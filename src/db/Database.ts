import sqlite3 from "sqlite3";
import path from "path";
import { ipcMain } from "electron";
import { app } from 'electron';
import { Record } from "@/models/Record";
import { IpcResponse, IpcType } from "@/models/IpcResponse";
import fs from "fs/promises";
import { ErrorType } from "./ErrorInfo";
import { logError, logInfo } from "@/utils/Log";

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, "records.db");

logInfo("dbPath: " + dbPath);

const createTableSql = `
CREATE TABLE record (
    id INTEGER PRIMARY KEY,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    date Date NOT NULL,
    category TEXT NOT NULL,
    subCategory TEXT NOT NULL,
    remark TEXT NOT NULL,
    isDeleted BOOLEAN Default 0
);
`

// 连接到数据库，如果数据库不存在则会被创建
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        logError("Connected database failed, error:" + err.message);
        return
    }
    logInfo("Connected to the records database.");
});

// 检查record表是否存在
db.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='record';",
    (err, row) => {
        if (err) {
            logError("check table failed, error:" + err.message);
            return
        }
        if (row) {
            logInfo('Table "record" already exists.');
        } else {
            logInfo('Table "record" does not exist. Creating table...');
            // 读取schema.sql文件并执行SQL语句创建表
            db.exec(createTableSql, (err) => {
                if (err) {
                    logError("Create table failed, error:" + err.message);
                    return
                }
                logInfo('Table "record" has been created.');
            });
        }
    }
);

export function databaseListen() {
    ipcMain.handle(IpcType.TOTAL_AMOUNT_BY_DATE_RANGE, async (event, start, end) => {
        logInfo("fetch total amount by date range");
        try {
            const result = await fetchTotalAmountByRange(new Date(start), new Date(end));
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Fetching total amount by date range failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.CREATE_RECORD, async (event, record) => {
        logInfo("will create record");
        try {
            const result = await createRecord(JSON.parse(record));
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Creating record failed:" + error);
            return handleError(error);
        }
    });

    ipcMain.handle(IpcType.FETCH_RECORDS_BY_FILTER, async (event, filter) => {
        logInfo("will get all records");
        try {
            const result = await fetchRecordsByFilter(filter);
            logInfo("get all records success");
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Fetching records failed:" + error);
            return handleError(error);
        }
    });

    ipcMain.handle(IpcType.TOTAL_AMOUNT, async (event) => {
        logInfo("will fetch total amount");
        try {
            const result = await fetchTotalAmount();
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Fetching total amount failed:" + error);
            return handleError(error);
        }
    });

    ipcMain.handle(IpcType.UPDATE_RECORD, async (event, record) => {
        logInfo("will update record");
        try {
            const result = await updateRecord(JSON.parse(record) as Record);
            logInfo("update record success");
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Updating record failed:" + error);
            return handleError(error);
        }
    });

    ipcMain.handle(IpcType.DELETE_RECORD, async (event, record) => {
        logInfo("will delete record");
        try {
            const realRecord = JSON.parse(record) as Record;
            const result = await updateRecord({ ...realRecord, isDeleted: true });
            logInfo("delete record success");
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Deleting record failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.YEARLY_DATA, async (event, years) => {
        logInfo("will fetch yearly data");
        try {
            const result = await yearlyData(JSON.parse(years) as number[]);
            logInfo("fetch yearly data success");
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Fetching yearly data failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.TOTAL_CATEGORY_AMOUNT, async (event) => {
        logInfo("will fetch total amount by category");
        try {
            const result = await getTopCategoryByAmount()
            logInfo("fetch total amount by category success");
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Fetching total amount by category failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.CATGORY_DATA, async (event, category) => {
        logInfo("will fetch total amount by category");
        try {
            const result = await getTopSubCategoryByAmount(category)
            logInfo("fetch total amount by category success");
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Fetching total amount by category failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.YEARLY_CATEGORY_DATA, async (event, year, category) => {
        logInfo("will fetch total amount by category in years");
        try {
            const result = await getTopSubCategoryByYear(year, category);
            logInfo("fetch total amount by category in years success");
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Fetching total amount by category in years failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.TIME_LINE_DATA, async () => {
        logInfo("will fetch time line data");
        try {
            const result = await getTimeLineByYears();
            logInfo("fetch time line data success");
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Fetching time line data failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.IMPORT_RECORDS, async (event, records) => {
        logInfo("will import records");
        try {
            const result = batchInsertRecords(JSON.parse(records) as Record[]);
            logInfo("import records success");
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Importing records failed:" + error);
            return handleError(error);
        }
    })


    ipcMain.handle(IpcType.PATCH_DELETE_RECORDS, async (event, ids) => {
        logInfo("will delete records by ids");
        try {
            const result = await batchDeleteRecords(JSON.parse(ids) as number[]);
            logInfo("delete records by ids success");
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Deleting records by ids failed:" + error);
            return handleError(error);
        }
    })


    ipcMain.handle(IpcType.ALL_RECORDS_DESC, async (event) => {
        logInfo("will fetch all records");
        try {
            const result = await fetchAllRecords();
            logInfo("fetch all records success");
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Fetching all records failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.SAVE_CUSTOM_CATEGORY, async (event, newCategory) => {
        logInfo("will save custom category");
        try {
            const result = await saveCustomCategory(newCategory);
            logInfo("save custom category success");
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Saving custom category failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.FETCH_CUSTOM_CATEGORY, async (event) => {
        logInfo("will read custom category");
        try {
            const result = await readCustomCategory();
            logInfo("read custom category success");
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Reading custom category failed:" + error);
            return handleError(error);
        }
    })
}

async function fetchTotalAmountByRange(start: Date, end: Date) {
    const sql = `
            SELECT
                SUM(CASE WHEN type = '收入' THEN amount ELSE 0 END) AS income,
                SUM(CASE WHEN type = '支出' THEN amount ELSE 0 END) AS outcome
            FROM record
            WHERE isDeleted = 0 AND date >= ? AND date <= ?
        `;
    const params = [getDaliyStart(start), getDaliyEnd(end)];
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row: any) => {
            if (err) {
                reject(new Error(ErrorType.DATA_BASE_ERROR));
            } else {
                resolve({ income: row.income || 0, outcome: row.outcome || 0 });
            }
        });
    });
}

async function createRecord(record: Record): Promise<number> {
    const { date, type, subCategory, category, amount, remark } = record;
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    if (!dateObj) {
        throw new Error(ErrorType.DATE_NOT_EMPTY);
    }
    if (!type) {
        throw new Error(ErrorType.TYPE_NOT_EMPTY);
    }
    if (!subCategory) {
        throw new Error(ErrorType.SUB_CATEGORY_NOT_EMPTY);
    }
    if (!category) {
        throw new Error(ErrorType.CATEGORY_NOT_EMPTY);
    }
    if (!amount) {
        throw new Error(ErrorType.AMOUNT_NOT_EMPTY);
    }
    const timestamp = dateObj.getTime();
    const row = await new Promise((resolve, reject) => {
        db.run(
            "INSERT INTO record (date, type, subCategory, category, amount, remark) VALUES (?, ?, ?, ?, ?, ?)",
            [timestamp, type, subCategory, category, amount, remark],
            function (err) {
                if (err) {
                    reject(new Error(ErrorType.DATA_BASE_ERROR));
                } else {
                    resolve(this.lastID);
                }
            }
        );
    }) as number;
    return row;
}

async function fetchRecordsByFilter(filter: string): Promise<Record[]> {
    const { types, categorys, startTime, endTime, keyword } = JSON.parse(filter);
    let sql = "SELECT * FROM record WHERE isDeleted = 0";
    let params: any[] = [];

    if (types && types.length > 0) {
        sql += ` AND type IN (${types.map(() => '?').join(',')})`;
        params = params.concat(types);
    }
    if (categorys && categorys.length > 0) {
        sql += ` AND subCategory IN (${categorys.map(() => '?').join(',')})`;
        params = params.concat(categorys);
    }
    if (startTime) {
        sql += " AND date >= ?";
        params.push(new Date(startTime).getTime());
    }
    if (endTime) {
        sql += " AND date <= ?";
        params.push(new Date(endTime).getTime());
    }
    if (keyword) {
        const keywordPattern = `%${keyword}%`;
        sql += " AND (remark LIKE ? OR type LIKE ? OR subCategory LIKE ? OR amount LIKE ?)";
        params.push(keywordPattern, keywordPattern, keywordPattern, keywordPattern);
    }

    logInfo("fetch records by filter sql:" + sql);

    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(new Error(ErrorType.DATA_BASE_ERROR));
            } else {
                resolve(rows as Record[]);
            }
        });
    });
}

async function fetchTotalAmount(): Promise<{ income: number; outcome: number }> {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT
                SUM(CASE WHEN type = '收入' THEN amount ELSE 0 END) AS income,
                SUM(CASE WHEN type = '支出' THEN amount ELSE 0 END) AS outcome
            FROM record
            WHERE isDeleted = 0
        `;
        db.get(sql, (err, row: any) => {
            if (err) {
                reject(new Error(ErrorType.DATA_BASE_ERROR));
            } else {
                resolve({ income: row.income || 0, outcome: row.outcome || 0 });
            }
        });
    });
}

async function updateRecord(record: Record): Promise<number> {
    const { id, date, type, subCategory, category, amount, remark } = record;
    if (!id) {
        logError("Record id is empty");
        throw new Error(ErrorType.RECORD_NOT_EXIST);
    }
    const dateObj = new Date(date);
    if (!dateObj) {
        logError("Record date is empty");
        throw new Error(ErrorType.DATE_NOT_EMPTY);
    }
    if (!type) {
        logError("Record type is empty");
        throw new Error(ErrorType.TYPE_NOT_EMPTY);
    }
    if (!subCategory) {
        logError("Record subCategory is empty");
        throw new Error(ErrorType.SUB_CATEGORY_NOT_EMPTY);
    }
    if (!category) {
        logError("Record category is empty");
        throw new Error(ErrorType.CATEGORY_NOT_EMPTY);
    }
    if (!amount) {
        logError("Record amount is empty");
        throw new Error(ErrorType.AMOUNT_NOT_EMPTY);
    }

    const timestamp = dateObj.getTime();

    logInfo("update record, record id:" + id);

    const row = await new Promise((resolve, reject) => {
        db.run(
            "UPDATE record SET date = ?, type = ?, subCategory = ?, category = ?, amount = ?, remark = ?, isDeleted = ? WHERE id = ? and isDeleted = 0",
            [timestamp, type, subCategory, category, amount, remark, record.isDeleted, id],
            function (err) {
                if (err) {
                    reject(new Error(ErrorType.DATA_BASE_ERROR));
                } else {
                    resolve(id as number);
                }
            }
        );
    }) as number;
    return row;
}

async function yearlyData(years: number[]) {
    try {
        const queries = years.map((year) => {
            return new Promise((resolve, reject) => {
                db.all(
                    "SELECT category, ROUND(SUM(amount), 2) as total FROM record where date >= ? and date <= ? and isDeleted = 0 AND type = '支出' group by category",
                    [
                        new Date(year, 0, 1).getTime(),
                        new Date(year, 11, 31, 23, 59, 59, 999).getTime(),
                    ],
                    (err, rows) => {
                        if (err) {
                            reject(new Error(ErrorType.DATA_BASE_ERROR));
                        } else {
                            resolve({ year, items: rows });
                        }
                    }
                );
            });
        });

        const result = await Promise.all(queries);
        return result;
    } catch (error) {
        throw new Error(ErrorType.DATA_BASE_ERROR); // 抛出具体的错误类型
    }

}

async function getTopCategoryByAmount() {
    try {
        const row = await new Promise((resolve, reject) => {
            db.all(
                "SELECT category as name, ROUND(SUM(amount), 2) as value FROM record where isDeleted = 0 and type = '支出' group by name order by value DESC",
                (err, row) => {
                    if (err) {
                        reject(new Error(ErrorType.DATA_BASE_ERROR));
                    } else {
                        resolve(row);
                    }
                }
            );
        });
        return row;
    } catch (error) {
        throw new Error(ErrorType.DATA_BASE_ERROR);
    }
}

async function getTopSubCategoryByAmount(category: string) {
    try {
        // Get total amount for the category
        const totalAmount = await dbGet(
            "SELECT ROUND(SUM(amount), 2) as total FROM record where category = ? and isDeleted = 0 AND type = '支出'",
            [category]
        ) as { total: number };

        // Get subcategories and their totals
        const subCategories = await dbAll(
            "SELECT subCategory, total FROM (SELECT subCategory, ROUND(SUM(amount), 2) as total FROM record WHERE category = ? AND isDeleted = 0 AND type = '支出' GROUP BY subCategory) AS groupedData ORDER BY CAST(total AS REAL) DESC",
            [category]
        ) as { subCategory: string; total: Number, records: Record[] }[]

        // For each subcategory, get the records
        for (const subCategory of subCategories) {
            const records = await dbAll(
                "SELECT * FROM record where category = ? and subCategory = ? and isDeleted = 0 AND type = '支出' order by amount DESC",
                [category, subCategory.subCategory]
            );
            subCategory.records = records as Record[];
        }

        return {
            category: category,
            total: totalAmount.total || 0,
            subCategory: subCategories,
        };
    } catch (error) {
        throw new Error(ErrorType.DATA_BASE_ERROR);
    }
}

async function getTopSubCategoryByYear(year: number, category: string) {
    // 封装数据库查询函数
    async function queryDb(sql: string, params: any[]) {
        return dbAll(sql, params);
    }

    // 获取月份数据
    async function getMonthData(month: number) {
        const start = new Date(year, month, 1).getTime();
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

        const totalAmount = await dbGet(
            "SELECT ROUND(SUM(amount), 2) as total FROM record WHERE category = ? AND date >= ? AND date <= ? AND isDeleted = 0 AND type = '支出'",
            [category, start, end]
        ) as { total: number };

        const subCategories = await queryDb(
            "SELECT subCategory, ROUND(SUM(amount), 2) as total FROM record WHERE category = ? AND date >= ? AND date <= ? AND isDeleted = 0 AND type = '支出' GROUP BY subCategory ORDER BY total DESC",
            [category, start, end]
        ) as { subCategory: string; total: Number }[]

        const subCategoryDetails = await Promise.all(
            subCategories.map((subCategory) =>
                queryDb(
                    "SELECT * FROM record WHERE category = ? AND subCategory = ? AND date >= ? AND date <= ? AND isDeleted = 0 AND type = '支出' ORDER BY amount DESC",
                    [category, subCategory.subCategory, start, end]
                ).then((records) => ({ ...subCategory, records }))
            )
        );

        return {
            month: month + 1,
            total: totalAmount.total || 0,
            subCategory: subCategoryDetails,
        };
    }

    const monthList = await Promise.all(
        Array.from({ length: 12 }, (_, i) => getMonthData(i))
    );

    const yearStart = new Date(year, 0, 1).getTime();
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
    const totalAmount = await dbGet(
        "SELECT ROUND(SUM(amount), 2) as total FROM record WHERE category = ? AND date >= ? AND date <= ? AND isDeleted = 0 AND type = '支出'",
        [category, yearStart, yearEnd]
    ) as { total: number };

    return {
        year,
        category,
        total: totalAmount.total || 0,
        months: monthList,
    };
}

async function getTimeLineByYears() {
    try {
        const minMaxYear = await dbGet(
            "SELECT MIN(date) as min, MAX(date) as max FROM record WHERE isDeleted = 0 AND type = '支出'", []
        ) as { min: number; max: number }

        const minYear = new Date(minMaxYear.min).getFullYear();
        const maxYear = new Date(minMaxYear.max).getFullYear();

        const years = Array.from(
            { length: maxYear - minYear + 1 },
            (_, i) => minYear + i
        );

        const yearList = await Promise.all(
            years.map(async (year) => {
                const start = new Date(year, 0, 1).getTime();
                const end = new Date(year, 11, 31, 23, 59, 59, 999).getTime();

                const totalAmount = await dbGet(
                    "SELECT ROUND(SUM(amount), 2) as total FROM record WHERE date >= ? AND date <= ? AND isDeleted = 0 AND type = '支出'",
                    [start, end]
                ) as { total: number };

                const earliestRecord = await dbGet(
                    "SELECT * FROM record WHERE date >= ? AND date <= ? AND isDeleted = 0 AND type = '支出' ORDER BY date ASC LIMIT 1",
                    [start, end]
                );

                const latestRecord = await dbGet(
                    "SELECT * FROM record WHERE date >= ? AND date <= ? AND isDeleted = 0 AND type = '支出' ORDER BY date DESC LIMIT 1",
                    [start, end]
                );

                const largestAmountRecord = await dbGet(
                    "SELECT * FROM record WHERE date >= ? AND date <= ? AND isDeleted = 0 AND type = '支出' ORDER BY amount DESC LIMIT 1",
                    [start, end]
                );

                const totalRecords = await dbGet(
                    "SELECT COUNT(*) as total FROM record WHERE date >= ? AND date <= ? AND isDeleted = 0 AND type = '支出'",
                    [start, end]
                ) as { total: number };

                return {
                    year,
                    total: totalAmount.total,
                    earliestRecord,
                    latestRecord,
                    largestAmountRecord,
                    totalRecords: totalRecords.total,
                };
            })
        );
        return yearList;
    } catch (error) {
        throw new Error(ErrorType.DATA_BASE_ERROR)
    }
}

async function batchInsertRecords(records: Record[]) {
    if (!records || records.length === 0) {
        throw new Error(ErrorType.RECORD_NOT_EXIST);
    } else {
        const sql =
            "INSERT INTO record(amount, type, category, subCategory, remark, date) VALUES (?, ?, ?, ?, ?, ?)";
        const stmt = db.prepare(sql);
        records.forEach((record) => {
            stmt.run([
                record.amount,
                record.type,
                record.category,
                record.subCategory,
                record.remark,
                getDaliyStart(record.date),
            ]);
        });
        stmt.finalize((err) => {
            if (err) {
                throw new Error(ErrorType.DATA_BASE_ERROR);
            } else {
                return records;
            }
        });
    }
}

async function batchDeleteRecords(ids: number[]) {
    if (!ids || ids.length === 0) {
        throw new Error(ErrorType.RECORD_NOT_EXIST);
    } else {
        const sql = "UPDATE record SET isDeleted = 1 WHERE id = ?";
        const stmt = db.prepare(sql);
        ids.forEach((id) => {
            stmt.run(id);
        });
        stmt.finalize((err) => {
            if (err) {
                throw new Error(ErrorType.DATA_BASE_ERROR);
            } else {
                return ids;
            }
        });
    }
}

async function fetchAllRecords(): Promise<Record[]> {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM record WHERE isDeleted = 0 order by date desc", (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows as Record[]);
            }
        });
    });
}

export async function getRecordsCount(): Promise<Number> {
    return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as total FROM record WHERE isDeleted = 0", (err, row: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(row.total as number);
            }
        });
    })
}

export async function insertRecordsIfNeeded(records: Record[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const sql = "SELECT COUNT(*) as total FROM record WHERE date = ? AND type = ? AND category = ? AND subCategory = ? AND amount = ? AND remark = ?";
        const stmt = db.prepare(sql);
        records.forEach((record) => {
            const dateObj = new Date(record.date);
            dateObj.setHours(0, 0, 0, 0);
            const timestamp = dateObj.getTime();
            stmt.get([timestamp, record.type, record.category, record.subCategory, record.amount, record.remark], (err, row: any) => {
                if (err) {
                    reject(err);
                } else {
                    if (row.total === 0) {
                        createRecord(record);
                    }
                }
            });
        });
        resolve();
    });
}

export async function getRecordsByLimit(limit: Number, offset: Number): Promise<Record[]> {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM record WHERE isDeleted = 0 order by date desc limit ? offset ?", [limit, offset], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows as Record[]);
            }
        });
    });
}

async function saveCustomCategory(newCategory: string): Promise<string> {
    const customPath = path.join(userDataPath, "category-custom.json");
    logInfo("save custom category to:" + customPath);
    try {
        await fs.writeFile(customPath, newCategory);
        return newCategory;
    } catch (err: any) {
        throw new Error(ErrorType.FILE_WIRTE_FAIL);
    }
}

async function readCustomCategory(): Promise<string> {
    const customPath = path.join(userDataPath, "category-custom.json");
    logInfo("read custom category from:" + customPath);
    try {
        const data = await fs.readFile(customPath, 'utf8');
        return data;
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            logInfo("File does not exist:" + customPath);
            return ""
        } else {
            logError("Read custom category failed:" + err);
            throw new Error(ErrorType.FILE_READ_FAIL); // 抛出异常供调用者处理
        }
    }
}

function getDaliyStart(date: Date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    return startDate.getTime();
}

function getDaliyEnd(date: Date) {
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    return endDate.getTime();
}



function dbGet(query: string, params: any[]) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(new Error(ErrorType.DATA_BASE_ERROR));
            else resolve(row);
        });
    });
}

function dbAll(query: string, params: any[]) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(new Error(ErrorType.DATA_BASE_ERROR));
            else resolve(rows);
        });
    });
}


function handleResult(data: any): string {
    const response: IpcResponse = {
        type: "success",
        data: data,
    };
    return JSON.stringify(response);
}

function handleError(error: unknown): string {
    let errorInfo = ErrorType.DATA_BASE_ERROR;
    if (error instanceof Error) {
        errorInfo = error.message;
    }

    const result: IpcResponse = {
        type: "error",
        error: errorInfo,
    };
    return JSON.stringify(result);
}

