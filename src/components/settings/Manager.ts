import * as XLSX from 'xlsx';
import { getCategories, defaultCategories, CategoryItem } from "@/configs/CategoryParser"
import { updateCurrentCategory } from "@/configs/CategoryParser"
import L10n from "@/configs/L10n.json"
import { Record } from "@/models/Record";
import { formatDate } from "@/utils/DateUtils"
import { fetchAllRecords, importRecords, deleteRecords, logError } from "@/utils/DataCenter"
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
    const title = [L10n.time, L10n.type, L10n.category, L10n.sub_category, L10n.amount, L10n.remark];
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
                record.remark
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
                syncId: 0
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