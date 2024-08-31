package com.example.record.vm

import android.annotation.SuppressLint
import android.util.Log
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.Preview
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import com.example.record.utils.CameraConfig
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.concurrent.Executors


class ScannerViewModel(config: CameraConfig) : ViewModel() {
    val preview = config.options(Preview.Builder())
    val imageCapture: ImageCapture = config.options(ImageCapture.Builder())
    val imageAnalysis: ImageAnalysis = config.options(ImageAnalysis.Builder())

    private val barcodeScanner: BarcodeScanner = BarcodeScanning.getClient(
        BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
    )

    var scanBarcode = mutableStateOf("")

    var enableTorch: MutableState<Boolean> = mutableStateOf(false)

    fun toggleTorch() {
        enableTorch.value = !enableTorch.value
    }

    private var enableAnalysis = true

    // 重新识别
    fun analyzeReStart() {
        enableAnalysis = true
    }

    private val _result = MutableStateFlow<String?>(null)

    var result: StateFlow<String?> = _result.asStateFlow()

    fun cleanResult() {
        _result.value = null
    }

    @SuppressLint("UnsafeOptInUsageError")
    fun analyze() {
        Log.d("scanner", "start analyze")
        imageAnalysis.setAnalyzer(Executors.newSingleThreadExecutor()) { image ->
            if (!enableAnalysis || image.image == null) {
                image.close()
                return@setAnalyzer
            }

            enableAnalysis = false

            val mediaImage = image.image!!


            val inputImage = InputImage.fromMediaImage(mediaImage, image.imageInfo.rotationDegrees)

            barcodeScanner.process(inputImage)
                .addOnSuccessListener { list ->
                    Log.d("scanner", "barcodeScanner onSuccess")
                    val resultList = list.map { it.rawValue.toString() }
                    if (resultList.isNotEmpty()) {
                        _result.value = resultList[0]
                        Log.d("scanner", "startCamera success: $_result.value")
                    } else {
                        Log.d("scanner", "failed, restart")
                        analyzeReStart()
                    }
                }.addOnFailureListener {
                    Log.d("scanner", "onFailure")
                    scanBarcode.value = "onFailure"

                    analyzeReStart()
                }.addOnCompleteListener {
                    image.close()
                }
        }
    }
}