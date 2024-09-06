//
//  SearchBar.swift
//  Record
//
//  Created by xiachuan on 2024/9/1.
//

import SwiftUI

struct SearchBar: View {
    @Binding var searchKey: String
    let tapFilter: VoidBlock
    let tapSearch: (String) -> Void
    var body: some View {
        HStack(alignment: .center, spacing: 18) {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(Color.subInfo)
                
                TextField(L10n.inputSearchInfo, text: $searchKey)
                    .onSubmit {
                        tapSearch(searchKey)
                    }
                
                Spacer()
                
                if (!searchKey.isEmpty) {
                    Image(systemName: "xmark.circle")
                        .foregroundStyle(Color.subInfo)
                        .onTapGesture {
                            searchKey = ""
                        }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .padding(.leading, 20)
            
            Image(name: "record_filter")
                .frame(width: 36, height: 36)
                .padding(.trailing, 5)
                .onTapGesture {
                    tapFilter()
                }
        }
        .padding(.vertical, 6)
        .background(Color.info)
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }
}
