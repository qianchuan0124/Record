package com.example.record.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TriStateCheckbox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.example.record.R

data class CheckboxInfo(
    val isChecked: Boolean = false,
    val title: String,
    val subCheckBoxes: Array<SubCheckboxInfo>
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as CheckboxInfo

        if (isChecked != other.isChecked) return false
        if (title != other.title) return false
        if (!subCheckBoxes.contentEquals(other.subCheckBoxes)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = isChecked.hashCode()
        result = 31 * result + title.hashCode()
        result = 31 * result + subCheckBoxes.contentHashCode()
        return result
    }
}

data class SubCheckboxInfo(
    val isChecked: Boolean,
    val title: String
)

@Composable
fun MultiCheckboxesModal(
    items: Array<CheckboxInfo>,
    confirmAction: (Array<CheckboxInfo>) -> Unit,
    onDismiss: () -> Unit
) {
    var currentInfos by remember { mutableStateOf(items) }

    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .background(
                    color = Color.White,
                    shape = RoundedCornerShape(16.dp)
                )
                .padding(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .height(320.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                MultiCheckboxes(
                    items = items,
                    changed = {
                        currentInfos = it
                    }
                )
            }

            Row(modifier = Modifier.align(Alignment.End)) {
                TextButton(onClick = {
                    confirmAction(currentInfos)
                    onDismiss()
                }) {
                    Text(stringResource(R.string.confirm))
                }

                TextButton(onClick = {
                    onDismiss()
                }) {
                    Text(stringResource(R.string.cancel))
                }
            }
        }
    }
}

@Composable
fun MultiCheckboxes(
    items: Array<CheckboxInfo>,
    changed: (Array<CheckboxInfo>) -> Unit
) {
    Column {
        items.forEachIndexed { index, item ->
            Checkboxes(
                info = item,
                changed = {
                    val temp = it.copy(isChecked = !it.isChecked)
                    items[index] = temp
                    changed(items)
                }
            )
        }
    }
}

@Composable
fun Checkboxes(
    info: CheckboxInfo,
    changed: (CheckboxInfo) -> Unit
) {

    val checkboxes = remember {
        mutableStateListOf(*info.subCheckBoxes)
    }

    var isExpand by rememberSaveable { mutableStateOf(false) }

    var triState by remember {
        mutableStateOf(
            if (checkboxes.all { it.isChecked }) {
                ToggleableState.On
            } else if (checkboxes.any { it.isChecked }) {
                ToggleableState.Indeterminate
            } else {
                ToggleableState.Off
            }
        )
    }

    val toggleTriState = {
        triState = when (triState) {
            ToggleableState.Indeterminate -> ToggleableState.On
            ToggleableState.On -> ToggleableState.Off
            ToggleableState.Off -> ToggleableState.On
        }

        checkboxes.indices.forEach { index ->
            checkboxes[index] = checkboxes[index].copy(
                isChecked = triState == ToggleableState.On
            )
        }
        changed(info.copy(subCheckBoxes = checkboxes.toTypedArray()))
    }

    val parentCheckboxInteractionSource = remember {
        MutableInteractionSource()
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clickable(
                indication = null,
                onClick = toggleTriState,
                interactionSource = parentCheckboxInteractionSource
            )
    ) {
        TriStateCheckbox(
            state = triState,
            onClick = toggleTriState,
            interactionSource = parentCheckboxInteractionSource
        )

        Text(text = info.title, modifier = Modifier.weight(1f))

        Icon(imageVector = if (isExpand) Icons.Filled.KeyboardArrowDown else Icons.Filled.KeyboardArrowRight,
            contentDescription = null,
            modifier = Modifier.clickable { isExpand = !isExpand })
    }

    if (isExpand) {
        checkboxes.forEachIndexed { index, checkbox ->

            val onCheckChangeFun = {
                checkboxes[index] = checkbox.copy(
                    isChecked = !checkbox.isChecked
                )
                changed(info.copy(subCheckBoxes = checkboxes.toTypedArray()))
            }

            val childCheckboxInteractionSource = remember {
                MutableInteractionSource()
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .padding(start = 32.dp)
                    .clickable(
                        indication = null,
                        onClick = onCheckChangeFun,
                        interactionSource = childCheckboxInteractionSource
                    )
            ) {
                Checkbox(
                    checked = checkbox.isChecked,
                    onCheckedChange = { _ ->
                        onCheckChangeFun()
                    },
                    interactionSource = childCheckboxInteractionSource
                )
                Text(text = checkbox.title)

            }
        }

        if (checkboxes.all { it.isChecked }) {
            triState = ToggleableState.On
        } else if (checkboxes.all { !it.isChecked }) {
            triState = ToggleableState.Off
        } else if (checkboxes.any { it.isChecked }) {
            triState = ToggleableState.Indeterminate
        }
    }
}