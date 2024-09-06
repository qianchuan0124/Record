//
//  DateUtils.swift
//  Record
//
//  Created by xiachuan on 2024/9/1.
//

import Foundation

extension TimeInterval {
    func formate() -> String {
        Date(timeIntervalSince1970: self).formate()
    }
}

extension Date {
    func resetTime() -> Date {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month, .day], from: self)
        return calendar.date(from: components) ?? self
    }
    
    func formate() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy.MM.dd"
        return formatter.string(from: self)
    }
    
    func formateForSync() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy.MM.dd HH:mm:ss"
        return formatter.string(from: self)
    }
    
    func formateRange(to: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy.MM.dd"
        let start = formatter.string(from: self)
        let end = formatter.string(from: to)
        return "\(start)~\(end)"
    }
    
    func monthRange() -> (Date, Date) {
        return (startOfMonth(), endOfMonth())
    }
    
    func startOfMonth() -> Date {
//        return Calendar.current.date(from: Calendar.current.dateComponents([.year, .month], from: Calendar.current.startOfDay(for: self))) ?? self
        
        var firstDayComponents = DateComponents()
            firstDayComponents.year = 2024
            firstDayComponents.month = 8
            firstDayComponents.day = 1
        return Calendar.current.date(from: firstDayComponents) ?? self
    }
    
    func endOfMonth() -> Date {
//        let startDate = startOfMonth()
//        
//        return Calendar.current.date(byAdding: DateComponents(month: 1, day: -1), to: startDate) ?? self
        
        var lastDayComponents = DateComponents()
        lastDayComponents.year = 2024
        lastDayComponents.month = 8
            lastDayComponents.day = 0 // 设置为0表示获取下个月的前一天，即5月的最后一天
            lastDayComponents.month = 9 // 设置为6月
        return Calendar.current.date(from: lastDayComponents) ?? self
    }
    
    func startOfYear(year: Int) -> Date {
        let calendar = Calendar.current
        return calendar.date(from: DateComponents(year: year, month: 1, day: 1)) ?? self
    }
    
    func endOfYear(year: Int) -> Date {
        let calendar = Calendar.current
        return calendar.date(from: DateComponents(year: year, month: 12, day: 31)) ?? self
    }
    
    func yearFormate(year: Int?) -> String {
        let realYear = year ?? Calendar.current.component(.year, from: self)
        let startDate = startOfYear(year: realYear)
        let endDate = endOfYear(year: realYear)
        return startDate.formateRange(to: endDate)
    }
    
    func recentYears() -> [Int] {
        let calendar = Calendar.current
        let currentYear = calendar.component(.year, from: self)
        return (0..<5).map { currentYear - $0 }
    }
}
