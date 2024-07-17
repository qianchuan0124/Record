import { Filter } from "@/models/Filter";
import { IpcResponse, IpcType } from "@/models/IpcResponse";
import { Record } from "@/models/Record";
import { SingleYearlyData, TotalCategory, SingleCategoryData, YearlyData, TimeLineRecord } from "@/models/AnalysisData"
import { CategorySettingNode } from "@/models/CategorySettingNode"
import { CategoryNodeItem } from '@/models/CategoryNodeItem'

export function logInfo(content: string) {
    window.electron.ipcRenderer.invoke('logger', 'info', ' [renderer] ' + content);
}

export function logError(content: string) {
    window.electron.ipcRenderer.invoke('logger', 'error', ' [renderer] ' + content);
}

// DashBoard Network

// 获取某段时间内的总收入和总支出
export async function fetchTotalAmountByDateRange(start: Date, end: Date): Promise<{ income: number, outcome: number }> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.TOTAL_AMOUNT_BY_DATE_RANGE, start.getTime(), end.getTime());
        // console.log("response: ", response);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data;
        }
    }
    catch (error: unknown) {
        console.error("Fetching total amount by date range failed:", error);
        throw error;
    }
}

// 创建新的记录
export async function asyncCreateRecord(record: Record): Promise<Record> {
    try {
        console.log("record: ", record);
        const response = await window.electron.ipcRenderer.invoke(IpcType.CREATE_RECORD, JSON.stringify(record));
        console.log("response: ", response);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            console.log("Record created successfully");
            return data.data as Record;
        }
    }
    catch (error: unknown) {
        console.error("Creating record failed:", error);
        throw error;
    }
}

// 根据过滤条件获取对应的账单数组
export async function asyncFetchRecords(filter: Filter): Promise<Record[]> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.FETCH_RECORDS_BY_FILTER, JSON.stringify(filter));
        // console.log("response: ", response);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data as Record[];
        }
    }
    catch (error: unknown) {
        console.error("Fetching records failed:", error);
        throw error;
    }
}

// 获取总收入和总支出
export async function fetchTotalAmount(): Promise<{ income: number, outcome: number }> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.TOTAL_AMOUNT);
        // console.log("response: ", response);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data;
        }
    }
    catch (error: unknown) {
        console.error("Fetching total amount failed:", error);
        throw error;
    }
}

// 更新一条记录
export async function asyncUpdateRecord(record: Record): Promise<Record> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.UPDATE_RECORD, JSON.stringify(record));
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            console.log("Record updated successfully" + data.data);
            return record;
        }
    }
    catch (error: unknown) {
        console.error("Updating record failed:", error);
        throw error;
    }
}

// 删除一条记录
export async function asyncDeleteRecord(record: Record): Promise<void> {
    try {
        const result = await window.electron.ipcRenderer.invoke(IpcType.DELETE_RECORD, record.id);
        const data = JSON.parse(result) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            console.log("Record deleted successfully");
        }
    }
    catch (error: unknown) {
        console.error("Deleting record failed:", error);
        throw error;
    }
}

// analysis Network
export async function fetchYearlyData(years: string[]): Promise<SingleYearlyData[]> {
    try {
        const result = await window.electron.ipcRenderer.invoke(IpcType.YEARLY_DATA, JSON.stringify(years));
        const data = JSON.parse(result) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            console.log("Record deleted successfully");
            return data.data as SingleYearlyData[];
        }
    }
    catch (error: unknown) {
        console.error("Deleting record failed:", error);
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
            console.log("Record deleted successfully");
            return data.data as TotalCategory[];
        }
    }
    catch (error: unknown) {
        console.error("Deleting record failed:", error);
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
            console.log("Record deleted successfully");
            return data.data as SingleCategoryData;
        }
    }
    catch (error: unknown) {
        console.error("Deleting record failed:", error);
        throw error;
    }
}

// 获取某年某个category的每月数据
export async function fetchYearlyCategoryData(year: number, category: string): Promise<YearlyData> {
    try {
        const result = await window.electron.ipcRenderer.invoke(IpcType.YEARLY_CATEGORY_DATA, year, category);
        const data = JSON.parse(result) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            console.log("Record deleted successfully");
            return data.data as YearlyData;
        }
    }
    catch (error: unknown) {
        console.error("Deleting record failed:", error);
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
            console.log("Record deleted successfully");
            return data.data as TimeLineRecord[];
        }
    }
    catch (error: unknown) {
        console.error("Deleting record failed:", error);
        throw error;
    }
}

// settings Network

// 获取所有的账单数据
export async function fetchAllRecords(): Promise<Record[]> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.ALL_RECORDS_DESC);
        console.log("response: ", response);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data as Record[];
        }
    }
    catch (error: unknown) {
        console.error("Exporting all records failed:", error);
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
        // console.log("response: ", response);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            console.log("Custom category saved successfully");
        }
    }
    catch (error: unknown) {
        console.error("Saving custom category failed:", error);
        throw error;
    }
}

// 导入record数据
export async function importRecords(records: Record[]): Promise<Record[]> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.IMPORT_RECORDS, JSON.stringify(records));
        console.log("response: ", response);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data as Record[];
        }
    }
    catch (error: unknown) {
        console.error("Exporting all records failed:", error);
        throw error;
    }
}

// 批量删除records
export async function deleteRecords(ids: Number[]) {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.PATCH_DELETE_RECORDS, JSON.stringify(ids));
        console.log("response: ", response);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            return data.data as Record[];
        }
    }
    catch (error: unknown) {
        console.error("Exporting all records failed:", error);
        throw error;
    }
}


export async function fetchCustomCategory(): Promise<CategoryNodeItem[]> {
    try {
        const response = await window.electron.ipcRenderer.invoke(IpcType.FETCH_CUSTOM_CATEGORY);
        // console.log("response: ", response);
        const data = JSON.parse(response) as IpcResponse;
        if (data.type === "error") {
            throw new Error(data.error);
        } else {
            // console.log(data.data)

            return JSON.parse(data.data) as CategoryNodeItem[];
        }
    }
    catch (error: unknown) {
        console.error("Fetching custom category failed:", error);
        throw error;
    }
}