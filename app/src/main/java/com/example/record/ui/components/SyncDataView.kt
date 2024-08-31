package com.example.record.ui.components

import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.record.R
import com.example.record.model.SyncError
import com.example.record.services.RecordService
import com.example.record.services.RecordSyncService
import com.example.record.ui.theme.ColorFailed
import com.example.record.ui.theme.ColorSubInfo
import com.example.record.ui.theme.ColorSuccess
import com.example.record.ui.theme.ColorTitle

enum class SyncType {
    Prepare, Start, Failed, Success
}

@Composable
fun SyncDataView(dismiss: () -> Unit) {
    var syncStatus by rememberSaveable { mutableStateOf(SyncType.Prepare) }
    val progress by RecordSyncService.progress.collectAsState()
    val error by RecordSyncService.errorState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(null) {
        RecordService.syncNotifyStart()
    }

    CustomDialog(
        content = {
            Column(verticalArrangement = Arrangement.SpaceEvenly) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                ) {
                    Text(stringResource(R.string.sync_data), fontWeight = FontWeight.Bold)
                }

                when (syncStatus) {
                    SyncType.Prepare ->
                        PrepareView(
                            syncToMobile = {
                                syncStatus = SyncType.Start
                                RecordSyncService.startSyncFromPC()
                            }, syncToPC = {
                                syncStatus = SyncType.Start
                                RecordSyncService.startSyncToPC()
                            }
                        )

                    SyncType.Start ->
                        ProgressView(progress) {
                            syncStatus = SyncType.Success
                        }

                    SyncType.Success -> SuccessView()
                    SyncType.Failed -> FailedView()
                }

                error.let {
                    if (it is SyncError) {
                        syncStatus = SyncType.Failed
                        Toast.makeText(context, "${it.message}", Toast.LENGTH_SHORT).show()
                        RecordSyncService.clearError()
                    }
                }
            }
        },
        onDismiss = dismiss
    )
}

@Composable
fun PrepareView(syncToMobile: () -> Unit, syncToPC: () -> Unit) {
    Column {
        Column(
            modifier = Modifier
                .padding(vertical = 12.dp)
                .clickable { syncToMobile() }
        ) {
            Text(
                stringResource(R.string.syncFromPC),
                color = ColorTitle,
                fontSize = 16.sp
            )
            Text(
                stringResource(R.string.syncFromPCInfo),
                color = ColorSubInfo,
                fontSize = 12.sp
            )
        }
        Column(modifier = Modifier.clickable { syncToPC() }) {
            Text(
                stringResource(R.string.sync_from_mobile),
                color = ColorTitle,
                fontSize = 16.sp
            )
            Text(
                stringResource(R.string.sync_from_mobile_info),
                color = ColorSubInfo,
                fontSize = 12.sp
            )
        }
    }
}

@Composable
fun ProgressView(progress: Int, statusChanged: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.Start,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(stringResource(R.string.data_syncing), modifier = Modifier.padding(bottom = 24.dp, top = 64.dp))
        LinearProgressIndicator(
            progress = {
                if (progress.toFloat() == 100.0f) {
                    statusChanged()
                }
                progress.toFloat()
            },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
fun SuccessView() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(stringResource(R.string.sync_success), color = ColorSuccess, fontSize = 16.sp, modifier = Modifier.padding(top = 84.dp))
    }
}

@Composable
fun FailedView() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(stringResource(R.string.sync_failed), color = ColorFailed, fontSize = 16.sp, modifier = Modifier.padding(top = 84.dp))
    }
}