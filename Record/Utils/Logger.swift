//
//  Logger.swift
//  Record
//
//  Created by xiachuan on 2024/9/4.
//

import Foundation

let LOG_PATH = "/log.txt"
let MAX_LOG_SIZE = 10 * 1024 * 1024 // 最大10M

public func logInfo(fileName: String = #file,
                    funcName: String = #function,
                    lineNum: Int = #line,
                    _ items: Any...,
                    separator: String = " ") {
    let stringItems = items.map{ String(describing: $0) }
    let combinedString = stringItems.joined(separator: separator)
    let finalString = "\(getCurrentTime()): \(fileName) - \(funcName) - \(lineNum): \(combinedString)"
    debugPrint(finalString)
    saveFile(content: "\(finalString)\n")
}

private func saveFile(content: String) {
    guard let path = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true).first else {
        return
    }
    
    let logURL = URL(fileURLWithPath: path + LOG_PATH)
    checkAndRemoveFileIfNeeded(url: logURL)
    debugPrint(logURL)
    
    let dataToWrite = content.data(using: .utf8)
    let fileManager = FileManager.default
    
    if !fileManager.fileExists(atPath: logURL.path) {
        fileManager.createFile(atPath: logURL.path, contents: dataToWrite, attributes: nil)
        return
    }
    
    if let fileHandle = try? FileHandle(forWritingTo: logURL) {
        fileHandle.seekToEndOfFile()
        fileHandle.write(dataToWrite ?? Data())
        fileHandle.closeFile()
    }
}

private func checkAndRemoveFileIfNeeded(url: URL) {
    let fileManager = FileManager.default
    guard fileManager.fileExists(atPath: url.path) else {
        return
    }
    
    do {
        let attributes = try url.resourceValues(forKeys: [.fileSizeKey])
        if let size = attributes.fileSize, Int(size) > MAX_LOG_SIZE {
            try fileManager.removeItem(at: url)
            logInfo("删除日志文件 删除前大小 size:\(size)")
        }
    } catch {
        logInfo("删除日志文件失败 error:\(error.localizedDescription)")
    }
}

private func getCurrentTime() -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
    let currentTime = formatter.string(from: Date())
    return currentTime
}

public func openLogFile() throws -> String {
    guard let path = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true).first else {
        throw RecordError.message("文件不存在")
    }
    
    let logURL = URL(filePath: path + LOG_PATH)
    do {
        return try String(contentsOf: logURL)
    } catch {
        logInfo("打开文件失败, error:\(error.localizedDescription)")
        throw RecordError.message("文件打开失败")
    }
}
