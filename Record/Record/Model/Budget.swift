//
//  Budget.swift
//  Record
//
//  Created by xiachuan on 2024/9/1.
//

import Foundation

struct Budget: Identifiable {
    let id: UUID = UUID()
    var time: Date
    var all: Float
    var current: Float
    var category: String
}

struct BudgetInfo: Codable {
    var all: Float
    var category: String
}

extension UserDefaults {
    private enum Keys {
        static let budgetInfos = "budget_infos"
    }

    func setBudgetInfos(_ budgets: [BudgetInfo]) {
        let encoder = JSONEncoder()
        if let encoded = try? encoder.encode(budgets) {
            self.set(encoded, forKey: Keys.budgetInfos)
        }
    }

    func getBudgetInfos() -> [BudgetInfo] {
        let decoder = JSONDecoder()
        if let data = self.data(forKey: Keys.budgetInfos),
           let budgetInfos = try? decoder.decode([BudgetInfo].self, from: data) {
            return budgetInfos
        }
        return []
    }
}
