//
//  SettingView.swift
//  Record
//
//  Created by xiachuan on 2024/9/1.
//

import Foundation
import SwiftUI
import AlertToast
import MessageUI
import UniformTypeIdentifiers

struct SettingView: View {
    @State var showToast = false
    @State var toastInfo: String?
    @State private var isShowingMailView = false
    @State private var isExporting = false
    @State private var isImporting = false
    @State private var isSyncing = false
    @State private var fileURL: URL?
    
    var body: some View {
        NavigationStack {
            GeometryReader { geometry in
                ZStack(alignment: .top) {
                    Image(name: "info_background")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: geometry.size.width)
                        .clipped()
                    
                    VStack {
                        Spacer()
                        VStack(spacing: 20) {
                            HStack {
                                Spacer()
                                
                                Text(L10n.setting)
                                    .font(.system(size: 21, weight: .bold))
                                    .foregroundStyle(Color.title)
                                
                                Spacer()
                            }
                            .padding(.top, 16)
                            
                            ScrollView {
                                makeDataHandleView()
                                makeFeedbackView()
                            }
                        }
                        .frame(height: geometry.size.height * 0.8)
                        .background(Color.white)
                        .clipShape(CustomCorners(corners: [.topLeft, .topRight], radius: 25))
                        .padding(.bottom, 20)
                    }
                }
                .toast(isPresenting: $showToast, duration: 1.5, alert: {
                    AlertToast(displayMode: .alert, type: .regular, title: toastInfo)
                })
                .sheet(isPresented: $isShowingMailView) {
                    MailView()
                }
                .customDialog(isPresented: $isSyncing) {
                    RecordSyncView(dismiss: { isSyncing = false })
                }
            }
        }
    }
    
    @MainActor
    func makeDataHandleView() -> some View {
        VStack(spacing: 20) {
            SettingTitle(title: L10n.dataHandle)
            SettingCell(icon: "data_import_icon", title: L10n.dataImport, description: L10n.dataImportInfo)
                .onTapGesture {
                    isImporting = true
                }
                .fileImporter(
                    isPresented: $isImporting,
                    allowedContentTypes: [.commaSeparatedText],
                    allowsMultipleSelection: false
                ) { result in
                    switch result {
                    case .success(let urls):
                        if let url = urls.first {
                            importCSV(from: url)
                            delayPostSyncNotify()
                            showToast(info: L10n.importSuccess)
                        }
                    case .failure(let error):
                        showToast(info: L10n.importFailed)
                        logInfo("导入失败: \(error.localizedDescription)")
                    }
                }
            
            SettingCell(icon: "data_export_icon", title: L10n.dataExport, description: L10n.dataExportInfo)
                .onTapGesture {
                    fileURL = generateCSV()
                    isExporting = true
                }
                .fileExporter(
                    isPresented: $isExporting,
                    document: CSVDocument(url: fileURL),
                    contentType: .commaSeparatedText,
                    defaultFilename: "ExportedData"
                ) { result in
                    switch result {
                    case .success:
                        showToast(info: L10n.exportSuccess)
                        deleteTemporaryFile()
                    case .failure(let error):
                        logInfo("文件导出失败: \(error)")
                        showToast(info: L10n.exportFailed)
                    }
                }
            
            NavigationLink(destination: ScanView() {
                if let newURL = $0.parseSyncURL() {
                    BaseConfig.shared.setBaseURL(newURL)
                    isSyncing = true
                }
            }) {
                SettingCell(icon: "data_sync_icon", title: L10n.dataSync, description: L10n.dataSyncInfo)
            }
        }
    }
    
    @MainActor
    func makeFeedbackView() -> some View {
        VStack(spacing: 20) {
            SettingTitle(title: L10n.updateFeedback)
            SettingCell(icon: "feedback_icon", title: L10n.feedback, description: L10n.feedbackInfo)
                .disabled(!MFMailComposeViewController.canSendMail())
                .onTapGesture {
                    if !MFMailComposeViewController.canSendMail() {
                        showToast(info: L10n.notFondEmailSender)
                    } else {
                        isShowingMailView = true
                    }
                }
            
            SettingCell(icon: "version_icon", title: L10n.versionUpdate, description: "\(L10n.versionUpdateInfo) \(BaseConfig.shared.currentVersion())")
                .onTapGesture {
                    guard let url = URL(string: VERSION_URL) else {
                        return
                    }
                    UIApplication.shared.open(url)
                }
        }
        .padding(.vertical, 24)
    }
    
    func generateCSV() -> URL {
        var fileURL: URL!
        do {
            let heading = "\(L10n.time), \(L10n.type), \(L10n.category), \(L10n.subCategory), \(L10n.amount), \(L10n.remark)\n"
            
            let rows = try DatabaseManager.shared.queryAll().map { record in
                "\(record.date.formate()),\(record.type),\(record.category),\(record.subCategory),\(record.amount),\(record.remark)"
            }
            
            let stringData = heading + rows.joined(separator: "\n")
            
            let path = try FileManager.default.url(for: .documentDirectory,
                                                   in: .allDomainsMask,
                                                   appropriateFor: nil,
                                                   create: false)
            
            fileURL = path.appendingPathComponent("\(L10n.recordList)-\(Date().formateForSync()).csv")
            
            try stringData.write(to: fileURL, atomically: true, encoding: .utf8)
        } catch {
            logInfo("generating csv file failed, error:\(error)")
        }
        return fileURL
    }
    
    func importCSV(from url: URL) {
        Task {
            do {
                let content = try String(contentsOf: url)
                let rows = content.split(separator: "\n").map { row in
                    row.split(separator: ",").map { String($0) }
                }
                let records: [Record] = rows.dropFirst().compactMap { items in
                    if let dateValue = items.safeIndex(0),
                       let type = items.safeIndex(1),
                       let category = items.safeIndex(2),
                       let subCategory = items.safeIndex(3),
                       let amountValue = items.safeIndex(4),
                       let date = dateValue.convertToDate(),
                       let amount = Float(amountValue) {
                        
                        let remark = items.safeIndex(5) ?? ""
                        
                        return .init(date: date,
                                     amount: amount,
                                     type: type,
                                     category: category,
                                     subCategory: subCategory,
                                     remark: remark)
                    }
                    return nil
                }
                
                try await DatabaseManager.shared.insertLargeRecordArray(records)
            } catch {
                logInfo("读取 CSV 文件失败: \(error.localizedDescription)")
                await showToast(info: L10n.exportFailed)
            }
        }
    }
    
    func deleteTemporaryFile() {
        guard let url = fileURL else { return }
        do {
            try FileManager.default.removeItem(at: url)
            logInfo("临时文件已删除: \(url)")
        } catch {
            logInfo("删除临时文件失败: \(error)")
        }
    }
    
    @MainActor
    func showToast(info: String) {
        toastInfo = info
        showToast = true
    }
    
    struct SettingTitle: View {
        let title: String
        var body: some View {
            HStack {
                Text(title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(Color.title)
                
                Spacer()
            }
            .padding(.leading, 24)
        }
    }
    
    struct SettingCell: View {
        let icon: String
        let title: String
        let description: String
        var body: some View {
            HStack(alignment: .center, spacing: 12) {
                Image(name: icon)
                    .resizable()
                    .frame(width: 36, height: 36)
                    .padding(18)
                
                VStack(alignment: .leading, spacing: 8) {
                    Text(title)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(Color.title)
                    
                    Text(description)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color.text)
                    
                }
                
                Spacer()
            }
            .padding(.horizontal, 14)
            .background(Color.info)
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .padding(.horizontal, 21)
        }
    }
}

struct CSVDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.commaSeparatedText] }
    
    var url: URL?
    
    init(url: URL?) {
        self.url = url
    }
    
    init(configuration: ReadConfiguration) throws {
        // 读取文件内容
    }
    
    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        guard let url = url else {
            throw CocoaError(.fileReadNoSuchFile)
        }
        return try FileWrapper(url: url)
    }
}
