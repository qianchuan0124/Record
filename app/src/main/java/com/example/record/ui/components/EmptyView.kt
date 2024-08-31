package com.example.record.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.sp
import com.example.record.R
import com.example.record.ui.theme.ColorSubInfo

@Composable
fun RecordEmptyView(modifier: Modifier = Modifier) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier.fillMaxSize()
    ) {
        Image(
            painter = painterResource(id = R.drawable.record_empty),
            contentDescription = null,
            modifier = Modifier.background(Color.Transparent)
        )

        Text(text = stringResource(R.string.empty_data), color = ColorSubInfo, fontSize = 24.sp)
    }
}