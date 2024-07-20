import L10n from '@/configs/L10n.json';
import { Record, DailyRecords } from '@/models/Record';
import { Filter } from "@/models/Filter";
import { asyncFetchRecords, logError } from "@/utils/DataCenter";
import { isSameDate } from "@/utils/DateUtils";

export async function fetchRecordsAndGroupByDate(filter: Filter): Promise<DailyRecords[]> {
    try {
        const records = await asyncFetchRecords(filter);

        // 对拿到的records按照时间逆序排序
        records.sort((a, b) => {
            return Number(b.date) - Number(a.date);
        });

        // 根据返回的内容，生成DailyRecords数组
        const dailyRecords: DailyRecords[] = [];
        let currentDate: Date | null = null;
        let currentDailyRecords: DailyRecords | null = null;
        for (const record of records) {
            if (!currentDate || !currentDailyRecords || !isSameDate(new Date(currentDate), new Date(record.date))) {
                // 生成新的DailyRecords
                currentDate = record.date;
                currentDailyRecords = {
                    id: "",
                    date: record.date,
                    records: [],
                    income: 0,
                    expense: 0,
                };
                dailyRecords.push(currentDailyRecords);
            }
            // 将record添加到currentDailyRecords
            currentDailyRecords.records.push(record);
            if (record.type === L10n.income) {
                currentDailyRecords.income += record.amount;
            } else {
                currentDailyRecords.expense += record.amount;
            }
        }
        dailyRecords.forEach((dailyRecord) => {
            dailyRecord.records.sort((a, b) => { return Number(b.id) - Number(a.id) });
            const date = new Date(dailyRecord.date);
            date.setHours(0, 0, 0, 0);
            dailyRecord.date = date;
            dailyRecord.id = dailyRecord.records.reduce((sum, record) => sum + "-" + String(record.id), "");
        })
        return dailyRecords
    } catch (error) {
        logError("Fetching records failed:" + error);
        throw error; // 或者返回一个默认值，如 return [];
    }
}

// 获取某一天的最新记录
export async function fetchLastestDaliyRecord(date: Date): Promise<DailyRecords | null> {
    try {
        // 获取当天的开始和结束时间
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        const filter: Filter = {
            types: [],
            categorys: [],
            startTime: startDate,
            endTime: endDate,
            keyword: "",
            isAll: false
        };
        const records = await asyncFetchRecords(filter);
        if (records == null || records.length === 0) {
            return null;
        }
        // 根据id逆序排序
        records.sort((a, b) => {
            return Number(b.id) - Number(a.id);
        });
        const newIncome = records.filter(record => record.type === L10n.income).reduce((sum, record) => sum + record.amount, 0);
        const newExpense = records.filter(record => record.type === L10n.expense).reduce((sum, record) => sum + record.amount, 0);
        return {
            id: records.reduce((sum, record) => sum + "-" + String(record.id), ""),
            date: startDate,
            records: records,
            income: newIncome,
            expense: newExpense
        };
    }
    catch (error) {
        logError("Fetching lastest daily record failed:" + error);
        return null
    }
}