//
//  PieData.swift
//  Record
//
//  Created by xiachuan on 2024/9/2.
//

import Foundation
import SwiftUI

struct PieData: Identifiable {
    let id = UUID()
    var name: String
    var amount: Float
    var color: Color = PIE_COLORS.first ?? Color.red
    
    static func getColor(index: Int) -> Color {
        let realIndex = abs(index) % PIE_COLORS.count
        return PIE_COLORS[realIndex]
    }
}

let PIE_COLORS: [Color] = [
    Color(hex: 0x5470c6),
    Color(hex: 0x91cc75),
    Color(hex: 0xfac858),
    Color(hex: 0xee6666),
    Color(hex: 0x73c0de),
    Color(hex: 0x3ba272),
    Color(hex: 0xfc8452),
    Color(hex: 0x9a60b4),
    Color(hex: 0xea7ccc),
    Color(hex: 0x9d96f5),
    Color(hex: 0x8378EA),
    Color(hex: 0x96BFFF),
]
