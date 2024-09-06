//
//  Record.swift
//  Record
//
//  Created by xiachuan on 2024/9/1.
//

import Foundation
import WCDBSwift

struct Record: Identifiable, TableCodable, Describable {
    var id: Int? = nil
    var date: Date
    var amount: Float
    var type: String
    var category: String
    var subCategory: String
    var remark: String = ""
    var isDeleted: Int = 0
    
    enum CodingKeys: String, CodingTableKey {
        typealias Root = Record
        
        case id
        case date
        case amount
        case type
        case category
        case subCategory
        case remark
        case isDeleted
        
        static let objectRelationalMapping = TableBinding(CodingKeys.self) {
            BindColumnConstraint(id, isPrimary: true)
        }
    }
    
    var isAutoIncrement: Bool = true
    var lastInsertedRowID: Int64 = 0
    
    mutating func handleSyncData() -> Record {
        self.id = nil
        self.date = Date(timeIntervalSince1970: self.date.timeIntervalSince1970 / 1000)
        return self
    }
    
    mutating func resetDate() -> Record {
        self.date = self.date.resetTime()
        return self
    }
    
    var isIncome: Bool {
        return type == RecordType.income.description
    }
    
    var description: String {
        "record - id:\(String(describing: id)) date:\(date) amount:\(amount) type:\(type) category:\(category) subCategory:\(subCategory) remark:\(remark) isDeleted:\(isDeleted)"
    }
}
