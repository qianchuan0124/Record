package com.example.record.services

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.example.record.utils.RecordApplication

const val RECORD_NOTIFY = "com.example.RECORD_NOTIFICATION"

enum class NotifyType {
    RecordSync,
    RecordImport,
    RecordAdd,
    RecordDelete,
    RecordUpdate
}

object NotifyCenter {
    fun sendRecordNotify(type: NotifyType) {
        val intent = Intent(RECORD_NOTIFY).apply {
            putExtra("type", type.name)
        }
        RecordApplication.context.sendBroadcast(intent)
    }
}

class NotificationReceiver : BroadcastReceiver() {
    var onReceiveCallback: ((NotifyType) -> Unit)? = null

    override fun onReceive(context: Context?, intent: Intent?) {
        val type = intent?.getStringExtra("type")
        type?.let {
            val info = NotifyType.valueOf(it)
            onReceiveCallback?.invoke(info)
        }
    }
}