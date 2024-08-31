package com.example.record.ui.components

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.core.content.ContextCompat
import com.example.record.R


@Composable
fun PermissionView(
    permission: String = android.Manifest.permission.CAMERA,
    rationale: String = stringResource(R.string.request_camera_permission_info),
    permissionNotAvailableContent: @Composable () -> Unit = { },
    content: @Composable () -> Unit = { }
) {
    val context = LocalContext.current
    var permissionGranted by remember { mutableStateOf<Boolean?>(null) }
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        permissionGranted = isGranted
    }
    var showRationale by remember { mutableStateOf(false) }

    LaunchedEffect(key1 = true) {
        when (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)) {
            PackageManager.PERMISSION_GRANTED -> {
                showRationale = false
            }
            else -> {
                showRationale = true
            }
        }
    }

    if(showRationale) {
        AlertDialog(
            onDismissRequest = { showRationale = false },
            title = { Text(stringResource(R.string.request_camera_permission)) },
            text = { Text(rationale) },
            confirmButton = {
                Button(onClick = { showRationale = false
                    launcher.launch(permission)
                }) {
                    Text(stringResource(R.string.give_permission))
                }
            },
            dismissButton = {
                Button(onClick = {
                    showRationale = false
                    permissionGranted = false
                }) {
                    Text(stringResource(R.string.reject_permission))
                }
            }
        )
    } else {
        content()
    }

    when (permissionGranted) {
        true -> content()
        false -> permissionNotAvailableContent()
        null -> {} // 等待权限结果
    }
}

fun openSettingsPermission(context: Context) {
    context.startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", context.packageName, null)
        }
    )
}
