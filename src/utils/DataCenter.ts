import axios from 'axios';
import { Record } from "@/models/Record"
import { Filter } from "@/models/Filter"
import { CategorySettingNode } from "@/models/CategorySettingNode"
import { updateCurrentCategory } from "@/configs/CategoryParser"
import { SingleYearlyData, TotalCategory, SingleCategoryData, YearlyData, TimeLineRecord } from "@/models/AnalysisData"
const BASE_URL = 'http://localhost:3000';

// 设置全局的响应拦截器
axios.interceptors.response.use(
    response => {
        // 如果响应状态码是2xx, 则直接返回响应
        return response;
    },
    error => {
        // 统一处理错误
        console.error("Network error:", error);
        // 获取错误类型和错误码
        const { response } = error;
        if (response) {
            // 获取错误信息
            return Promise.reject(handleError(response.status, response.data));
        }

        // 抛出错误，以便可以在调用axios的地方捕获并处理
        return Promise.reject(new Error("网络错误"));
    }
);

function handleError(status: number, message: string): Error {
    if (status === 404) {
        return new Error("网络错误");
    }

    return new Error(message)
}

export function logInfo(content: string) {
    console.log(content);
}

export function logError(content: string) {
    console.error(content);
}

// DashBoard Network

// 获取某段时间内的总收入和总支出
export async function fetchTotalAmountByDateRange(satrt: Date, end: Date): Promise<{ income: number, outcome: number }> {
    try {
        const incomeResponse = await axios.get(`${BASE_URL}/records/total/income/${satrt}/${end}`);
        const expenseResponse = await axios.get(`${BASE_URL}/records/total/expense/${satrt}/${end}`);
        return {
            income: incomeResponse.data.total ? incomeResponse.data.total : 0,
            outcome: expenseResponse.data.total ? expenseResponse.data.total : 0,
        };
    }
    catch (error: unknown) {
        console.error("Fetching records failed:", error);
        throw error;
    }
}

// 创建新的记录
export async function asyncCreateRecord(record: Record): Promise<Record> {
    try {
        // 以json格式发送post请求，用record填充请求体
        const response = await axios.post(`${BASE_URL}/record`, record);
        return response.data;
    }
    catch (error) {
        console.error("Creating record failed:", error);
        throw error;
    }
}

// 根据过滤条件获取对应的账单数组
export async function asyncFetchRecords(filter: Filter): Promise<Record[]> {
    try {
        const response = await axios.post(`${BASE_URL}/filter/records`, filter);
        return response.data as Record[];
    }
    catch (error: unknown) {
        console.error("Fetching records failed:", error);
        throw error;
    }
}

// 获取总收入和总支出
export async function fetchTotalAmount(): Promise<{ income: number, outcome: number }> {
    try {
        const incomeResponse = await axios.get(`${BASE_URL}/records/total/income`);
        const expenseResponse = await axios.get(`${BASE_URL}/records/total/expense`);
        return {
            income: incomeResponse.data.total ? incomeResponse.data.total : 0,
            outcome: expenseResponse.data.total ? expenseResponse.data.total : 0,
        };
    }
    catch (error) {
        console.error("Fetching records failed:", error);
        throw error; // 或者返回一个默认值，如 return [];
    }
}

// 更新一条记录
export async function asyncUpdateRecord(record: Record): Promise<Record> {
    try {
        const response = await axios.put(`${BASE_URL}/records/${record.id}`, record);
        return response.data;
    }
    catch (error) {
        console.error("Updating record failed:", error);
        throw error; // 或者返回一个默认值，如 return [];
    }
}

// 删除一条记录
export async function asyncDeleteRecord(record: Record): Promise<void> {
    try {
        await axios.delete(`${BASE_URL}/records/${record.id}`);
    }
    catch (error) {
        console.error("Deleting record failed:", error);
        throw error; // 或者返回一个默认值，如 return [];
    }
}

// analysis Network
export async function fetchYearlyData(years: string[]): Promise<SingleYearlyData[]> {
    try {
        const req = { "years": years }
        const response = await axios.post(`${BASE_URL}/records/total/category`, req);
        return response.data as SingleYearlyData[];
    }
    catch (error: unknown) {
        console.error("Fetching yearly data failed:", error);
        throw error;
    }
}

// 获取所有category的总金额
export async function fetchTotalCategorysAmount(): Promise<TotalCategory[]> {
    try {
        const response = await axios.get(`${BASE_URL}/records/total/category/top`);
        return response.data as TotalCategory[];
    }
    catch (error: unknown) {
        console.error("Creating record failed:", error);
        throw error; // 或者返回一个默认值，如 return [];
    }
}

// 获取某个category的详细数据
export async function fetchCategoryData(category: string): Promise<SingleCategoryData> {
    try {
        const req = { "category": category }
        const response = await axios.post(`${BASE_URL}/records/analysis/single/category`, req)
        return response.data as SingleCategoryData;
    }
    catch (error: unknown) {
        console.error("Creating record failed:", error);
        throw error; // 或者返回一个默认值，如 return [];
    }
}

// 获取某年某个category的每月数据
export async function fetchYearlyCategoryData(year: number, category: string): Promise<YearlyData> {
    try {
        const req = { "year": year, "category": category }
        const response = await axios.post(`${BASE_URL}/records/analysis/single/category/month`, req)
        return response.data as YearlyData;
    }
    catch (error: unknown) {
        console.error("Creating record failed:", error);
        throw error; // 或者返回一个默认值，如 return [];
    }
}

// 获取时间线数据
export async function fetchTimeLineData(): Promise<TimeLineRecord[]> {
    try {
        const response = await axios.get(`${BASE_URL}/records/analysis/years`);
        return response.data as TimeLineRecord[];
    }
    catch (error: unknown) {
        console.error("Creating record failed:", error);
        return []
    }
}


// settings Network

// 获取所有的账单数据
export async function fetchAllRecords(): Promise<Record[]> {
    try {
        const response = await axios.get(`${BASE_URL}/records/export/all`);
        return response.data as Record[];
    }
    catch (error: unknown) {
        console.error("Fetching records failed:", error);
        throw error;
    }
}

// 保存自定义的category数据
export async function saveCustomCategory(node: CategorySettingNode) {
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
    try {
        await axios.post(`${BASE_URL}/records/custom/category`, req)
        await updateCurrentCategory()
    }
    catch (error: unknown) {
        console.error("Saving custom category failed:", error);
        throw error;
    }
}

// 导入record数据
export async function importRecords(records: Record[]): Promise<Record[]> {
    try {
        const req = { "records": records }
        return await axios.post(`${BASE_URL}/records/import`, records)
    }
    catch (error: unknown) {
        console.error("Importing records failed:", error);
        throw error;
    }
}

// 批量删除records
export async function deleteRecords(ids: number[]) {
    try {
        return await axios.post(`${BASE_URL}/records/delete`, ids)
    }
    catch (error: unknown) {
        console.error("Deleting records failed:", error);
        throw error;
    }
}

export async function fetchCustomCategory() {
    try {
        return await axios.get(`${BASE_URL}/records/custom/category`)
    } catch (error: unknown) {
        console.error("Fetching custom category failed:", error);
        throw error;
    }
}
