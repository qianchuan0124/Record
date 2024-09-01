package com.example.record.services

import android.net.Uri
import android.util.Log
import androidx.room.Room
import androidx.room.withTransaction
import com.example.record.R
import com.example.record.model.Database
import com.example.record.model.Record
import com.example.record.utils.DateUtils
import com.example.record.utils.LogTag
import com.example.record.utils.RecordApplication
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.apache.poi.ooxml.POIXMLException
import org.apache.poi.ss.usermodel.CellType
import org.apache.poi.ss.usermodel.DateUtil
import org.apache.poi.ss.usermodel.WorkbookFactory
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import java.io.OutputStream
import java.text.DecimalFormat

object ExcelService {

    const val XLSXTYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    private val database: Database =
        Room.databaseBuilder(RecordApplication.context, Database::class.java, "record.db").build()

    fun exportName(): String {
        val context = RecordApplication.context
        return context.getString(R.string.export_record_list, DateUtils.exportFormatDate())
    }

    suspend fun exportRecord(outputStream: OutputStream): Boolean = withContext(Dispatchers.IO) {
        try {
            val workbook = XSSFWorkbook()
            val sheet = workbook.createSheet("Sheet1")

            sheet.setColumnWidth(0, 30 * 256)
            sheet.setColumnWidth(1, 20 * 256)
            sheet.setColumnWidth(2, 20 * 256)
            sheet.setColumnWidth(3, 20 * 256)
            sheet.setColumnWidth(4, 20 * 256)
            sheet.setColumnWidth(5, 30 * 256)

            val context = RecordApplication.context

            val data = mutableListOf(
                arrayOf(
                    context.getString(R.string.time),
                    context.getString(R.string.type),
                    context.getString(R.string.category),
                    context.getString(R.string.sub_category),
                    context.getString(R.string.amount),
                    context.getString(R.string.remark)
                )
            )

            database.record().queryAll().sortedByDescending { it.date }.forEach { record ->
                val rowData = arrayOf(
                    DateUtils.formatDate(record.date),
                    record.type,
                    record.category,
                    record.subCategory,
                    DecimalFormat("#.##").format(record.amount),
                    record.remark
                )
                data.add(rowData)
            }

            for ((rowIndex, rowData) in data.withIndex()) {
                val row = sheet.createRow(rowIndex)
                for ((colIndex, cellValue) in rowData.withIndex()) {
                    val cell = row.createCell(colIndex)
                    cell.setCellValue(cellValue)
                }
            }

            try {
                workbook.write(outputStream)
            } finally {
                workbook.close()
                outputStream.close()
            }
            true
        } catch (e: Exception) {
            Log.e(LogTag.ExportData, "导出文件失败, error: ${e.message}", e)
            false
        }
    }

    suspend fun importRecord(uri: Uri): Boolean = withContext(Dispatchers.IO) {
        val contentResolver = RecordApplication.context.contentResolver
        try {
            val records = contentResolver.openInputStream(uri)?.use { inputStream ->
                val workbook = WorkbookFactory.create(inputStream)
                val sheet = workbook.getSheetAt(0)
                (1 until sheet.physicalNumberOfRows).map { rowIndex ->
                    (0 until sheet.getRow(rowIndex).physicalNumberOfCells).map { colIndex ->
                        val cell = sheet.getRow(rowIndex).getCell(colIndex)
                        // Handle potential null cell values and different cell types
                        if (cell != null) {
                            when (cell.cellType) {
                                CellType.STRING -> cell.stringCellValue
                                CellType.NUMERIC ->
                                    if (DateUtil.isCellDateFormatted(cell)) {
                                        cell.dateCellValue.toString() // Or format the date
                                    } else {
                                        cell.numericCellValue.toString()
                                    }
                                else -> cell.toString() // Default handling
                            }
                        } else {
                            "" // Or handle null values differently
                        }
                    }
                }
            }
            records?.let {
                insertRecords(it)
                true
            } ?: run { false }
        } catch (e: POIXMLException) {
            Log.e(LogTag.ImportData, "解析Excel文件失败", e)
            false
        } catch (e: Exception) {
            Log.e(LogTag.ImportData, "读取Excel文件失败", e)
            false
        }
    }

    private suspend fun insertRecords(records: List<List<String>>) {
        val tempRecords = records.map {
            val date = DateUtils.parseDate(it[0])
            val type = it[1]
            val category = it[2]
            val subCategory = it[3]
            val amount = it[4].toFloat()
            val remark = it[5]
            Record(0, date, amount, type, category, subCategory, remark)
        }

        database.withTransaction {
            val batchSize = 100
            val batches = tempRecords.chunked(batchSize)
            batches.forEach { batch ->
                batch.forEach { record ->
                    record.date?.let {
                        val duplicate = database.record().findDuplicateRecord(
                            it,
                            record.amount,
                            record.type,
                            record.category,
                            record.subCategory,
                            record.remark
                        )
                        if (duplicate == null) {
                            database.record().insert(record)
                            Log.d(LogTag.ImportData, "插入数据: $record")
                        } else {
                            Log.d(LogTag.ImportData, "发现重复数据: $record")
                        }
                    }
                }
                Log.d(LogTag.ImportData, "插入成功, 数量: ${batch.size}")
            }
        }
    }
}