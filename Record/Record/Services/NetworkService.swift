//
//  NetworkService.swift
//  Record
//
//  Created by xiachuan on 2024/9/4.
//

import Foundation
import Alamofire

enum SyncType: String {
    case handleData = "/sync/records/result"
    case start = "/sync/records/start"
    case success = "/sync/records/success"
    case failed = "/sync/records/failed"
}

class NetworkService: NSObject {
    static let shared = NetworkService()
    private let session: Alamofire.Session
    private override init() {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = REQUEST_MAX_TIME
        configuration.timeoutIntervalForResource = REQUEST_MAX_TIME
        session = Alamofire.Session(configuration: configuration)
        super.init()
    }
    
    func sendSyncStatus(type: SyncType) async throws {
        return try await withCheckedThrowingContinuation { continuation in
            logInfo("发起请求，开始同步数据")
            
            session.request(BaseConfig.shared.getBaseURL() + type.rawValue).response { [weak self] response in
                do {
                    let syncInfo: ResponseInfo? = try self?.parseResponseResult(response)
                    logInfo("获取到数据了, records:\(String(describing: syncInfo?.result))")
                    continuation.resume()
                } catch {
                    logInfo("请求失败, 失败原因 error:\(error)")
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    func syncAllRecords(page: Int, limit: Int) async throws -> SyncInfo? {
        return try await withCheckedThrowingContinuation { continuation in
            logInfo("开始请求所有数据 url:\(BaseConfig.shared.getBaseURL() + SyncType.handleData.rawValue)...")
            let parameters: [String: Int] = [
                "page": page,
                "limit": limit
            ]
            session.request(
                BaseConfig.shared.getBaseURL() + SyncType.handleData.rawValue,
                parameters: parameters
            ).response { [weak self] response in
                do {
                    let syncInfo: SyncInfo? = try self?.parseResponseResult(response)
                    logInfo("获取到数据了, records:\(String(describing: syncInfo?.currentCount))")
                    continuation.resume(returning: syncInfo)
                } catch {
                    logInfo("请求失败, 失败原因 error:\(error.localizedDescription)")
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    func postRecords(records: [Record]) async throws {
        let req = ["records": records]
        
        // 将记录数组转换为 JSON 数据
        let jsonData = try JSONEncoder().encode(req)
        
        // 将 JSON 数据转换为字典
        let jsonObject = try JSONSerialization.jsonObject(with: jsonData, options: []) as? [String: Any]
        
        return try await withCheckedThrowingContinuation { continuation in
            logInfo("同步数据到电脑:\(BaseConfig.shared.getBaseURL() + SyncType.handleData.rawValue)...")
            session.request(
                BaseConfig.shared.getBaseURL() + SyncType.handleData.rawValue,
                method: .post,
                parameters: jsonObject,
                encoding: JSONEncoding.default,
                headers: ["Content-Type": "application/json"]
            ).response { [weak self] response in
                do {
                    logInfo("收到响应, response:\(response)")
                    let syncInfo: ResponseInfo? = try self?.parseResponseResult(response)
                    logInfo("获取到数据了, records:\(String(describing: syncInfo))")
                    continuation.resume()
                } catch {
                    logInfo("请求失败, 失败原因 error:\(error)")
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    private func parseResponseResult<T: Codable>(_ response: DataResponse<Data?, AFError>) throws -> T {
        switch response.result {
        case .success(let data):
            return try parseResponseData(data)
        case .failure(let error):
            logInfo("解析请求结果失败, error:\(error.localizedDescription)")
            if error.isSessionTaskError {
                throw RecordError.message(L10n.notFoundNetwork)
            } else {
                throw RecordError.message(L10n.unknownError)
            }
        }
    }
    
    private func parseResponseData<T: Codable>(_ data: Data?) throws -> T {
        guard let data else {
            throw RecordError.message(L10n.notFoundData)
        }
        
        do {
            let response: T = try ResponseDecoder.decodeData(data)
            
            return response
            
        } catch let error as RecordError {
            throw error
        } catch {
            logInfo("解析返回数据失败, error:\(error)")
            throw RecordError.message(L10n.parseFailed)
        }
    }
}

struct SyncInfo: Codable {
    let records: [Record]
    let currentCount: Int
    let totalRecords: Int
}

struct ResponseInfo: Codable {
    let result: Bool?
    let info: String?
}

class ResponseDecoder: NSObject {
    static let shared = ResponseDecoder()
    private override init() {
        super.init()
    }
    
    static func decodeData<T: Codable>(_ data: Data) throws -> T {
        return try JSONDecoder().decode(T.self, from: data)
    }
}
