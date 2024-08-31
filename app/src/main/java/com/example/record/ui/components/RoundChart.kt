package com.example.record.ui.components

import android.util.Log
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.TweenSpec
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.center
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.toSize
import com.example.record.model.PieData
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.flow
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

enum class ChartType {
    Ring, Full
}

enum class DescriptionDirection {
    LEFT,//左侧
    TOP,//顶部
    RIGHT,//右侧
    BOTTOM,//底部
    CIRCLE,//圆周
}

@OptIn(ExperimentalStdlibApi::class)
@Composable
fun Pie(
    dataList: List<PieData>,
    modifier: Modifier,
    gap: Float = 40f,
    chartTye: ChartType = ChartType.Full,
    desDirection: DescriptionDirection = DescriptionDirection.LEFT,
    tapAction:(PieData) -> Unit
) {
    var mSize by remember { mutableStateOf(Size(0f, 0f)) }
    val centerX = mSize.center.x
    val centerY = mSize.center.y
    val radius = centerX.coerceAtLeast(centerY) / 2  //饼图半径
    val total = dataList.map { it.amount }.reduce { t, u -> t + u }
    val rateList = Array(dataList.size) {
        (dataList[it].amount / total) * 360f
    }
    val diffAngleList = Array(dataList.size) { 0f }
    var pieState by remember { mutableStateOf(false) }
    var textstate by remember { mutableStateOf(false) }
    LaunchedEffect(true) {
        flow {
            delay(500)
            emit(0)
        }.collect {
            pieState = !pieState
        }
    }
    for (index in rateList.indices) {
        val diff by animateFloatAsState(
            if (pieState) rateList[index] else 0f, animationSpec = TweenSpec(
                200, easing = LinearEasing, delay = 200 * index
            ), label = ""
        ) {
            if (index == dataList.lastIndex) {
                textstate = !textstate
            }
        }
        diffAngleList[index] = diff
    }
    val measure = rememberTextMeasurer()
    val textSize = 12f
    var prefixAngle = 0f

    val mGap = if (chartTye == ChartType.Full) {
        0f
    } else {
        gap
    }

    Canvas(
        modifier = modifier
            .onSizeChanged {
                mSize = it.toSize()
            }
            .pointerInput(Unit) {
                detectTapGestures { offset ->
                    val clickX = offset.x
                    val clickY = offset.y

                    Log.d("pieClick", "检测点击了....$mSize")
                    var startAngle = -90f
                    dataList.forEachIndexed { index, data ->
                        val endAngle = startAngle + rateList[index]

                        val currentCenterX = mSize.center.x
                        val currentCenterY = mSize.center.y
                        val currentRadius = currentCenterX.coerceAtLeast(currentCenterY) / 2  //饼图半径

                        if (isPointInPieSlice(
                                clickX,
                                clickY,
                                currentCenterX, // 540f
                                currentCenterY, // 310f
                                currentRadius, // 270f
                                startAngle,
                                endAngle,
                            )
                        ) {
                            Log.d("pieClick", "点击了$data")
                            tapAction(data)
                            return@detectTapGestures
                        }
                        startAngle = endAngle
                    }
                }
            }
    ) {
        mSize = size
        rateList.indices.forEach {
            drawArc(
                color = dataList[it].color,
                useCenter = chartTye == ChartType.Full,
                startAngle = -90f + prefixAngle,
                sweepAngle = diffAngleList[it],
                topLeft = Offset(centerX - radius, centerY - radius),
                size = Size(radius * 2, radius * 2),
                style = if (chartTye == ChartType.Full) Fill else Stroke(mGap)
            )

            drawRect(
                color = dataList[it].color, topLeft =
                when (desDirection) {
                    DescriptionDirection.CIRCLE -> {
                        Offset(
                            pointX(
                                radius + mGap / 2 + radius / 2,
                                centerX,
                                90f + (rateList[it] / 2) + prefixAngle
                            ) - 30f,
                            pointY(
                                radius + mGap / 2 + radius / 2,
                                centerY,
                                90f + (rateList[it] / 2) + prefixAngle
                            ) + 10f
                        )
                    }

                    DescriptionDirection.LEFT -> {
                        Offset(
                            centerX - radius - mGap / 2 - 200f - textSize * 2,
                            centerY - radius + it * (radius * 2) / dataList.size + textSize
                        )
                    }

                    DescriptionDirection.RIGHT -> {
                        Offset(
                            centerX + radius + mGap / 2,
                            centerY - radius + it * (radius * 2) / dataList.size
                        )
                    }

                    DescriptionDirection.TOP -> {
                        Offset(
                            centerX - radius - mGap / 2 + (2 * textSize + 200f) * it,
                            textSize + (centerY - radius - mGap / 2) / 2
                        )
                    }

                    else -> {
                        Offset(
                            centerX - radius - mGap / 2 + (2 * textSize + 200f) * it,
                            textSize + centerY + radius + mGap / 2 + 30f
                        )
                    }
                },
                size = Size(textSize, textSize)
            )

            drawText(
                measure,
                text = dataList[it].name + "\n" + dataList[it].amount,
                topLeft = when (desDirection) {
                    DescriptionDirection.CIRCLE -> {
                        Offset(
                            pointX(radius + mGap / 2 + radius / 2, centerX, 90f + (rateList[it] / 2) + prefixAngle),
                            pointY(radius + mGap / 2 + radius / 2, centerY, 90f + (rateList[it] / 2) + prefixAngle)
                        )
                    }

                    DescriptionDirection.LEFT -> {
                        Offset(
                            centerX - radius - mGap / 2 - 200f,
                            centerY - radius + it * (radius * 2) / dataList.size
                        )
                    }

                    DescriptionDirection.RIGHT -> {
                        Offset(
                            centerX + radius + mGap / 2 + 30f,
                            centerY - radius + it * (radius * 2) / dataList.size
                        )
                    }

                    DescriptionDirection.TOP -> {
                        Offset(
                            centerX - radius - mGap / 2 + (2 * textSize + 200f) * it + 2 * textSize,
                            (centerY - radius - mGap / 2) / 2
                        )
                    }

                    else -> {
                        Offset(
                            centerX - radius - mGap / 2 + (2 * textSize + 200f) * it + 2 * textSize,
                            centerY + radius + mGap / 2 + 30f
                        )
                    }
                },
                size = Size(200f, 200f),
                style = TextStyle(
                    fontStyle = FontStyle.Italic,
                    fontWeight = FontWeight.Bold,
                    fontSize = textSize.sp,
                    color = Color.White
                ),
            )

            prefixAngle += rateList[it]
        }
    }
}

private fun isPointInPieSlice(
    x: Float,
    y: Float,
    centerX: Float,
    centerY: Float,
    radius: Float,
    startAngle: Float,
    endAngle: Float,
): Boolean {
    val dx = x - centerX
    val dy = y - centerY
    val distance = sqrt(dx * dx + dy * dy)

    if (distance > radius) return false // 点击在饼图外

    var angle = atan2(-dx, dy) * 180 / PI.toFloat() + 180 // 注意这里 dx 取负
    angle = (angle + 360) % 360 - 90

    Log.d("pieClick", "点击了$angle startAngle$startAngle endAngle$endAngle")

    return angle >= startAngle && angle <= endAngle
}

private fun pointX(width: Float, centerX: Float, fl: Float): Float {
    val angle = Math.toRadians(fl.toDouble())
    return centerX - cos(angle).toFloat() * (width)
}

private fun pointY(width: Float, centerY: Float, fl: Float): Float {
    val angle = Math.toRadians(fl.toDouble())
    return centerY - sin(angle).toFloat() * (width)
}