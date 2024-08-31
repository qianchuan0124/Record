package com.example.record.model

data class YearlyData (
    val year: Int,
    val recordMap: List<CategoryRecord>,
    val totalIncome: Float,
    val totalOutcome: Float
)

data class CategoryRecord(
    val category: String,
    val totalIncome: Float,
    val totalOutcome: Float,
    val items: List<SubCategoryRecord>
)

data class SubCategoryRecord(
    val subCategory: String,
    val totalIncome: Float,
    val totalOutcome: Float,
    val items: List<Record>
)