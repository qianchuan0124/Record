export interface SalaryRecord {
    id: number;
    date: number;
    baseSalary: number;
    overtimePay: number;
    oneTimeBonus: number;
    socialInsurance: number;
    tax: number;
    taxRate: number;
    netPay: number;
    taxManual?: number;
    isDeleted?: boolean;
    syncId?: number;
}

export interface AnnualBonus {
    id: number;
    date: number;
    bonus: number;
    tax: number;
    taxRate: number;
    netPay: number;
    isDeleted?: boolean;
    syncId?: number;
}

export interface BudgetItem {
    id: number;
    name: string;
    amount: number;
    isDeleted?: boolean;
    syncId?: number;
}

export interface PayrollData {
    salaries: SalaryRecord[];
    bonuses: AnnualBonus[];
    budgets: BudgetItem[];
}

export interface PayrollIncome {
    salaryIncome: number;
    bonusIncome: number;
}
