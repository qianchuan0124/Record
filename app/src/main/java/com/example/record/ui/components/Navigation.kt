package com.example.record.ui.components

import androidx.annotation.DrawableRes
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.record.R
import com.example.record.ui.pages.Analysis
import com.example.record.ui.pages.Budget
import com.example.record.ui.pages.Home
import com.example.record.ui.pages.Scanner
import com.example.record.ui.pages.Setting
import com.example.record.vm.AnalysisViewModel
import com.example.record.vm.BudgetViewModel
import com.example.record.vm.RecordViewModel

@Composable
fun HomeView(recordVM: RecordViewModel,
             analysisVM: AnalysisViewModel,
             budgetVM: BudgetViewModel
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val routesWithoutBottomBar = listOf("scanner")
    Scaffold(bottomBar = {
        if (currentRoute !in routesWithoutBottomBar) {
            NavigationBar {
                NavigationBarItem(
                    selected = currentRoute == MainTabs.Home.name,
                    onClick = {
                        navController.navigate(MainTabs.Home.name)
                    }, icon = {
                        if (currentRoute == MainTabs.Home.name) {
                            Icon(
                                painter = painterResource(id = MainTabs.Home.selectedIcon),
                                contentDescription = MainTabs.Home.name,
                                tint = Color.Unspecified
                            )
                        } else {
                            Icon(
                                painter = painterResource(id = MainTabs.Home.icon),
                                contentDescription = MainTabs.Home.name,
                                tint = Color.Unspecified
                            )
                        }
                    }
                )
                NavigationBarItem(
                    selected = currentRoute == MainTabs.Analysis.name,
                    onClick = {
                        navController.navigate(MainTabs.Analysis.name)
                    }, icon = {
                        if (currentRoute == MainTabs.Analysis.name) {
                            Icon(
                                painter = painterResource(id = MainTabs.Analysis.selectedIcon),
                                contentDescription = MainTabs.Analysis.name,
                                tint = Color.Unspecified
                            )
                        } else {
                            Icon(
                                painter = painterResource(id = MainTabs.Analysis.icon),
                                contentDescription = MainTabs.Analysis.name,
                                tint = Color.Unspecified
                            )
                        }
                    }
                )
                NavigationBarItem(
                    selected = currentRoute == MainTabs.Account.name,
                    onClick = {
                        navController.navigate(MainTabs.Account.name)
                    }, icon = {
                        if (currentRoute == MainTabs.Account.name) {
                            Icon(
                                painter = painterResource(id = MainTabs.Account.selectedIcon),
                                contentDescription = MainTabs.Account.name,
                                tint = Color.Unspecified
                            )
                        } else {
                            Icon(
                                painter = painterResource(id = MainTabs.Account.icon),
                                contentDescription = MainTabs.Account.name,
                                tint = Color.Unspecified
                            )
                        }
                    }
                )
                NavigationBarItem(
                    selected = currentRoute == MainTabs.Person.name,
                    onClick = {
                        navController.navigate(MainTabs.Person.name)
                    }, icon = {
                        if (currentRoute == MainTabs.Person.name) {
                            Icon(
                                painter = painterResource(id = MainTabs.Person.selectedIcon),
                                contentDescription = MainTabs.Person.name,
                                tint = Color.Unspecified
                            )
                        } else {
                            Icon(
                                painter = painterResource(id = MainTabs.Person.icon),
                                contentDescription = MainTabs.Person.name,
                                tint = Color.Unspecified
                            )
                        }
                    }
                )
            }
        }
    }) { innerPadding ->

        NavHost(
            navController = navController,
            startDestination = MainTabs.Home.name,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(MainTabs.Home.name) {
                Home(recordVM)
            }
            composable(MainTabs.Analysis.name) {
                Analysis(analysisVM, modifier = Modifier.padding(innerPadding))
            }
            composable(MainTabs.Account.name) {
                Budget(budgetVM)
            }
            composable(MainTabs.Person.name) {
                Setting(navController)
            }
            composable("scanner") {
                Scanner(navController)
            }
        }
    }
}

enum class MainTabs(val tabName: String, @DrawableRes val icon: Int, @DrawableRes val selectedIcon: Int) {
    Home("Home", R.drawable.home_default, R.drawable.home_highlight),
    Analysis("Analysis", R.drawable.analysis_default, R.drawable.analysis_highlight),
    Account("Account", R.drawable.account_default, R.drawable.account_highlight),
    Person("Person", R.drawable.person_default, R.drawable.person_highlight)
}