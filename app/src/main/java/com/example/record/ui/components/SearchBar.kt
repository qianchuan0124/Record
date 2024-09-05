package com.example.record.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.record.R
import com.example.record.ui.theme.ColorInfo

@Composable
fun SearchBar(
    searchKey: String,
    searchAction: (String) -> Unit,
    filterAction: () -> Unit,
    modifier: Modifier
) {
    Box(
        modifier = modifier
            .padding(horizontal = 24.dp)
            .background(
                ColorInfo,
                shape = RoundedCornerShape(20.dp)
            )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                Modifier
                    .weight(1f)
                    .padding(horizontal = 20.dp, vertical = 6.dp)
                    .background(
                        color = Color.White,
                        shape = RoundedCornerShape(8.dp)
                    )
                    .height(40.dp)
                    .padding(start = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(imageVector = Icons.Default.Search, contentDescription = null)
                BasicTextField(
                    value = searchKey,
                    onValueChange = {
                        searchAction(it)
                    },
                    singleLine = true,
                    modifier = Modifier
                        .weight(1f)
                        .padding(start = 10.dp),
                    textStyle = TextStyle(
                        color = Color.Black,
                        fontSize = 16.sp,
                    )
                )
                if (searchKey.isNotEmpty()) {
                    Icon(
                        imageVector = Icons.Default.Clear,
                        contentDescription = null,
                        modifier = Modifier
                            .padding(end = 12.dp)
                            .clickable { searchAction("") }
                    )
                }
            }

            Icon(
                painter = painterResource(id = R.drawable.record_more_icon),
                contentDescription = null,
                modifier = Modifier
                    .width(36.dp)
                    .padding(end = 6.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { filterAction() }
            )
        }
    }
}