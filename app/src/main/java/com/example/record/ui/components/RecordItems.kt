package com.example.record.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Done
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DateRangePicker
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberDateRangePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.record.R
import com.example.record.model.Record
import com.example.record.ui.theme.ColorFailed
import com.example.record.ui.theme.ColorSubInfo
import com.example.record.ui.theme.ColorSuccess
import com.example.record.ui.theme.ColorTitle
import com.example.record.utils.CategoryParser
import com.example.record.utils.DateUtils
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun AddRecordView(addAction: (Record) -> Unit) {
    var timeDesc by rememberSaveable { mutableStateOf<Date?>(Date()) }
    var isIncome by rememberSaveable { mutableStateOf(false) }
    var firstCategory by rememberSaveable { mutableStateOf(CategoryParser.firstCategory()) }
    var secondCategory by rememberSaveable { mutableStateOf(CategoryParser.firstChildCategory()) }
    var amount by rememberSaveable{ mutableStateOf<String?>(null) }
    val context = LocalContext.current

    Column(modifier = Modifier.padding(horizontal = 54.dp)) {
        RecordTimeItem(
            dateChange = { timeDesc = it }
        )

        RecordTypeItem(isIncome, selectChange = {
            isIncome = it
        })

        RecordCategoryItem(changed = { first, second ->
            firstCategory = first
            secondCategory = second
        })

        RecordAmountItem(amount, changed = { amount = it })

        var remark by rememberSaveable{ mutableStateOf("") }

        RecordRemarkItem(remark, changed = { remark = it })

        BottomActionView(
            leftTitle = stringResource(R.string.record_reset),
            leftAction = {
                timeDesc = DateUtils.resetTime(Date())
                isIncome = false
                firstCategory = CategoryParser.firstCategory()
                secondCategory = CategoryParser.firstChildCategory()
                amount = null
                remark = ""
            },
            rightTitle = stringResource(R.string.record_create),
            rightAction = {
                addAction(Record(
                    id = 0,
                    date = DateUtils.resetTime(timeDesc ?: Date()),
                    amount = amount?.toFloat() ?: 0f,
                    type = if (isIncome) context.getString(R.string.record_income) else context.getString(R.string.record_outcome),
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
fun RecordActionItem(title: String, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Row(
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
    ) {
        Text(
            color = ColorTitle,
            text = title,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(end = 15.dp)
        )
        content()
    }
}

@Composable
fun RecordTimeItem(startDate: Date = DateUtils.resetTime(Date()),
                   dateChange: (Date?) -> Unit
) {
    val showTimePicker = remember { mutableStateOf(false) }
    var timeDesc by rememberSaveable { mutableStateOf(startDate.dateToString()) }

    RecordActionItem(title = stringResource(R.string.time)) {
        FilterChip(
            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = ColorSubInfo) ,
            selected = true,
            onClick = { showTimePicker.value = true },
            label = {
                Text(timeDesc)
            }
        )
    }
    if (showTimePicker.value) {
        DatePickerModal(onDateSelected = {
            it?.let { date ->
                timeDesc = date.dateToString()
                dateChange(DateUtils.resetTime(date))
            }
        }, onDismiss = {
            showTimePicker.value = false
        })
    }
}

@Composable
fun RecordTypeItem(isIncome: Boolean = false,
                   selectChange: (Boolean) -> Unit
) {
    var innerIsIncome by rememberSaveable { mutableStateOf(isIncome) }
    RecordActionItem(title = stringResource(R.string.type)) {
        FilterChip(
            selected = !innerIsIncome,
            onClick = {
                innerIsIncome = false
                selectChange(false)
            },
            label = {
                Text(stringResource(R.string.record_outcome))
            },
            leadingIcon = {
                if (!innerIsIncome) {
                    Icon(
                        imageVector = Icons.Filled.Done,
                        contentDescription = "Done icon",
                        modifier = Modifier
                            .size(FilterChipDefaults.IconSize)
                    )
                }
            },
            modifier = Modifier.padding(end = 16.dp)
        )

        FilterChip(
            selected = innerIsIncome,
            onClick = {
                innerIsIncome = true
                selectChange(true)
            },
            label = {
                Text(stringResource(R.string.record_income))
            },
            leadingIcon = {
                if (innerIsIncome) {
                    Icon(
                        imageVector = Icons.Filled.Done,
                        contentDescription = "Done icon",
                        modifier = Modifier
                            .size(FilterChipDefaults.IconSize)
                    )
                }
            }
        )
    }
}

@Composable
fun RecordCategoryItem(
    firstInitCategory: String = CategoryParser.firstCategory(),
    secondInitCategory: String = CategoryParser.firstChildCategory(),
    changed:(String, String) -> Unit
) {
    var showMenu by rememberSaveable { mutableStateOf(false) }
    var showSubMenu by rememberSaveable { mutableStateOf(false) }
    var firstCategory by rememberSaveable { mutableStateOf(firstInitCategory) }
    var secondCategory by rememberSaveable { mutableStateOf(secondInitCategory) }

    RecordActionItem(title = stringResource(R.string.category)) {
        FilterChip(
            selected = true,
            onClick = { showMenu = true },
            label = {
                Text(firstCategory)
            },
            modifier = Modifier.padding(end = 16.dp)
        )
        CategorySingleSelect(
            menuList = CategoryParser.firstLevelCategories(),
            expanded = showMenu,
            onDismiss = { showMenu = false }
        ) {
            firstCategory = it
            secondCategory = CategoryParser.firstChildCategory(firstCategory)
            changed(firstCategory, secondCategory)
            showMenu = false
        }

        FilterChip(
            selected = true,
            onClick = { showSubMenu = true },
            label = {
                Text(secondCategory)
            }
        )

        CategorySingleSelect(
            menuList = CategoryParser.secondLevelCategories(firstCategory),
            expanded = showSubMenu,
            offset = DpOffset(80.dp, 0.dp),
            onDismiss = { showSubMenu = false }
        ) {
            secondCategory = it
            changed(firstCategory, secondCategory)
            showSubMenu = false
        }
    }
}

@Composable
fun RecordAmountItem(
    amount: String? = null,
    changed: (String?) -> Unit
) {
    var innerAmount by rememberSaveable{ mutableStateOf(amount) }

    RecordActionItem(title = stringResource(R.string.amount)) {
        AmountTextEdit(innerAmount = innerAmount) {
            innerAmount = it
            changed(it)
        }
    }
}

@Composable
fun AmountTextEdit(innerAmount: String?, modifier: Modifier = Modifier, changed:(String?) -> Unit) {
    val pattern = Regex("""^-?\d+(\.\d+)?$""")
    CustomTextField(
        value = (innerAmount ?: "").toString(), onValueChange = {
            if (it.isEmpty() || pattern.matches(it)) {
                changed(it)
            }
        },
        singleLine = true,
        placeholder = {
            Text(stringResource(R.string.input_amount), fontSize = 13.sp)
        },
        trailingIcon = {
            if (innerAmount != null && innerAmount.toString().isNotEmpty()) {
                Icon(
                    imageVector = Icons.Default.Clear,
                    contentDescription = null,
                    modifier = Modifier
                        .size(width = 16.dp, height = 16.dp)
                        .clickable {
                            changed(null)
                        }
                )
            }
        },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        textStyle = LocalTextStyle.current.copy(fontSize = 13.sp, lineHeight = 20.sp),
        visualTransformation = VisualTransformation.None,
        modifier = modifier
            .fillMaxWidth()
            .height(32.dp),
        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 0.dp)
    )
}

@Composable
fun RecordRemarkItem(remark: String = "", changed: (String) -> Unit) {
    var innerRemark by rememberSaveable{ mutableStateOf("") }

    RecordActionItem(title = stringResource(R.string.remark), modifier = Modifier.padding(top = 12.dp)) {
        CustomTextField(
            value = remark, onValueChange = {
                innerRemark = it
                changed(innerRemark)
            },
            singleLine = true,
            placeholder = {
                Text(stringResource(R.string.input_remark), fontSize = 13.sp)
            },
            trailingIcon = {
                if (remark.isNotEmpty()) {
                    Icon(
                        imageVector = Icons.Default.Clear,
                        contentDescription = null,
                        modifier = Modifier
                            .size(width = 16.dp, height = 16.dp)
                            .clickable {
                                innerRemark = ""
                                changed(innerRemark)
                            }
                    )
                }
            },
            textStyle = LocalTextStyle.current.copy(fontSize = 13.sp, lineHeight = 20.sp),
            visualTransformation = VisualTransformation.None,
            modifier = Modifier
                .fillMaxWidth()
                .height(32.dp),
            contentPadding = PaddingValues(horizontal = 6.dp, vertical = 0.dp)
        )
    }
}

@Composable
fun RecordTimeRangeItem(
    startDate: Date?,
    endDate: Date?,
    changed: (Pair<Date?, Date?>) -> Unit
) {
    var showTimePicker by rememberSaveable {
        mutableStateOf(false)
    }
    var timeDesc by rememberSaveable { mutableStateOf(Pair(startDate, endDate)) }
    RecordActionItem(title = stringResource(R.string.time)) {
        FilterChip(selected = true, onClick = {
            showTimePicker = true
        }, label = {
            Text("${timeDesc.first.dateToString()} - ${timeDesc.second.dateToString()}")
        })
    }

    if (showTimePicker) {
        DateRangePickerModal(onDateRangeSelected = {
            timeDesc = it.timeToDate()
            changed(it.timeToDate())
        }, onDismiss = {
            showTimePicker = false
        })
    }
}

@Composable
fun RecordFilterTypeItem(
    outcome: Boolean?,
    income: Boolean?,
    changed: (Pair<Boolean, Boolean>) -> Unit
) {
    var innerOutcome by rememberSaveable { mutableStateOf(outcome ?: false) }
    var innerIncome by rememberSaveable { mutableStateOf(income ?: false) }
    RecordActionItem(title = stringResource(R.string.type)) {
        FilterChip(
            selected = innerOutcome, onClick = {
                innerOutcome = !innerOutcome
                changed(Pair(innerOutcome, innerIncome))
            }, label = {
                Text(text = stringResource(R.string.record_outcome))
            }, leadingIcon = {
                if (innerOutcome) {
                    Icon(
                        imageVector = Icons.Filled.Done,
                        contentDescription = "Done icon",
                        modifier = Modifier
                            .size(FilterChipDefaults.IconSize)
                    )
                }
            },
            modifier = Modifier.padding(end = 16.dp)
        )

        FilterChip(
            selected = innerIncome, onClick = {
                innerIncome = !innerIncome
                changed(Pair(innerOutcome, innerIncome))
            }, label = {
                Text(text = stringResource(R.string.record_income))
            }, leadingIcon = {
                if (innerIncome) {
                    Icon(
                        imageVector = Icons.Filled.Done,
                        contentDescription = "Done icon",
                        modifier = Modifier
                            .size(FilterChipDefaults.IconSize)
                    )
                }
            },
            modifier = Modifier.padding(end = 16.dp)
        )
    }
}


@Composable
fun RecordFilterCategoryItem(
    initCheckboxes: Array<CheckboxInfo>,
    changed: (Array<CheckboxInfo>) -> Unit
) {
    var showCategoryPicker by rememberSaveable {
        mutableStateOf(false)
    }

    RecordActionItem(title = stringResource(R.string.category)) {
        FilterChip(selected = true, onClick = {
            showCategoryPicker = true
        }, label = {
            Text(stringResource(R.string.select_category))
        })
    }

    if (showCategoryPicker) {
        MultiCheckboxesModal(items = initCheckboxes, confirmAction = {
            changed(it)
        }) {
            showCategoryPicker = false
        }
    }
}

fun Pair<Long?, Long?>.timeToDate(): Pair<Date?, Date?> {
    return Pair(this.first?.let { DateUtils.resetTime(Date(it)) }, this.second?.let { DateUtils.resetTime(Date(it)) })
}

@Composable
fun BottomActionView(
    leftTitle: String,
    leftAction: () -> Unit,
    rightTitle: String,
    rightAction: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
    ) {
        Button(
            colors = ButtonDefaults.buttonColors().copy(containerColor = ColorFailed),
            shape = RoundedCornerShape(topStart = 20.dp, bottomStart = 20.dp, topEnd = 0.dp, bottomEnd = 0.dp),
            contentPadding = PaddingValues(horizontal = 35.dp, vertical = 8.dp),
            onClick = {
                leftAction()
            }
        ) {
            Text(text = leftTitle)
        }

        Button(
            colors = ButtonDefaults.buttonColors().copy(containerColor = ColorSuccess),
            shape = RoundedCornerShape(topStart = 0.dp, bottomStart = 0.dp, topEnd = 20.dp, bottomEnd = 20.dp),
            contentPadding = PaddingValues(horizontal = 35.dp, vertical = 8.dp),
            onClick = {
                rightAction()
            }
        ) {
            Text(rightTitle)
        }
    }
}


fun Date?.dateToString(): String {
    this?.let {
        val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        return formatter.format(it)
    }
    return ""
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DateRangePickerModal(
    onDateRangeSelected: (Pair<Long?, Long?>) -> Unit,
    onDismiss: () -> Unit
) {
    val dateRangePickerState = rememberDateRangePickerState()

    DatePickerDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(
                onClick = {
                    onDateRangeSelected(
                        Pair(
                            dateRangePickerState.selectedStartDateMillis,
                            dateRangePickerState.selectedEndDateMillis
                        )
                    )
                    onDismiss()
                }
            ) {
                Text(stringResource(R.string.confirm))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        }
    ) {
        DateRangePicker(
            state = dateRangePickerState,
            title = {
                Text(
                    text = stringResource(R.string.select_date_range)
                )
            },
            showModeToggle = false,
            modifier = Modifier
                .fillMaxWidth()
                .height(500.dp)
                .padding(16.dp)
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DatePickerModal(
    onDateSelected: (Date?) -> Unit,
    onDismiss: () -> Unit
) {
    val datePickerState = rememberDatePickerState()

    DatePickerDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = {
                onDateSelected(datePickerState.selectedDateMillis?.let { Date(it) })
                onDismiss()
            }) {
                Text(stringResource(R.string.confirm))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        }
    ) {
        DatePicker(state = datePickerState)
    }
}