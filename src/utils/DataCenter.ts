import { Filter } from "@/models/Filter";
import { IpcResponse, IpcType } from "@/models/IpcResponse";
import { Record } from "@/models/Record";
import { SingleYearlyData, TotalCategory, SingleCategoryData, YearlyData, TimeLineRecord, CategoryItem } from "@/models/AnalysisData"
import { CategorySettingNode } from "@/models/CategorySettingNode"
import { CategoryNodeItem } from '@/models/CategoryNodeItem'
import { PayrollData, SalaryRecord, AnnualBonus, BudgetItem } from '@/models/Payroll'
import { DepositBank, DepositData, DepositRecord } from '@/models/Deposit'

export function logInfo(content: string) {
    window.electron.ipcRenderer.invoke('logger', 'info', ' [renderer] ' + content);
}

export function logError(content: string) {
    window.electron.ipcRenderer.invoke('logger', 'error', ' [renderer] ' + content);
}

// DashBoard Network

// 获取某段时间内的总收入和总支出
export async function fetchTotalAmountByFilter(filter: string): Promise<{ income: number, outcome: number }> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.TOTAL_AMOUNT_BY_Filter, filter);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data;
        }
    }
    catch (error: unknown) {
        logError("fetch total amount by range failed " + error)
        throw error;
    }
}

// 创建新的记录
export async function asyncCreateRecord(record: Record): Promise<Record> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.CREATE_RECORD, JSON.stringify(record));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data as Record;
        }
    }
    catch (error: unknown) {
        logError("Creating record failed:" + error);
        throw error;
    }
}

// 根据过滤条件获取对应的账单数组
export async function asyncFetchRecords(filter: Filter): Promise<Record[]> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.FETCH_RECORDS_BY_FILTER, JSON.stringify(filter));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data as Record[];
        }
    }
    catch (error: unknown) {
        logError("Fetching records failed:" + error);
        throw error;
    }
}

// 获取总收入和总支出
export async function fetchTotalAmount(): Promise<{ income: number, outcome: number }> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.TOTAL_AMOUNT);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data;
        }
    }
    catch (error: unknown) {
        logError("fetch total amount failed " + error)
        throw error;
    }
}

// 更新一条记录
export async function asyncUpdateRecord(record: Record): Promise<Record> {
    try {
        console.log("asyncUpdateRecord", record);
        const response = await window.electron.ipcRenderer.invoke(IpcType.UPDATE_RECORD, JSON.stringify(record));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return record;
        }
    }
    catch (error: unknown) {
        logError("Updating record failed:" + error);
        throw error;
    }
}

// 删除一条记录
export async function asyncDeleteRecord(record: Record): Promise<void> {
    try {
        const result = await window.electron.ipcRenderer.invoke(IpcType.DELETE_RECORD, JSON.stringify(record));
        const data = JSON.parse(result) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            logInfo("Record deleted successfully");
        }
    }
    catch (error: unknown) {
        logError("Deleting record failed:" + error);
        throw error;
    }
}

// analysis Network
export async function fetchYearlyData(years: string[], recordType: "支出" | "收入" = "支出"): Promise<SingleYearlyData[]> {
    try {
        const result = await window.electron.ipcRenderer.invoke(IpcType.YEARLY_DATA, JSON.stringify(years), recordType);
        const data = JSON.parse(result) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data as SingleYearlyData[];
        }
    }
    catch (error: unknown) {
        logError("Fetching yearly data failed:" + error);
        throw error;
    }
}

// 获取所有category的总金额
export async function fetchTotalCategorysAmount(): Promise<TotalCategory[]> {
    try {
        const result = await window.electron.ipcRenderer.invoke(IpcType.TOTAL_CATEGORY_AMOUNT);
        const data = JSON.parse(result) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data as TotalCategory[];
        }
    }
    catch (error: unknown) {
        logError("Fetching total category amount failed:" + error);
        throw error;
    }
}

// 获取某个category的详细数据
export async function fetchCategoryData(category: string): Promise<SingleCategoryData> {
    try {
        const result = await window.electron.ipcRenderer.invoke(IpcType.CATGORY_DATA, category);
        const data = JSON.parse(result) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data as SingleCategoryData;
        }
    }
    catch (error: unknown) {
        logError("Fetching category data failed:" + error);
        throw error;
    }
}

// 获取某年某个category的每月数据
export async function fetchYearlyCategoryData(year: number, category: string, recordType: "支出" | "收入" = "支出"): Promise<YearlyData> {
    try {
        const result = await window.electron.ipcRenderer.invoke(IpcType.YEARLY_CATEGORY_DATA, year, category, recordType);
        const data = JSON.parse(result) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data as YearlyData;
        }
    }
    catch (error: unknown) {
        logError("Fetching yearly category data failed:" + error);
        throw error;
    }
}

// 获取某年所有的category数据
export async function fetchYearlyTotalInfo(year: number, recordType: "支出" | "收入" = "支出"): Promise<CategoryItem[]> {
    try {
        const result = await window.electron.ipcRenderer.invoke(IpcType.YEARLY_TOTAL_CATEGORY, year, recordType);
        const data = JSON.parse(result) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data as CategoryItem[];
        }
    }
    catch (error: unknown) {
        logError("Fetching yearly total info failed:" + error);
        throw error;
    }
}

// 获取时间线数据
export async function fetchTimeLineData(): Promise<TimeLineRecord[]> {
    try {
        const result = await window.electron.ipcRenderer.invoke(IpcType.TIME_LINE_DATA);
        const data = JSON.parse(result) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data as TimeLineRecord[];
        }
    }
    catch (error: unknown) {
        logError("Fetching time line data failed:" + error);
        throw error;
    }
}

// settings Network

// 获取所有的账单数据
export async function fetchAllRecords(): Promise<Record[]> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.ALL_RECORDS_DESC);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data as Record[];
        }
    }
    catch (error: unknown) {
        logError("Fetching all records failed:" + error);
        throw error;
    }
}

// 保存自定义category数据
export async function saveCustomCategory(node: CategorySettingNode) {
    try {
        const children = node.children?.map((category) => {
            return {
                label: category.label,
                value: category.id,
                children: category.children?.map((subCategory) => {
                    return {
                        label: subCategory.label,
                        value: subCategory.id
                    }
                })
            }
        })

        const req = {
            "category": {
                "custom": children
            }
        }
        const response = await window.electron.ipcRenderer.invoke(IpcType.SAVE_CUSTOM_CATEGORY, JSON.stringify(req));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            logInfo("Custom category saved successfully");
        }
    }
    catch (error: unknown) {
        logError("Saving custom category failed:" + error);
        throw error;
    }
}

// 导入record数据
export async function importRecords(records: Record[]): Promise<Record[]> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.IMPORT_RECORDS, JSON.stringify(records));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data as Record[];
        }
    }
    catch (error: unknown) {
        logError("Importing records failed:" + error);
        throw error;
    }
}

// 批量删除records
export async function deleteRecords(ids: Number[]) {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.PATCH_DELETE_RECORDS, JSON.stringify(ids));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data as Record[];
        }
    }
    catch (error: unknown) {
        logError("Deleting records failed:" + error);
        throw error;
    }
}


export async function fetchCustomCategory(): Promise<CategoryNodeItem[]> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.FETCH_CUSTOM_CATEGORY);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            if (data.data == null || data.data == "") {
                return [];
            }
            return JSON.parse(data.data).category.custom as CategoryNodeItem[];
        }
    }
    catch (error: unknown) {
        logError("Fetching custom category failed:" + error);
        throw error;
    }
}
// Payroll Network

export async function fetchPayrollData(): Promise<PayrollData> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.FETCH_PAYROLL_DATA);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data as PayrollData;
        }
    }
    catch (error: unknown) {
        logError("Fetching payroll data failed:" + error);
        throw error;
    }
}

export async function createSalary(salary: SalaryRecord): Promise<number> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.CREATE_SALARY, JSON.stringify(salary));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        }
        return data.data as number;
    }
    catch (error: unknown) {
        logError("Creating salary failed:" + error);
        throw error;
    }
}

export async function updateSalary(salary: SalaryRecord): Promise<number> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.UPDATE_SALARY, JSON.stringify(salary));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        }
        return data.data as number;
    }
    catch (error: unknown) {
        logError("Updating salary failed:" + error);
        throw error;
    }
}

export async function deleteSalary(id: number): Promise<void> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.DELETE_SALARY, id);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        }
    }
    catch (error: unknown) {
        logError("Deleting salary failed:" + error);
        throw error;
    }
}

export async function createBonus(bonus: AnnualBonus): Promise<number> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.CREATE_BONUS, JSON.stringify(bonus));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        }
        return data.data as number;
    }
    catch (error: unknown) {
        logError("Creating bonus failed:" + error);
        throw error;
    }
}

export async function updateBonus(bonus: AnnualBonus): Promise<number> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.UPDATE_BONUS, JSON.stringify(bonus));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        }
        return data.data as number;
    }
    catch (error: unknown) {
        logError("Updating bonus failed:" + error);
        throw error;
    }
}

export async function deleteBonus(id: number): Promise<void> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.DELETE_BONUS, id);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        }
    }
    catch (error: unknown) {
        logError("Deleting bonus failed:" + error);
        throw error;
    }
}

export async function saveBudgets(items: BudgetItem[]): Promise<BudgetItem[]> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.SAVE_BUDGETS, JSON.stringify(items));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        }
        return data.data as BudgetItem[];
    }
    catch (error: unknown) {
        logError("Saving budgets failed:" + error);
        throw error;
    }
}

export async function fetchBudgetExpense(start: number, end: number): Promise<number> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.FETCH_BUDGET_EXPENSE, start, end);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        }
        return data.data as number;
    }
    catch (error: unknown) {
        logError("Fetching budget expense failed:" + error);
        throw error;
    }
}

export async function importPayroll(payload: { salaries?: SalaryRecord[]; bonuses?: AnnualBonus[]; budgets?: BudgetItem[] }) {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.IMPORT_PAYROLL, JSON.stringify(payload));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        }
        return data.data;
    }
    catch (error: unknown) {
        logError("Importing payroll failed:" + error);
        throw error;
    }
}

// Deposit Network

export async function fetchDepositData(): Promise<DepositData> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.FETCH_DEPOSIT_DATA);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        }
        return data.data as DepositData;
    }
    catch (error: unknown) {
        logError("Fetching deposit data failed:" + error);
        throw error;
    }
}

export async function createBank(bank: DepositBank): Promise<number> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.CREATE_BANK, JSON.stringify(bank));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        }
        return data.data as number;
    }
    catch (error: unknown) {
        logError("Creating bank failed:" + error);
        throw error;
    }
}

export async function updateBank(bank: DepositBank): Promise<number> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.UPDATE_BANK, JSON.stringify(bank));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        }
        return data.data as number;
    }
    catch (error: unknown) {
        logError("Updating bank failed:" + error);
        throw error;
    }
}

export async function deleteBank(id: number): Promise<void> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.DELETE_BANK, id);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        }
    }
    catch (error: unknown) {
        logError("Deleting bank failed:" + error);
        throw error;
    }
}

export async function createDeposit(deposit: DepositRecord): Promise<number> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.CREATE_DEPOSIT, JSON.stringify(deposit));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        }
        return data.data as number;
    }
    catch (error: unknown) {
        logError("Creating deposit failed:" + error);
        throw error;
    }
}

export async function updateDeposit(deposit: DepositRecord): Promise<number> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.UPDATE_DEPOSIT, JSON.stringify(deposit));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        }
        return data.data as number;
    }
    catch (error: unknown) {
        logError("Updating deposit failed:" + error);
        throw error;
    }
}

export async function deleteDeposit(id: number): Promise<void> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.DELETE_DEPOSIT, id);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        }
    }
    catch (error: unknown) {
        logError("Deleting deposit failed:" + error);
        throw error;
    }
}

export async function reorderDeposits(ids: number[]): Promise<void> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.REORDER_DEPOSITS, JSON.stringify(ids));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        }
    }
    catch (error: unknown) {
        logError("Reordering deposits failed:" + error);
        throw error;
    }
}
