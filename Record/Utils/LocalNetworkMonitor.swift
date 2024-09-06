//
//  LocalNetworkMonitor.swift
//  Record
//
//  Created by xiachuan on 2024/9/6.
//

import Alamofire
import AVFoundation
import SwiftUI

class PermissionManager {
    static let shared = PermissionManager()
    
    private init() {}
    
    func checkLocalNetworkAccess() async -> Bool {
        return await withCheckedContinuation { continuation in
            
            let networkManager = NetworkReachabilityManager()
            let isReachable = networkManager?.isReachable
            
            logInfo("permission check isReachable:\(String(describing: isReachable))")
            
            networkManager?.startListening(onUpdatePerforming: { status in
                switch status {
                case .reachable:
                    continuation.resume(returning: true)
                default:
                    continuation.resume(returning: false)
                }
            })
        }
    }
    
    func checkCameraAccess() async -> Bool {
        return await withCheckedContinuation { continuation in
            let status = AVCaptureDevice.authorizationStatus(for: .video)
            
            switch status {
            case .authorized:
                // 已经授权
                continuation.resume(returning: true)
            case .notDetermined:
                // 尚未请求权限
                AVCaptureDevice.requestAccess(for: .video) { granted in
                    continuation.resume(returning: granted)
                }
            case .denied, .restricted:
                // 权限被拒绝或受限
                continuation.resume(returning: false)
            @unknown default:
                continuation.resume(returning: false)
            }
        }
    }
}
