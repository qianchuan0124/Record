//
//  AnalysisView.swift
//  Record
//
//  Created by xiachuan on 2024/9/1.
//

import Foundation
import SwiftUI

struct AnalysisView: View {
    @ObservedObject var viewModel: AnalysisViewModel
    
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .top) {
                Image(name: "info_background")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: geometry.size.width)
                    .clipped()
                
                VStack {
                    PieView(data: viewModel.yearlyDatas.enumerated().map {
                        .init(name: "\($1.year)", amount: $1.totalOutcome, color: PieData.getColor(index: $0))
                    }) {
                        viewModel.tapChanged($0)
                    }
                    
                    Spacer()
                    
                    VStack(spacing: 0) {
                        YearlyDetailBar(year: viewModel.selectedYearlyData?.year,
                                        income: viewModel.selectedYearlyData?.totalIncome,
                                        outcome: viewModel.selectedYearlyData?.totalOutcome)
                        .padding(.horizontal, 12)
                        
                        Divider()
                            .padding(.bottom, 1)
                        
                        if let yearlyData = viewModel.selectedYearlyData, !yearlyData.recordMap.isEmpty {
                            List(yearlyData.recordMap) { item in
                                Section {
                                    CategoryItemsView(model: item)
                                        .listRowInsets(.init())
                                        .listRowSeparator(.hidden)
                                }
                                .listRowInsets(EdgeInsets())
                            }
                            .padding(.vertical, 0)
                            .environment(\.defaultMinListRowHeight, 0)
                            .listStyle(.plain)
                        } else {
                            RecordEmptyView()
                            Spacer()
                        }
                    }
                    .frame(height: geometry.size.height * 0.6)
                    .background(Color.white)
                    .clipShape(CustomCorners(corners: [.topLeft, .topRight], radius: 25))
                    .padding(.bottom, 20)
                }
            }
        }
    }
    
    struct CategoryItemsView: View {
        let model: CategoryRecord
        @State var showDetail = false
        
        var body: some View {
            VStack(spacing: 0) {
                HStack(spacing: 0) {
                    Image(systemName: showDetail ? "chevron.down" : "chevron.right")
                        .frame(width: 16)
                        .padding(.trailing, 8)
                    
                    Text(model.category)
                        .foregroundStyle(Color.title)
                    
                    Spacer()
                    
                    HStack {
                        Text("+ \(model.totalIncome.toFormatter())")
                            .foregroundStyle(Color.success)
                        
                        Text("/")
                            .foregroundStyle(Color.subInfo)
                        
                        Text("- \(model.totalOutcome.toFormatter())")
                            .foregroundStyle(Color.failed)
                    }
                }
                .font(.system(size: 16))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .onTapGesture {
                    showDetail.toggle()
                }
                
                if (showDetail) {
                    ForEach(model.items) {
                        SubCategoryItemView(model: $0)
                    }
                    .padding(.horizontal, 12)
                }
            }
        }
        
        struct SubCategoryItemView: View {
            let model: SubCategoryRecord
            var body: some View {
                HStack {
                    Text(model.subCategory)
                    
                    Spacer()
                    
                    Text("+ \(model.totalIncome.toFormatter())")
                        .foregroundStyle(Color.success)
                    
                    Text("/")
                        .foregroundStyle(Color.subInfo)
                    
                    Text("- \(model.totalOutcome.toFormatter())")
                        .foregroundStyle(Color.failed)
                }
                .font(.system(size: 16))
                .padding(.leading, 24)
                .padding(.vertical, 12)
            }
        }
    }
}
