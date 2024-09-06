//
//  PermissionView.swift
//  Record
//
//  Created by xiachuan on 2024/9/6.
//

import Foundation
import SwiftUI

enum PermissionType: Identifiable {
    var id: Self { self }
    
    case cameraForbidden
    case networkForbidden
}

struct PermissionView: View {
    let type: PermissionType
    let dismiss: VoidBlock
    var body: some View {
        VStack {
            TitleView(title: L10n.givePermission)
                .padding(.vertical, 24)
            
            switch type {
            case .cameraForbidden:
                Text(L10n.permissionForCamera)
                    .font(.system(size: 14))
            case .networkForbidden:
                Text(L10n.permissionForNetwork)
                    .font(.system(size: 14))
            }
            
            ConfirmView(confirmTitle: L10n.permission, cancelAction: dismiss) {
                openAppSettings()
                dismiss()
            }
            .padding(.vertical, 24)
        }
    }
    
    func openAppSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }
    }
}
