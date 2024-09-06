//
//  CleanableTextField.swift
//  Record
//
//  Created by xiachuan on 2024/9/6.
//

import Foundation
import SwiftUI

struct CleanableTextField: View {
    @Binding var text: String
    let placeholder: String
    let isDecimalPad: Bool
    let width: CGFloat
    
    var body: some View {
        HStack(alignment: .center) {
            TextField(placeholder, text: $text)
                .padding(.horizontal, 12)
                .keyboardType(.decimalPad)
                .background(Color.clear)
            
            Spacer()
            
            if (!text.isEmpty) {
                Image(systemName: "xmark.circle")
                    .foregroundStyle(Color.subInfo)
                    .onTapGesture {
                        text = ""
                    }
                    .padding(.trailing, 12)
            }
        }
        .frame(width: width, height: 32)
        .background(Color.info)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
