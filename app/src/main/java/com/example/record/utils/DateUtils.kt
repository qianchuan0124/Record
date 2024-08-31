package com.example.record.utils

import java.text.SimpleDateFormat
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Calendar
import java.util.Date
import java.util.Locale

object DateUtils {
    fun currentMonthDateRange(): Pair<Date, Date> {
        return monthDateRange(Date())
    }

    fun formatDate(date: Date?): String {
        date?.let {
            val formatter = SimpleDateFormat("yyyy.MM.dd", Locale.getDefault())
            return formatter.format(it)
        } ?: run {
            return ""
        }
    }

    fun exportFormatDate(): String {
        val date = Date()
        val formatter = SimpleDateFormat("YYYY-MM-DD HH:mm:ss", Locale.getDefault())
        return formatter.format(date)
    }

    fun parseDate(content: String): Date {
        val formatter = DateTimeFormatter.ofPattern("yyyy.MM.dd")
        val localDate = LocalDate.parse(content, formatter)
        val date = Date.from(localDate.atStartOfDay().toInstant(ZoneOffset.UTC))
        return date
    }

    fun currentYear(): Int {
        return Calendar.getInstance().get(Calendar.YEAR)
    }

    fun yearlyFormatYear(year: Int): String {
        val (startDate, endDate) = yearDateRange(year)
        return formatDateRange(startDate, endDate)
    }

    fun formatDateRange(start: Date, end: Date): String {
        return "${formatDate(start)} ~ ${formatDate(end)}"
    }

    fun monthDateRange(date: Date): Pair<Date, Date> {
        val calendar = Calendar.getInstance()
        calendar.time = date

        // 获取第一天
        calendar.set(Calendar.DAY_OF_MONTH, 1)
        val firstDay = calendar.time

        // 获取最后一天
        calendar.add(Calendar.MONTH, 1)
        calendar.set(Calendar.DAY_OF_MONTH, 1)
        calendar.add(Calendar.DAY_OF_MONTH, -1)
        val lastDay = calendar.time

        return Pair(firstDay, lastDay)
    }

    fun yearDateRange(year: Int): Pair<Date, Date> {
        val calendar = Calendar.getInstance()
        calendar.set(year, 0, 1, 0, 0, 0) // 设置为该年的 1 月 1 日 0 时 0 分 0 秒
        val earliestTimestamp = calendar.timeInMillis

        calendar.set(year, 11, 31, 23, 59, 59) // 设置为该年的 12 月 31 日 23 时 59 分 59 秒
        val latestTimestamp = calendar.timeInMillis

        return Pair(Date(earliestTimestamp), Date(latestTimestamp))
    }

    fun debugDateRange(): Pair<Date, Date> {
        val calendar = Calendar.getInstance()
        calendar.set(Calendar.YEAR, calendar.get(Calendar.YEAR))
        calendar.set(Calendar.MONTH, Calendar.MAY)
        calendar.set(Calendar.DAY_OF_MONTH, 1)
        val mayThisYear = calendar.time
        return monthDateRange(mayThisYear)
    }
}