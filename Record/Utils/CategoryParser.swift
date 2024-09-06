//
//  CategoryParser.swift
//  Record
//
//  Created by xiachuan on 2024/9/3.
//

import Foundation

class CategoryParser {
    
    static let shared = CategoryParser()
    
    private init() {}
    
    func parse() -> [Category] {
        guard let url = Bundle.main.url(forResource: "Category", withExtension: "json") else {
            logInfo("Failed to locate JSON file.")
            return []
        }
        
        do {
            let data = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            let categoryInfo = try decoder.decode(CategoryInfo.self, from: data)
            return categoryInfo.default
        } catch {
            logInfo("Failed to load JSON: \(error.localizedDescription)")
            return []
        }
    }
    
    func parseIcons() -> [CategoryIcon] {
        guard let url = Bundle.main.url(forResource: "CategoryIcon", withExtension: "json") else {
            logInfo("Failed to locate JSON file.")
            return []
        }
        
        do {
            let data = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            let categoryInfo = try decoder.decode(CategoryIconInfo.self, from: data)
            return categoryInfo.default
        } catch {
            logInfo("Failed to load JSON: \(error.localizedDescription)")
            return []
        }
    }
    
    func firstLevelCategories() -> [String] {
        parse().map { $0.label }
    }
    
    func secondLevelCategories(parent: String) -> [String] {
        guard let firstLevel = parse().first(where: { $0.label == parent }) else {
            return []
        }
        return firstLevel.children?.map { $0.label } ?? []
    }
    
    func firstItemCategory() -> String {
        parse().first?.label ?? ""
    }
    
    func firstSubItemCategory(parent: String) -> String {
        parse().first(where: { $0.label == parent })?.children?.first?.label ?? ""
    }
    
    func categoryIcon(parent: String, sub: String) -> String {
        let categoryIcons = parseIcons()
        guard let category = categoryIcons.first(where: { $0.value == parent }) else {
            return "other_icon"
        }
        
        guard let subCategory = category.children?.first(where: { $0.value == sub }) else {
            return category.icon
        }
        
        return subCategory.icon
    }
    
    func categoryIcon(parent: String) -> String {
        let categoryIcons = parseIcons()
        guard let category = categoryIcons.first(where: { $0.value == parent }) else {
            return "other_icon"
        }
        return category.icon
    }
}
