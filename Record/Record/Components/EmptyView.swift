//
//  EmptyView.swift
//  Record
//
//  Created by xiachuan on 2024/9/5.
//

import Foundation
import SwiftUI

struct RecordEmptyView: View {
    var body: some View {
        VStack(alignment: .center, spacing: 12) {
            Image(name: "data_empty")
            
            HStack {
                Spacer()
                Text(L10n.emptyData)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(Color.title.opacity(0.6))
                
                Spacer()
            }
        }
    }
}
