package com.example.record.model

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Delete
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.TypeConverter
import androidx.room.TypeConverters
import androidx.room.Update
import java.util.Date

@Database(entities = [Record::class], version = 2)
@TypeConverters(DateConverter::class)
abstract class Database: RoomDatabase() {
    abstract fun record(): RecordDao
}

@Dao
interface RecordDao {
    @Query("select * from Record")
    fun queryAll(): List<Record>

    @Query("select * from Record where date >= :startTime and date <= :endTime and isDeleted == 0 ORDER BY date DESC")
    fun recordsByTime(startTime: Date, endTime: Date): List<Record>

    @Query("SELECT * FROM Record WHERE date >= :startTime AND date <= :endTime AND ((type IN (:types))) AND ((subCategory IN (:subCategories))) and isDeleted == 0 ORDER BY date DESC")
    fun recordsByFilter(startTime: Date, endTime: Date, types: List<String>, subCategories: List<String>): List<Record>

    @Query("select sum(amount) from Record where type = '收入' and isDeleted == 0")
    fun totalIncome(): Float

    @Query("select sum(amount) from Record where type = '支出' and isDeleted == 0")
    fun totalOutcome(): Float

    @Query("select sum(amount) from Record where type = '收入' and date >= :startTime AND date <= :endTime AND ((subCategory IN (:subCategories))) and isDeleted == 0")
    fun totalIncomeByFilter(startTime: Date, endTime: Date, subCategories: List<String>): Float

    @Query("select sum(amount) from Record where type = '支出' and date >= :startTime AND date <= :endTime AND ((subCategory IN (:subCategories))) and isDeleted == 0")
    fun totalOutcomeByFilter(startTime: Date, endTime: Date, subCategories: List<String>): Float

    @Query("select sum(amount) from Record where type = '支出' and date >= :startTime and date <= :endTime and category = :category and isDeleted == 0")
    fun outcomeByCategory(startTime: Date, endTime: Date, category: String): Float

    @Query("SELECT * FROM Record WHERE type = '支出' AND date >= :startTime AND date <=:endTime and isDeleted == 0")
    fun recordsWithOutcomeByTime(startTime: Date, endTime: Date): List<Record>

    @Insert
    fun insert(vararg record: Record)

    @Update
    fun update(record: Record)

    @Delete
    fun delete(record: Record)

    @Query("Delete From Record")
    fun clearRecords()

    @Insert
    suspend fun insertRecords(records: List<Record>)

    @Query("SELECT * FROM Record WHERE date = :date AND amount = :amount AND type = :type AND category = :category AND subCategory = :subCategory AND remark = :remark")
    suspend fun findDuplicateRecord(date: Date, amount: Float, type: String, category: String, subCategory: String, remark: String): Record?

    @Query("SELECT * FROM record ORDER BY date ASC LIMIT :limit OFFSET :offset")
    suspend fun recordsByLimit(limit: Int, offset: Int): List<Record>

    @Query("SELECT COUNT(*) AS count FROM record")
    suspend fun recordsCount(): Int
}


@Entity
data class Record(
    @PrimaryKey(autoGenerate = true)
    var id: Int = 0,
    val date: Date? = null,
    val amount: Float,
    val type: String,
    val category: String,
    val subCategory: String,
    val remark: String = "",
    var isDeleted: Boolean = false,
    var syncId: Int = 0
)

class DateConverter {
    @TypeConverter
    fun fromTimestamp(value: Long?): Date? {
        return value?.let { Date(it)}
    }

    @TypeConverter
    fun dateToTimestamp(date: Date?): Long? {
        return date?.time
    }
}
