import { AnnualBonus, BudgetItem, SalaryRecord } from "@/models/Payroll";

// 切换 tab 时组件可能重新挂载，缓存上一次数据用于首屏直接渲染，避免列表先空后满地“弹一下”
export const payrollCache = {
    salaries: [] as SalaryRecord[],
    bonuses: [] as AnnualBonus[],
    budgets: [] as BudgetItem[],
    monthExpense: 0,
    loaded: false,
};

function sameJson(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

export function applyPayrollCache(data: {
    salaries: SalaryRecord[];
    bonuses: AnnualBonus[];
    budgets: BudgetItem[];
}, monthExpense: number) {
    if (!sameJson(payrollCache.salaries, data.salaries)) {
        payrollCache.salaries = data.salaries;
    }
    if (!sameJson(payrollCache.bonuses, data.bonuses)) {
        payrollCache.bonuses = data.bonuses;
    }
    if (!sameJson(payrollCache.budgets, data.budgets)) {
        payrollCache.budgets = data.budgets;
    }
    payrollCache.monthExpense = monthExpense;
    payrollCache.loaded = true;
}

export function payrollDataChanged(data: {
    salaries: SalaryRecord[];
    bonuses: AnnualBonus[];
    budgets: BudgetItem[];
}, current: {
    salaries: SalaryRecord[];
    bonuses: AnnualBonus[];
    budgets: BudgetItem[];
}): boolean {
    return !sameJson(data.salaries, current.salaries)
        || !sameJson(data.bonuses, current.bonuses)
        || !sameJson(data.budgets, current.budgets);
}
