package com.example.record.ui.pages

import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.record.R
import com.example.record.model.CategoryRecord
import com.example.record.model.YearlyData
import com.example.record.ui.components.DetailBar
import com.example.record.ui.components.Pie
import com.example.record.ui.components.RecordEmptyView
import com.example.record.ui.theme.ColorFailed
import com.example.record.ui.theme.ColorSubInfo
import com.example.record.utils.DateUtils
import com.example.record.vm.AnalysisViewModel
import java.text.DecimalFormat

@Composable
fun Analysis(viewModel: AnalysisViewModel, modifier: Modifier) {
    val pieDataList by viewModel.pieState.collectAsStateWithLifecycle()
    val currentYearlyData by viewModel.currentYearlyState.collectAsStateWithLifecycle()
    val errorInfo by viewModel.errorState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    Box(modifier = Modifier.fillMaxSize()) {
        Image(
            painter = painterResource(id = R.drawable.info_background),
            contentDescription = null,
            modifier = Modifier.fillMaxWidth()
        )

        Column(modifier = Modifier.fillMaxSize()) {
            if (pieDataList.isNotEmpty()) {
                Pie(
                    dataList = pieDataList, modifier = Modifier
                        .fillMaxWidth()
                        .weight(0.3f)
                ) {
                    viewModel.changeCurrentYear(it.name.toInt())
                }
            } else {
                Spacer(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(0.3f)
                )
            }

            Column(
                modifier = Modifier
                    .weight(0.7f)
                    .background(
                        color = Color.White,
                        shape = RoundedCornerShape(
                            topStart = 36.dp,
                            topEnd = 36.dp
                        )
                    )
            ) {
                DetailBar(
                    timeInfo = DateUtils.yearlyFormatYear(currentYearlyData?.year ?: DateUtils.currentYear()),
                    income = currentYearlyData?.totalIncome ?: 0.0f,
                    outcome = currentYearlyData?.totalOutcome ?: 0.0f,
                    modifier = Modifier
                        .padding(top = 12.dp)
                        .background(
                            color = ColorSubInfo.copy(alpha = 0.2F),
                            shape = RoundedCornerShape(
                                topStart = 20.dp,
                                topEnd = 20.dp
                            )
                        )
                        .padding(horizontal = 28.dp, vertical = 6.dp)
                )

                currentYearlyData?.let{ yearlyData ->
                    if (yearlyData.recordMap.isEmpty()) {
                        RecordEmptyView(modifier = Modifier.padding(top = 54.dp))
                    } else {
                        YearlyDataView(yearlyData)
                    }
                }
            }
        }

        errorInfo?.let {
            Toast.makeText(context, "${it.message}", Toast.LENGTH_SHORT).show()
            viewModel.clearError()
        }
    }
}

@Composable
fun YearlyDataView(yearlyData: YearlyData) {
    LazyColumn {
        items(yearlyData.recordMap.size) { index -> // Use entries
            val categoryData = yearlyData.recordMap[index]
            val category = categoryData.category
            var isExpanded by rememberSaveable { mutableStateOf(false) }

            Column {
                DetailView(
                    category,
                    categoryData.totalOutcome,
                    leadingIcon = {
                        Image(
                            imageVector = if (isExpanded) Icons.Default.KeyboardArrowDown else Icons.Default.KeyboardArrowRight,
                            contentDescription = null
                        )
                    }
                ) {
                    isExpanded = !isExpanded
                }

                if (isExpanded) {
                    CategoryRecordView(categoryData)
                }
            }
        }
    }
}

@Composable
fun CategoryRecordView(categoryRecord: CategoryRecord) {
    val records = categoryRecord.items
    LazyColumn(modifier = Modifier.height( (55 * records.size).dp)) {
        items(records.size) { index ->
            val subCategoryRecord = records[index]
            val subCategory = subCategoryRecord.subCategory
            DetailView(subCategory, amount = subCategoryRecord.totalOutcome)
        }
    }
}

@Composable
fun DetailView(
    title: String,
    amount: Float,
    modifier: Modifier = Modifier,
    leadingIcon: @Composable (() -> Unit)? = null,
    action: (() -> Unit)? = null
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(55.dp)
            .clickable { action?.let { it() } }
            .padding(16.dp)
    ) {
        leadingIcon?.let {
            it()
        } ?: run {
            Spacer(modifier = Modifier.size(24.dp))
        }

        Row(
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
        ) {
            Text(
                text = title,
            )

            Text(
                color = ColorFailed,
                text = DecimalFormat("#.##").format(amount),
            )
        }
    }
}