export interface Record {
    id: Number;
    date: Date;
    amount: number;
    type: string;
    category: string;
    subCategory: string;
    remark: string;
    isDeleted: Boolean;
    syncId: number;
}

export interface DailyRecords {
    id: String;
    date: Date;
    records: Record[];
    income: number;
    expense: number;
}