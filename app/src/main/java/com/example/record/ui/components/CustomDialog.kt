package com.example.record.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredHeightIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.example.record.R
import com.example.record.model.Budget
import com.example.record.utils.CategoryParser

@Composable
fun BudgetDialog(
    budget: Budget? = null,
    disabledCategory: List<String> = listOf(),
    onDismiss: () -> Unit,
    onConfirm: (String, String?) -> Unit
) {
    var amount by rememberSaveable {
        mutableStateOf(budget?.all?.toString())
    }

    var showMenu by rememberSaveable {
        mutableStateOf(false)
    }

    var selectedCategory by rememberSaveable {
        mutableStateOf(budget?.category ?: CategoryParser.firstLevelCategories().first { !disabledCategory.contains(it) })
    }

    val focusRequester = remember { FocusRequester() }

    CustomDialog(
        content = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = stringResource(R.string.budget_category_title))
                Box {
                    FilterChip(
                        selected = true,
                        onClick = {
                            if (budget == null) {
                                showMenu = true
                            }
                        },
                        label = {
                            Text(selectedCategory)
                        },
                        modifier = Modifier.padding(end = 16.dp)
                    )
                    CategorySingleSelect(
                        menuList = removeElements(CategoryParser.firstLevelCategories(), disabledCategory),
                        expanded = showMenu,
                        onDismiss = { showMenu = false }
                    ) {
                        selectedCategory = it
                        showMenu = false
                    }
                }
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(top = 16.dp)
            ) {
                Text(text = stringResource(R.string.budget_sumary_title))
                AmountTextEdit(
                    innerAmount = amount,
                    modifier = Modifier.focusRequester(focusRequester)
                ) {
                    amount = it
                }
            }
        },
        onDismiss = onDismiss,
        onConfirm = {
            onConfirm(selectedCategory, amount)
        }
    )

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }
}

fun removeElements(firstList: List<String>, secondList: List<String>): List<String> {
    return firstList.filterNot { element ->
        secondList.any { it == element }}
}

@Composable
fun CustomDialog(
    modifier: Modifier = Modifier,
    content: @Composable (() -> Unit)? = null,
    onDismiss: () -> Unit,
    onConfirm: (() -> Unit)? = null
) {
    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = modifier
                .fillMaxWidth()
                .requiredHeightIn(max = 300.dp)
                .background(
                    color = Color.White,
                    shape = RoundedCornerShape(20.dp)
                )
                .padding(24.dp)
        ) {
            content?.let { it() }
            Spacer(modifier = modifier.weight(1f))
            Row(
                modifier = modifier
                    .fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
            ) {
                TextButton(
                    onClick = { onDismiss() },
                    modifier = Modifier.padding(8.dp),
                ) {
                    Text(stringResource(R.string.cancel))
                }
                onConfirm?.let {
                    TextButton(
                        onClick = { onConfirm() },
                        modifier = Modifier.padding(8.dp),
                    ) {
                        Text(stringResource(R.string.confirm))
                    }
                }
            }
        }
    }
}