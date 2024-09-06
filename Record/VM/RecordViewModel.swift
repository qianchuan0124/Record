//
//  RecordViewModel.swift
//  Record
//
//  Created by xiachuan on 2024/9/3.
//

import Foundation
import Combine

class RecordViewModel: ObservableObject {
    @Published var records: [Record] = []
    @Published var totalIncome: Float = 0.0
    @Published var totalOutcome: Float = 0.0
    @Published var rangeIncome: Float = 0.0
    @Published var rangeOutcome: Float = 0.0
    @Published var filter: Filter = RecordViewModel.defaultFilter()
    @Published var searchKey: String = ""
    
    var toast = PassthroughSubject<String?, Never>()
    
    init() {
        loadTitleInfo()
        loadRecords()
        observedNotify()
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    func observedNotify() {
        NotificationCenter.default.addObserver(forName: .recordNotify, object: nil, queue: .main) { [weak self] notification in
            if let self,
               let userInfo = notification.userInfo,
               let info = userInfo["info"] as? NotifyType {
                logInfo("record vm 收到通知:\(info)")
                self.handleNotify(type: info)
            }
        }
    }
    
    func handleNotify(type: NotifyType) {
        switch type {
        case .recordSync:
            loadTitleInfo()
            loadRecords()
        default:
            break
        }
    }
    
    func loadTitleInfo() {
        do {
            totalIncome = try DatabaseManager.shared.totalIncome()
            totalOutcome = try DatabaseManager.shared.totalOutcome()
            
            rangeIncome = try DatabaseManager.shared.rangeIncome(startDate: filter.startDate, endDate: filter.endDate)
            rangeOutcome = try DatabaseManager.shared.rangeOutcome(startDate: filter.startDate, endDate: filter.endDate)
        } catch {
            logInfo("load title info error: \(error)")
            toast.send(error.localizedDescription)
        }
    }
    
    static func defaultFilter() -> Filter {
        let (startDate, endDate) = Date().monthRange()
        return .init(startDate: startDate, endDate: endDate, types: [], subCategories: [])
    }
    
    func loadRecords() {
        do {
            records = try DatabaseManager.shared.recordsWithFilter(filter).filter({ record in
                if !searchKey.isEmpty {
                    return record.date.formate().contains(searchKey) ||
                    record.subCategory.contains(searchKey) ||
                    record.remark.contains(searchKey)
                }
                return true
            })
            .sorted(by: { $0.date > $1.date })
        } catch {
            logInfo("load record error: \(error)")
            toast.send(error.localizedDescription)
        }
    }
    
    func onFilterChanged(_ newValue: Filter) {
        filter = newValue
        loadRecords()
        loadTitleInfo()
    }
    
    func onSearchKeyChanged(_ newValue: String) {
        searchKey = newValue
        loadRecords()
    }
    
    func cleanup() {
        do {
            try DatabaseManager.shared.clearRecords()
        } catch {
            logInfo("cleanup record failed, error: \(error)")
            toast.send(error.localizedDescription)
        }
    }
    
    func insertRecord(_ record: Record) {
        do {
            try DatabaseManager.shared.insertRecord(record)
            loadTitleInfo()
            if record.date >= filter.startDate && record.date <= filter.endDate {
                loadRecords()
            }
            postNotification(type: .recordAdd)
            toast.send(L10n.createSuccess)
        } catch {
            logInfo("insert record failed, error:\(error)")
            toast.send(error.localizedDescription)
        }
    }
    
    func deleteRecord(_ record: Record) {
        do {
            try DatabaseManager.shared.deleteRecord(record)
            loadTitleInfo()
            if record.date >= filter.startDate && record.date <= filter.endDate {
                loadRecords()
            }
            postNotification(type: .recordDelete)
            toast.send(L10n.deleteSuccess)
        } catch {
            logInfo("delete record failed, error:\(error)")
            toast.send(error.localizedDescription)
        }
    }
    
    func editRecord(_ record: Record) {
        do {
            try DatabaseManager.shared.updateRecord(record)
            loadTitleInfo()
            if record.date >= filter.startDate && record.date <= filter.endDate {
                loadRecords()
            }
            postNotification(type: .recordUpdate)
            toast.send(L10n.updateSuccess)
        } catch {
            logInfo("delete record failed, error:\(error)")
            toast.send(error.localizedDescription)
        }
    }
}
