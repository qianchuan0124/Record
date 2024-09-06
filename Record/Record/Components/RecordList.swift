//
//  RecordList.swift
//  Record
//
//  Created by xiachuan on 2024/9/1.
//

import SwiftUI

struct RecordList: View {
    @Binding var records: [Record]
    @Binding var searchKey: String
    let deleteAction: RecordBlock
    let editAction: RecordBlock
    @State private var isAtBottom = false
    var body: some View {
        ScrollViewReader { proxy in
            List(records) { record in
                Section {
                    RecordCell(model: record,
                               searchKey: $searchKey,
                               editAction: editAction,
                               deleteAction: deleteAction)
                    .listRowInsets(.init(top: 6, leading: 6, bottom: 6, trailing: 6))
                    .listRowSeparator(.hidden)
                    .onAppear {
                        if record.id == records.last?.id {
                            isAtBottom = true
                        }
                    }
                    .onDisappear {
                        if record.id == records.last?.id {
                            isAtBottom = false
                        }
                    }
                }
                .id(record.id)
            }
            .listStyle(.plain)
            .scrollIndicators(.hidden)
            .padding(.horizontal, 0)
            .overlay(alignment: .bottomTrailing) {
                if !isAtBottom {
                    Button {
                        withAnimation {
                            proxy.scrollTo(records.first?.id)
                        }
                    } label: {
                        Circle()
                            .fill(Color.info)
                            .frame(width: 46, height: 46)
                            .shadow(color: .gray, radius: 10, x: 0, y: 5)
                            .overlay {
                                Image(systemName: "chevron.up")
                                    .foregroundStyle(Color.title)
                            }
                    }
                }
            }
        }
    }
}

struct RecordCell: View {
    let model: Record
    @Binding var searchKey: String
    let editAction: RecordBlock
    let deleteAction: RecordBlock
    var body: some View {
        HStack(alignment: .center) {
            Image(name: CategoryParser.shared.categoryIcon(parent: model.category, sub: model.subCategory))
                .resizable()
                .frame(width: 32, height: 32)
                .padding(13)
                .background(Color.info)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.trailing, 12)
            
            VStack(alignment: .leading) {
                HighlightText(content: model.subCategory,
                              highlightContent: searchKey,
                              font: .systemFont(ofSize: 16, weight: .medium))
                HStack(alignment: .center) {
                    HighlightText(content: model.date.formate(),
                                  highlightContent: searchKey,
                                  color: .text,
                                  font: .systemFont(ofSize: 12, weight: .medium))
                        .layoutPriority(200)
                    if !model.remark.isEmpty {
                        Text("•")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundStyle(Color.text)
                            .padding(.bottom, 2)
                        
                        HighlightText(content: model.remark,
                                      highlightContent: searchKey, 
                                      color: .text,
                                      font: .systemFont(ofSize: 12, weight: .medium))
                            .lineLimit(1)
                            .truncationMode(.tail)
                    }
                }
                .padding(.top, 6)
            }
            
            Spacer()
            
            Text("\(model.isIncome ? "+" : "-") \(model.amount.toFormatter())")
                .foregroundStyle(model.isIncome ? Color.success : Color.failed)
                .font(.system(size: 16, weight: .medium))
        }
        .swipeActions(edge: .trailing) {
            Button {
                deleteAction(model)
            } label: {
                Text(L10n.delete)
                    .foregroundColor(.white)
                    .font(.system(size: 15))
            }
            .tint(Color.failed)
        }
        .swipeActions(edge: .leading) {
            Button {
                editAction(model)
            } label: {
                Text(L10n.edit)
                    .foregroundColor(.white)
                    .font(.system(size: 15))
            }
            .tint(Color.success)
            .padding(.trailing, 20)
        }
    }
}
