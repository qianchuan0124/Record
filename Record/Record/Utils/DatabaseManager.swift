//
//  Database.swift
//  Record
//
//  Created by xiachuan on 2024/9/3.
//

import Foundation
import WCDBSwift

let RECORD_TABLE = "records"

class DatabaseManager {
    
    static let shared = DatabaseManager()
    
    var database: Database?
    
    var table: Table<Record>?
    
    private init() {
        guard var documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
            return
        }
        
        documentsDirectory.append(path: "record.db")
        
        do {
            let database = Database(at: documentsDirectory)
            logInfo("database create success, path:\(documentsDirectory)")
            try database.create(table: RECORD_TABLE, of: Record.self)
            logInfo("table create success, path:\(documentsDirectory)")
            self.database = database
            self.table = database.getTable(named: RECORD_TABLE)
        } catch {
            logInfo("database create error, failed:\(error)")
        }
    }
    
    func queryAll() throws -> [Record] {
        guard let table else {
            throw RecordError.message("not found table")
        }
        return try table.getObjects(on: Record.Properties.all, 
                                    where: Record.Properties.isDeleted == 0,
                                    orderBy: [Record.Properties.date.order(.descending)])
    }
    
    func insertRecord(_ record: Record) throws {
        guard let table else {
            throw RecordError.message("not found table")
        }
        logInfo("will insert record:\(record)")
        try table.insert([record])
        logInfo("insert record success")
    }
    
    func updateRecord(_ record: Record) throws {
        guard let table, let id = record.id else {
            throw RecordError.message("not found table")
        }
        
        try table.update(on: Record.Properties.all, with: record, where: Record.Properties.id == id)
    }
    
    func deleteRecord(_ record: Record) throws {
        guard let table else {
            throw RecordError.message("not found table")
        }
        
        try table.delete(where: Record.Properties.id == record.id ?? 0)
    }
    
    func clearRecords() throws {
        guard let table else {
            throw RecordError.message("not found table")
        }
        try table.delete()
    }
    
    func recordsWithTime(startDate: Date, endDate: Date, types: [String]) throws -> [Record] {
        guard let table else {
            throw RecordError.message("not found table")
        }
        
        let condition = combineCondition(startDate: startDate, endDate: endDate, types: types)
        
        return try table.getObjects(on: Record.Properties.all, where: condition)
    }
    
    func totalIncome() throws -> Float {
        guard let table else {
            throw RecordError.message("not found table")
        }
        
        let condition = combineCondition(types: [RecordType.income.description])
        
        return Float(try table.getValue(on: Record.Properties.amount.sum(), where: condition).doubleValue)
    }
    
    func totalOutcome() throws -> Float {
        guard let table else {
            throw RecordError.message("not found table")
        }
        
        let condition = combineCondition(types: [RecordType.outcome.description])
        
        return Float(try table.getValue(on: Record.Properties.amount.sum(), where: condition).doubleValue)
    }
    
    func rangeIncome(startDate: Date, endDate: Date) throws -> Float {
        guard let table else {
            throw RecordError.message("not found table")
        }
        
        let condition = combineCondition(
            startDate: startDate,
            endDate: endDate,
            types: [RecordType.income.description]
        )
        
        return Float(try table.getValue(on: Record.Properties.amount.sum(), where: condition).doubleValue)
    }
    
    func rangeOutcome(startDate: Date, endDate: Date) throws -> Float {
        guard let table else {
            throw RecordError.message("not found table")
        }
        
        let condition = combineCondition(
            startDate: startDate,
            endDate: endDate,
            types: [RecordType.outcome.description]
        )
        
        return Float(try table.getValue(on: Record.Properties.amount.sum(), where: condition).doubleValue)
    }
    
    func rangeOutcome(startDate: Date, endDate: Date, category: [String]) throws -> Float {
        guard let table else {
            throw RecordError.message("not found table")
        }
        
        let condition = combineCondition(
            startDate: startDate,
            endDate: endDate,
            types: [RecordType.outcome.description],
            categories: category
        )
        
        return Float(try table.getValue(on: Record.Properties.amount.sum(), where: condition).doubleValue)
    }
    
    func recordsWithFilter(_ filter: Filter) throws -> [Record] {
        guard let table else {
            throw RecordError.message("not found table")
        }
        
        let condition = combineCondition(
            startDate: filter.startDate,
            endDate: filter.endDate,
            types: filter.types,
            subCategories: filter.subCategories
        )
        
        return try table.getObjects(on: Record.Properties.all, where: condition)
    }
    
    func fetchRecords(page: Int, pageSize: Int) throws -> [Record] {
        guard let table else {
            throw RecordError.message("not found table")
        }
        
        let offset = (page - 1) * pageSize
        
        return try table.getObjects(on: Record.Properties.all, limit: pageSize, offset: offset)
    }
    
    func recordCounts() throws -> Int {
        guard let table else {
            throw RecordError.message("not found table")
        }
        
        return try table.getValue(on: Column.all().count()).intValue
    }
    
    func insertLargeRecordArray(_ records: [Record], needReset: Bool = false) async throws {
        guard let table, let database else {
            throw RecordError.message("not found table")
        }
        
        try database.run(transaction: { [weak self] _ in
            var skip = 0
            for var record in records {
                guard let self else {
                    skip += 1
                    continue
                }
                let condition = self.combineCondition(
                    targetDate: record.date.resetTime(),
                    types: [record.type],
                    categories: [record.category],
                    subCategories: [record.subCategory],
                    amount: record.amount,
                    remark: record.remark
                )
                
                let current = try table.getObject(on: Record.Properties.all, where: condition)
                
                if current == nil {
                    if needReset {
                        record = record.handleSyncData()
                    }
                    record = record.resetDate()
                    logInfo("插入 record:\(record)")
                    try table.insert([record])
                } else {
                    logInfo("record:\(record) 已存在")
                    skip += 1
                }
            }
            
            logInfo("同步完成, skip: \(skip) - total: \(records.count)")
        })
    }
    
    func combineCondition(
        startDate: Date? = nil,
        endDate: Date? = nil,
        targetDate: Date? = nil,
        types: [String] = [],
        categories: [String] = [],
        subCategories: [String] = [],
        amount: Float? = nil,
        remark: String? = nil,
        isDeleted: Int? = 0
    ) -> Condition? {
        var conditionList = [Condition]()
        
        if let startDate {
            conditionList.append(Record.Properties.date >= startDate)
        }
        
        if let endDate {
            conditionList.append(Record.Properties.date <= endDate)
        }
        
        if let targetDate {
            conditionList.append(Record.Properties.date == targetDate)
        }
        
        if !types.isEmpty {
            conditionList.append(Record.Properties.type.in(types))
        }
        
        if !categories.isEmpty {
            conditionList.append(Record.Properties.category.in(categories))
        }
        
        if !subCategories.isEmpty {
            conditionList.append(Record.Properties.subCategory.in(subCategories))
        }
        
        if let amount {
            let tolerance: Float = 0.01
            conditionList.append(Record.Properties.amount >= amount - tolerance && Record.Properties.amount <= amount + tolerance)
        }
        
        if let remark {
            conditionList.append(Record.Properties.remark == remark)
        }
        
        if let isDeleted {
            conditionList.append(Record.Properties.isDeleted == isDeleted)
        }
        
        return conditionList.reduce(true) { $0.asExpression() && $1.asExpression() }
        
    }
}
