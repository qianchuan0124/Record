//
//  PieView.swift
//  Record
//
//  Created by xiachuan on 2024/9/1.
//

import SwiftUI
import Charts

struct PieView: View {
    let data: [PieData]
    let tapAction: (PieData) -> Void
    
    @State private var selectedCount: Int?
    
    var body: some View {
        HStack {
            CustomLegend(data: data)
            
            Chart(data) { element in
                SectorMark(
                    angle: .value("Value", element.amount),
                    innerRadius: .ratio(0.0),
                    angularInset: 1.0
                )
                .foregroundStyle(element.color)
            }
            .frame(height: 200)
            .chartAngleSelection(value: $selectedCount)
            .padding()
            
        }
        .onChange(of: selectedCount) { oldValue, newValue in
            if let newValue, let data = findSelectedSector(value: newValue) {
                tapAction(data)
            }
        }
        .padding()
    }
    
    private func findSelectedSector(value: Int) -> PieData? {
        var accumulatedCount = 0

        let pie = data.first { data in
            accumulatedCount += Int(data.amount)
            return value <= accumulatedCount
        }

        return pie
    }
}

struct CustomLegend: View {
    let data: [PieData]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(data) { element in
                HStack(alignment: .top, spacing: 6) {
                    Circle()
                        .fill(element.color)
                        .frame(width: 10, height: 10)
                        .padding(.top, 2)
                    
                    VStack(alignment: .leading) {
                        Text("\(element.name)")
                        Text("\(element.amount.toFormatter())")
                    }
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)
                }
                .padding(.trailing, 10)
            }
        }
    }
}
