package com.example.record.ui.components

import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.example.record.ui.theme.ColorFailed
import com.example.record.ui.theme.ColorSubInfo
import com.example.record.ui.theme.ColorSuccess
import com.example.record.ui.theme.ColorTitle

@Composable
fun DetailBar(timeInfo: String, income: Float, outcome: Float, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
    ) {
        Text(
            text = timeInfo,
            color = ColorTitle,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = "+$income",
            color = ColorSuccess,
            fontWeight = FontWeight.Medium,
            fontSize = 16.sp
        )

        Text(
            text = "  /  ",
            color = ColorSubInfo,
            fontSize = 16.sp
        )

        Text(
            text = "-$outcome",
            color = ColorFailed,
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium
        )
    }
}