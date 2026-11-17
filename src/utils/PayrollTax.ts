import { SalaryRecord } from "@/models/Payroll";

export interface SalaryTaxResult {
    tax: number;
    taxRate: number;
    netPay: number;
}

export interface BonusTaxResult {
    tax: number;
    taxRate: number;
    netPay: number;
}

interface Bracket {
    limit: number;
    rate: number;
    deduction: number;
}

// 居民个人工资薪金累计预扣预缴税率表
const YEARLY_BRACKETS: Bracket[] = [
    { limit: 36000, rate: 0.03, deduction: 0 },
    { limit: 144000, rate: 0.1, deduction: 2520 },
    { limit: 300000, rate: 0.2, deduction: 16920 },
    { limit: 420000, rate: 0.25, deduction: 31920 },
    { limit: 660000, rate: 0.3, deduction: 52920 },
    { limit: 960000, rate: 0.35, deduction: 85920 },
    { limit: Number.POSITIVE_INFINITY, rate: 0.45, deduction: 181920 },
];

// 全年一次性奖金按月换算后的综合所得税率表
const MONTHLY_BRACKETS: Bracket[] = [
    { limit: 3000, rate: 0.03, deduction: 0 },
    { limit: 12000, rate: 0.1, deduction: 210 },
    { limit: 25000, rate: 0.2, deduction: 1410 },
    { limit: 35000, rate: 0.25, deduction: 2660 },
    { limit: 55000, rate: 0.3, deduction: 4410 },
    { limit: 80000, rate: 0.35, deduction: 7160 },
    { limit: Number.POSITIVE_INFINITY, rate: 0.45, deduction: 15160 },
];

const MONTHLY_DEDUCTION = 5000;

function round2(value: number): number {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function findBracket(brackets: Bracket[], amount: number): Bracket {
    return brackets.find((bracket) => amount <= bracket.limit) || brackets[brackets.length - 1];
}

export function salaryIncomeOf(record: SalaryRecord): number {
    return round2(record.baseSalary + record.overtimePay + record.oneTimeBonus);
}

export function calcSalaryTax(
    current: Pick<SalaryRecord, "id" | "date" | "baseSalary" | "overtimePay" | "oneTimeBonus" | "socialInsurance">,
    sameYearSalaries: SalaryRecord[]
): SalaryTaxResult {
    const date = new Date(current.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // 每月固定减除费用按当年 1 月至本月累计
    const months = month;

    let priorIncome = 0;
    let priorInsurance = 0;
    let priorTax = 0;
    for (const record of sameYearSalaries) {
        if (record.id === current.id) {
            continue;
        }
        const recordDate = new Date(record.date);
        if (recordDate.getFullYear() !== year || recordDate.getMonth() + 1 >= month) {
            continue;
        }
        priorIncome += salaryIncomeOf(record);
        priorInsurance += Number(record.socialInsurance) || 0;
        priorTax += Number(record.tax) || 0;
    }

    const currentIncome = round2(current.baseSalary + current.overtimePay + current.oneTimeBonus);
    const currentInsurance = Number(current.socialInsurance) || 0;
    const cumulativeTaxable = Math.max(
        0,
        priorIncome + currentIncome - priorInsurance - currentInsurance - MONTHLY_DEDUCTION * months
    );

    const bracket = findBracket(YEARLY_BRACKETS, cumulativeTaxable);
    const cumulativeTax = Math.max(0, cumulativeTaxable * bracket.rate - bracket.deduction);
    const tax = Math.max(0, round2(cumulativeTax - priorTax));

    return {
        tax,
        taxRate: round2(bracket.rate * 100),
        netPay: round2(currentIncome - currentInsurance - tax),
    };
}

export function calcBonusTax(bonus: number): BonusTaxResult {
    const amount = Number(bonus) || 0;
    if (amount <= 0) {
        return { tax: 0, taxRate: 0, netPay: 0 };
    }
    const bracket = findBracket(MONTHLY_BRACKETS, amount / 12);
    const tax = Math.max(0, round2(amount * bracket.rate - bracket.deduction));
    return {
        tax,
        taxRate: round2(bracket.rate * 100),
        netPay: round2(amount - tax),
    };
}

// 找上个月（相对 today）的工资记录，用于新增工资时的默认值
export function findPreviousMonthSalary(salaries: SalaryRecord[], today: Date = new Date()): SalaryRecord | null {
    const target = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const targetYear = target.getFullYear();
    const targetMonth = target.getMonth();
    const matched = salaries.filter((record) => {
        const date = new Date(record.date);
        return date.getFullYear() === targetYear && date.getMonth() === targetMonth;
    });
    return matched.length > 0 ? matched[0] : null;
}
