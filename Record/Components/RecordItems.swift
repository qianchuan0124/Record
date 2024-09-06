//
//  RecordItems.swift
//  Record
//
//  Created by xiachuan on 2024/9/2.
//

import Foundation
import SwiftUI

struct TimeSelectItem: View {
    @Binding var time: Date
    
    var body: some View {
        HStack {
            Text(L10n.time)
            HStack {
                DatePicker("", selection: $time, displayedComponents: [.date])
                    .environment(\.locale, Locale(identifier: "zh_CN"))
                    .scaledToFit()
                    .labelsHidden()
                Spacer()
            }
            .frame(width: 250)
        }
    }
}

struct TypeSelectItem: View {
    @Binding var isIncome: Bool
    var body: some View {
        HStack {
            Text(L10n.type)
            RadioItemView(isSelected: isIncome, content: RecordType.income.description)
                .onTapGesture {
                    withAnimation {
                        isIncome = true
                    }
                }
            
            RadioItemView(isSelected: !isIncome, content: RecordType.outcome.description)
                .onTapGesture {
                    withAnimation {
                        isIncome = false
                    }
                }
        }
    }
}

struct CategorySelectItem: View {
    @Binding var selectedCategory: String
    @Binding var selectedSubCategory: String
    let categories = CategoryParser.shared.firstLevelCategories()
    var body: some View {
        HStack {
            Text(L10n.category)
            
            Menu {
                ForEach(categories.reversed(), id: \.self) { option in
                    Button(action: {
                        selectedCategory = option
                    }) {
                        Text(option)
                    }
                }
            } label: {
                SingleItemView(content: selectedCategory)
            }
            
            Menu {
                ForEach(subCategories().reversed(), id: \.self) { option in
                    Button(action: {
                        selectedSubCategory = option
                    }) {
                        Text(option)
                    }
                }
            } label: {
                SingleItemView(content: selectedSubCategory)
            }
        }
    }
    
    func subCategories() -> [String] {
        CategoryParser.shared.secondLevelCategories(parent: selectedCategory)
    }
}

struct AmountSelectItem: View {
    @Binding var amount: String
    let width: CGFloat
    
    init(amount: Binding<String>, width: CGFloat = 250) {
        _amount = amount
        self.width = width
    }
    
    var body: some View {
        HStack {
            Text(L10n.amount)
            
            CleanableTextField(text: $amount,
                               placeholder: L10n.inputAmount,
                               isDecimalPad: true,
                               width: width)
        }
    }
}

struct RemarkSelectItem: View {
    @Binding var remark: String
    var body: some View {
        HStack {
            Text(L10n.remark)
            
            CleanableTextField(text: $remark,
                               placeholder: L10n.inputRemark,
                               isDecimalPad: false,
                               width: 250)
        }
    }
}


struct ConfirmView: View {
    let confirmTitle: String
    let cancelTitle: String
    let cancelAction: VoidBlock
    let confirmAction: VoidBlock
    
    init(confirmTitle: String = L10n.confirm,
         cancelTitle: String = L10n.cancel,
         cancelAction: @escaping VoidBlock,
         confirmAction: @escaping VoidBlock) {
        self.confirmTitle = confirmTitle
        self.cancelTitle = cancelTitle
        self.cancelAction = cancelAction
        self.confirmAction = confirmAction
    }
    
    var body: some View {
        HStack(spacing: 0) {
            Button(role: .cancel) {
                cancelAction()
            } label: {
                Text(cancelTitle)
                    .font(.system(size: 16, weight: .bold))
                    .padding(.horizontal, 52)
                    .padding(.vertical, 8)
                    .background(Color.failed)
                    .contentShape(Rectangle())
            }
            
            Button(role: .cancel) {
                confirmAction()
            } label: {
                Text(confirmTitle)
                    .font(.system(size: 16, weight: .bold))
                    .padding(.horizontal, 52)
                    .padding(.vertical, 8)
                    .background(Color.success)
                    .contentShape(Rectangle())
            }
        }
        .foregroundStyle(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }
}

struct RadioItemView: View {
    var isSelected: Bool
    let content: String
    var body: some View {
        HStack {
            Spacer()
            if isSelected {
                Image(systemName: "checkmark")
            }
            Text(content)
            Spacer()
        }
        .frame(width: 120, height: 32)
        .background(isSelected ? Color.success.opacity(0.2) : Color.info)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}


struct SingleItemView: View {
    let content: String
    let width: CGFloat
    
    init(content: String, width: CGFloat = 120) {
        self.content = content
        self.width = width
    }
    
    var body: some View {
        HStack(alignment: .center) {
            Spacer()
            Text(content)
                .foregroundStyle(Color.title)
            Spacer()
        }
        .frame(width: width, height: 32)
        .background(Color.info)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}


struct TimeRangeSelectItem: View {
    @Binding var startDate: Date
    @Binding var endDate: Date
    let dateRangeChanged: (Date, Date) -> Void
    var body: some View {
        HStack {
            Text(L10n.time)
            
            HStack {
                DatePicker("", selection: $startDate, displayedComponents: [.date])
                    .environment(\.locale, Locale(identifier: "zh_CN"))
                    .scaledToFit()
                    .labelsHidden()
                    .frame(width: 140)
                
                Spacer()
                
                Text("~")
                
                Spacer()
                
                DatePicker("", selection: $endDate, in: startDate..., displayedComponents: [.date])
                    .environment(\.locale, Locale(identifier: "zh_CN"))
                    .scaledToFit()
                    .labelsHidden()
                    .frame(width: 140)
                
                Spacer()
            }
            .frame(width: 320)
        }
        .onChange(of: startDate) { oldValue, newValue in
            dateRangeChanged(newValue, endDate)
        }
        .onChange(of: endDate) { oldValue, newValue in
            dateRangeChanged(startDate, newValue)
        }
    }
}

struct TypeRangeSelectItem: View {
    @Binding var selectedTypes: [String]
    let onTypesChanged: ([String]) -> Void
    @State var isIncome: Bool
    @State var isOutcome: Bool
    
    init(selectedTypes: Binding<[String]>, onTypesChanged: @escaping ([String]) -> Void) {
        _selectedTypes = selectedTypes
        self.onTypesChanged = onTypesChanged
        _isIncome = .init(initialValue: selectedTypes.wrappedValue.contains(RecordType.income.description))
        _isOutcome = .init(initialValue: selectedTypes.wrappedValue.contains(RecordType.outcome.description))
    }
    
    var body: some View {
        HStack {
            Text(L10n.type)
            HStack {
                RadioItemView(isSelected: isIncome, content: RecordType.income.description)
                    .onTapGesture {
                        withAnimation {
                            isIncome.toggle()
                        }
                        typeChanged()
                    }
                
                RadioItemView(isSelected: isOutcome, content: RecordType.outcome.description)
                    .onTapGesture {
                        withAnimation {
                            isOutcome.toggle()
                        }
                        typeChanged()
                    }
                
                Spacer()
            }
            .frame(width: 320)
        }
        .onChange(of: selectedTypes) { oldValue, newValue in
            isIncome = newValue.contains(RecordType.income.description)
            isOutcome = newValue.contains(RecordType.outcome.description)
        }
    }
    
    func typeChanged() {
        var result = [String]()
        if isIncome {
            result.append(RecordType.income.description)
        }
        
        if isOutcome {
            result.append(RecordType.outcome.description)
        }
        
        onTypesChanged(result)
    }
}

struct CategoryRangeSelectItem: View {
    @Binding var selectedCategories: [String]
    let confirmAction: ([String]) -> Void
    @State var showDialog = false
    
    var body: some View {
        HStack {
            Text(L10n.category)
            
            HStack {
                SingleItemView(content: L10n.selectCategory, width: 260)
                    .onTapGesture {
                        showDialog = true
                    }
                
                if selectedCategories.count > 0 {
                    Circle()
                        .stroke(Color.success, lineWidth: 2)
                        .frame(width: 26, height: 26)
                        .overlay(
                            Text("\(selectedCategories.count)")
                                .foregroundColor(.success)
                        )
                }
                
                Spacer()
            }
            .frame(width: 320)
        }
        .sheet(isPresented: $showDialog) {
            CategoryPicker(selectedCategories: $selectedCategories,
                           cancelAction: { showDialog = false }) {
                confirmAction($0)
                showDialog = false
            }
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
    }
}
