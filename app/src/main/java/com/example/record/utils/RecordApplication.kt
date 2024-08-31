package com.example.record.utils

import android.annotation.SuppressLint
import android.app.Application
import android.content.Context

class RecordApplication: Application() {
    companion object {
        @SuppressLint("StaticFieldLeak")
        lateinit var context: Context
    }

    override fun onCreate() {
        super.onCreate()
        context = applicationContext
    }
}