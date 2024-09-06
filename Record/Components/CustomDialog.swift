//
//  CustomDialog.swift
//  Record
//
//  Created by xiachuan on 2024/9/3.
//

import Foundation
import SwiftUI

struct CustomDialogModifier<DialogContent: View>: ViewModifier {
    @Binding var isPresented: Bool
    let dialogContent: () -> DialogContent

    func body(content: Content) -> some View {
        ZStack {
            content
                .blur(radius: isPresented ? 5 : 0)
                .disabled(isPresented) // 禁用背景内容

            if isPresented {
                Color.black.opacity(0.4)
                    .edgesIgnoringSafeArea(.all)

                VStack(spacing: 20) {
                    dialogContent()
                }
                .toolbar(isPresented ? .hidden : .visible, for: .tabBar)
                .padding()
                .background(Color.white)
                .cornerRadius(20)
                .shadow(radius: 10)
                .padding(40)
            }
        }
    }
}

struct DialogBottomView: View {
    var onDismiss: VoidBlock
    var onConfirm: VoidBlock
    var body: some View {
        HStack(spacing: 12) {
            Spacer()
            
            Text(L10n.cancel)
                .foregroundStyle(Color.white)
                .font(.system(size: 16, weight: .bold))
                .padding(.horizontal, 24)
                .padding(.vertical, 8)
                .background(Color.failed)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .contentShape(Rectangle())
                .onTapGesture {
                    onDismiss()
                }
            
            Text(L10n.confirm)
                .foregroundStyle(Color.white)
                .font(.system(size: 16, weight: .bold))
                .padding(.horizontal, 24)
                .padding(.vertical, 8)
                .background(Color.success)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .contentShape(Rectangle())
                .onTapGesture {
                    onConfirm()
                    onDismiss()
                }
            
            
            Spacer()
        }
    }
}

extension View {
    @ViewBuilder
    func customDialog<Item: Identifiable, DialogContent: View>(
        item: Binding<Item?>,
        @ViewBuilder dialogContent: @escaping (Item) -> DialogContent
    ) -> some View {
        self.modifier(CustomDialogModifier(
            isPresented: Binding<Bool>(
                get: { item.wrappedValue != nil },
                set: { newValue in
                    if !newValue {
                        item.wrappedValue = nil
                    }
                }
            ),
            dialogContent: {
                VStack {
                    if let item = item.wrappedValue {
                        dialogContent(item)
                    } else {
                        EmptyView()
                    }
                }
            }
        ))
    }
    
    func customDialog<DialogContent: View>(
        isPresented: Binding<Bool>,
        @ViewBuilder dialogContent: @escaping () -> DialogContent
    ) -> some View {
        self.modifier(CustomDialogModifier(
            isPresented: isPresented,
            dialogContent: dialogContent
        ))
    }
    
    func confirmDialog(isPresented: Binding<Bool>,
                       title: String,
                       info: String,
                       onDismiss: @escaping VoidBlock,
                       onConfirm: @escaping VoidBlock) -> some View {
        self.modifier(CustomDialogModifier(
            isPresented: isPresented,
            dialogContent: {
                VStack {
                    TitleView(title: title)
                        .padding(.bottom, 24)
                    
                    Text(info)
                        .font(.system(size: 16))
                        .foregroundStyle(Color.title)
                    
                    DialogBottomView(onDismiss: onDismiss, onConfirm: onConfirm)
                        .padding(.top, 24)
                }
            }
        ))
    }
}
