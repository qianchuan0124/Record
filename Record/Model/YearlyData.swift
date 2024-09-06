//
//  YearlyData.swift
//  Record
//
//  Created by xiachuan on 2024/9/1.
//

import Foundation

struct YearlyData {
    var year: Int
    var totalIncome: Float
    var totalOutcome: Float
    var recordMap: [CategoryRecord]
}

struct CategoryRecord: Identifiable {
    let id: UUID = UUID()
    var category: String
    var totalIncome: Float
    var totalOutcome: Float
    var items: [SubCategoryRecord]
}

struct SubCategoryRecord: Identifiable {
    let id: UUID = UUID()
    var subCategory: String
    var totalIncome: Float
    var totalOutcome: Float
    var items: [Record]
}
