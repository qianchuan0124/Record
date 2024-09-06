//
//  PageModel.swift
//  Record
//
//  Created by xiachuan on 2024/9/1.
//

import Foundation

enum PageType: CaseIterable {
    case home
    case analysis
    case budget
    case setting
    
    var model: PageModel {
        switch self {
        case .home:
            return .init(defaultIcon: "home_default", selectedIcon: "home_highlight")
        case .analysis:
            return .init(defaultIcon: "analysis_default", selectedIcon: "analysis_highlight")
        case .budget:
            return .init(defaultIcon: "budget_default", selectedIcon: "budget_highlight")
        case .setting:
            return .init(defaultIcon: "person_default", selectedIcon: "person_highlight")
        }
    }
}

struct PageModel {
    var defaultIcon: String
    var selectedIcon: String
}


