package com.example.record.model

data class Category (
    val label: String,
    val value: String,
    val children: List<Category>?
)

data class CategoryResponse(
    val default: List<Category>
)

data class CategoryIcon (
    val value: String,
    val icon: String,
    val children: List<CategoryIcon>?
)

data class CategoryIconResponse (
    val default: List<CategoryIcon>
)