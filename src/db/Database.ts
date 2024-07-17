import sqlite3 from "sqlite3";
import path from "path";
import { ipcMain } from "electron";
import { Filter } from "@/models/Filter";
import { app } from 'electron';
import { Record } from "@/models/Record";
import { IpcResponse, IpcType } from "@/models/IpcResponse";
import fs from "fs/promises";
import { ErrorType } from "./ErrorInfo";

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, "records.db");

console.log("dbPath: ", dbPath);

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
        return console.error(err.message);
    }
    console.log("Connected to the records database.");
});

// 检查record表是否存在
db.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='record';",
    (err, row) => {
        if (err) {
            return console.error(err.message);
        }
        if (row) {
            console.log('Table "record" already exists.');
        } else {
            console.log('Table "record" does not exist. Creating table...');
            // 读取schema.sql文件并执行SQL语句创建表
            db.exec(createTableSql, (err) => {
                if (err) {
                    return console.error(err.message);
                }
                console.log('Table "record" has been created.');
            });
        }
    }
);

export function databaseListen() {
    ipcMain.handle(IpcType.TOTAL_AMOUNT_BY_DATE_RANGE, async (event, start, end) => {
        console.log("fetch total amount by date range");
        try {
            const result = await fetchTotalAmountByRange(new Date(start), new Date(end));
            return handleResult(result);
        }
        catch (error: unknown) {
            console.error("Fetching total amount by date range failed:", error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.CREATE_RECORD, async (event, record) => {
        console.log("create record");
        try {
            const result = await createRecord(JSON.parse(record));
            return handleResult(result);
        }
        catch (error: unknown) {
            console.error("Creating record failed:", error);
            return handleError(error);
        }
    });

    ipcMain.handle(IpcType.FETCH_RECORDS_BY_FILTER, async (event, filter) => {
        console.log("get all records");
        try {
            const result = await fetchRecordsByFilter(filter);
            console.log("result: ", result);
            return handleResult(result);
        }
        catch (error: unknown) {
            console.error("Fetching records failed:", error);
            return handleError(error);
        }
    });

    ipcMain.handle(IpcType.TOTAL_AMOUNT, async (event) => {
        console.log("fetch total amount");
        try {
            const result = await fetchTotalAmount();
            return handleResult(result);
        }
        catch (error: unknown) {
            console.error("Fetching total amount failed:", error);
            return handleError(error);
        }
    });

    ipcMain.handle(IpcType.UPDATE_RECORD, async (event, record) => {
        console.log("update record");
        try {
            const result = await updateRecord(record);
            return handleResult(result);
        }
        catch (error: unknown) {
            console.error("Updating record failed:", error);
            return handleError(error);
        }
    });

    ipcMain.handle(IpcType.DELETE_RECORD, async (event, record) => {
        console.log("delete record");
        try {
            const result = await updateRecord({ ...record, isDeleted: 1 });
            return handleResult(result);
        }
        catch (error: unknown) {
            console.error("Deleting record failed:", error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.YEARLY_DATA, async (event, years) => {
        console.log("fetch yearly data");
        try {
            const result = await yearlyData(JSON.parse(years) as number[]);
            return handleResult(result);
        }
        catch (error: unknown) {
            console.error("Fetching yearly data failed:", error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.TOTAL_CATEGORY_AMOUNT, async (event) => {
        console.log("fetch total amount by category");
        try {
            const result = await getTopCategoryByAmount()
            return handleResult(result);
        }
        catch (error: unknown) {
            console.error("Fetching total amount by category failed:", error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.CATGORY_DATA, async (event, category) => {
        console.log("fetch total amount by category");
        try {
            const result = await getTopSubCategoryByAmount(category)
            return handleResult(result);
        }
        catch (error: unknown) {
            console.error("Fetching total amount by category failed:", error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.YEARLY_CATEGORY_DATA, async (event, year, category) => {
        console.log("fetch total amount by category in years");
        try {
            const result = await getTopSubCategoryByYear(year, category);
            return handleResult(result);
        }
        catch (error: unknown) {
            console.error("Fetching total amount by category in years failed:", error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.TIME_LINE_DATA, async () => {
        console.log("fetch time line data");
        try {
            const result = await getTimeLineByYears();
            return handleResult(result);
        }
        catch (error: unknown) {
            console.error("Fetching time line data failed:", error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.IMPORT_RECORDS, async (event, records) => {
        console.log("import records");
        try {
            const result = batchInsertRecords(JSON.parse(records) as Record[]);
            return handleResult(result);
        }
        catch (error: unknown) {
            console.error("Importing records failed:", error);
            return handleError(error);
        }
    })


    ipcMain.handle(IpcType.PATCH_DELETE_RECORDS, async (event, ids) => {
        console.log("delete records");
        try {
            const result = await batchDeleteRecords(JSON.parse(ids) as number[]);
            return handleResult(result);
        }
        catch (error: unknown) {
            console.error("Deleting records failed:", error);
            return handleError(error);
        }
    })


    ipcMain.handle(IpcType.ALL_RECORDS_DESC, async (event) => {
        console.log("export all records");
        try {
            const result = await fetchAllRecords();
            console.log("result: ", result);
            return handleResult(result);
        }
        catch (error: unknown) {
            console.error("Exporting records failed:", error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.SAVE_CUSTOM_CATEGORY, async (event, newCategory) => {
        console.log("save custom category");
        try {
            const result = await saveCustomCategory(newCategory);
            return handleResult(result);
        }
        catch (error: unknown) {
            console.error("Saving custom category failed:", error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.FETCH_CUSTOM_CATEGORY, async (event) => {
        console.log("read custom category");
        try {
            const result = await readCustomCategory();
            return handleResult(result);
        }
        catch (error: unknown) {
            console.error("Reading custom category failed:", error);
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
                console.error(err.message);
                reject(new Error(ErrorType.DATA_BASE_ERROR));
            } else {
                console.log("get total amount by date range success");
                resolve({ income: row.income || 0, outcome: row.outcome || 0 });
            }
        });
    });
}

async function createRecord(record: Record): Promise<number> {
    try {
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
    } catch (error) {
        throw error; // 抛出具体的错误类型
    }
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
    console.log("sql: ", sql);

    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error(err.message);
                reject(new Error(ErrorType.DATA_BASE_ERROR));
            } else {
                console.log("get all records success");
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
                console.error(err.message);
                reject(new Error(ErrorType.DATA_BASE_ERROR));
            } else {
                console.log("get total amount success");
                resolve({ income: row.income || 0, outcome: row.outcome || 0 });
            }
        });
    });
}

async function updateRecord(record: Record): Promise<number> {
    try {
        const { id, date, type, subCategory, category, amount, remark } = record;
        if (!id) {
            throw new Error(ErrorType.RECORD_NOT_EXIST);
        }
        const dateObj = new Date(date);
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
                "UPDATE record SET date = ?, type = ?, subCategory = ?, category = ?, amount = ?, remark = ? WHERE id = ? and isDeleted = 0",
                [timestamp, type, subCategory, category, amount, remark, id],
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
    } catch (error) {
        throw error; // 抛出具体的错误类型
    }
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
                            console.error(err.message);
                            reject(new Error(ErrorType.DATA_BASE_ERROR));
                        } else {
                            resolve({ year, items: rows });
                        }
                    }
                );
            });
        });

        const result = await Promise.all(queries);
        console.log("get total amount by category in years success");
        return result;
    } catch (error) {
        console.error(error);
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
        console.error("Error fetching data:", error);
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
        console.error("Error fetching data:", error);
        throw new Error(ErrorType.DATA_BASE_ERROR);
    }
}

async function getTopSubCategoryByYear(year: number, category: string) {
    try {
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
    } catch (error) {
        console.log("Error fetching data:", error);
        throw new Error(ErrorType.DATA_BASE_ERROR);
    }
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
        console.log("Error fetching data:", error);
        throw new Error(ErrorType.DATA_BASE_ERROR)
    }
}

async function batchInsertRecords(records: Record[]) {
    try {
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
                    console.error(err.message);
                    throw new Error(ErrorType.DATA_BASE_ERROR);
                } else {
                    console.log("import records success");
                    return records;
                }
            });
        }
    } catch (error) {
        throw error; // 抛出具体的错误类型
    }
}

async function batchDeleteRecords(ids: number[]) {
    try {
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
                    console.error(err.message);
                    throw new Error(ErrorType.DATA_BASE_ERROR);
                } else {
                    console.log("delete records by ids success");
                    return ids;
                }
            });
        }
    } catch (error) {
        throw error; // 抛出具体的错误类型
    }
}

async function fetchAllRecords(): Promise<Record[]> {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM record WHERE isDeleted = 0 order by date desc", (err, rows) => {
            if (err) {
                console.error(err.message);
                reject(err);
            } else {
                console.log("get all records success");
                resolve(rows as Record[]);
            }
        });
    });
}

async function saveCustomCategory(newCategory: string): Promise<string> {
    console.log("get category custom data");
    const customPath = path.join(__dirname, "category-custom.json");
    try {
        await fs.writeFile(customPath, newCategory);
        console.log("save category custom data success");
        return newCategory;
    } catch (err: any) {
        console.error(err.message);
        throw new Error(ErrorType.FILE_WIRTE_FAIL);
    }
}

async function readCustomCategory(): Promise<string> {
    console.log("get category custom data");
    const customPath = path.join(__dirname, "category-custom.json");
    try {
        const data = await fs.readFile(customPath, 'utf8'); // 直接尝试读取文件
        console.log("get category custom data success");
        return data;
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            console.error("File does not exist:", customPath);
            return ""
        } else {
            console.error("Error accessing or reading the file:", err);
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

