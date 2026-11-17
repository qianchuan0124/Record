import * as XLSX from 'xlsx';
import { getCategories, defaultCategories, CategoryItem } from "@/configs/CategoryParser"
import { updateCurrentCategory } from "@/configs/CategoryParser"
import L10n from "@/configs/L10n.json"
import { Record } from "@/models/Record";
import { formatDate } from "@/utils/DateUtils"
import { fetchAllRecords, importRecords, deleteRecords, logError, fetchPayrollData } from "@/utils/DataCenter"
import { AnnualBonus, BudgetItem, SalaryRecord } from "@/models/Payroll"
import { CategorySettingNode } from "@/models/CategorySettingNode"


export async function getCategorySettingNode(type: 'current' | 'default'): Promise<CategorySettingNode[]> {
    await updateCurrentCategory()
    const data = type == 'current' ? getCategories() : defaultCategories
    const categoryNodes = data.map((category: CategoryItem) => {
        return {
            id: category.value,
            label: category.label,
            level: 1,
            children: category.children?.map((subCategory: CategoryItem) => {
                return {
                    id: subCategory.value,
                    label: subCategory.label,
                    level: 2
                }
            })
        }
    })

    return [
        {
            id: L10n.all,
            label: L10n.all,
            level: 0,
            children: categoryNodes
        }
    ]
}

export async function exportAllData(): Promise<string[][]> {
    const result: string[][] = []
    const title = [L10n.time, L10n.type, L10n.category, L10n.sub_category, L10n.amount, L10n.remark, L10n.count_in_budget];
    result.push(title)
    try {
        const records = await fetchAllRecords();
        records.forEach((record: Record) => {
            const row = [
                formatDate(record.date),
                record.type,
                record.category,
                record.subCategory,
                record.amount.toFixed(2),
                record.remark,
                Number(record.countInBudget ?? 1) === 0 ? "否" : "是"
            ]
            result.push(row)
        })
        return result
    }
    catch (error: unknown) {
        logError("Export data failed:" + error);
        throw error;
    }
}

export interface WorkbookSheet {
    name: string;
    rows: (string | number)[][];
    widths?: number[];
}

export async function exportWorkbookData(): Promise<WorkbookSheet[]> {
    try {
        const recordRows = await exportAllData();
        const payroll = await fetchPayrollData();

        const salaryRows: (string | number)[][] = [[
            L10n.time, L10n.base_salary, L10n.overtime_pay, L10n.one_time_bonus,
            L10n.social_insurance, L10n.tax, L10n.tax_rate, L10n.net_pay
        ]];
        payroll.salaries.forEach((item: SalaryRecord) => {
            salaryRows.push([
                formatDate(new Date(item.date)),
                Number(item.baseSalary).toFixed(2),
                Number(item.overtimePay).toFixed(2),
                Number(item.oneTimeBonus).toFixed(2),
                Number(item.socialInsurance).toFixed(2),
                Number(item.tax).toFixed(2),
                Number(item.taxRate).toFixed(2),
                Number(item.netPay).toFixed(2)
            ]);
        });

        const bonusRows: (string | number)[][] = [[
            L10n.time, L10n.bonus, L10n.tax, L10n.tax_rate, L10n.net_pay
        ]];
        payroll.bonuses.forEach((item: AnnualBonus) => {
            bonusRows.push([
                formatDate(new Date(item.date)),
                Number(item.bonus).toFixed(2),
                Number(item.tax).toFixed(2),
                Number(item.taxRate).toFixed(2),
                Number(item.netPay).toFixed(2)
            ]);
        });

        const budgetRows: (string | number)[][] = [[L10n.budget_name, L10n.budget_amount]];
        payroll.budgets.forEach((item: BudgetItem) => {
            budgetRows.push([item.name, Number(item.amount).toFixed(2)]);
        });

        return [
            { name: L10n.record_list, rows: recordRows, widths: [28, 12, 18, 18, 14, 32, 12] },
            { name: L10n.salary, rows: salaryRows, widths: [24, 14, 14, 16, 14, 12, 12, 14] },
            { name: L10n.annual_bonus, rows: bonusRows, widths: [24, 14, 12, 12, 14] },
            { name: "预算", rows: budgetRows, widths: [24, 14] },
        ];
    }
    catch (error: unknown) {
        logError("Export workbook data failed:" + error);
        throw error;
    }
}

export function downloadWorkbook(sheets: WorkbookSheet[], fileName: string) {
    const stringToBuff = (str: string) => {
        const buf = new ArrayBuffer(str.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i !== str.length; ++i) {
            view[i] = str.charCodeAt(i) & 0xff;
        }
        return buf;
    };

    const workbook = XLSX.utils.book_new();
    sheets.forEach((sheet) => {
        const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows as any[][]);
        worksheet['!cols'] = (sheet.widths || []).map((width) => ({ wch: width }));
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });

    const xlsxBlob = new Blob(
        [stringToBuff(XLSX.write(workbook, { bookType: 'xlsx', bookSST: false, type: 'binary' }))],
        { type: 'application/octet-stream' }
    );

    const url = URL.createObjectURL(xlsxBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${fileName}.xlsx`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
}


export const downloadXlsx = (dataList: string[][], fileName: string) => {
    const stringToBuff = (str: string) => {
        const buf = new ArrayBuffer(str.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i !== str.length; ++i) {
            view[i] = str.charCodeAt(i) & 0xff;
        }
        return buf;
    };

    // 创建表格
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(dataList);

    worksheet['!cols'] = [
        { wch: 30 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 30 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'sheet1');

    // 创建二进制对象写入转换好的字节流
    const xlsxBlob = new Blob(
        [stringToBuff(XLSX.write(workbook, { bookType: 'xlsx', bookSST: false, type: 'binary' }))],
        { type: 'application/octet-stream' }
    );

    // 创建下载链接并触发下载
    const url = URL.createObjectURL(xlsxBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${fileName}.xlsx`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url); // 清理资源
}


export interface ImportFailedResult {
    errorIndex: string,
    errorInfo: string
}


export function parseImportData(jsonData: any[]): [ImportFailedResult[], Record[]] {
    const successResult: Record[] = []
    const failedResult: ImportFailedResult[] = []
    jsonData.forEach((item: any, index: number) => {
        if (failedResult.length > 10) {
            return [failedResult, successResult];
        }
        const time = item[L10n.time]
        let date: Date | null = null
        // TODO: 这里要写一个专门格式化日期的函数
        if (time as string && time.includes(L10n.year_unit) && time.includes(L10n.month_unit) && time.includes(L10n.day_unit)) {
            const formattedDateString = time.replace(/年|月/g, "-").replace(L10n.day_unit, "");
            date = new Date(formattedDateString);
        } else {
            date = new Date(time);
        }
        const amount = Number(item[L10n.amount]);
        const type = item[L10n.type];
        const category = item[L10n.category];
        const subCategory = item[L10n.sub_category];
        if (date === undefined || date === null || isNaN(date.getTime())) {
            failedResult.push({
                errorIndex: `${L10n.index_prefix} ${(index + 1)} ${L10n.index_suffix}`,
                errorInfo: L10n.date_failed_reason
            })
            return
        } else if (amount === undefined || amount === null || isNaN(amount)) {
            failedResult.push({
                errorIndex: `${L10n.index_prefix} ${(index + 1)} ${L10n.index_suffix}`,
                errorInfo: L10n.amount_failed_reason
            })
            return
        } else if (type === undefined || type === null || type === "" || (type !== "支出" && type !== "收入")) {
            failedResult.push({
                errorIndex: `${L10n.index_prefix} ${(index + 1)} ${L10n.index_suffix}`,
                errorInfo: L10n.type_failed_reason
            })
            return
        } else if (category === undefined || category === null || category === "") {
            failedResult.push({
                errorIndex: `${L10n.index_prefix} ${(index + 1)} ${L10n.index_suffix}`,
                errorInfo: L10n.category_failed_reason
            })
            return
        } else if (subCategory === undefined || subCategory === null || subCategory === "") {
            failedResult.push({
                errorIndex: `${L10n.index_prefix} ${(index + 1)} ${L10n.index_suffix}`,
                errorInfo: L10n.sub_category_failed_reason
            })
            return
        } else {
            const record: Record = {
                id: 0,
                date: date,
                amount: amount,
                type: type,
                category: category,
                subCategory: subCategory,
                remark: item[L10n.remark]?.toString() || "",
                isDeleted: false,
                syncId: 0,
                countInBudget: parseCountInBudget(item[L10n.count_in_budget])
            }
            successResult.push(record)
        }
    });

    return [failedResult, successResult]
}

// 这里分段发送，每段100条数据，当数据量大于100条时，分段发送
export async function importData(records: Record[]) {
    const chunkSize = 100;
    const successIDs: Number[] = []
    for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize)
        try {
            const records = await importRecords(chunk);
            if (records !== undefined && records.length > 0) {
                successIDs.push(...records.map((record) => record.id))
            }
        }
        catch (error: unknown) {
            logError("Import records failed:" + error);
            await deleteRecords(successIDs);
            throw error;
        }
    }
}

function parseCountInBudget(value: any): number {
    if (value === undefined || value === null || value === "") {
        return 1;
    }
    const text = String(value).trim();
    if (text === "否" || text === "0" || text.toLowerCase() === "false") {
        return 0;
    }
    return 1;
}

function parseFlexibleDate(value: any): Date | null {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
    }
    const text = String(value);
    let date: Date;
    if (text.includes(L10n.year_unit) && text.includes(L10n.month_unit) && text.includes(L10n.day_unit)) {
        const formatted = text.replace(/年|月/g, "-").replace(L10n.day_unit, "");
        date = new Date(formatted);
    } else {
        date = new Date(text);
    }
    return isNaN(date.getTime()) ? null : date;
}

function toNumber(value: any): number {
    const result = Number(value);
    return isNaN(result) ? 0 : result;
}

export interface PayrollImportResult {
    salaries: SalaryRecord[];
    bonuses: AnnualBonus[];
    budgets: BudgetItem[];
    failed: ImportFailedResult[];
}

export function parsePayrollRows(
    salaryRows: any[],
    bonusRows: any[],
    budgetRows: any[]
): PayrollImportResult {
    const salaries: SalaryRecord[] = [];
    const bonuses: AnnualBonus[] = [];
    const budgets: BudgetItem[] = [];
    const failed: ImportFailedResult[] = [];

    salaryRows.forEach((item: any, index: number) => {
        const date = parseFlexibleDate(item[L10n.time]);
        if (!date) {
            failed.push({ errorIndex: `${L10n.index_prefix} ${index + 1} ${L10n.index_suffix}`, errorInfo: L10n.date_failed_reason });
            return;
        }
        salaries.push({
            id: 0,
            date: date.getTime(),
            baseSalary: toNumber(item[L10n.base_salary]),
            overtimePay: toNumber(item[L10n.overtime_pay]),
            oneTimeBonus: toNumber(item[L10n.one_time_bonus]),
            socialInsurance: toNumber(item[L10n.social_insurance]),
            tax: toNumber(item[L10n.tax]),
            taxRate: toNumber(item[L10n.tax_rate]),
            netPay: toNumber(item[L10n.net_pay]),
        });
    });

    bonusRows.forEach((item: any, index: number) => {
        const date = parseFlexibleDate(item[L10n.time]);
        if (!date) {
            failed.push({ errorIndex: `${L10n.index_prefix} ${index + 1} ${L10n.index_suffix}`, errorInfo: L10n.date_failed_reason });
            return;
        }
        bonuses.push({
            id: 0,
            date: date.getTime(),
            bonus: toNumber(item[L10n.bonus]),
            tax: toNumber(item[L10n.tax]),
            taxRate: toNumber(item[L10n.tax_rate]),
            netPay: toNumber(item[L10n.net_pay]),
        });
    });

    budgetRows.forEach((item: any) => {
        const name = item[L10n.budget_name];
        if (name === undefined || name === null || String(name).trim() === "") {
            return;
        }
        budgets.push({
            id: 0,
            name: String(name).trim(),
            amount: toNumber(item[L10n.budget_amount]),
        });
    });

    return { salaries, bonuses, budgets, failed };
}
