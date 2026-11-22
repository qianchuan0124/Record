export type BudgetIncomeMode = "current" | "next";

export interface BudgetSettings {
    cycleEnabled: boolean;
    startDay: number;
    endDay: number;
    incomeMode: BudgetIncomeMode;
}
