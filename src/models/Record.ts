export interface Record {
    id: Number;
    date: Date;
    amount: number;
    type: string;
    category: string;
    subCategory: string;
    remark: string;
    isDeleted: Boolean;
}

export interface DailyRecords {
    id: String;
    date: Date;
    records: Record[];
    income: number;
    expense: number;
}