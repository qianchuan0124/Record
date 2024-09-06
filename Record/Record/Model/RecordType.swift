//
//  RecordType.swift
//  Record
//
//  Created by xiachuan on 2024/9/3.
//

import Foundation

enum RecordType {
    case income
    case outcome
    
    var description: String {
        switch self {
        case .income:
            L10n.recordIncome
        case .outcome:
            L10n.recordOutcome
        }
    }
}
