package com.example.record.ui.components

import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.TextUnit
import com.example.record.ui.theme.ColorSuccess

@Composable
fun HighlightText(
    value: String,
    modifier: Modifier = Modifier,
    highlightValue: String? = null,
    color: Color = Color.Unspecified,
    highlightColor: Color = ColorSuccess,
    fontSize: TextUnit = TextUnit.Unspecified,
    fontStyle: FontStyle? = null,
    fontWeight: FontWeight? = null,
    fontFamily: FontFamily? = null,
    maxLines: Int = Int.MAX_VALUE,
    minLines: Int = 1,
    style: TextStyle = LocalTextStyle.current
) {
    Text(
        text = highlightSubstring(value, highlightValue ?: "", highlightColor, fontWeight),
        modifier = modifier,
        color = color,
        fontSize = fontSize,
        fontStyle = fontStyle,
        fontWeight = fontWeight,
        fontFamily = fontFamily,
        maxLines = maxLines,
        minLines = minLines,
        style = style
    )
}

fun highlightSubstring(
    text: String,
    substring: String,
    highlightColor: Color,
    fontWeight: FontWeight?
): AnnotatedString {
    return buildAnnotatedString {
        if (substring.isNotEmpty()) {
            val startIndex = text.indexOf(substring, ignoreCase = true)
            if (startIndex != -1) {
                append(text.substring(0, startIndex))
                withStyle(style = SpanStyle(fontWeight = fontWeight, color = highlightColor)) {
                    append(text.substring(startIndex, startIndex + substring.length))
                }
                append(text.substring(startIndex + substring.length))
            } else {
                append(text)
            }
        } else {
            append(text)
        }
    }
}