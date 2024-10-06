package com.example.record.services

import androidx.room.Room
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.record.model.Database
import com.example.record.utils.RecordApplication

object DatabaseService {
    fun recordDatabase(): Database {
        return Room.databaseBuilder(RecordApplication.context, Database::class.java, "record.db").addMigrations(
            MIGRATION_1_2
        ).build()
    }

    val MIGRATION_1_2: Migration = object : Migration(1, 2) {
        override fun migrate(database: SupportSQLiteDatabase) {
            // 在record表中增加syncId列，设置默认值为0
            database.execSQL("ALTER TABLE record ADD COLUMN syncId INTEGER NOT NULL DEFAULT 0")
        }
    }
}