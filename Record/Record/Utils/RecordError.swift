//
//  RecordError.swift
//  Record
//
//  Created by xiachuan on 2024/9/3.
//

import Foundation

public enum RecordError: Error {
    public var domain: String? {
        switch self {
        case .error(let domain, _, _):
            return domain
        default:
            return nil
        }
    }
    public var code: Int? {
        switch self {
        case .message(_):
            return nil
        case .error(_, let code, _):
            return code
        case .unexpected(let code, _):
            return code
        }
    }
    
    public var message: String {
        switch self {
        case .message(let string):
            return string
        case .error(_, _, let userInfo):
            return userInfo.description
        case .unexpected(_, let message):
            return message
        }
    }
    
    case message(String)
    case error(domain: String, code: Int, userInfo: [String: Any])
    case unexpected(code: Int, message: String)
}
