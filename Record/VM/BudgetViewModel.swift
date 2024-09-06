//
//  BudgetViewModel.swift
//  Record
//
//  Created by xiachuan on 2024/9/3.
//

import Foundation
import Combine

class BudgetViewModel: ObservableObject {
    var budgetInfos = BudgetViewModel.loadBudgetInfos()
    @Published var budgets: [Budget] = []
    @Published var currentMonthOutcome: Float = 0.0
    
    var toast = PassthroughSubject<String?, Never>()
    
    init() {
        loadData()
        loadOutcome()
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    func observedNotify() {
        NotificationCenter.default.addObserver(forName: .recordNotify, object: nil, queue: .main) { [weak self] notification in
            if let self,
               let userInfo = notification.userInfo,
               let info = userInfo["info"] as? NotifyType {
                logInfo("budget vm 收到通知:\(info)")
                self.handleNotify(type: info)
            }
        }
    }
    
    func handleNotify(type: NotifyType) {
        switch type {
        case .recordSync, .recordAdd, .recordDelete, .recordUpdate:
            loadData()
            loadOutcome()
        }
    }
    
    func loadData() {
        do {
            budgets = try budgetInfos.map { info in
                let (startDate, endDate) = Date().monthRange()
                let current = try DatabaseManager.shared.rangeOutcome(
                    startDate: startDate,
                    endDate: endDate,
                    category: info.category == L10n.totalBudget ? [] : [info.category]
                )
                
                return .init(time: Date(), all: info.all, current: current, category: info.category)
            }
        } catch {
            logInfo("load budget info failed, error:\(error)")
        }
    }
    
    func loadOutcome() {
        do {
            let (startDate, endDate) = Date().monthRange()
            currentMonthOutcome = try DatabaseManager.shared.rangeOutcome(startDate: startDate, endDate: endDate)
        } catch {
            logInfo("load current month outcome failed, error:\(error)")
        }
    }
    
    func addBudget(_ newBudget: BudgetInfo) {
        budgetInfos.insert(.init(all: newBudget.all, category: newBudget.category), at: 1)
        
        UserDefaults.standard.setBudgetInfos(budgetInfos)
        
        loadData()
        
        toast.send(L10n.addRecordSuccess)
    }
    
    func editBudget(_ newBudget: BudgetInfo) {
        guard let index = budgetInfos.firstIndex(where: { $0.category == newBudget.category }) else {
            return
        }
        
        budgetInfos[index] = .init(all: newBudget.all, category: newBudget.category)
        
        UserDefaults.standard.setBudgetInfos(budgetInfos)
        
        loadData()
        
        toast.send(L10n.updateSuccess)
    }
    
    func deleteBudget(_ budget: Budget) {
        guard let index = budgetInfos.firstIndex(where: { $0.category == budget.category }) else {
            return
        }
        
        budgetInfos.remove(at: index)
        
        UserDefaults.standard.setBudgetInfos(budgetInfos)
        
        loadData()
        
        toast.send(L10n.deleteSuccess)
    }
    
    static func loadBudgetInfos() -> [BudgetInfo] {
        let configs = UserDefaults.standard.getBudgetInfos()
        if configs.isEmpty {
            let defaults = defaultBudgetInfos()
            UserDefaults.standard.setBudgetInfos(defaults)
            return defaults
        }
        return configs
    }
    
    static func defaultBudgetInfos() -> [BudgetInfo] {
        let total = BudgetInfo(all: 1000.0, category: L10n.totalBudget)
        var infos = [BudgetInfo]()
        infos.append(total)
        let categories = CategoryParser.shared.firstLevelCategories().prefix(3)
        infos.append(contentsOf: categories.map { .init(all: 1000.0, category: $0) })
        return infos
    }
}
