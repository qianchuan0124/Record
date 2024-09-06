//
//  DetailBar.swift
//  Record
//
//  Created by xiachuan on 2024/9/1.
//

import SwiftUI

struct DetailBar: View {
    @Binding var startDate: Date
    @Binding var endDate: Date
    @Binding var income: Float
    @Binding var outcome: Float
    
    var body: some View {
        HStack {
            Text(startDate.formateRange(to: endDate))
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Color.title)
            
            Spacer()
            
            Text("+\(income.toFormatter())")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Color.success)
            
            Text("/")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Color.subInfo)
            
            Text("-\(outcome.toFormatter())")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Color.failed)
        }
        .padding(.vertical, 12)
    }
}


struct YearlyDetailBar: View {
    var year: Int?
    var income: Float?
    var outcome: Float?
    
    var body: some View {
        HStack {
            Text(Date().yearFormate(year: year))
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Color.title)
            
            Spacer()
            
            Text("+\(income?.toFormatter() ?? "0.00")")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Color.success)
            
            Text("/")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Color.subInfo)
            
            Text("-\(outcome?.toFormatter() ?? "0.00")")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Color.failed)
        }
        .padding(.vertical, 12)
    }
}
