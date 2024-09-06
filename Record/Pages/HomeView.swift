//
//  HomeView.swift
//  Record
//
//  Created by xiachuan on 2024/9/1.
//

import Foundation
import SwiftUI
import AlertToast

struct HomeView: View {
    @ObservedObject var viewModel: RecordViewModel
    
    @State private var showCreateSheet = false
    @State private var showFilterSheet = false
    @State private var showToast = false
    @State private var showDeleteToast = false
    @State private var toastInfo: String?
    @State private var selectedRecord: Record?
    @State private var editRecord: Record?
    
    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(L10n.recordList)
                    .font(.system(size: 21, weight: .bold))
                Spacer()
//                Text(L10n.recordClear)
//                    .font(.system(size: 21, weight: .bold))
//                    .onTapGesture {
//                        viewModel.cleanup()
//                    }
            }
            .padding(.bottom, 12)
            
            
            HStack(alignment: .center, spacing: 12) {
                ZStack(alignment: .bottom) {
                    Image("record_total")
                    VStack {
                        VStack(alignment: .trailing, spacing: 12) {
                            Text("+ \(viewModel.totalIncome.toFormatter())")
                                .foregroundStyle(Color.success)
                            Text("- \(viewModel.totalOutcome.toFormatter())")
                                .foregroundStyle(Color.failed)
                        }
                        .padding(.trailing, 64)
                        .padding(.bottom, 38)
                    }
                    .font(.system(size: 27, weight: .bold))
                }
                
                Image("record_add")
                    .onTapGesture {
                        showCreateSheet = true
                    }
            }
            
            SearchBar(searchKey: $viewModel.searchKey) {
                showFilterSheet = true
            } tapSearch: {
                viewModel.onSearchKeyChanged($0)
            }
            .padding(.vertical, 12)
            
            Divider()
                .padding(.horizontal, 6)
            
            DetailBar(startDate: $viewModel.filter.startDate,
                      endDate: $viewModel.filter.endDate,
                      income: $viewModel.rangeIncome,
                      outcome: $viewModel.rangeOutcome)
            .padding(.horizontal, 6)
            
            if viewModel.records.isEmpty {
                RecordEmptyView()
            } else {
                RecordList(records: $viewModel.records,
                           searchKey: $viewModel.searchKey,
                           deleteAction: {
                    self.selectedRecord = $0
                    showDeleteToast = true
                }) {
                    editRecord = $0
                }
            }
            
            Spacer()
        }
        .padding(.horizontal, 16)
        .toast(isPresenting: $showToast, duration: 1.5, alert: {
            AlertToast(displayMode: .alert, type: .regular, title: toastInfo)
        })
        .onReceive(viewModel.toast, perform: { toast in
            toastInfo = toast
            showToast = true
        })
        .sheet(isPresented: $showCreateSheet) {
            CreateView(confirmAction: viewModel.insertRecord, dismissAction: { showCreateSheet = false })
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .sheet(item: $editRecord, onDismiss: {
            editRecord = nil
        }, content: { record in
            EditView(record: record, confirmAction: {
                viewModel.editRecord($0)
                editRecord = nil
            }) {
                editRecord = nil
            }
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        })
        .sheet(isPresented: $showFilterSheet) {
            FilterView(filter: viewModel.filter, cancelAction: { showFilterSheet = false }) {
                viewModel.onFilterChanged($0)
                showFilterSheet = false
            }
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
        }
        .confirmDialog(isPresented: $showDeleteToast, title: L10n.deleteRecordDialog, info: L10n.confirmDeleteRecord) {
            self.selectedRecord = nil
            showDeleteToast = false
        } onConfirm: {
            guard let selectedRecord else {
                return
            }
            viewModel.deleteRecord(selectedRecord)
            self.selectedRecord = nil
            showDeleteToast = false
        }
        
    }
    
    
    struct CreateView: View {
        @State var time = Date()
        @State var isIncome = false
        @State var selectedCategory = CategoryParser.shared.firstItemCategory()
        @State var selectedSubCategory = CategoryParser.shared.firstSubItemCategory(parent: CategoryParser.shared.firstItemCategory())
        @State var amount = ""
        @State var remark = ""
        
        let confirmAction: (Record) -> Void
        let dismissAction: VoidBlock
        var body: some View {
            VStack {
                TitleView(title: L10n.recordCreate)
                    .padding(.vertical, 24)
                    .padding(.top, 12)
                
                TimeSelectItem(time: $time)
                TypeSelectItem(isIncome: $isIncome)
                CategorySelectItem(selectedCategory: $selectedCategory,
                                   selectedSubCategory: $selectedSubCategory)
                AmountSelectItem(amount: $amount)
                RemarkSelectItem(remark: $remark)
                
                ConfirmView(cancelAction: dismissAction) {
                    let record = Record(date: time.resetTime(),
                                        amount: Float(amount) ?? 0.0,
                                        type: isIncome ? RecordType.income.description : RecordType.outcome.description,
                                        category: selectedCategory,
                                        subCategory: selectedSubCategory,
                                        remark: remark)
                    confirmAction(record)
                    dismissAction()
                }
                .padding(.vertical, 24)
                
                Spacer()
            }
            .onChange(of: selectedCategory) { oldValue, newValue in
                selectedSubCategory = CategoryParser.shared.firstSubItemCategory(parent: newValue)
            }
        }
    }
    
    struct FilterView: View {
        let filter: Filter
        @State var selectedTypes: [String]
        @State var selectedCategories: [String]
        @State var startDate: Date
        @State var endDate: Date
        let cancelAction: VoidBlock
        let confirmAction: (Filter) -> Void
        
        init(filter: Filter, cancelAction: @escaping VoidBlock, confirmAction: @escaping (Filter) -> Void) {
            self.filter = filter
            _selectedTypes = .init(initialValue: filter.types)
            _selectedCategories = .init(initialValue: filter.subCategories)
            _startDate = .init(initialValue: filter.startDate)
            _endDate = .init(initialValue: filter.endDate)
            self.cancelAction = cancelAction
            self.confirmAction = confirmAction
        }
        
        var body: some View {
            VStack {
                TitleView(title: L10n.recordFilter)
                    .padding(.vertical, 24)
                    .padding(.top, 12)
                
                TimeRangeSelectItem(startDate: $startDate,
                                    endDate: $endDate) {
                    startDate = $0
                    endDate = $1
                }
                
                TypeRangeSelectItem(selectedTypes: $selectedTypes, onTypesChanged: { selectedTypes = $0 })
                
                CategoryRangeSelectItem(selectedCategories: $selectedCategories,
                                        confirmAction: { selectedCategories = $0 })
                
                ConfirmView(cancelTitle: L10n.recordReset, cancelAction: {
                    withAnimation {
                        selectedTypes = []
                        selectedCategories = []
                        startDate = Date().startOfMonth()
                        endDate = Date().endOfMonth()
                    }
                }) {
                    let filter = Filter(startDate: startDate,
                                        endDate: endDate,
                                        types: selectedTypes,
                                        subCategories: selectedCategories)
                    confirmAction(filter)
                }
                .padding(.top, 24)
                
                Spacer()
            }
        }
    }
    
    struct EditView: View {
        @State var time: Date
        @State var isIncome: Bool
        @State var selectedCategory: String
        @State var selectedSubCategory: String
        @State var amount: String
        @State var remark: String
        
        init(record: Record,
             confirmAction: @escaping (Record) -> Void,
             dismissAction: @escaping VoidBlock) {
            _time = .init(initialValue: record.date)
            _isIncome = .init(initialValue: record.isIncome)
            _selectedCategory = .init(initialValue: record.category)
            _selectedSubCategory = .init(initialValue: record.subCategory)
            _amount = .init(initialValue: "\(record.amount)")
            _remark = .init(initialValue: record.remark)
            self.record = record
            self.confirmAction = confirmAction
            self.dismissAction = dismissAction
        }
        
        let record: Record
        let confirmAction: (Record) -> Void
        let dismissAction: VoidBlock
        
        var body: some View {
            VStack {
                TitleView(title: L10n.update)
                    .padding(.vertical, 24)
                    .padding(.top, 12)
                
                TimeSelectItem(time: $time)
                TypeSelectItem(isIncome: $isIncome)
                CategorySelectItem(selectedCategory: $selectedCategory,
                                   selectedSubCategory: $selectedSubCategory)
                AmountSelectItem(amount: $amount)
                RemarkSelectItem(remark: $remark)
                
                ConfirmView(cancelAction: dismissAction) {
                    let record = Record(
                        id: record.id,
                        date: time.resetTime(),
                        amount: Float(amount) ?? 0.0,
                        type: isIncome ? RecordType.income.description : RecordType.outcome.description,
                        category: selectedCategory,
                        subCategory: selectedSubCategory,
                        remark: remark
                    )
                    confirmAction(record)
                    dismissAction()
                }
                .padding(.vertical, 24)
                
                Spacer()
            }
            .onChange(of: selectedCategory) { oldValue, newValue in
                selectedSubCategory = CategoryParser.shared.firstSubItemCategory(parent: newValue)
            }
        }
    }
}
