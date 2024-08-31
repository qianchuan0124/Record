package com.example.record.utils

import android.util.Log
import com.example.record.R
import com.example.record.model.Category
import com.example.record.model.CategoryIcon
import com.example.record.model.CategoryIconResponse
import com.example.record.model.CategoryResponse
import com.example.record.model.Filter
import com.example.record.ui.components.CheckboxInfo
import com.example.record.ui.components.SubCheckboxInfo
import com.google.gson.Gson

object CategoryParser {
    private fun getJson(): String {
        return RecordApplication.context.assets.open("Category.json").bufferedReader().use {
            it.readText()
        }
    }

    private fun getIconJson(): String {
        return RecordApplication.context.assets.open("CategoryIcon.json").bufferedReader().use {
            it.readText()
        }
    }

    fun parse(): List<Category> {
        val json = getJson()
        val gson = Gson()
        val categoryResponse = gson.fromJson(json, CategoryResponse::class.java)
        val categories = categoryResponse.default
        return categories
    }

    fun parseIcons(): List<CategoryIcon> {
        val json = getIconJson()
        val gson = Gson()
        val categoryResponse = gson.fromJson(json, CategoryIconResponse::class.java)
        val categories = categoryResponse.default
        return categories
    }

    fun allSubCategories(): List<String> {
        val categories = parse()
        return categories.flatMap { category ->
            category.children?.map { it.label } ?: emptyList()
        }
    }

    fun firstCategory(): String {
        val categories = parse()
        return categories.firstOrNull()?.label ?: ""
    }

    fun firstChildCategory(parent: String? = null): String {
        val categories = parse()
        parent?.let {
            return secondLevelCategories(parent).firstOrNull() ?: ""
        }
        return categories.firstOrNull()?.children?.firstOrNull()?.label ?: ""
    }

    fun firstLevelCategories(): List<String> {
        val categories = parse()
        return categories.map { it.label }
    }

    fun secondLevelCategories(parent: String): List<String> {
        val categories = parse()
        val category = categories.firstOrNull { it.label == parent }
        return category?.children?.map { it.label } ?: categories.firstOrNull()?.children?.map { it.label } ?: emptyList()
    }

    fun filterCheckBoxInfo(filter: Filter): Array<CheckboxInfo> {
        val categories = parse()
        return categories.map {
            CheckboxInfo(
                isChecked = false,
                title = it.label,
                subCheckBoxes = it.children?.map { child ->
                    SubCheckboxInfo(
                        isChecked = filter.subCategories.contains(child.label),
                        title = child.label
                    )
                }?.toTypedArray() ?: arrayOf()
            )
        }.toTypedArray()
    }

    fun findCategoryIcon(category: String, subCategory: String): Int {
        try {
            val context = RecordApplication.context

            val categoryIcons = parseIcons()

            val categoryIcon = categoryIcons.firstOrNull { it.value == category }

            categoryIcon?.let {
                val subCategoryIcon = it.children?.firstOrNull { sub -> sub.value == subCategory }

                subCategoryIcon?.let { item ->
                    return context.resources.getIdentifier(item.icon, "drawable", context.packageName)
                } ?: run {
                    return context.resources.getIdentifier(it.icon, "drawable", context.packageName)
                }
            } ?: run {
                return context.resources.getIdentifier("other_icon", "drawable", context.packageName)
            }
        } catch (e: Exception) {
            Log.e("Category Icon", "not found Icon, category:${category} subCategory:${subCategory}")
            return R.drawable.person_default
        }
    }

    fun findCategoryIcon(category: String): Int {
        try {
            val context = RecordApplication.context

            val categoryIcons = parseIcons()

            val categoryIcon = categoryIcons.firstOrNull { it.value == category }

            categoryIcon?.let {
                return context.resources.getIdentifier(it.icon, "drawable", context.packageName)
            } ?: run {
                return context.resources.getIdentifier("other_icon", "drawable", context.packageName)
            }
        } catch (e: Exception) {
            Log.e("Category Icon", "not found Icon, category:${category}")
            return R.drawable.person_default
        }
    }
}