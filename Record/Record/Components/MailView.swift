//
//  MailView.swift
//  Record
//
//  Created by xiachuan on 2024/9/4.
//

import Foundation
import SwiftUI
import MessageUI

struct MailView: UIViewControllerRepresentable {
    class Coordinator: NSObject, MFMailComposeViewControllerDelegate {
        func mailComposeController(_ controller: MFMailComposeViewController, didFinishWith result: MFMailComposeResult, error: Error?) {
            controller.dismiss(animated: true, completion: nil)
        }
    }

    func makeCoordinator() -> Coordinator {
        return Coordinator()
    }

    func makeUIViewController(context: Context) -> MFMailComposeViewController {
        let vc = MFMailComposeViewController()
        vc.mailComposeDelegate = context.coordinator
        vc.setToRecipients([FEEDBACK_EMAIL])
        vc.setSubject(FEEDBACK_SUBJECT)
        vc.setMessageBody(FEEDBACK_BODY, isHTML: false)
        return vc
    }

    func updateUIViewController(_ uiViewController: MFMailComposeViewController, context: Context) {}
}
