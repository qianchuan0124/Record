//
//  Extension.swift
//  Record
//
//  Created by xiachuan on 2024/9/1.
//

import Foundation
import SwiftUI

typealias VoidBlock = () -> Void
typealias RecordBlock = (Record) -> Void

extension Array {
    /// 安全地获取数组中的元素
    /// - Parameter index: 要获取的元素的索引
    /// - Returns: 如果索引在数组范围内，则返回对应的元素；否则返回 nil
    func safeIndex(_ index: Int) -> Element? {
        return indices.contains(index) ? self[index] : nil
    }
}

extension String {
    func toImage() -> Image {
        Image(self, bundle: nil)
    }
    
    func convertToDate() -> Date? {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy.MM.dd"
        let date = dateFormatter.date(from: self)
        return date?.resetTime()
    }
    
    func parseSyncURL() -> String? {
        guard let range = range(of: SYNC_CODE_PREFIX) else {
            return nil
        }
        
        let content = String(self[range.upperBound...]).trimmingCharacters(in: .whitespacesAndNewlines)
        
        return content
    }
}

extension Image {
    init(name: String) {
        self.init(name, bundle: nil)
    }
}

extension Float {
    func toFormatter() -> String {
        String(format: "%.2f", self)
    }
}

struct CustomCorners: Shape {
    var corners: UIRectCorner
    var radius: CGFloat

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(roundedRect: rect, byRoundingCorners: corners, cornerRadii: CGSize(width: radius, height: radius))
        return Path(path.cgPath)
    }
}

extension Color {
    public init(hex: Int, alpha: CGFloat = 1) {
        self.init(uiColor: .init(hex: hex, alpha: alpha))
    }
    
    
    /// 0x32BE4B
    static var success: Color {
        .init(uiColor: .hex(0x32BE4B))
    }
    
    /// 0xEB5757
    static var failed: Color {
        .init(uiColor: .hex(0xEB5757))
    }
    
    /// 0xEFF1F3
    static var info: Color {
        .init(uiColor: .hex(0xEFF1F3))
    }
    
    /// 0xCCCCCC
    static var subInfo: Color {
        .init(uiColor: .hex(0xCCCCCC))
    }
    
    /// 0x1D2027
    static var title: Color {
        .init(uiColor: .hex(0x1D2027))
    }
    
    /// 0x989898
    static var text: Color {
        .init(uiColor: .hex(0x989898))
    }
    
    /// 0x47924B
    static var agree: Color {
        .init(uiColor: .hex(0x47924B))
    }
}

extension UIColor {
    @objc public convenience init(hex: Int, alpha: CGFloat = 1) {
        let red = CGFloat((hex >> 16) & 0xFF)
        let green = CGFloat((hex >> 8) & 0xFF)
        let blue = CGFloat(hex & 0xFF)
        self.init(red: red / 255.0, green: green / 255.0, blue: blue / 255.0, alpha: alpha)
    }
    
    @objc static public func hex(_ hex: String) -> UIColor? {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int = UInt64()
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            return nil
        }
        return UIColor(hex: Int((r << 16) | (g << 8) | (b)), alpha: CGFloat(a) / 255)
    }
    
    @objc static public func hex(_ hex: Int, alpha: CGFloat = 1) -> UIColor {
        return UIColor(hex: hex, alpha: alpha)
    }
}
