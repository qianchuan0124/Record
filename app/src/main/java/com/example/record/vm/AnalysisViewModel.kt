package com.example.record.vm

import android.annotation.SuppressLint
import android.content.Context
import android.content.IntentFilter
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.room.Room
import com.example.record.model.CategoryRecord
import com.example.record.model.Database
import com.example.record.model.PieColors
import com.example.record.model.PieData
import com.example.record.model.SubCategoryRecord
import com.example.record.model.YearlyData
import com.example.record.services.NotificationReceiver
import com.example.record.services.NotifyType
import com.example.record.services.RECORD_NOTIFY
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
import java.util.Calendar

@SuppressLint("InlinedApi")
class AnalysisViewModel: ViewModel()  {
    private val database: Database =
        Room.databaseBuilder(RecordApplication.context, Database::class.java, "record.db").build()

    private val _analysisState = MutableStateFlow(emptyList<YearlyData>())
    val analysisState: StateFlow<List<YearlyData>> = _analysisState.asStateFlow()

    private val _currentYearlyState = MutableStateFlow<YearlyData?>(null)
    val currentYearlyState: StateFlow<YearlyData?> = _currentYearlyState.asStateFlow()

    private val _pieState = MutableStateFlow(emptyList<PieData>())
    val pieState: StateFlow<List<PieData>> = _pieState.asStateFlow()

    private val _errorState = MutableStateFlow<Exception?>(null)
    val errorState: StateFlow<Exception?> = _errorState.asStateFlow()

    private val notificationReceiver = NotificationReceiver().apply {
        onReceiveCallback = { type ->
            Log.d(LogTag.RecordNotify, "AnalysisVM收到通知: $type")
            handleNotify(type)
        }
    }

    init {
        val filter = IntentFilter(RECORD_NOTIFY)
        RecordApplication.context.registerReceiver(notificationReceiver, filter,
            Context.RECEIVER_EXPORTED)
        reloadInfo()
    }

    override fun onCleared() {
        super.onCleared()
        RecordApplication.context.unregisterReceiver(notificationReceiver)
    }

    private fun handleNotify(type: NotifyType) {
        when (type) {
            NotifyType.RecordAdd,
            NotifyType.RecordDelete,
            NotifyType.RecordUpdate,
            NotifyType.RecordImport,
            NotifyType.RecordSync ->
                reloadInfo()
        }
    }

    private fun reloadInfo() {
        viewModelScope.launch {
            try {
                val yearlyDataList = loadData()
                _analysisState.update { yearlyDataList }
                _currentYearlyState.update { yearlyDataList.lastOrNull() }

                var index = 0
                val pieDataList = yearlyDataList.filter { it.totalOutcome != 0.0f }.map {
                    val currentIndex = index % PieColors.count()
                    val data = PieData(it.year.toString(), it.totalOutcome, PieColors[currentIndex])
                    index += 1
                    data
                }
                _pieState.update {
                    pieDataList
                }
            } catch (e: Exception) {
                Log.e(LogTag.AnalysisInfo, "分析数据加载失败，error: ${e.message}")
            }
        }
    }

    fun changeCurrentYear(year: Int) {
        val yearlyData = _analysisState.value.firstOrNull { it.year == year }
        _currentYearlyState.update { yearlyData }
    }

    fun clearError() {
        _errorState.value = null
    }

    private suspend fun loadData(): List<YearlyData> {
        return withContext(Dispatchers.IO) {
            val years = currentYears()
            val yearlyDataList = years.map {
                val (startDate, endDate) = DateUtils.yearDateRange(it)
                val income = database.record().totalIncome(startDate, endDate)
                val outcome = database.record().totalOutcome(startDate, endDate)
                val records = database.record().recordsWithOutcomeByTime(startDate, endDate)
                if (records.isEmpty()) {
                    YearlyData(it, listOf(), income, outcome)
                } else {
                    val groupedRecords = records.groupBy { sub -> sub.category }
                        .mapValues { entry ->
                            entry.value.sortedByDescending { sub -> sub.amount }
                        }
                    val categoryRecords = groupedRecords.map { item ->
                        val totalIncome = 0.0f
                        val totalOutcome = item.value.map { sub -> sub.amount }.sum()

                        val subGroupedRecords = item.value.groupBy { sub -> sub.subCategory }
                            .mapValues { entry ->
                                entry.value.sortedByDescending { sub -> sub.amount }
                            }
                        val subCategoryRecords = subGroupedRecords.map { subItem ->
                            val subTotalIncome = 0.0f
                            val subTotalOutcome = subItem.value.map { sub -> sub.amount }.sum()

                            SubCategoryRecord(subItem.key, subTotalIncome, subTotalOutcome, subItem.value)
                        }

                        CategoryRecord(item.key, totalIncome, totalOutcome, subCategoryRecords)
                    }

                    YearlyData(it, categoryRecords.sortedWith(compareByDescending { sub -> sub.totalOutcome }), income, outcome)
                }
            }
            yearlyDataList
        }
    }

    private fun currentYears(): List<Int> {
        val currentYear = Calendar.getInstance().get(Calendar.YEAR)
        return (currentYear - 4..currentYear).toList()
    }
}