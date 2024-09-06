//
//  SyncService.swift
//  Record
//
//  Created by xiachuan on 2024/9/4.
//

import Foundation
import Combine

class SyncService {
    static let shared = SyncService()
    
    private(set) var progressPublisher = CurrentValueSubject<Double, Never>(0.0)
    
    private init() {}
    
    func syncStart() async throws {
        try await NetworkService.shared.sendSyncStatus(type: .start)
    }
    
    func syncFailed() async {
        do {
            try await NetworkService.shared.sendSyncStatus(type: .failed)
        } catch {
            logInfo("send to sync status failed, error:\(error)")
        }
    }
    
    func syncComplete() async throws {
        try await NetworkService.shared.sendSyncStatus(type: .success)
    }
    
    func syncRecordsFromPC() async throws {
        var tempRecords = [Record]()
        var page = 1
        let limit = 50
        var totalRecords = 0
        
        while(true) {
            guard let info = try await NetworkService.shared.syncAllRecords(page: page, limit: limit) else {
                throw RecordError.message(L10n.syncFailedWithDataEmpty)
            }
            tempRecords.append(contentsOf: info.records)
            totalRecords = info.totalRecords
            
            let currentProgress = totalRecords > 0 ? Double((tempRecords.count * 98 / totalRecords)) : 0.0
            
            DispatchQueue.main.async { [weak self] in
                self?.progressPublisher.send(currentProgress)
            }
            
            if tempRecords.count < totalRecords {
                page += 1
            } else {
                try await DatabaseManager.shared.insertLargeRecordArray(tempRecords,
                                                                        needReset: true)
                
                DispatchQueue.main.async { [weak self] in
                    self?.progressPublisher.send(100.0)
                    delayPostSyncNotify()
                }
                break
            }
        }
    }
    
    func syncRecordsToPC() async throws {
        var page = 1
        let limit = 50
        let totalRecords = try DatabaseManager.shared.recordCounts()
        var currentRecords = 0
        
        while(true) {
            let records = try DatabaseManager.shared.fetchRecords(page: page, pageSize: limit)
            
            let handleRecords = records.map { record in
                var newRecord = record
                newRecord.date = Date(timeIntervalSince1970: newRecord.date.timeIntervalSince1970 * 1000)
                return newRecord
            }
            
            try await NetworkService.shared.postRecords(records: handleRecords)
            
            currentRecords += records.count
            
            let currentProgress = Double((currentRecords * 100 / totalRecords))
            
            DispatchQueue.main.async { [weak self] in
                self?.progressPublisher.send(currentProgress)
            }
            
            if currentRecords < totalRecords {
                page += 1
            } else {
                DispatchQueue.main.async { [weak self] in
                    self?.progressPublisher.send(100.0)
                }
                break
            }
        }
    }
    
}
