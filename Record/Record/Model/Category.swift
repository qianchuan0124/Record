//
//  Category.swift
//  Record
//
//  Created by xiachuan on 2024/9/3.
//

import Foundation

struct CategoryInfo: Codable {
    var `default`: [Category]
}

struct Category: Codable {
    var label: String
    var value: String
    var children: [Category]?
}

struct CategoryIconInfo: Codable {
    var `default`: [CategoryIcon]
}

struct CategoryIcon: Codable {
    var value: String
    var icon: String
    var children: [CategoryIcon]?
}
