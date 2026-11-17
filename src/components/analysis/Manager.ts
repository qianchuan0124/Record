import axios from "axios";
import { getCategories } from "@/configs/CategoryParser";
import { Record } from "@/models/Record";
import L10n from "@/configs/L10n.json"
import { formatDate } from "@/utils/DateUtils"
import { SingleYearlyData, SingleCategoryData, YearlyData, TimeLineRecord, CategoryItem } from "@/models/AnalysisData"
import { fetchYearlyData, fetchCategoryData, fetchYearlyCategoryData, fetchTimeLineData, logError, fetchYearlyTotalInfo } from "@/utils/DataCenter"

export interface YearlyAnalysis {
    name: string;
    type: string;
    stack: string;
    barWidth: string;
    emphasis: {
        focus: string;
    };
    data: number[];
    description: string[];
}

// 根据传入的开始时间与结束时间，按照category生成年度分析数据
export async function fetchYearlyAnalysis(yearsData: string[], recordType: "支出" | "收入" = "支出"): Promise<YearlyAnalysis[]> {
    try {
        const data = await fetchYearlyData(yearsData, recordType);
        const Category = getCategories();
        const categories = Category.map((item: any) => item.label);
        // 生成年度分析数据
        return categories.map((category: string) => ({
            name: category,
            type: "bar",
            stack: L10n.all_data,
            barWidth: "60%",
            emphasis: {
                focus: "series",
            },
            data: parseYearlyData(data, category, yearsData),
            description: yearsData
        }));
    }
    catch (error: unknown) {
        logError("Creating record failed:" + error);
        throw error; // 或者返回一个默认值，如 return [];
    }
}

function parseYearlyData(response: SingleYearlyData[], category: string, years: string[]): number[] {
    return years.map((year: string) => {
        const yearlyData = response.find((data) => data.year === year);
        if (yearlyData) {
            const categoryData = yearlyData.items.find((item) => item.category === category);
            return categoryData ? categoryData.total : 0;
        }
        return 0;
    })
}


export interface CategoryNode {
    id: string;
    label: string;
    level: number;
    amount: string,
    record?: Record;
    children?: CategoryNode[];
}

export async function generateCatgeoryNode(category: string): Promise<CategoryNode> {
    try {
        const data = await fetchCategoryData(category)
        return parseCategoryData(data);
    }
    catch (error: unknown) {
        logError("Creating record failed:" + error);
        throw error; // 或者返回一个默认值，如 return [];
    }
}

function parseCategoryData(response: SingleCategoryData): CategoryNode {
    return {
        id: response.category,
        label: response.category,
        level: 0,
        amount: String(response.total.toFixed(2)),
        record: undefined,
        children: response.subCategory.sort((a, b) => b.total - a.total).map((subCategory) => ({
            id: subCategory.subCategory,
            level: 1,
            amount: String(subCategory.total.toFixed(2)),
            record: undefined,
            label: subCategory.subCategory,
            children: subCategory.records.map((record) => ({
                id: String(record.id),
                label: String(formatDate(record.date)),
                level: 2,
                amount: String(record.amount.toFixed(2)),
                record: record,
                children: []
            }))
        }))
    }
}

export async function generateYearlyCategoryNode(year: number, category: string, recordType: "支出" | "收入" = "支出"): Promise<CategoryNode> {
    try {
        const data = await fetchYearlyCategoryData(year, category, recordType);
        return parseYearlyCategoryData(data);
    }
    catch (error: unknown) {
        logError("Creating record failed:" + error);
        throw error; // 或者返回一个默认值，如 return [];
    }
}

export async function generateYearlyTotalInfo(year: number, recordType: "支出" | "收入" = "支出"): Promise<CategoryNode> {
    try {
        const data = await fetchYearlyTotalInfo(year, recordType);
        return parseYearlyTotalData(year, data);
    }
    catch (error: unknown) {
        logError("Creating record failed:" + error);
        throw error; // 或者返回一个默认值，如 return [];
    }
}

function parseYearlyTotalData(year: number, response: CategoryItem[]): CategoryNode {
    const sortedData = response.sort((a, b) => b.total - a.total);
    // 如果value是空的，则过滤掉
    const filteredData = sortedData.filter((data) => data.total > 0);
    return {
        id: String(year),
        label: String(year),
        level: 0,
        amount: String(response.reduce((sum, item) => sum + item.total, 0).toFixed(2)),
        record: undefined,
        children: filteredData.map((item) => ({
            id: item.category,
            label: item.category,
            level: 1,
            amount: String(item.total.toFixed(2)),
            record: undefined,
            children: []
        }))
    }
}

function parseYearlyCategoryData(response: YearlyData): CategoryNode {
    const sortedData = response.months.sort((a, b) => b.total - a.total);
    // 如果total是空的，则过滤掉
    const filteredData = sortedData.filter((data) => data.total > 0);
    return {
        id: response.category,
        label: String(response.year) + "  " + response.category,
        level: 0,
        amount: String(response.total.toFixed(2)),
        record: undefined,
        children: filteredData.map((monthData) => ({
            id: String(monthData.month),
            label: `${monthData.month}${L10n.month_unit}`,
            level: 1,
            amount: String(monthData.total.toFixed(2)),
            record: undefined,
            children: monthData.subCategory.map((subCategory) => ({
                id: subCategory.subCategory + String(monthData.month),
                label: subCategory.subCategory,
                level: 2,
                amount: String(subCategory.total.toFixed(2)),
                record: undefined,
                children: subCategory.records.map((record) => ({
                    id: String(record.id),
                    label: String(formatDate(record.date)),
                    level: 3,
                    amount: String(record.amount.toFixed(2)),
                    record: record,
                    children: []
                }))
            }))
        }))
    }
}

export interface TimeLineNode {
    content: string;
    timestamp: string;
    isLastest: boolean;
    type: "earliest" | "latest" | "largest",
    record: Record;
}

export type TimeLineEventType = "earliest" | "latest" | "largest" | "large" | "income";

export interface TimeLineTag {
    type: TimeLineEventType;
    label: string;
}

export interface TimeLineEvent {
    type: TimeLineEventType;
    tags: TimeLineTag[];
    record: Record;
    isIncome: boolean;
}

export interface TimeLineYear {
    year: number;
    total: number;
    incomeTotal: number;
    totalRecords: number;
    events: TimeLineEvent[];
}

// 组织每年的重点节点：最后一笔、金额最大的几笔支出、最大一笔收入、第一笔
// 同一笔记录命中多个特征时合并为一张卡片，并整体按时间倒序排列
function buildYearEvents(item: TimeLineRecord): TimeLineEvent[] {
    const candidates: { type: TimeLineEventType; label: string; record?: Record | null }[] = [
        { type: "latest", label: L10n.timeline_latest, record: item.latestRecord },
        { type: "largest", label: L10n.timeline_largest, record: item.topExpenses?.[0] || item.largestAmountRecord },
        { type: "large", label: L10n.timeline_large, record: item.topExpenses?.[1] },
        { type: "large", label: L10n.timeline_large, record: item.topExpenses?.[2] },
        { type: "income", label: L10n.timeline_income_largest, record: item.largestIncome },
        { type: "earliest", label: L10n.timeline_first, record: item.earliestRecord },
    ];

    const merged = new Map<number, TimeLineEvent>();
    for (const candidate of candidates) {
        if (!candidate.record) {
            continue;
        }
        const id = Number(candidate.record.id);
        const existing = merged.get(id);
        if (existing) {
            existing.tags.push({ type: candidate.type, label: candidate.label });
            continue;
        }
        merged.set(id, {
            type: candidate.type,
            tags: [{ type: candidate.type, label: candidate.label }],
            record: candidate.record,
            isIncome: candidate.record.type === "收入",
        });
    }

    return Array.from(merged.values()).sort((a, b) => {
        const dateDiff = new Date(b.record.date).getTime() - new Date(a.record.date).getTime();
        if (dateDiff !== 0) {
            return dateDiff;
        }
        return Number(b.record.amount) - Number(a.record.amount);
    });
}

export async function generateTimeLineYears(): Promise<TimeLineYear[]> {
    try {
        const data = await fetchTimeLineData();
        return data
            .filter((item) => item && item.earliestRecord)
            .sort((a, b) => b.year - a.year)
            .map((item) => ({
                year: item.year,
                total: Number(item.total || 0),
                incomeTotal: Number(item.incomeTotal || 0),
                totalRecords: Number(item.totalRecords || 0),
                events: buildYearEvents(item),
            }));
    }
    catch (error) {
        logError("Creating timeline failed:" + error);
        return [];
    }
}

export async function generateTimeLineNodes(): Promise<TimeLineNode[]> {
    try {
        const data = await fetchTimeLineData();
        return parseTimeLineData(data);
    }
    catch (error: unknown) {
        logError("Creating record failed:" + error);
        return []
    }
}

function parseTimeLineData(response: TimeLineRecord[]): TimeLineNode[] {
    const result: TimeLineNode[] = [];
    response.sort((a, b) => b.year - a.year).forEach((record) => {
        result.push({
            content: generateTimeLineContent("latest", record.latestRecord, record.year, record.totalRecords, record.total),
            timestamp: formatDate(record.latestRecord.date),
            isLastest: false,
            type: "latest",
            record: record.latestRecord
        })
        result.push({
            content: generateTimeLineContent("largest", record.largestAmountRecord, record.year, record.totalRecords, record.total),
            timestamp: formatDate(record.largestAmountRecord.date),
            isLastest: false,
            type: "largest",
            record: record.largestAmountRecord
        })
        result.push({
            content: generateTimeLineContent("earliest", record.earliestRecord, record.year, record.totalRecords, record.total),
            timestamp: formatDate(record.earliestRecord.date),
            isLastest: false,
            type: "earliest",
            record: record.earliestRecord
        })
    })

    if (result.length > 0) {
        result[0].isLastest = true;
    }

    return result;
}

function generateTimeLineContent(type: "earliest" | "latest" | "largest", record: Record, year: number, total: number, amount: number) {
    if (type === "earliest") {
        return L10n.first_record_info
    } else if (type === 'largest') {
        return L10n.largest_record_info + record.amount + L10n.info_suffix
    } else {
        return L10n.latest_record_info + String(total) + L10n.total_expense_info + String(amount) + L10n.info_suffix
    }
}

export function recordDetails(type: "earliest" | "latest" | "largest", record: Record) {
    let result = `${formatDate(record.date)},${L10n.record_details_cost}${record.amount}${L10n.single_unit},${L10n.record_details_for}${record.category}${L10n.single_info}${record.subCategory}`

    if (record.remark.length !== 0) {
        result += L10n.record_details_reamrk_info + record.remark;
    }

    if (type === "earliest") {
        result += L10n.record_details_first_record_suffix;
    } else if (type === "largest") {
        result += L10n.record_details_largest_record_suffix;
    } else {
        result += L10n.record_details_latest_record_suffix;
    }

    return result;
}