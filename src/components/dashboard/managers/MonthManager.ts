import { Month } from "@/models/Month";
import { Filter } from "@/models/Filter";
import { fetchTotalAmountByFilter } from "@/utils/DataCenter";

// 生成去年、今年、明年的月份数组
export async function generateMonths(): Promise<Month[]> {
    const currentYear = new Date().getFullYear();
    // 获取去年、今年、明年的月份
    const lastYearMonths = await generateMonthsForYears(currentYear - 1);
    const thisYearMonths = await generateMonthsForYears(currentYear);
    const nextYearMonths = await generateMonthsForYears(currentYear + 1);
    // 将所有月份合并到一个数组中
    return [...lastYearMonths, ...thisYearMonths, ...nextYearMonths];
}

export async function generateMonthsForYears(year: number): Promise<Month[]> {
    // 为指定年份生成月份数组
    const months = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1);
        const display = `${date.getFullYear()}年${date.getMonth() + 1}月`;
        const isCurrent = year === currentYear && month === currentMonth;
        const content = date.getMonth() + 1;
        const { income, outcome } = await fetchTotalAmountByMonth(date);
        months.push({
            date,
            display,
            content,
            isCurrent,
            totalIncome: income,
            totalExpense: outcome,
        });
    }
    return months;
}

// 获取对应月份的总收入和总支出
export async function fetchTotalAmountByMonth(
    date: Date
): Promise<{ income: number; outcome: number }> {
    // 获取Date对应月份的第一天和最后一天
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const start = new Date(Number(year), Number(month) - 1, 1)
    const end = new Date(Number(year), Number(month), 0)
    const filter: Filter = {
        types: [],
        categorys: [],
        startTime: start,
        endTime: end,
        keyword: "",
        isAll: false,
    }
    return fetchTotalAmountByFilter(JSON.stringify(filter));
}

// 根据日期获取对应日期的第一天和最后一天
export function getFirstAndLastDate(date: Date): [Date, Date] {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDate = new Date(year, month, 1);
    firstDate.setHours(0, 0, 0, 0);
    const lastDate = new Date(year, month + 1, 0);
    lastDate.setHours(23, 59, 59, 999);
    return [firstDate, lastDate];
}
