package com.example.record.vm

import android.annotation.SuppressLint
import android.content.Context
import android.content.IntentFilter
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.room.Room
import com.example.record.R
import com.example.record.model.Database
import com.example.record.model.Filter
import com.example.record.model.Record
import com.example.record.model.RecordError
import com.example.record.services.NotificationReceiver
import com.example.record.services.NotifyCenter
import com.example.record.services.NotifyType
import com.example.record.services.RECORD_NOTIFY
import com.example.record.utils.CategoryParser
import com.example.record.utils.DateUtils
import com.example.record.utils.LogTag
import com.example.record.utils.RecordApplication
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@SuppressLint("InlinedApi")
class RecordViewModel: ViewModel() {

    private val database: Database =
        Room.databaseBuilder(RecordApplication.context, Database::class.java, "record.db").build()

    private val _recordsState = MutableStateFlow(emptyList<Record>())
    val recordsState: StateFlow<List<Record>> = _recordsState.asStateFlow()

    private val _searchKeyState = MutableStateFlow("")
    val searchKeyState: StateFlow<String> = _searchKeyState.asStateFlow()

    private val _totalIncomeState = MutableStateFlow(0.0f)
    val totalIncomeState: StateFlow<Float> = _totalIncomeState.asStateFlow()

    private val _totalOutcomeState = MutableStateFlow(0.0f)
    val totalOutcomeState: StateFlow<Float> = _totalOutcomeState.asStateFlow()

    private val _rangeOutcomeState = MutableStateFlow(0.0f)
    val rangeOutcomeState: StateFlow<Float> = _rangeOutcomeState.asStateFlow()

    private val _rangeIncomeState = MutableStateFlow(0.0f)
    val rangeIncomeState: StateFlow<Float> = _rangeIncomeState.asStateFlow()

    private val _filterState = MutableStateFlow(defaultFilter())
    val filterState: StateFlow<Filter> = _filterState.asStateFlow()

    private val _errorState = MutableStateFlow<Exception?>(null)
    val errorState: StateFlow<Exception?> = _errorState.asStateFlow()

    private val notificationReceiver = NotificationReceiver().apply {
        onReceiveCallback = { type ->
            Log.d(LogTag.RecordNotify, "RecordVM收到通知: $type")
            handleNotify(type)
        }
    }

    private var isReceiverRegistered = false

    init {
        registerReceiver()
        reloadData()
    }

    private fun registerReceiver() {
        if (!isReceiverRegistered) {
            val filter = IntentFilter(RECORD_NOTIFY)
            RecordApplication.context.registerReceiver(notificationReceiver, filter,
                Context.RECEIVER_EXPORTED)
            isReceiverRegistered = true
        }
    }

    override fun onCleared() {
        super.onCleared()
        if (isReceiverRegistered) {
            RecordApplication.context.unregisterReceiver(notificationReceiver)
            isReceiverRegistered = false
        }
    }

    private fun handleNotify(type: NotifyType) {
        when (type) {
            NotifyType.RecordImport,
            NotifyType.RecordSync ->
                reloadData()
            else ->
                return
        }
    }

    private fun defaultFilter(): Filter {
        val (startDate, endDate) = DateUtils.currentMonthDateRange()

        return Filter(startDate, endDate, listOf(), listOf())
    }

    private fun reloadData() {
        viewModelScope.launch {
            val records = withContext(Dispatchers.IO) {
                currentRecords()
            }
            _recordsState.update { records }
            loadTotalInfo()
        }
    }

    fun onFilterChanged(newValue: Filter?) {
        _filterState.value = newValue ?: defaultFilter()
        reloadData()
    }

    fun onSearchKeyChanged(newValue: String) {
        _searchKeyState.value = newValue
        reloadData()
    }

    fun clearError() {
        _errorState.value = null
    }

    private suspend fun loadTotalInfo() {
        val startDate = _filterState.value.startDate
        val endDate = _filterState.value.endDate

        val totalIncome = withContext(Dispatchers.IO) {
            database.record().totalIncome()
        }
        _totalIncomeState.update { totalIncome }
        val totalOutcome = withContext(Dispatchers.IO) {
            database.record().totalOutcome()
        }
        _totalOutcomeState.update { totalOutcome }

        val rangeIncome = withContext(Dispatchers.IO) {
            database.record().totalIncome(startDate, endDate)
        }
        _rangeIncomeState.update { rangeIncome }
        val rangeOutcome = withContext(Dispatchers.IO) {
            database.record().totalOutcome(startDate, endDate)
        }
        _rangeOutcomeState.update { rangeOutcome }
    }

    fun removeItem(currentItem: Record) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    deleteRecord(currentItem)
                }
                _recordsState.update {
                    val mutableList = it.toMutableList()
                    mutableList.remove(currentItem)
                    mutableList
                }
                NotifyCenter.sendRecordNotify(NotifyType.RecordDelete)
                loadTotalInfo()
            } catch (e: Exception) {
                Log.e(LogTag.RecordAction, "删除失败, error: ${e.message}")
                _errorState.value = e
            }
        }
    }

    fun addItem(newItem: Record) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    addRecord(newItem)
                }
                _recordsState.update {
                    if (DateUtils.isDateInRange(newItem.date, _filterState.value.startDate, _filterState.value.endDate)) {
                        val mutableList = it.toMutableList()
                        val index = mutableList.indexOfFirst { item -> item.date?.before(newItem.date) ?: false }
                        if (index >= 0) {
                            mutableList.add(index, newItem)
                        } else {
                            mutableList.add(0, newItem)
                        }
                        mutableList
                    } else {
                        it
                    }
                }
                NotifyCenter.sendRecordNotify(NotifyType.RecordAdd)
                reloadData()
            } catch(e: Exception) {
                Log.e(LogTag.RecordAction, "新增失败, error: ${e.message}")
                _errorState.value = e
            }
        }
    }

    fun updateItem(currentItem: Record) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    updateRecord(currentItem)
                }
                _recordsState.update {
                    val mutableList = it.toMutableList()
                    val index = mutableList.indexOfFirst { sub -> sub.id == currentItem.id }
                    if (index == -1) {
                        throw RecordError(message = "找不到记录")
                    } else {
                        mutableList[index] = currentItem
                        mutableList.filter { item -> DateUtils.isDateInRange(item.date, _filterState.value.startDate, _filterState.value.endDate) }.sortedByDescending { item -> item.date }
                    }
                }
                NotifyCenter.sendRecordNotify(NotifyType.RecordUpdate)
                loadTotalInfo()
            } catch (e: Exception) {
                Log.e(LogTag.RecordAction, "更新失败, error: ${e.message}")
                _errorState.value = e
            }
        }
    }

    fun clearRecords() {
        viewModelScope.launch {
            withContext(Dispatchers.IO) {
                database.record().clearRecords()
            }
            NotifyCenter.sendRecordNotify(NotifyType.RecordUpdate)
            reloadData()
        }
    }

    private fun currentRecords(): List<Record> {
        val context = RecordApplication.context
        val records = database.record().recordsByFilter(
            _filterState.value.startDate,
            _filterState.value.endDate,
            _filterState.value.types.ifEmpty { listOf(context.getString(R.string.record_income), context.getString(R.string.record_outcome)) },
            _filterState.value.subCategories.ifEmpty { CategoryParser.allSubCategories() }
        )

        if (_searchKeyState.value.isNotEmpty()) {
            val searchKey = _searchKeyState.value
            return records.filter {
                it.type.contains(searchKey) ||
                        it.category.contains(searchKey) ||
                        it.subCategory.contains(searchKey) ||
                        it.remark.contains(searchKey) ||
                        DateUtils.formatDate(it.date).contains(searchKey)
            }
        } else {
            return records
        }
    }

    private fun addRecord(record: Record): Boolean {
        database.record().insert(record)
        return true
    }

    private fun updateRecord(record: Record): Boolean {
        database.record().update(record)
        return true
    }

    private fun deleteRecord(record: Record): Boolean {
        database.record().delete(record)
        return true
    }
}