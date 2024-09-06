//
//  HighlightText.swift
//  Record
//
//  Created by xiachuan on 2024/9/4.
//

import Foundation
import SwiftUI


struct HighlightText: View {
    let content: String
    let highlightContent: String
    let color: Color
    let font: UIFont
    
    init(content: String, 
         highlightContent: String,
         color: Color = .title,
         font: UIFont = .systemFont(ofSize: 16)) {
        self.content = content
        self.highlightContent = highlightContent
        self.color = color
        self.font = font
    }
    
    var body: some View {
        Text(displayText())
    }
    
    func displayText() -> AttributedString {
        var attributedString = AttributedString(content)
        
        attributedString.foregroundColor = color
        attributedString.font = .init(font)
        
        if let range = attributedString.range(of: highlightContent) {
            attributedString[range].foregroundColor = Color.success
            attributedString[range].font = font
        }
        
        return attributedString
    }
}
