package com.example.record.services

import android.util.Log
import com.example.record.model.Record
import com.example.record.model.SyncError
import com.example.record.utils.LogTag
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Headers
import retrofit2.http.POST
import retrofit2.http.Query
import java.lang.reflect.Type
import java.util.Date


object RecordService {
    private var service: SyncService? = null

    fun setupBaseUrl(url: String) {
        Log.d(LogTag.SyncRecord, "set up base url:$url")
        val retrofit = Retrofit.Builder()
            .baseUrl(url)
            .addConverterFactory(GsonConverterFactory.create(gsonInfo()))
            .build()
        service = retrofit.create(SyncService::class.java)
    }

    suspend fun syncRecordsFromPC(page: Int, limit: Int): SyncInfo {
        service?.let {
            val info = it.getRecords(page, limit)
            Log.d(LogTag.SyncRecord, info.toString())
            return info
        } ?: run {
            throw SyncError("service is nil")
        }
    }

    suspend fun syncRecordsToPC(records: List<Record>, currentCount: Int, allCount: Int): Boolean {
        service?.let {
            val info = SyncInfo(records, currentCount, allCount)
            try {
                val res = it.postRecords(info)
                return res.result == "true"
            } catch (e: Exception) {
                Log.e(LogTag.SyncRecord, "${ e.message }")
                return false
            }
        } ?: run {
            Log.e(LogTag.SyncRecord, "service is nil")
            return false
        }
    }

    suspend fun syncNotifyStart() {
        service?.notifySyncStart() ?: run {
            throw SyncError("service is nil")
        }
    }

    suspend fun syncNotifySuccess() {
        service?.notifySyncSuccess() ?: run {
            throw SyncError("service is nil")
        }
    }

    suspend fun syncNotifyFailed() {
        try {
            service?.notifySyncFailed() ?: run {
                throw SyncError("service is nil")
            }
        } catch (e: Exception) {
            Log.e(LogTag.SyncRecord, "notify pc failed, error:${e.message}")
        }
    }

    private fun gsonInfo() : Gson {
        val builder = GsonBuilder()
        // 注册 Date 类型的适配器
        builder.registerTypeAdapter(Date::class.java, DateDeserializer())
        // 注册 Boolean 类型的适配器
        builder.registerTypeAdapter(Boolean::class.java, BooleanDeserializer())
        val gson = builder.create()
        return gson
    }
}

class DateDeserializer : JsonDeserializer<Date> {
    override fun deserialize(
        json: JsonElement,
        typeOfT: Type,
        context: JsonDeserializationContext
    ): Date {
        return Date(json.asJsonPrimitive.asLong)
    }
}

class BooleanDeserializer : JsonDeserializer<Boolean> {
    override fun deserialize(
        json: JsonElement,
        typeOfT: Type,
        context: JsonDeserializationContext
    ): Boolean {
        return json.asInt != 0
    }
}

interface SyncService {
    @Headers("Accept-Encoding: identity")
    @GET("/sync/records/result")
    suspend fun getRecords(@Query("page") page:Int, @Query("limit") limit: Int): SyncInfo

    @POST("/sync/records/result")
    suspend fun postRecords(@Body info: SyncInfo): Response

    @GET("/sync/records/start")
    suspend fun notifySyncStart()

    @GET("/sync/records/success")
    suspend fun notifySyncSuccess()

    @GET("/sync/records/failed")
    suspend fun notifySyncFailed()
}

data class SyncInfo(
    val records: List<Record>,
    val currentCount: Int,
    val totalRecords: Int
)

data class Response(
    val result: String,
    val info: String?,
    val err: String?
)