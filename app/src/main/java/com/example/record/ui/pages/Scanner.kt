package com.example.record.ui.pages

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner
import androidx.navigation.NavController
import com.example.record.R
import com.example.record.services.RecordService
import com.example.record.ui.components.CameraViewPermission
import com.example.record.ui.components.DrawCropScan
import com.example.record.ui.components.SyncDataView
import com.example.record.utils.AspectRatioCameraConfig
import com.example.record.utils.LogTag
import com.example.record.utils.SYNC_CODE_PREFIX
import com.example.record.vm.ScannerViewModel

@Composable
fun Scanner(
    navController: NavController,
    lifecycleOwner: LifecycleOwner = LocalLifecycleOwner.current,
) {

    val context = LocalContext.current

    val viewModel = remember {
        val config = AspectRatioCameraConfig(context)
        val model = ScannerViewModel(config)
        model.analyze()
        model
    }

    val scanResult by viewModel.result.collectAsState()
    var showSyncPage by rememberSaveable {
        mutableStateOf(false)
    }

    Box(
        contentAlignment = Alignment.TopCenter, modifier = Modifier
            .fillMaxSize()
    ) {

        CameraViewPermission(
            preview = viewModel.preview,
            imageAnalysis = viewModel.imageAnalysis,
            imageCapture = viewModel.imageCapture,
            enableTorch = viewModel.enableTorch.value,
            modifier = Modifier
                .fillMaxSize()
        )

        // 裁剪区域
        DrawCropScan(
            topLeftScale = Offset(x = 0.2f, y = 0.25f),
            sizeScale = Size(width = 0.6f, height = 0f)
        )

        IconButton(
            onClick = {
                viewModel.toggleTorch()
            },
            modifier = Modifier
                .align(alignment = Alignment.BottomCenter)
                .padding(bottom = 100.dp)
                .shadow(shape = CircleShape, elevation = 1.dp, clip = true)
                .background(color = Color.Transparent)
                .padding(horizontal = 15.dp),
        ) {
            Icon(
                painter = if (viewModel.enableTorch.value) {
                    painterResource(id = R.drawable.flashlight_open)
                } else {
                    painterResource(id = R.drawable.flashlight_close)
                },
                contentDescription = "Image",
                tint = Color.White,
                modifier = Modifier
                    .padding(0.dp)
                    .size(34.dp),
            )
        }

        scanResult?.let {
            if (it.startsWith(SYNC_CODE_PREFIX)) {
                val url = it.substringAfter(":", "")
                RecordService.setupBaseUrl(url)
                showSyncPage = true
            } else {
                Log.i(LogTag.SyncRecord, "scan failed, result: $it")
            }
        }

        if (showSyncPage) {
            SyncDataView {
                viewModel.cleanResult()
                showSyncPage = false
                navController.popBackStack()
            }
        }

        // 实现切换界面，重置扫码分析状态
        DisposableEffect(lifecycleOwner) {
            val observer = LifecycleEventObserver { _, event ->
                if (event == Lifecycle.Event.ON_START) {
                    // 重新进入页面，恢复解码
                    viewModel.analyzeReStart()
                }
            }

            lifecycleOwner.lifecycle.addObserver(observer)

            onDispose {
                lifecycleOwner.lifecycle.removeObserver(observer)
            }
        }
    }
}