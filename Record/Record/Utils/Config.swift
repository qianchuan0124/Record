//
//  Config.swift
//  Record
//
//  Created by xiachuan on 2024/9/4.
//

import Foundation

/**
    static let baseURL = "http://127.0.0.1:3000"
 */

let DEFAULT_BASE_URL = "http://127.0.0.1:3000"
let REQUEST_MAX_TIME: Double = 5
let FEEDBACK_EMAIL = "qianchuan0124@gamil.com"
let FEEDBACK_SUBJECT = "记账清单 - 问题反馈"
let FEEDBACK_BODY = "请在此处描述反馈问题..."
let VERSION_URL = "https://github.com/qianchuan0124/Record/releases"
let SYNC_CODE_PREFIX = "record-list-for-sync:"

class BaseConfig: NSObject {
    static let shared = BaseConfig()
    var baseURL: String
    
    private override init() {
        self.baseURL = DEFAULT_BASE_URL
        super.init()
    }
    
    public func getBaseURL() -> String {
        return baseURL
    }
    
    public func setBaseURL(_ newValue: String) {
        baseURL = newValue
        logInfo("成功设置BaseURL newValue:\(newValue)")
    }
    
    public func currentVersion() -> String {
        if let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String,
           let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String {
            return "\(version)"
        }
        return "未知版本"
    }
    
    func isCodeLegal(_ content: String) -> Bool {
        return content.hasPrefix(SYNC_CODE_PREFIX)
    }
}
