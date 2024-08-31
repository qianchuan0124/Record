package com.example.record.ui.components

import androidx.compose.foundation.layout.requiredHeightIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp

@Composable
fun CategorySingleSelect(
    menuList: List<String>,
    expanded: Boolean,
    offset: DpOffset = DpOffset.Zero,
    onDismiss: () -> Unit,
    onSelected: (String) -> Unit
) {
    DropdownMenu(
        expanded = expanded,
        onDismissRequest = onDismiss,
        offset = offset,
        scrollState = rememberScrollState(),
        modifier = Modifier.requiredHeightIn(max = 200.dp)
    ) {
        for (item in menuList) {
            DropdownMenuItem(text = { Text(item) }, onClick = { onSelected(item) })
        }
    }
}