package com.example.record.vm

import android.annotation.SuppressLint
import android.content.Context
import android.content.IntentFilter
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.record.R
import com.example.record.model.Budget
import com.example.record.model.BudgetInfo
import com.example.record.model.Database
import com.example.record.services.DatabaseService
import com.example.record.services.NotificationReceiver
import com.example.record.services.NotifyType
import com.example.record.services.RECORD_NOTIFY
import com.example.record.utils.CategoryParser
import com.example.record.utils.DateUtils
import com.example.record.utils.LogTag
import com.example.record.utils.RecordApplication
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Date

const val BudgetInfoKey = "budgetInfo-key"

@SuppressLint("InlinedApi")
class BudgetViewModel: ViewModel() {
    private val _budgetState = MutableStateFlow(emptyList<Budget>())
    val budgetState: StateFlow<List<Budget>> = _budgetState.asStateFlow()

    private val _totalOutcomeState = MutableStateFlow(0.0f)
    val totalOutcomeState: StateFlow<Float> = _totalOutcomeState.asStateFlow()

    private val sharedPref = RecordApplication.context.getSharedPreferences(BudgetInfoKey, Context.MODE_PRIVATE)
    private val database: Database = DatabaseService.recordDatabase()

    private val _errorState = MutableStateFlow<Exception?>(null)
    val errorState: StateFlow<Exception?> = _errorState.asStateFlow()

    private val notificationReceiver = NotificationReceiver().apply {
        onReceiveCallback = { type ->
            Log.d(LogTag.RecordNotify, "BudgetVM收到通知: $type")
            handleNotify(type)
        }
    }

    init {
        val filter = IntentFilter(RECORD_NOTIFY)
        RecordApplication.context.registerReceiver(notificationReceiver, filter,
            Context.RECEIVER_EXPORTED)
        loadData()
    }

    override fun onCleared() {
        super.onCleared()
        RecordApplication.context.unregisterReceiver(notificationReceiver)
    }

    fun clearError() {
        _errorState.value = null
    }

    private fun loadData() {
        viewModelScope.launch {
            try {
                val budgets = loadBudgetInfos()
                _budgetState.update { budgets }

                val totalOutcome = loadTotalOutcome()
                _totalOutcomeState.update { totalOutcome }
            } catch (e: Exception) {
                Log.e(LogTag.BudgetInfo, "预算内容加载失败, error: ${e.message}")
                _errorState.value = e
            }
        }
    }

    private fun handleNotify(type: NotifyType) {
        when (type) {
            NotifyType.RecordAdd,
            NotifyType.RecordUpdate,
            NotifyType.RecordDelete,
            NotifyType.RecordImport,
            NotifyType.RecordSync ->
                loadData()
        }
    }

    fun insertOrUpdateBudgetInfo(category: String, amount: Float) {
        try {
            val budgetInfo = BudgetInfo(amount, category)
            val currentBudgetInfos = currentBudgetInfos().toMutableList()
            val index = currentBudgetInfos.indexOfFirst { it.category == category }
            if (index != -1) {
                currentBudgetInfos[index] = budgetInfo
            } else {
                currentBudgetInfos.add(1, budgetInfo)
            }
            saveBudgetInfos(currentBudgetInfos)
            loadData()
        } catch (e: Exception) {
            Log.e(LogTag.BudgetInfo, "预算插入/更新失败, error: ${e.message}")
            _errorState.value = e
        }
    }

    fun deleteBudgetInfo(budget: Budget) {
        try {
            val currentBudgetInfos = currentBudgetInfos().toMutableList()
            val index = currentBudgetInfos.indexOfFirst { it.category == budget.category }
            if (index != -1) {
                currentBudgetInfos.removeAt(index)
                saveBudgetInfos(currentBudgetInfos)
                loadData()
            }
        } catch (e: Exception) {
            Log.e(LogTag.BudgetInfo, "预算删除失败, error: ${e.message}")
            _errorState.value = e
        }
    }

    private suspend fun loadBudgetInfos(): List<Budget> = withContext(Dispatchers.IO) {
        val currentInfos = currentBudgetInfos().ifEmpty {
            val defaultInfos = defaultBudgetInfos()
            saveBudgetInfos(defaultInfos)
            defaultInfos
        }

        val (startDate, endDate) = DateUtils.currentMonthDateRange()

        val context = RecordApplication.context

        currentInfos.map { budgetInfo ->
            if (budgetInfo.category == context.getString(R.string.total_budget)) {
                val outcome = database.record().totalOutcomeByFilter(startDate, endDate, CategoryParser.allSubCategories())
                Budget(Date(), budgetInfo.all, outcome, budgetInfo.category)
            } else {
                val outcome = database.record().outcomeByCategory(startDate, endDate, budgetInfo.category)
                Budget(Date(), budgetInfo.all, outcome, budgetInfo.category)
            }
        }
    }

    private suspend fun loadTotalOutcome(): Float = withContext(Dispatchers.IO) {
        val (startDate, endDate) = DateUtils.currentMonthDateRange()
        database.record().totalOutcomeByFilter(startDate, endDate, CategoryParser.allSubCategories())
    }

    private fun defaultBudgetInfos(): List<BudgetInfo> {
        val categories = CategoryParser.firstLevelCategories()
        val budgetInfos = mutableListOf<BudgetInfo>()
        val context = RecordApplication.context
        budgetInfos.add(BudgetInfo(1000.0f, context.getString(R.string.total_budget)))
        budgetInfos.addAll(
            categories.map {
                BudgetInfo(1000.0f, it)
            }.take(3)
        )
        return budgetInfos
    }

    private fun currentBudgetInfos(): List<BudgetInfo> {
        val jsonString = sharedPref.getString(BudgetInfoKey, null)
        val type = object : TypeToken<List<BudgetInfo>>() {}.type
        return jsonString?.let { Gson().fromJson(it, type) } ?: listOf()
    }

    private fun saveBudgetInfos(infos: List<BudgetInfo>) {
        val editor = sharedPref.edit()
        val jsonString = Gson().toJson(infos)
        editor.putString(BudgetInfoKey, jsonString)
        editor.apply()
    }
}