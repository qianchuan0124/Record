package com.example.record.ui.pages

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.example.record.R
import com.example.record.services.ExcelService
import com.example.record.services.NotifyCenter
import com.example.record.services.NotifyType
import com.example.record.ui.theme.ColorInfo
import com.example.record.ui.theme.ColorText
import com.example.record.ui.theme.ColorTitle
import com.example.record.utils.VERSION_INFO
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun Setting(navController: NavHostController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val exportLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val data = result.data
        val uri = data?.data
        uri?.let {
            context.contentResolver.openOutputStream(it)?.let { outputStream ->
                scope.launch {
                    val res = ExcelService.exportRecord(outputStream)
                    if (res) {
                        withContext(Dispatchers.Main) {
                            Toast.makeText(
                                context,
                                context.getString(R.string.export_success),
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    } else {
                        withContext(Dispatchers.Main) {
                            Toast.makeText(
                                context,
                                context.getString(R.string.export_failed),
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    }
                }
            }
        }
    }

    val importLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        uri?.let {
            scope.launch {
                val res = ExcelService.importRecord(it)
                if (res) {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(
                            context,
                            context.getString(R.string.import_success),
                            Toast.LENGTH_SHORT
                        ).show()
                        NotifyCenter.sendRecordNotify(NotifyType.RecordImport)
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(
                            context,
                            context.getString(R.string.import_failed),
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Image(
            painter = painterResource(id = R.drawable.info_background),
            contentDescription = null,
            modifier = Modifier.fillMaxWidth()
        )

        Column(modifier = Modifier.fillMaxSize()) {
            Spacer(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(0.2f)
            )

            Column(
                modifier = Modifier
                    .weight(0.8f)
                    .background(
                        color = Color.White,
                        shape = RoundedCornerShape(
                            topStart = 36.dp,
                            topEnd = 36.dp
                        )
                    )
            ) {
                Text(
                    color = ColorTitle,
                    text = stringResource(R.string.setting),
                    fontSize = 21.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 14.dp),
                    textAlign = TextAlign.Center
                )

                Column(modifier = Modifier.padding(horizontal = 21.dp)) {
                    SettingTitle(title = stringResource(R.string.data_handle))
                    SettingCell(
                        title = stringResource(R.string.data_import),
                        subTitle = stringResource(R.string.data_import_info),
                        icon = painterResource(id = R.drawable.data_import_icon),
                    ) {
                        importLauncher.launch(arrayOf(ExcelService.XLSXTYPE))
                    }

                    SettingCell(
                        title = stringResource(R.string.data_export),
                        subTitle = stringResource(R.string.data_export_info),
                        icon = painterResource(id = R.drawable.data_export_icon),
                    ) {
                        val intent = createNewDocumentIntent()
                        exportLauncher.launch(intent)
                    }

                    SettingCell(
                        title = stringResource(R.string.data_sync),
                        subTitle = stringResource(R.string.data_sync_info),
                        icon = painterResource(id = R.drawable.data_sync_icon)
                    ) {
                        navController.navigate("scanner")
                    }

                    SettingTitle(title = stringResource(R.string.update_feedback))
                    SettingCell(
                        title = stringResource(R.string.feedback),
                        subTitle = stringResource(R.string.feedback_info),
                        icon = painterResource(id = R.drawable.feedback_icon)
                    ) {
                        sendEmail(context)
                    }

                    SettingCell(
                        title = stringResource(R.string.version_update),
                        subTitle = stringResource(
                            R.string.current_version_info,
                            getAppVersionName(context)
                        ),
                        icon = painterResource(id = R.drawable.version_icon)
                    ) {
                        openURL(context)
                    }
                }
            }
        }
    }
}

fun getAppVersionName(context: Context): String {
    return try {
        val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
        packageInfo.versionName
    } catch (e: Exception) {
        context.getString(R.string.unknown)
    }
}


@SuppressLint("QueryPermissionsNeeded")
fun openURL(context: Context) {
    val url = VERSION_INFO
    val intent = Intent(Intent.ACTION_VIEW)
    intent.data = Uri.parse(url)

    if (intent.resolveActivity(context.packageManager) != null) {
        context.startActivity(intent)
    } else {
        Toast.makeText(
            context,
            context.getString(R.string.not_found_newest_version),
            Toast.LENGTH_SHORT
        ).show();
    }
}

@SuppressLint("QueryPermissionsNeeded")
fun sendEmail(context: Context) {
    try {
        val emailIntent = Intent(Intent.ACTION_SEND)
        emailIntent.setType("message/rfc822")
        emailIntent.putExtra(Intent.EXTRA_EMAIL, context.getString(R.string.feedback_send_emial))
        emailIntent.putExtra(Intent.EXTRA_SUBJECT, context.getString(R.string.feedback_title))
        emailIntent.putExtra(Intent.EXTRA_TEXT, context.getString(R.string.feedback_email_text))
        if (emailIntent.resolveActivity(context.packageManager) != null) {
            emailIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(Intent.createChooser(
                emailIntent,
                context.getString(R.string.select_email_info)
            ))
        } else {
            Toast.makeText(
                context,
                context.getString(R.string.not_found_email_sender),
                Toast.LENGTH_SHORT
            ).show();
        }
    } catch (e: Exception) {
        Toast.makeText(
            context,
            e.message,
            Toast.LENGTH_SHORT
        ).show();
    }
}

@Composable
fun SettingTitle(title: String, modifier: Modifier = Modifier) {
    Text(
        color = ColorTitle,
        text = title,
        fontSize = 16.sp,
        fontWeight = FontWeight.Bold,
        modifier = modifier.padding(vertical = 10.dp)
    )
}

@Composable
fun SettingCell(title: String,
                subTitle: String,
                icon: Painter,
                modifier: Modifier = Modifier,
                clickAction: () -> Unit) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp)
            .height(74.dp)
            .background(
                ColorInfo,
                shape = RoundedCornerShape(20.dp)
            )
            .clip(RoundedCornerShape(20.dp))
            .clickable {
                clickAction()
            }
    ) {
        Image(
            painter = icon,
            contentDescription = null,
            modifier = modifier
                .padding(horizontal = 24.dp, vertical = 18.dp)
                .size(32.dp)
        )

        Column(modifier = modifier.padding(vertical = 14.dp)) {
            Text(
                color = ColorTitle,
                text = title,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium
            )

            Text(
                color = ColorText,
                text = subTitle,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(top = 2.dp)
            )
        }
    }
}

fun createNewDocumentIntent(): Intent {
    val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = ExcelService.XLSXTYPE
        putExtra(Intent.EXTRA_TITLE, "${ExcelService.exportName()}.xlsx")
    }
    intent.setFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    intent.setFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
    intent.setFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
    return intent
}