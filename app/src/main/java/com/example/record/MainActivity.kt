package com.example.record

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.example.record.ui.components.HomeView
import com.example.record.vm.AnalysisViewModel
import com.example.record.vm.BudgetViewModel
import com.example.record.vm.RecordViewModel
import com.example.record.ui.theme.RecordTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            RecordTheme {
                val recordVM = RecordViewModel()
                val analysisVM = AnalysisViewModel()
                val budgetVM = BudgetViewModel()
                HomeView(recordVM, analysisVM, budgetVM)
            }
        }
    }
}