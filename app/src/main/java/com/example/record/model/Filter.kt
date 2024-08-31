package com.example.record.model

import java.util.Date

data class Filter (
    val startDate: Date,
    val endDate: Date,
    val types: List<String>,
    val subCategories: List<String>
)