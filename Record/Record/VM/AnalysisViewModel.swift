//
//  AnalysisViewModel.swift
//  Record
//
//  Created by xiachuan on 2024/9/3.
//

import Foundation


class AnalysisViewModel: ObservableObject {
    @Published var selectedYearlyData: YearlyData?
    var yearlyDatas: [YearlyData] = []
    
    init() {
        loadData()
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
                logInfo("analysis vm 收到通知:\(info)")
                self.handleNotify(type: info)
            }
        }
    }
    
    func handleNotify(type: NotifyType) {
        switch type {
        case .recordSync, .recordAdd, .recordDelete, .recordUpdate:
            loadData()
        }
    }
    
    func tapChanged(_ pie: PieData) {
        guard let data = yearlyDatas.first(where: { "\($0.year)" == pie.name }) else {
            return
        }
        selectedYearlyData = data
    }
    
    func loadData() {
        let years = Date().recentYears()
        
        do {
            yearlyDatas = try years.map{ year in
                let startDate = Date().startOfYear(year: year)
                let endDate = Date().endOfYear(year: year)
                let totalIncome = try DatabaseManager.shared.rangeIncome(startDate: startDate, endDate: endDate)
                let totalOutcome = try DatabaseManager.shared.rangeOutcome(startDate: startDate, endDate: endDate)
                
                let records = try DatabaseManager.shared.recordsWithTime(
                    startDate: startDate,
                    endDate: endDate,
                    types: [RecordType.outcome.description]
                )
                
                let groupedRecords = Dictionary(grouping: records, by: { $0.category })
                
                let recordMap: [CategoryRecord] = groupedRecords.map { item in
                    let totalIncome: Float = 0.0
                    let totalOutcome = item.value.reduce(0.0, { $0 + $1.amount })
                    
                    let subGroupedRecords = Dictionary(grouping: item.value, by: { $0.subCategory })
                    
                    
                    let subRecordMap: [SubCategoryRecord] = subGroupedRecords.map { item in
                        let totalIncome: Float = 0.0
                        let totalOutcome = item.value.reduce(0.0, { $0 + $1.amount })
                        
                        return .init(subCategory: item.key, 
                                     totalIncome: totalIncome,
                                     totalOutcome: totalOutcome,
                                     items: item.value)
                    }.sorted(by: { $0.totalOutcome > $1.totalOutcome })
                    
                    return .init(category: item.key,
                                 totalIncome: totalIncome,
                                 totalOutcome: totalOutcome, items: subRecordMap)
                }
                .sorted(by: { $0.totalOutcome > $1.totalOutcome })
                
                
                return .init(year: year,
                             totalIncome: totalIncome,
                             totalOutcome: totalOutcome,
                             recordMap: recordMap)
            }
            
            selectedYearlyData = yearlyDatas.first
        } catch {
            logInfo("load analysis info failed, error:\(error)")
        }
        
    }
}
