//
//  RecordSyncView.swift
//  Record
//
//  Created by xiachuan on 2024/9/5.
//

import Foundation
import SwiftUI

struct RecordSyncView: View {
    @State var status: SyncStatus = .prepare
    @State var progress: Double = 0.0
    
    let dismiss: VoidBlock
    
    enum SyncStatus {
        case prepare
        case start
        case success
        case failed
    }
    
    var body: some View {
        VStack(spacing: 12) {
            
            Spacer()
            
            switch status {
            case .prepare:
                makePrepareView()
            case .start:
                makeStartView()
            case .success:
                Text(L10n.syncSuccess)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(Color.success)
            case .failed:
                Text(L10n.syncFailed)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(Color.failed)
            }
            
            Spacer()
            
            HStack {
                Spacer()
                Button(L10n.cancel, role: .cancel) {
                    dismiss()
                }
                Spacer()
            }
            .padding(.bottom, 24)
        }
        .frame(height: 350)
        .onReceive(SyncService.shared.progressPublisher) {
            progress = $0
        }
    }
    
    @ViewBuilder
    func makePrepareView() -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(L10n.syncFromPC)
                .font(.system(size: 16))
            Text(L10n.syncFromPCInfo)
                .font(.system(size: 13))
                .foregroundStyle(Color.text)
            
        }
        .padding(20)
        .background(Color.info)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .padding(.horizontal, 16)
        .padding(.vertical, 4)
        .contentShape(Rectangle())
        .onTapGesture {
            Task { @MainActor in
                do {
                    try await SyncService.shared.syncStart()
                    status = .start
                    try await SyncService.shared.syncRecordsFromPC()
                    status = .success
                    try await SyncService.shared.syncComplete()
                } catch {
                    logInfo("sync from pc failed, error:\(error)")
                    await SyncService.shared.syncFailed()
                    status = .failed
                }
            }
        }
        
        VStack(alignment: .leading, spacing: 10) {
            Text(L10n.syncFromMobile)
                .font(.system(size: 16))
            Text(L10n.syncFromMobileInfo)
                .font(.system(size: 12))
                .foregroundStyle(Color.text)
        }
        .padding(20)
        .background(Color.info)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .padding(.horizontal, 16)
        .padding(.vertical, 4)
        .contentShape(Rectangle())
        .onTapGesture {
            Task { @MainActor in
                do {
                    try await SyncService.shared.syncStart()
                    status = .start
                    try await SyncService.shared.syncRecordsToPC()
                    status = .success
                    try await SyncService.shared.syncComplete()
                } catch {
                    logInfo("sync to pc failed, error:\(error)")
                    await SyncService.shared.syncFailed()
                    status = .failed
                }
            }
        }
    }
    
    func makeStartView() -> some View {
        VStack {
            Text(L10n.dataSyncing)
            ProgressView(value: progress, total: 100.0)
                .progressViewStyle(LinearProgressViewStyle())
                .padding()
        }
        .padding(10)
    }
    
}
