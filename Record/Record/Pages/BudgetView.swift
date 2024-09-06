//
//  BudgetView.swift
//  Record
//
//  Created by xiachuan on 2024/9/1.
//

import Foundation
import SwiftUI
import AlertToast

struct BudgetView: View {
    @ObservedObject var viewModel: BudgetViewModel
    
    @State private var showDialog = false
    @State private var showDeleteDialog = false
    @State private var selectedBudget: Budget?
    @State private var showToast = false
    @State private var toastInfo: String?
    
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .top) {
                Image(name: "info_background")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: geometry.size.width)
                    .clipped()
                
                VStack {
                    VStack(alignment: .center) {
                        Spacer()
                        Text(L10n.currentMonthAmount)
                            .font(.system(size: 12))
                        Text("￥\(viewModel.currentMonthOutcome.toFormatter())")
                            .font(.system(size: 36, weight: .bold))
                        Spacer()
                    }
                    .foregroundStyle(Color.white)
                    
                    VStack {
                        HStack(alignment: .center, spacing: 24) {
                            Image(name: "budget_add")
                                .frame(width: 24, height: 24)
                                .padding(.vertical, 8)
                                .padding(.leading, 36)
                            
                            Text(L10n.createNewBudget)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Color.white)
                            
                            Spacer()
                        }
                        .background(Color.black.opacity(0.8))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .padding(.horizontal, 24)
                        .padding(.top, 24)
                        .padding(.bottom, 6)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            showDialog = true
                        }
                        
                        BudgetList(
                            budgetList: viewModel.budgets,
                            editAction: {
                                selectedBudget = $0
                                showDialog = true
                            },
                            deleteAction: {
                                selectedBudget = $0
                                showDeleteDialog = true
                            }
                        )
                        
                    }
                    .frame(height: geometry.size.height * 0.7)
                    .background(Color.white)
                    .clipShape(CustomCorners(corners: [.topLeft, .topRight], radius: 25))
                    .padding(.bottom, 20)
                }
            }
            .customDialog(isPresented: $showDialog) {
                let categories = CategoryParser.shared.firstLevelCategories().filter { category in !viewModel.budgetInfos.contains(where: { $0.category == category })}
                if let selectedBudget {
                    BudgetEditView(title: L10n.updateBudget,
                                   categories: categories,
                                   canSelect: false,
                                   selectedCategory: selectedBudget.category,
                                   amount: "\(selectedBudget.all)",
                                   onDismiss: {
                        showDialog = false
                        self.selectedBudget = nil
                    }) {
                        showDialog = false
                        self.selectedBudget = nil
                        viewModel.editBudget($0)
                    }
                } else {
                    BudgetEditView(title: L10n.createBudget,
                                   categories: categories,
                                   canSelect: true,
                                   selectedCategory: categories.first ?? "",
                                   amount: "", onDismiss: {
                        showDialog = false
                        self.selectedBudget = nil
                    }) {
                        showDialog = false
                        self.selectedBudget = nil
                        viewModel.addBudget($0)
                    }
                }
            }
            .confirmDialog(isPresented: $showDeleteDialog, title: L10n.deleteBudget, info: L10n.confirmDeleteBudget) {
                showDeleteDialog = false
                self.selectedBudget = nil
            } onConfirm: {
                guard let selectedBudget else {
                    return
                }
                self.selectedBudget = nil
                viewModel.deleteBudget(selectedBudget)
            }
            .toast(isPresenting: $showToast, duration: 1.5, alert: {
                AlertToast(displayMode: .alert, type: .regular, title: toastInfo)
            })
            .onReceive(viewModel.toast, perform: { toast in
                toastInfo = toast
                showToast = true
            })
        }
    }
    
    struct BudgetEditView: View {
        let title: String
        let categories: [String]
        let canSelect: Bool
        @State var selectedCategory: String
        @State var amount: String
        var onDismiss: VoidBlock
        var onConfirm: (BudgetInfo) -> Void
        
        var body: some View {
            VStack(alignment: .center) {
                TitleView(title: title)
                    .padding(.bottom, 24)
                
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
                        HStack {
                            SingleItemView(content: selectedCategory)
                            Spacer()
                        }
                        .frame(width: 160)
                    }
                    .disabled(!canSelect)
                }
                
                AmountSelectItem(amount: $amount, width: 160)
                
                DialogBottomView(onDismiss: onDismiss, onConfirm: {
                    onConfirm(.init(all: Float(amount) ?? 0.0, category: selectedCategory))
                })
                .padding(.top, 24)
            }
        }
    }
    
    struct BudgetList: View {
        let budgetList: [Budget]
        let editAction: (Budget) -> Void
        let deleteAction: (Budget) -> Void
        var body: some View {
            ScrollView {
                ForEach(budgetList) { item in
                    BudgetCell(budget: item, editAction: editAction, deleteAction: deleteAction)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 6)
                }
            }
        }
    }
    
    struct BudgetCell: View {
        let budget: Budget
        let editAction: (Budget) -> Void
        let deleteAction: (Budget) -> Void
        var body: some View {
            HStack(alignment: .center, spacing: 12) {
                Image(name: CategoryParser.shared.categoryIcon(parent: budget.category))
                    .resizable()
                    .frame(width: 36, height: 36)
                    .padding(18)
                
                VStack(alignment: .center) {
                    HStack(spacing: 0) {
                        Text(budget.category)
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Color.title)
                        Spacer()
                        Group {
                            Text(budget.current.toFormatter())
                                .foregroundStyle(budget.current > budget.all ? Color.failed : Color.text)
                            
                            Text("/")
                                .foregroundStyle(Color.text)
                            
                            Text(budget.all.toFormatter())
                                .foregroundStyle(Color.success)
                        }
                        .font(.system(size: 12, weight: .medium))
                    }
                    
                    GradientProgressBar(progress: .constant(min(Double(budget.current / budget.all), 1.0)))
                }
            }
            .padding(.horizontal, 14)
            .background(Color.info)
            .contextMenu {
                Button(L10n.edit) {
                    editAction(budget)
                }
                
                if budget.category != L10n.totalBudget {
                    Button(L10n.delete) {
                        deleteAction(budget)
                    }
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 20))
        }
    }
}
