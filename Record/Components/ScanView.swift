//
//  ScanView.swift
//  Record
//
//  Created by xiachuan on 2024/9/4.
//

import Foundation
import SwiftUI
import AVFoundation

struct ScanView: View {
    @State private var offset: CGFloat = -UIScreen.main.bounds.height / 2
    let scanAction: (String) -> Void
    @State var permission: PermissionType?
    @Environment(\.dismiss) var dismiss
    var body: some View {
        ZStack {
            CameraView() { code in
                scanAction(code)
                dismiss()
            }
            .frame(width: UIScreen.main.bounds.width, height: UIScreen.main.bounds.height)
            
            SquareWithCorners()
                .foregroundColor(.white)
                .frame(width: 200, height: 200)
            
            Image(name: "scan_scanline")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: UIScreen.main.bounds.width)
                .offset(y: offset)
                .animation(
                    Animation.linear(duration: 3)
                        .repeatForever(autoreverses: false), value: offset)
                .onAppear {
                    offset = UIScreen.main.bounds.height / 2  // 初始时将图标移动到视图顶部
                }
        }
        .ignoresSafeArea()
        .toolbar(.hidden, for: .tabBar)
        .customDialog(item: $permission, dialogContent: { permission in
            PermissionView(type: permission, dismiss: { dismiss() })
        })
        .onAppear {
            Task { @MainActor in
                guard await PermissionManager.shared.checkCameraAccess() else {
                    DispatchQueue.main.async {
                        permission = .cameraForbidden
                    }
                    return
                }
                
                guard await PermissionManager.shared.checkLocalNetworkAccess() else {
                    permission = .networkForbidden
                    return
                }
            }
        }
    }
}

struct CameraView: UIViewRepresentable {
    let codeBlock: (String) -> Void
    
    class Coordinator: NSObject, AVCaptureMetadataOutputObjectsDelegate {
        var parent: CameraView
        var scanning: Bool = true
        var codeBlock: (String) -> Void
        
        init(_ parent: CameraView, _ codeBlock: @escaping (String) -> Void) {
            self.parent = parent
            self.codeBlock = codeBlock
        }
        
        func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
            guard let metadataObject = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
                  let codeValue = metadataObject.stringValue else {
                return
            }
            
            // 识别到二维码后的处理逻辑
            if BaseConfig.shared.isCodeLegal(codeValue), scanning {
                logInfo("二维码识别成功, 识别内容: \(codeValue)")
                scanning = false
                codeBlock(codeValue)
            }
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self, codeBlock)
    }
    
    func makeUIView(context: Context) -> UIView {
        return UIView(frame: UIScreen.main.bounds)
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        guard uiView.layer.sublayers?.first is AVCaptureVideoPreviewLayer else {
            let captureSession = AVCaptureSession()
            guard let captureDevice = AVCaptureDevice.default(for: .video),
                  let captureInput = try? AVCaptureDeviceInput(device: captureDevice) else {
                return
            }
            
            captureSession.addInput(captureInput)
            
            let metadataOutput = AVCaptureMetadataOutput()
            captureSession.addOutput(metadataOutput)
            metadataOutput.setMetadataObjectsDelegate(context.coordinator, queue: DispatchQueue.main)
            metadataOutput.metadataObjectTypes = [.qr]
            
            let videoPreviewLayer = AVCaptureVideoPreviewLayer(session: captureSession)
            videoPreviewLayer.videoGravity = .resizeAspectFill
            videoPreviewLayer.frame = UIScreen.main.bounds
            uiView.layer.insertSublayer(videoPreviewLayer, at: 0)
            
            DispatchQueue.global(qos: .userInitiated).async {
                captureSession.startRunning()
            }
            
            return
        }
    }
}

struct SquareWithCorners: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        
        let cornerSize: CGFloat = 10
        let lineWidth: CGFloat = 3
        
        let topLeft = rect.origin
        let topRight = CGPoint(x: rect.maxX, y: rect.minY)
        let bottomRight = CGPoint(x: rect.maxX, y: rect.maxY)
        let bottomLeft = CGPoint(x: rect.minX, y: rect.maxY)
        
        let midX = rect.midX
        let midY = rect.midY
        
        // 左上角
        path.move(to: CGPoint(x: topLeft.x, y: topLeft.y + cornerSize))
        path.addLine(to: CGPoint(x: topLeft.x, y: topLeft.y))
        path.addLine(to: CGPoint(x: topLeft.x + cornerSize, y: topLeft.y))
        
        // 右上角
        path.move(to: CGPoint(x: topRight.x - cornerSize, y: topRight.y))
        path.addLine(to: CGPoint(x: topRight.x, y: topRight.y))
        path.addLine(to: CGPoint(x: topRight.x, y: topRight.y + cornerSize))
        
        // 右下角
        path.move(to: CGPoint(x: bottomRight.x, y: bottomRight.y - cornerSize))
        path.addLine(to: CGPoint(x: bottomRight.x, y: bottomRight.y))
        path.addLine(to: CGPoint(x: bottomRight.x - cornerSize, y: bottomRight.y))
        
        // 左下角
        path.move(to: CGPoint(x: bottomLeft.x + cornerSize, y: bottomLeft.y))
        path.addLine(to: CGPoint(x: bottomLeft.x, y: bottomLeft.y))
        path.addLine(to: CGPoint(x: bottomLeft.x, y: bottomLeft.y - cornerSize))
        
        return path
            .strokedPath(StrokeStyle(lineWidth: lineWidth, lineCap: .square))
            .offsetBy(dx: -midX, dy: -midY)  // 将路径偏移至中心
            .applying(CGAffineTransform(translationX: midX, y: midY))  // 将路径还原至原始位置
    }
}
