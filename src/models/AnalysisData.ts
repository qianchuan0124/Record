import { Record } from './Record';

export interface SingleYearlyData {
    year: string;
    items: CategoryItem[]
}

export interface CategoryItem {
    category: string;
    total: number;
}


export interface TotalCategory {
    name: string;
    value: number;
}

export interface SingleCategoryData {
    category: string;
    total: number;
    subCategory: SubCategoryItem[]
}

interface SubCategoryItem {
    subCategory: string;
    total: number;
    records: Record[]
}

export interface YearlyData {
    year: number;
    category: string;
    total: number;
    months: SingleMonthData[]
}

interface SingleMonthData {
    month: number;
    total: number;
    subCategory: SubCategoryItem[]
}

export interface TimeLineRecord {
    year: number;
    totalRecords: number;
    total: number;
    earliestRecord: Record;
    latestRecord: Record;
    largestAmountRecord: Record;
}