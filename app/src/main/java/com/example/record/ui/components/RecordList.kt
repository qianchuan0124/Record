package com.example.record.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxState
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.record.R
import com.example.record.model.Record
import com.example.record.ui.theme.ColorFailed
import com.example.record.ui.theme.ColorInfo
import com.example.record.ui.theme.ColorSuccess
import com.example.record.utils.CategoryParser


@Composable
fun RecordList(records: List<Record>,
               state: LazyListState,
               highlightValue: String?,
               removeAction: (Record) -> Unit,
               editAction: (Record) -> Unit,
               modifier: Modifier = Modifier) {
    LazyColumn(
        state = state,
        modifier = modifier
            .fillMaxSize(),
        contentPadding = PaddingValues(vertical = 12.dp),
    ) {
        itemsIndexed(
            items = records,
            // Provide a unique key based on the email content
            key = { _, item -> item.hashCode() }
        ) { _, recordContent ->
            // Display each email item
            RecordItem(
                recordContent,
                highlightValue,
                onRemove = removeAction,
                onEdit = editAction
            )
        }
    }
}



@Composable
fun RecordCard(record: Record, highlightValue: String?) {
    ListItem(
        modifier = Modifier
            .clip(MaterialTheme.shapes.small),
        headlineContent = {
            HighlightText(
                value = record.subCategory,
                highlightValue = highlightValue
            )
        },
        supportingContent = {
            HighlightText(
                value = "${record.date.dateToString()} ${record.remark}",
                highlightValue = highlightValue,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 4.dp)
            )
        },
        leadingContent = {
            Image(
                painter = painterResource(id = CategoryParser.findCategoryIcon(record.category, record.subCategory)),
                contentDescription = null,
                Modifier
                    .background(
                        color = ColorInfo.copy(alpha = 0.8f),
                        shape = RoundedCornerShape(12.dp)
                    )
                    .padding(12.dp)
            )
        },
        trailingContent = {
            val isIcome = record.type == LocalContext.current.getString(R.string.record_income)
            Text(
                "${ if (isIcome) "+" else "-" } ${ record.amount }",
                color = if (isIcome) ColorSuccess else ColorFailed,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium
            )
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DismissBackground(dismissState: SwipeToDismissBoxState) {
    val color = when (dismissState.dismissDirection) {
        SwipeToDismissBoxValue.StartToEnd -> ColorFailed
        SwipeToDismissBoxValue.EndToStart -> ColorSuccess
        SwipeToDismissBoxValue.Settled -> Color.Transparent
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(color)
            .padding(12.dp, 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Icon(
            Icons.Default.Delete,
            contentDescription = "Delete"
        )
        Spacer(modifier = Modifier)
        Icon(
            // make sure add baseline_archive_24 resource to drawable folder
            Icons.Default.Edit,
            contentDescription = "Edit"
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecordItem(
    record: Record,
    highlightValue: String?,
    modifier: Modifier = Modifier,
    onRemove: (Record) -> Unit,
    onEdit: (Record) -> Unit
) {
    val currentItem by rememberUpdatedState(record)
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showEditDialog by remember { mutableStateOf(false) }
    var confirmResult by remember { mutableStateOf(false) }
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = {
            when(it) {
                SwipeToDismissBoxValue.StartToEnd -> {
                    showDeleteDialog = true
                }
                SwipeToDismissBoxValue.EndToStart -> {
                    showEditDialog = true
                }
                SwipeToDismissBoxValue.Settled -> return@rememberSwipeToDismissBoxState false
            }
            confirmResult
        },
        // positional threshold of 45%
        positionalThreshold = { it * .45f }
    )

    if (showDeleteDialog) {
        ActionDialog(
            title = stringResource(R.string.delete_record_dialog),
            content = stringResource(R.string.confirm_delete_record),
            onConfirmAction = {
                showDeleteDialog = false
                confirmResult = true
                onRemove(currentItem)
            }) {
            showDeleteDialog = false
            confirmResult = false
        }
    }

    if (showEditDialog) {
        ActionDialog(
            title = stringResource(R.string.update_record_dialog),
            content = stringResource(R.string.confirm_update_record),
            onConfirmAction = {
                showEditDialog = false
                confirmResult = true
                onEdit(currentItem)
            }) {
            showEditDialog = false
            confirmResult = false
        }
    }

    SwipeToDismissBox(
        state = dismissState,
        modifier = modifier,
        backgroundContent = { DismissBackground(dismissState)},
        content = {
            RecordCard(record, highlightValue)
        })
}

@Composable
fun ActionDialog(title: String,
                 content: String,
                 onConfirmAction: () -> Unit,
                 onDismissAction: () -> Unit) {
    AlertDialog(onDismissRequest = {
    }, title = {
        Text(text = title)
    }, text = {
        Text(text = content)
    }, confirmButton = {
        Button(onClick = {
            onConfirmAction()
        }) {
            Text(LocalContext.current.getString(R.string.confirm))
        }
    }, dismissButton = {
        Button(onClick = {
            onDismissAction()
        }) {
            Text(LocalContext.current.getString(R.string.cancel))
        }
    })
}