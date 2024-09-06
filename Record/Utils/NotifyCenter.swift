//
//  NotifyCenter.swift
//  Record
//
//  Created by xiachuan on 2024/9/5.
//

import Foundation

extension Notification.Name {
    static let recordNotify = Notification.Name("RecordNotification")
}

enum NotifyType {
    case recordAdd
    case recordUpdate
    case recordDelete
    case recordSync
}

// 发布通知
func postNotification(type: NotifyType) {
    let userInfo: [String: NotifyType] = ["info": type]
    NotificationCenter.default.post(name: .recordNotify, object: nil, userInfo: userInfo)
}

func delayPostSyncNotify() {
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
        postNotification(type: .recordSync)
    }
}
