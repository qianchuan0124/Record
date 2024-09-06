//
//  CategoryPicker.swift
//  Record
//
//  Created by xiachuan on 2024/9/4.
//

import Foundation
import SwiftUI

struct CategoryItem: Identifiable, Equatable {
    var id: String {
        return label
    }
    
    let label: String
    var state: ToggleState
    var children: [CategoryItem]?
    
    mutating func changeState(_ newValue: ToggleState) -> CategoryItem {
        self.state = newValue
        return self
    }
}

enum ToggleState {
    case checked
    case unchecked
    case partial
}

struct CategoryPicker: View {
    @State var categories: [CategoryItem]
    @Binding var selectedCategories: [String]
    let cancelAction: VoidBlock
    let confirmAction: ([String]) -> Void
    
    init(selectedCategories: Binding<[String]>,
         cancelAction: @escaping VoidBlock,
         confirmAction: @escaping ([String]) -> Void) {
        
        _categories = .init(initialValue: Self.setCategories(selectedCategories: selectedCategories.wrappedValue))
        self.cancelAction = cancelAction
        self.confirmAction = confirmAction
        _selectedCategories = selectedCategories
    }
    
    var body: some View {
        VStack {
            TitleView(title: L10n.categorySelect)
                .padding(.vertical, 12)
                .padding(.top, 12)
            
            Divider()
            
            ScrollView {
                ForEach(categories, id: \.label) { category in
                    CategoryItemView(model: category) { item in
                        withAnimation {
                            onCategoryTapped(category: item)
                        }
                    } tapSubAction: { item, subItem in
                        withAnimation {
                            onSubCategoryTapped(category: item, subCategory: subItem)
                        }
                    }
                }
            }
            
            ConfirmView(cancelAction: cancelAction) {
                let selected: [String] = categories.flatMap { item in
                    return (item.children ?? []).compactMap { $0.state == .checked ? $0.label : nil }
                }
                confirmAction(selected)
            }
            .padding(.top, 12)
            
            Spacer()
        }
        .padding(.horizontal, 24)
        .onChange(of: selectedCategories) { oldValue, newValue in
            categories = Self.setCategories(selectedCategories: newValue)
        }
    }
    
    static func setCategories(selectedCategories: [String]) -> [CategoryItem]{
        let items: [CategoryItem] = CategoryParser.shared.parse().map { category in
            guard let children = category.children, !children.isEmpty else {
                return .init(label: category.label, state: .unchecked, children: [])
            }
            
            var isSelected = false
            var isSelectedAll = true
            let childrenItem: [CategoryItem] = children.map { subCategory in
                if selectedCategories.contains(where: { $0 == subCategory.label }) {
                    isSelected = true
                    return .init(label: subCategory.label, state: .checked, children: [])
                } else {
                    isSelectedAll = false
                    return .init(label: subCategory.label, state: .unchecked, children: [])
                }
            }
            
            let state: ToggleState
            
            if !isSelected {
                state = .unchecked
            } else {
                if isSelectedAll {
                    state = .checked
                } else {
                    state = .partial
                }
            }
            
            return .init(label: category.label, state: state, children: childrenItem)
        }
        return items
    }
    
    func onCategoryTapped(category: CategoryItem) {
        guard let index = categories.firstIndex(where: { $0 == category }),
              index >= 0,
              index < categories.count else {
            return
        }
        
        var category = categories[index]
        if category.state == .partial || category.state == .unchecked {
            category.state = .checked
            let newSubCategories = (category.children ?? []).map { item in
                var newItem = item
                newItem.state = .checked
                return newItem
            }
            category.children = newSubCategories
        } else {
            category.state = .unchecked
            let newSubCategories = (category.children ?? []).map { item in
                var newItem = item
                newItem.state = .unchecked
                return newItem
            }
            category.children = newSubCategories
        }
        
        categories[index] = category
    }
    
    func onSubCategoryTapped(category: CategoryItem, subCategory: CategoryItem) {
        guard let index = categories.firstIndex(where: { $0 == category }),
              index >= 0,
              index < categories.count else {
            return
        }
        
        var category = categories[index]
        
        guard var subCategories = category.children,
              let subIndex = subCategories.firstIndex(where: { $0 == subCategory }),
              subIndex >= 0,
              subIndex < categories.count else {
            return
        }
        
        var subCategory = subCategories[subIndex]
        
        if subCategory.state == .checked {
            subCategory.state = .unchecked
        } else {
            subCategory.state = .checked
        }
        
        subCategories[subIndex] = subCategory
        
        var isSelected = false
        var isSelectedAll = true
        subCategories.forEach { subCategory in
            if subCategory.state == .checked {
                isSelected = true
            } else {
                isSelectedAll = false
            }
        }
        
        category.children = subCategories
        
        if !isSelected {
            category.state = .unchecked
        } else {
            category.state = isSelectedAll ? .checked : .partial
        }
        
        categories[index] = category
    }
    
    struct CategoryItemView: View {
        let model: CategoryItem
        let tapAction: (CategoryItem) -> Void
        let tapSubAction: (CategoryItem, CategoryItem) -> Void
        @State var showDetail = false
        var body: some View {
            VStack {
                HStack {
                    Image(systemName: showDetail ? "chevron.down" : "chevron.right")
                        .frame(width: 16)
                        .padding(.trailing, 8)
                    
                    PartialToggle(state: model.state)
                        .onTapGesture {
                            tapAction(model)
                        }
                    
                    Text(model.label)
                    
                    Spacer()
                }
                .padding(.vertical, 6)
                .contentShape(Rectangle())
                .onTapGesture {
                    showDetail.toggle()
                }
                
                if showDetail, let children = model.children {
                    LazyVStack {
                        ForEach(children, id: \.label) { subItem in
                            SubCategoryItem(model: subItem) {
                                tapSubAction(model, $0)
                            }
                        }
                    }
                }
            }
        }
    }
    
    struct SubCategoryItem: View {
        let model: CategoryItem
        let tapAction: (CategoryItem) -> Void
        var body: some View {
            HStack {
                PartialToggle(state: model.state)
                Text(model.label)
                Spacer()
            }
            .padding(.leading, 32)
            .padding(.vertical, 6)
            .contentShape(Rectangle())
            .onTapGesture {
                tapAction(model)
            }
        }
    }
}

struct PartialToggle: View {
    let state: ToggleState

    var body: some View {
        Image(systemName: imageName(for: state))
            .resizable()
            .frame(width: 16, height: 16)
            .foregroundStyle(state == .unchecked ? Color.title : Color.success)
    }

    private func imageName(for state: ToggleState) -> String {
        switch state {
        case .checked:
            return "checkmark.square.fill"
        case .unchecked:
            return "square"
        case .partial:
            return "minus.square.fill"
        }
    }
}
