package com.example.record.services

import android.util.Log
import androidx.room.Room
import androidx.room.withTransaction
import com.example.record.model.Database
import com.example.record.model.Record
import com.example.record.model.SyncError
import com.example.record.utils.LogTag
import com.example.record.utils.RecordApplication
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.channelFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.coroutines.CoroutineContext

object RecordSyncService: CoroutineScope {
    private val database: Database =
        Room.databaseBuilder(RecordApplication.context, Database::class.java, "record.db").build()

    private val _errorState = MutableStateFlow<Exception?>(null)
    val errorState: StateFlow<Exception?> = _errorState.asStateFlow()

    private val _progress = MutableStateFlow(0)
    val progress: StateFlow<Int> = _progress.asStateFlow()

    private val job = Job()

    override val coroutineContext: CoroutineContext
        get() = Dispatchers.Default + job

    fun cleanup() {
        job.cancel() // 在适当的时候取消协程
    }

    fun clearError() {
        _errorState.value = null
        _progress.value = 0
    }

    fun startSyncFromPC() {
        launch {
            try {
                syncRecordsFromPC().collect { progress ->
                    _progress.value = progress
                    if (progress == 100) {
                        NotifyCenter.sendRecordNotify(NotifyType.RecordSync)
                        RecordService.syncNotifySuccess()
                    }
                }
            } catch (e: Exception) {
                Log.e(LogTag.SyncRecord, "${e.message}")
                RecordService.syncNotifyFailed()
                _errorState.value = e
                cleanup()
            }
        }
    }

    fun startSyncToPC() {
        launch {
            try {
                syncRecordsToPC().collect { progress ->
                    _progress.value = progress
                    if (progress == 100) {
                        RecordService.syncNotifySuccess()
                    }
                }
            } catch (e: Exception) {
                Log.e(LogTag.SyncRecord, "${e.message}")
                RecordService.syncNotifyFailed()
                _errorState.value = e
                cleanup()
            }
        }
    }

    private fun syncRecordsFromPC(): Flow<Int> = channelFlow {
        withContext(Dispatchers.IO) {
            val tempRecords = mutableListOf<Record>()
            var page = 1
            val limit = 50
            var totalRecords = 0 //用于存储总记录数

            while (true) {
                RecordService.syncNotifyStart()
                val info = RecordService.syncRecordsFromPC(page, limit)
                tempRecords.addAll(info.records)
                totalRecords = info.totalRecords

                // 计算进度
                val progress = if (totalRecords > 0) {
                    (tempRecords.size * 98 / totalRecords)
                } else {
                    0
                }

                // 发送进度
                send(progress)

                if (tempRecords.size < totalRecords) {
                    page += 1
                } else {
                    insertLargeRecordArray(tempRecords)
                    send(100)
                    break
                }
            }
        }
    }

    private suspend fun insertLargeRecordArray(records: List<Record>) {
        val recordDao = database.record()

        database.withTransaction {
            val batchSize = 100
            val batches = records.chunked(batchSize)
            var skip = 0
            try {
                batches.forEach { batch ->
                    batch.forEach { record ->
                        record.date?.let {
                            val duplicate = recordDao.findDuplicateRecord(
                                it,
                                record.amount,
                                record.type,
                                record.category,
                                record.subCategory,
                                record.remark
                            )
                            if (duplicate == null) {
                                record.id = 0
                                recordDao.insert(record)
                                Log.d(LogTag.SyncRecord, "插入数据: $record")
                            } else {
                                Log.d(LogTag.SyncRecord, "发现重复数据: $record")
                                skip += 1
                            }
                        }
                    }
                }
                Log.d(LogTag.SyncRecord, "插入成功, 数量: ${records.size} skip: $skip")
            } catch (e: Exception) {
                // 处理异常，例如记录日志或向用户显示错误消息
                Log.e(LogTag.SyncRecord, "插入数据失败", e)
                throw SyncError("数据插入失败")
                // 事务将在 withTransaction 块结束时自动回滚
            }
            Log.d(LogTag.SyncRecord, "同步结束")
        }
    }

    private fun syncRecordsToPC(): Flow<Int> = channelFlow {
        withContext(Dispatchers.IO) {
            var page = 1
            val pageSize = 100
            val totalCount = database.record().recordsCount()
            var currentCount = 0

            while (true) {
                val offset = (page - 1) * pageSize

                val records = database.record().recordsByLimit(pageSize, offset)
                currentCount += records.size

                val res = RecordService.syncRecordsToPC(records, currentCount, totalCount)

                if (res) {
                    send((currentCount * 100) / totalCount)
                } else {
                    throw SyncError("数据同步失败")
                }

                if (currentCount >= totalCount) {
                    break
                }

                page += 1
            }
        }
    }
}