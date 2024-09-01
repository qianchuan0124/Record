package com.example.record.ui.pages

import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.record.R
import com.example.record.model.Filter
import com.example.record.model.Record
import com.example.record.ui.components.AddRecordView
import com.example.record.ui.components.BottomActionView
import com.example.record.ui.components.DetailBar
import com.example.record.ui.components.RecordAmountItem
import com.example.record.ui.components.RecordCategoryItem
import com.example.record.ui.components.RecordEmptyView
import com.example.record.ui.components.RecordFilterCategoryItem
import com.example.record.ui.components.RecordFilterTypeItem
import com.example.record.ui.components.RecordList
import com.example.record.ui.components.RecordRemarkItem
import com.example.record.ui.components.RecordTimeItem
import com.example.record.ui.components.RecordTimeRangeItem
import com.example.record.ui.components.RecordTypeItem
import com.example.record.ui.components.SearchBar
import com.example.record.ui.components.SyncDataView
import com.example.record.ui.theme.ColorFailed
import com.example.record.ui.theme.ColorSubInfo
import com.example.record.ui.theme.ColorSuccess
import com.example.record.ui.theme.ColorTitle
import com.example.record.utils.CategoryParser
import com.example.record.utils.DateUtils
import com.example.record.vm.RecordViewModel
import kotlinx.coroutines.launch
import java.util.Date


sealed class HomeAction
data object HomeActionAdd: HomeAction()
data class HomeActionEdit(val record: Record) : HomeAction()
data object HomeActionFilter : HomeAction()


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Home(viewModel: RecordViewModel) {
    val context = LocalContext.current
    val sheetState = rememberModalBottomSheetState()
    val filter by viewModel.filterState.collectAsStateWithLifecycle()
    val records by viewModel.recordsState.collectAsStateWithLifecycle()
    val searchKey by viewModel.searchKeyState.collectAsStateWithLifecycle()
    val totalIncome by viewModel.totalIncomeState.collectAsStateWithLifecycle()
    val totalOutcome by viewModel.totalOutcomeState.collectAsStateWithLifecycle()
    val rangeIncome by viewModel.rangeIncomeState.collectAsStateWithLifecycle()
    val rangeOutcome by viewModel.rangeOutcomeState.collectAsStateWithLifecycle()
    val errorInfo by viewModel.errorState.collectAsStateWithLifecycle()

    var showBottomSheet by remember { mutableStateOf(false) }
    var action by remember { mutableStateOf<HomeAction?>(null) }
    var isScrolledToLastItem by remember { mutableStateOf(false) }

    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(listState) {
        snapshotFlow {
            val lastVisibleItemIndex = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index
            lastVisibleItemIndex == records.size - 1
        }.collect {
            isScrolledToLastItem = it
        }
    }

    Scaffold(
        floatingActionButton = {
            if (!isScrolledToLastItem) {
                FloatingActionButton(onClick = {
                    coroutineScope.launch {
                        listState.animateScrollToItem(index = 0)
                    }
                }, shape = CircleShape.copy()) {
                    Image(imageVector = Icons.Filled.KeyboardArrowUp, contentDescription = null)
                }
            }
        }
    ) { value ->
        println(value)
        RecordContainer(
            records,
            listState,
            searchKey,
            totalIncome,
            totalOutcome,
            filter,
            rangeIncome,
            rangeOutcome,
            addAction = {
                action = HomeActionAdd
            },
            removeAction = {
                viewModel.removeItem(it)
            },
            editAction = {
                action = HomeActionEdit(it)
            },
            searchKeyChanged = {
                viewModel.onSearchKeyChanged(it)
            },
            clearAction = {
                viewModel.clearRecords()
            },
            filterAction = {
                action = HomeActionFilter
            }
        )

        action?.let {
            ModalBottomSheet(
                onDismissRequest = {
                    showBottomSheet = false
                    action = null
                },
                sheetState = sheetState
            ) {
                Column(modifier = Modifier
                    .padding(16.dp)
                    .weight(0.7f)) {
                    when (action) {
                        is HomeActionAdd -> {
                            AddRecordView(addAction = {
                                viewModel.addItem(it)
                                showBottomSheet = false
                                action = null
                                Toast.makeText(
                                    context,
                                    context.getString(R.string.add_record_success),
                                    Toast.LENGTH_SHORT
                                ).show()
                            })
                        }
                        is HomeActionEdit -> {
                            EditRecordView(
                                record = (action as HomeActionEdit).record,
                                updateAction = {
                                    viewModel.updateItem(it)
                                    showBottomSheet = false
                                    action = null
                                    Toast.makeText(
                                        context,
                                        context.getString(R.string.update_record_success),
                                        Toast.LENGTH_SHORT
                                    ).show()
                                }
                            )
                        }
                        is HomeActionFilter -> {
                            FilterRecordView(filter, dismiss = {
                                showBottomSheet = false
                                action = null
                            }) {
                                viewModel.onFilterChanged(it)
                            }
                        }
                        else -> {}
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
fun EditRecordView(record: Record, updateAction: (Record) -> Unit) {
    val context = LocalContext.current
    var timeDesc by rememberSaveable { mutableStateOf(record.date) }
    var isIncome by rememberSaveable { mutableStateOf(record.type == context.getString(R.string.record_income)) }
    var firstCategory by rememberSaveable { mutableStateOf(record.category) }
    var secondCategory by rememberSaveable { mutableStateOf(record.subCategory) }
    var amount by rememberSaveable{ mutableStateOf<String?>(record.amount.toString()) }
    var remark by rememberSaveable{ mutableStateOf(record.remark) }

    Column(modifier = Modifier.padding(horizontal = 54.dp)) {
        RecordTimeItem(
            startDate = timeDesc ?: DateUtils.resetTime(Date()),
            dateChange = { timeDesc = it }
        )

        RecordTypeItem(
            isIncome,
            selectChange = {
                isIncome = it
            }
        )

        RecordCategoryItem(
            firstCategory,
            secondCategory,
            changed = { first, second ->
                firstCategory = first
                secondCategory = second
            }
        )

        RecordAmountItem(amount, changed = { amount = it })

        RecordRemarkItem(remark, changed = { remark = it })

        BottomActionView(
            leftTitle = stringResource(R.string.record_reset),
            leftAction = {
                timeDesc = record.date
                isIncome = record.type == context.getString(R.string.record_income)
                firstCategory = record.category
                secondCategory = record.subCategory
                amount = amount
                remark = record.remark
            },
            rightTitle = stringResource(R.string.record_update),
            rightAction = {
                updateAction(Record(
                    id = record.id,
                    date = timeDesc ?: Date(),
                    amount = amount?.toFloat() ?: 0.0f,
                    type = if (isIncome) {
                        context.getString(R.string.record_income)
                    } else {
                        context.getString(R.string.record_outcome)
                    },
                    category = firstCategory,
                    subCategory = secondCategory,
                    remark = remark
                ))
            },
            modifier = Modifier
                .align(Alignment.CenterHorizontally)
                .padding(top = 20.dp)
        )
    }
}

@Composable
fun FilterRecordView(filter: Filter, dismiss: () -> Unit, filterAction: (Filter) -> Unit) {
    val context = LocalContext.current
    var timeSelectRange by rememberSaveable { mutableStateOf(Pair<Date?, Date?>(filter.startDate, filter.endDate)) }
    var typeFilter by rememberSaveable { mutableStateOf(Pair<Boolean?, Boolean?>(filter.types.contains("收入"), filter.types.contains("支出"))) }
    var categoryFilter by rememberSaveable {
        mutableStateOf(CategoryParser.filterCheckBoxInfo(filter))
    }
    Column(modifier = Modifier.padding(horizontal = 54.dp)) {
        RecordTimeRangeItem(
            startDate = timeSelectRange.first,
            endDate = timeSelectRange.second,
            changed = {
                timeSelectRange = it
            }
        )

        RecordFilterTypeItem(
            outcome = typeFilter.first,
            income = typeFilter.second,
            changed = {
                typeFilter = it
            }
        )

        RecordFilterCategoryItem(
            initCheckboxes = categoryFilter,
            changed = {
                categoryFilter = it
            }
        )

        BottomActionView(
            leftTitle = stringResource(R.string.record_total),
            leftAction = {
                timeSelectRange = Pair(null, null)
                typeFilter = Pair(null, null)
                categoryFilter = arrayOf()
            },
            rightTitle = stringResource(R.string.record_filter),
            rightAction = {
                filterAction(Filter(
                    startDate = timeSelectRange.first ?: DateUtils.currentMonthDateRange().first,
                    endDate = timeSelectRange.second ?: DateUtils.currentMonthDateRange().second,
                    types = listOf(if (typeFilter.first == true) context.getString(R.string.record_outcome) else "", if (typeFilter.second == true) context.getString(R.string.record_income) else "").filter { it != "" },
                    subCategories = categoryFilter.flatMap { it.subCheckBoxes.filter { sub -> sub.isChecked }.map { sub -> sub.title } }
                ))
                dismiss()
            },
            modifier = Modifier
                .align(Alignment.CenterHorizontally)
                .padding(top = 60.dp)
        )
    }
}

@Composable
fun RecordContainer(records: List<Record>,
                    state: LazyListState,
                    searchKey: String,
                    totalIncome: Float,
                    totalOutcome: Float,
                    filter: Filter,
                    rangeIncome: Float,
                    rangeOutcome: Float,
                    addAction: () -> Unit,
                    removeAction: (Record) -> Unit,
                    editAction: (Record) -> Unit,
                    searchKeyChanged:(String) -> Unit,
                    clearAction: () -> Unit,
                    filterAction: () -> Unit) {

    var showSyncPage by rememberSaveable {
        mutableStateOf(false)
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(horizontalArrangement = Arrangement.SpaceEvenly) {
            Text(
                text = stringResource(R.string.record_list),
                modifier = Modifier.padding(horizontal = 28.dp, vertical = 24.dp),
                color = ColorTitle,
                fontSize = 21.sp,
                fontWeight = FontWeight.Bold
            )

            Text(
                text = stringResource(R.string.record_sync),
                modifier = Modifier
                    .padding(horizontal = 28.dp, vertical = 24.dp)
                    .clickable { showSyncPage = true },
                color = ColorTitle,
                fontSize = 21.sp,
                fontWeight = FontWeight.Bold
            )

            Text(
                text = stringResource(R.string.record_clear),
                modifier = Modifier
                    .padding(horizontal = 28.dp, vertical = 24.dp)
                    .clickable { clearAction() },
                color = ColorTitle,
                fontSize = 21.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(190.dp)
                .padding(horizontal = 28.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            OverAllInfoView(allIncome = totalIncome, allOutcome = totalOutcome)
            Image(
                painter = painterResource(id = R.drawable.record_add_icon),
                contentDescription = null,
                modifier = Modifier
                    .clickable { addAction() }
            )
        }
        SearchBar(
            searchKey,
            searchAction = {
                searchKeyChanged(it)
            },
            filterAction = {
                filterAction()
            },
            modifier = Modifier.padding(top = 12.dp)
        )
        DetailBar(
            timeInfo = DateUtils.formatDateRange(filter.startDate, filter.endDate),
            income = rangeIncome,
            outcome = rangeOutcome,
            modifier = Modifier
                .padding(top = 12.dp)
                .background(ColorSubInfo.copy(alpha = 0.2F))
                .padding(horizontal = 28.dp, vertical = 6.dp)
        )

        if (records.isEmpty()) {
            RecordEmptyView(modifier = Modifier.padding(top = 24.dp))
        } else {
            RecordList(records, state, searchKey, removeAction, editAction)
        }

        if (showSyncPage) {
            SyncDataView {
                showSyncPage = false
            }
        }
    }
}

@Composable
fun OverAllInfoView(allIncome: Float, allOutcome: Float, modifier: Modifier = Modifier) {
    Box(modifier = modifier) {
        Image(painter = painterResource(id = R.drawable.overall_account), contentDescription = null)
        Column(
            modifier = Modifier
                .padding(top = 80.dp, start = 40.dp),
            horizontalAlignment = Alignment.End,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "+ $allIncome",
                color = ColorSuccess,
                fontWeight = FontWeight.Bold,
                fontSize = 27.sp
            )

            Text(
                "- $allOutcome",
                color = ColorFailed,
                fontWeight = FontWeight.Bold,
                fontSize = 27.sp
            )
        }
    }
}