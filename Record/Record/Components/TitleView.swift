//
//  TitleView.swift
//  Record
//
//  Created by xiachuan on 2024/9/2.
//

import Foundation
import SwiftUI

struct TitleView: View {
    let title: String
    var body: some View {
        HStack {
            Spacer()
            Text(title)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(Color.title)
            
            Spacer()
        }
    }
}
