//
//  GradientProgressBar.swift
//  Record
//
//  Created by xiachuan on 2024/9/2.
//

import SwiftUI

struct GradientProgressBar: View {
    @Binding var progress: Double // 进度值，范围为 0.0 到 1.0
    
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // 背景条
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.title.opacity(0.8))
                    .frame(width: geometry.size.width - 5, height: 12)
                
                // 渐变进度条
                LinearGradient(
                    gradient: Gradient(colors: [Color.success, Color.failed]),
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .frame(width: geometry.size.width, height: 12)
                .mask(
                    HStack(spacing: 0) {
                        RoundedRectangle(cornerRadius: 8)
                            .frame(width: geometry.size.width * progress, 
                                   height: 12)
                        Spacer()
                    }
                )
            }
        }
        .frame(height: 12)
    }
}
