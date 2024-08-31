package com.example.record.ui.pages

import android.widget.Toast
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ListItem
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.record.R
import com.example.record.model.Budget
import com.example.record.ui.components.BudgetDialog
import com.example.record.ui.theme.ColorAgree
import com.example.record.ui.theme.ColorFailed
import com.example.record.ui.theme.ColorSubInfo
import com.example.record.ui.theme.ColorSuccess
import com.example.record.ui.theme.ColorText
import com.example.record.ui.theme.ColorTitle
import com.example.record.utils.CategoryParser
import com.example.record.vm.BudgetViewModel

@Composable
fun Budget(viewModel: BudgetViewModel) {
    val budgets by viewModel.budgetState.collectAsStateWithLifecycle()
    val totalOutcome by viewModel.totalOutcomeState.collectAsStateWithLifecycle()
    val errorInfo by viewModel.errorState.collectAsStateWithLifecycle()

    var showCreateDialog by rememberSaveable {
        mutableStateOf(false)
    }

    var selectedBudget by rememberSaveable {
        mutableStateOf<Budget?>(null)
    }

    var showDeleteDialog by rememberSaveable {
        mutableStateOf(false)
    }

    val context = LocalContext.current

    Box(modifier = Modifier.fillMaxSize()) {
        Image(
            painter = painterResource(id = R.drawable.info_background),
            contentDescription = null,
            modifier = Modifier.fillMaxWidth()
        )

        Column(modifier = Modifier.fillMaxSize()) {
            TopTitleView(
                totalOutcome = totalOutcome,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(0.3f)
            )

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
                CreateBudgetView(createAction = { showCreateDialog = true })

                BudgetListView(budgets = budgets, updateAction = {
                    selectedBudget = it
                    showCreateDialog = true
                }, deleteAction = {
                    selectedBudget = it
                    showDeleteDialog = true
                })
            }

            if (showCreateDialog) {
                BudgetDialog(
                    budget = selectedBudget,
                    disabledCategory = budgets.map { it.category },
                    onDismiss = {
                        showCreateDialog = false
                        selectedBudget = null
                    },
                    onConfirm = { category, amount ->
                        amount?.let {
                            viewModel.insertOrUpdateBudgetInfo(category, it.toFloat())
                            showCreateDialog = false
                            selectedBudget = null
                            Toast.makeText(
                                context,
                                context.getString(R.string.create_success),
                                Toast.LENGTH_SHORT
                            ).show()
                        } ?: run {
                            Toast.makeText(
                                context,
                                context.getString(R.string.amount_is_not_empty),
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    }
                )
            }

            if (showDeleteDialog) {
                DeleteBudgetDialog(dismiss = {
                    showDeleteDialog = false
                    selectedBudget = null
                }) {
                    showDeleteDialog = false
                    selectedBudget?.let {
                        viewModel.deleteBudgetInfo(it)
                        Toast.makeText(
                            context,
                            context.getString(R.string.delete_success),
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                    selectedBudget = null
                }
            }

            errorInfo?.let {
                Toast.makeText(context, "${it.message}", Toast.LENGTH_SHORT).show()
                viewModel.clearError()
            }
        }
    }
}

@Composable
fun TopTitleView(totalOutcome: Float, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            color = ColorSubInfo,
            text = stringResource(R.string.current_month_amount),
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium
        )

        Text(
            color = Color.White,
            text = "￥${totalOutcome}",
            fontSize = 36.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun CreateBudgetView(createAction: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .padding(top = 30.dp)
            .height(38.dp)
            .background(
                ColorTitle,
                shape = RoundedCornerShape(12.dp)
            )
            .clickable { createAction() }
    ) {
        Image(
            painter = painterResource(id = R.drawable.budget_add),
            colorFilter = ColorFilter.tint(Color.White),
            contentDescription = null,
            modifier = Modifier
                .padding(horizontal = 38.dp, vertical = 7.dp)
                .size(width = 24.dp, height = 24.dp)
        )

        Text(
            color = Color.White,
            text = stringResource(R.string.create_new_budget),
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .padding(top = 6.dp)
        )
    }
}

@Composable
fun BudgetListView(
    budgets: List<Budget>,
    updateAction: (Budget) -> Unit,
    deleteAction: (Budget) -> Unit
) {
    LazyColumn(modifier = Modifier.padding(top = 10.dp)) {
        itemsIndexed(
            items = budgets,
            key = { _, item -> item.hashCode() }
        ) {
                _, budget ->
            BudgetCard(
                budget = budget,
                updateAction = {
                    updateAction(budget)
                },
                deleteAction = {
                    deleteAction(budget)
                }
            )
        }
    }
}

@Composable
fun DeleteBudgetDialog(dismiss: () -> Unit, confirm: () -> Unit) {
    AlertDialog(
        title = {
            Text(text = stringResource(R.string.delete_budget))
        },
        text = {
            Text(text = stringResource(R.string.confirm_delete_budget))
        },
        onDismissRequest = dismiss,
        confirmButton = {
            TextButton(
                onClick = confirm
            ) {
                Text(stringResource(R.string.confirm))
            }
        },
        dismissButton = {
            TextButton(
                onClick = dismiss
            ) {
                Text(stringResource(R.string.cancel))
            }
        }
    )
}

fun Modifier.longClick(onLongClick: (Offset) -> Unit): Modifier =
    pointerInput(this) {
        detectTapGestures(
            onLongPress = onLongClick
        )
    }

@Composable
fun BudgetCard(
    budget: Budget,
    updateAction: () -> Unit,
    deleteAction: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showMenu by rememberSaveable {
        mutableStateOf(false)
    }
    var menuOffset by remember { mutableStateOf(DpOffset.Zero) }

    val localDensity = LocalDensity.current
    Box {
        ListItem(
            headlineContent = {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp)
                ) {
                    Text(
                        color = ColorTitle,
                        text = budget.category,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Row {
                        Text(
                            color = if (budget.current <= budget.all) {
                                ColorText
                            } else {
                                ColorFailed
                            },
                            text = "${budget.current}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            color = ColorText,
                            text = "/",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            color = ColorAgree,
                            text = "${budget.all}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            },
            supportingContent = {
                GradientProgressBar(
                    progress = (budget.current / budget.all),
                    gradientColors = listOf(ColorSuccess, ColorFailed),
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                )
            },
            leadingContent = {
                Image(
                    painter = painterResource(id = CategoryParser.findCategoryIcon(budget.category)),
                    contentDescription = null,
                    Modifier
                        .padding(16.dp)
                )
            },
            modifier = modifier
                .padding(horizontal = 24.dp, vertical = 10.dp)
                .background(
                    color = Color.Transparent
                )
                .clip(RoundedCornerShape(20.dp))
                .longClick {
                    showMenu = true
                    menuOffset = with(localDensity) {
                        DpOffset(it.x.toDp(), it.y.toDp())
                    }
                }
        )
        DropdownMenu(
            expanded = showMenu,
            onDismissRequest = { showMenu = false },
            offset = DpOffset(menuOffset.x, 0.dp)
        ) {
            DropdownMenuItem(text = { Text(stringResource(R.string.edit)) }, onClick = {
                showMenu = false
                updateAction()
            })
            if (budget.category != stringResource(R.string.total_budget)) {
                DropdownMenuItem(text = { Text(stringResource(R.string.delete)) }, onClick = {
                    showMenu = false
                    deleteAction()
                })
            }
        }
    }
}

@Composable
fun GradientProgressBar(
    progress: Float,
    gradientColors: List<Color>,
    modifier: Modifier = Modifier
) {
    val strokeWidth = 10.dp
    Canvas(modifier = modifier
        .fillMaxWidth()
        .height(strokeWidth)) {
        val width = size.width
        val height = size.height

        // 绘制灰色背景
        drawLine(
            color = Color.LightGray,
            start = Offset(0f, height / 2),
            end = Offset(width, height / 2),
            strokeWidth = strokeWidth.toPx()
        )

        // 绘制渐变色进度
        if (progress > 0) {
            val progressWidth = width * progress
            val brush = Brush.horizontalGradient(gradientColors)
            drawRect(
                brush = brush,
                topLeft = Offset(0f, 0f),
                size = Size(progressWidth, height)
            )
        }
    }
}