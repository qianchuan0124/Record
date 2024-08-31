package com.example.record.model

import java.util.Date

data class Budget(
    val time: Date,
    val all: Float,
    val current: Float,
    val category: String
)

data class BudgetInfo(
    val all: Float,
    val category: String
)