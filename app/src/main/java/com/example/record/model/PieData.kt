package com.example.record.model

import androidx.compose.ui.graphics.Color


data class PieData(
    val name:String,
    val amount:Float,
    val color:Color = Color(0xFF000000),
    val lineColor:String = "ff000000",
    val groupName:String = ""
)

val PieColors = listOf(
    Color(0xFF5470c6),
    Color(0xFF91cc75),
    Color(0xFFfac858),
    Color(0xFFee6666),
    Color(0xFF73c0de),
    Color(0xFF3ba272),
    Color(0xFFfc8452),
    Color(0xFF9a60b4),
    Color(0xFFea7ccc),
    Color(0xFFe7bcf3),
    Color(0xFF9d96f5),
    Color(0xFF8378EA),
    Color(0xFF96BFFF),
)