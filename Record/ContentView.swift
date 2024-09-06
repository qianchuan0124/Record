//
//  ContentView.swift
//  Record
//
//  Created by xiachuan on 2024/9/1.
//

import SwiftUI

struct ContentView: View {
    @State var selected: PageType = .home
    @ObservedObject var recordVM = RecordViewModel()
    @ObservedObject var analysisVM = AnalysisViewModel()
    @ObservedObject var budgetVM = BudgetViewModel()
    var body: some View {
        TabView(selection: $selected) {
            ForEach(PageType.allCases.indices, id: \.self) { index in
                let type = PageType.allCases[index]
                
                contentView(type: type)
                .tabItem {
                    itemView(type: type, selected: selected)
                }
                .tag(type)
            }
        }
        .onAppear {
            UITabBar.appearance().backgroundColor = UIColor.hex(0xEFF1F3)
        }
    }
    
    func contentView(type: PageType) -> some View {
        Group {
            VStack {
                switch type {
                case .home:
                    HomeView(viewModel: recordVM)
                case .analysis:
                    AnalysisView(viewModel: analysisVM)
                case .budget:
                    BudgetView(viewModel: budgetVM)
                case .setting:
                    SettingView()
                }
            }
        }
    }
    
    func itemView(type: PageType, selected: PageType) -> some View {
        if selected == type {
            type.model.selectedIcon.toImage()
        } else {
            type.model.defaultIcon.toImage()
        }
    }
}
