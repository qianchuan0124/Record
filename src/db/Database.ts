import sqlite3 from "sqlite3";
import path from "path";
import { ipcMain } from "electron";
import { app } from 'electron';
import { Record } from "@/models/Record";
import { PayrollData, SalaryRecord, AnnualBonus, BudgetItem } from "@/models/Payroll";
import { DepositBank, DepositData, DepositRecord } from "@/models/Deposit";
import { BudgetSettings } from "@/models/Budget";
import { presetByName } from "@/configs/BankPresets";
import { calcSalaryTax } from "@/utils/PayrollTax";
import { IpcResponse, IpcType } from "@/models/IpcResponse";
import fs from "fs/promises";
import { ErrorType } from "./ErrorInfo";
import { logError, logInfo } from "@/utils/Log";

export const userDataPath = app.getPath('userData');
export const dbPath = path.join(userDataPath, "records.db");
export const customCategoryPath = path.join(userDataPath, "category-custom.json");

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
    isDeleted BOOLEAN Default 0,
    syncId INTEGER DEFAULT 0,
    countInBudget BOOLEAN DEFAULT 1
);
`

// 薪酬相关表。云端恢复旧快照时也会走这里的 IF NOT EXISTS，保证表结构始终可用。
const createPayrollTableSql = `
CREATE TABLE IF NOT EXISTS salary_record (
    id INTEGER PRIMARY KEY,
    date INTEGER NOT NULL,
    baseSalary REAL NOT NULL DEFAULT 0,
    overtimePay REAL NOT NULL DEFAULT 0,
    oneTimeBonus REAL NOT NULL DEFAULT 0,
    socialInsurance REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    taxRate REAL NOT NULL DEFAULT 0,
    netPay REAL NOT NULL DEFAULT 0,
    taxManual BOOLEAN DEFAULT 0,
    isDeleted BOOLEAN DEFAULT 0,
    syncId INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS annual_bonus (
    id INTEGER PRIMARY KEY,
    date INTEGER NOT NULL,
    bonus REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    taxRate REAL NOT NULL DEFAULT 0,
    netPay REAL NOT NULL DEFAULT 0,
    isDeleted BOOLEAN DEFAULT 0,
    syncId INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS budget_item (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    isDeleted BOOLEAN DEFAULT 0,
    syncId INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS deposit_bank (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '',
    isDeleted BOOLEAN DEFAULT 0,
    syncId INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS deposit_record (
    id INTEGER PRIMARY KEY,
    bankId INTEGER NOT NULL DEFAULT 0,
    bankKey TEXT DEFAULT '',
    startDate INTEGER NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    years REAL NOT NULL DEFAULT 0,
    rate REAL NOT NULL DEFAULT 0,
    interest REAL NOT NULL DEFAULT 0,
    sortOrder INTEGER DEFAULT 0,
    isDeleted BOOLEAN DEFAULT 0,
    syncId INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_setting (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    syncId INTEGER DEFAULT 0
);
`

// 数据库连接实例，需要支持云端恢复后替换整个数据库文件，因此保持可变
let db: sqlite3.Database;

export function getDb(): sqlite3.Database {
    return db;
}

// 连接到数据库，如果数据库不存在则会被创建，并确保表结构已是最新
function openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                logError("Connected database failed, error:" + err.message);
                reject(err);
                return;
            }
            logInfo("Connected to the records database.");
            // 检查record表是否存在
            db.get(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='record';",
                (err, row) => {
                    if (err) {
                        logError("check table failed, error:" + err.message);
                        reject(err);
                        return;
                    }
                    if (row) {
                        logInfo('Table "record" already exists.');
                        upgrateDatabase().then(resolve).catch(reject);
                    } else {
                        logInfo('Table "record" does not exist. Creating table...');
                        // 读取schema.sql文件并执行SQL语句创建表
                        db.exec(createTableSql, (err) => {
                            if (err) {
                                logError("Create table failed, error:" + err.message);
                                reject(err);
                                return;
                            }
                            db.exec(createPayrollTableSql, (payrollErr) => {
                                if (payrollErr) {
                                    logError("Create payroll tables failed, error:" + payrollErr.message);
                                    reject(payrollErr);
                                    return;
                                }
                                logInfo('Table "record" has been created.');
                                resolve();
                            });
                        });
                    }
                }
            );
        });
    });
}

// 应用启动时立即建立连接，保留即用即查的行为
const dbReady = openDatabase().catch((err) => {
    logError("init database failed, error:" + err);
});

export function whenDatabaseReady(): Promise<void> {
    return dbReady;
}

export function closeDatabase(): Promise<void> {
    return new Promise((resolve) => {
        if (!db) {
            resolve();
            return;
        }
        db.close(() => resolve());
    });
}

// 云端恢复会用快照文件整体覆盖本地数据库，覆盖后需要重新打开连接
export async function reopenDatabase(): Promise<void> {
    await closeDatabase();
    await openDatabase();
}

function execSql(sql: string): Promise<void> {
    return new Promise((resolve) => {
        db.exec(sql, (err) => {
            if (err) {
                logError("exec sql failed: " + err.message);
            }
            resolve();
        });
    });
}

async function ensureColumn(table: string, column: string, definition: string): Promise<void> {
    const rows = await dbAll(`PRAGMA table_info(${table});`, []) as { name: string }[];
    if (rows.some((row) => row.name === column)) {
        return;
    }
    await new Promise<void>((resolve) => {
        db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`, (err) => {
            if (err) {
                logError(`Add ${table}.${column} failed: ` + err.message);
            } else {
                logInfo(`${table}.${column} added.`);
            }
            resolve();
        });
    });
}

async function migrateDepositBankKeys(): Promise<void> {
    await ensureColumn("deposit_record", "bankKey", "TEXT DEFAULT ''");
    await ensureColumn("deposit_record", "amount", "REAL NOT NULL DEFAULT 0");
    // 历史数据没有本金时，用 利息 / (利率 × 年限) 反推本金
    await new Promise<void>((resolve) => {
        db.run(
            `UPDATE deposit_record
             SET amount = ROUND(interest / (rate / 100.0 * years), 2)
             WHERE amount = 0 AND interest > 0 AND rate > 0 AND years > 0`,
            () => resolve()
        );
    });
    const rows = await dbAll(
        `SELECT d.id AS id, d.bankId AS bankId, IFNULL(b.name, '') AS name
         FROM deposit_record d LEFT JOIN deposit_bank b ON b.id = d.bankId
         WHERE IFNULL(d.bankKey, '') = ''`,
        []
    ) as { id: number; bankId: number; name: string }[];
    for (const row of rows) {
        const preset = presetByName(row.name);
        const key = preset ? `b:${preset.icon}` : (row.bankId ? `c:${row.bankId}` : "");
        await new Promise<void>((resolve) => {
            db.run("UPDATE deposit_record SET bankKey = ? WHERE id = ?", [key, row.id], () => resolve());
        });
    }

    // 内置银行信息保存在安装包内，不再作为同步数据保留
    const banks = await dbAll("SELECT id, name FROM deposit_bank WHERE isDeleted = 0", []) as { id: number; name: string }[];
    for (const bank of banks) {
        if (!presetByName(bank.name)) {
            continue;
        }
        const used = await dbGet(
            "SELECT COUNT(*) AS total FROM deposit_record WHERE isDeleted = 0 AND bankKey = ?",
            [`c:${bank.id}`]
        ) as { total: number };
        if (Number((used as { total: number }).total) === 0) {
            await new Promise<void>((resolve) => {
                // 内置银行不落库、不参与同步，迁移时直接移除历史记录
                db.run("DELETE FROM deposit_bank WHERE id = ?", [bank.id], () => resolve());
            });
        }
    }
}

function upgrateDatabase(): Promise<void> {
    return (async () => {
        await execSql(createPayrollTableSql);
        await ensureColumn("salary_record", "taxManual", "BOOLEAN DEFAULT 0");
        await ensureColumn("record", "syncId", "INTEGER DEFAULT 0");
        await ensureColumn("record", "countInBudget", "BOOLEAN DEFAULT 1");
        await migrateDepositBankKeys();
    })().catch((error) => {
        logError("upgrade database failed: " + error);
    });
}

export function databaseListen() {
    ipcMain.handle(IpcType.TOTAL_AMOUNT_BY_Filter, async (event, filter) => {
        logInfo("fetch total amount by date range");
        try {
            const result = await fetchTotalAmountByFilter(filter);
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
            const result = await updateRecord(JSON.parse(record) as Record, true);
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
            const result = await updateRecord({ ...realRecord, isDeleted: true }, true);
            logInfo("delete record success");
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Deleting record failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.YEARLY_DATA, async (event, years, recordType) => {
        logInfo("will fetch yearly data");
        try {
            const result = await yearlyData(JSON.parse(years) as number[], normalizeRecordType(recordType));
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

    ipcMain.handle(IpcType.YEARLY_CATEGORY_DATA, async (event, year, category, recordType) => {
        logInfo("will fetch total amount by category in years");
        try {
            const result = await getTopSubCategoryByYear(year, category, normalizeRecordType(recordType));
            logInfo("fetch total amount by category in years success");
            return handleResult(result);
        }
        catch (error: unknown) {
            logError("Fetching total amount by category in years failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.YEARLY_TOTAL_CATEGORY, async (event, year, recordType) => {
        logInfo("will fetch total amount by category in years");
        try {
            const result = await getYearlyTotalInfo(year, normalizeRecordType(recordType));
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

    ipcMain.handle(IpcType.FETCH_PAYROLL_DATA, async () => {
        try {
            return handleResult(await fetchPayrollData());
        } catch (error: unknown) {
            logError("Fetching payroll data failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.FETCH_BUDGET_SETTINGS, async () => {
        try {
            return handleResult(await fetchBudgetSettings());
        } catch (error: unknown) {
            logError("Fetching budget settings failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.SAVE_BUDGET_SETTINGS, async (event, settings) => {
        try {
            const parsed = typeof settings === "string" ? JSON.parse(settings) : settings;
            return handleResult(await saveBudgetSettings(parsed));
        } catch (error: unknown) {
            logError("Saving budget settings failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.CREATE_SALARY, async (event, salary) => {
        try {
            const parsed = JSON.parse(salary) as SalaryRecord;
            const id = await createSalary(parsed);
            await recalculateSalaryYear(new Date(dayStart(parsed.date)).getFullYear());
            return handleResult(id);
        } catch (error: unknown) {
            logError("Creating salary failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.UPDATE_SALARY, async (event, salary) => {
        try {
            const parsed = JSON.parse(salary) as SalaryRecord;
            const previous = await dbGet(
                "SELECT date FROM salary_record WHERE id = ?",
                [parsed.id]
            ) as { date: number } | undefined;
            const id = await updateSalary(parsed);
            const newYear = new Date(dayStart(parsed.date)).getFullYear();
            const years = new Set<number>([newYear]);
            if (previous && previous.date) {
                years.add(new Date(Number(previous.date)).getFullYear());
            }
            for (const year of years) {
                await recalculateSalaryYear(year);
            }
            return handleResult(id);
        } catch (error: unknown) {
            logError("Updating salary failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.DELETE_SALARY, async (event, id) => {
        try {
            const previous = await dbGet(
                "SELECT date FROM salary_record WHERE id = ?",
                [Number(id)]
            ) as { date: number } | undefined;
            await deleteSalary(Number(id));
            if (previous && previous.date) {
                await recalculateSalaryYear(new Date(Number(previous.date)).getFullYear());
            }
            return handleResult(Number(id));
        } catch (error: unknown) {
            logError("Deleting salary failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.CREATE_BONUS, async (event, bonus) => {
        try {
            return handleResult(await createBonus(JSON.parse(bonus) as AnnualBonus));
        } catch (error: unknown) {
            logError("Creating bonus failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.UPDATE_BONUS, async (event, bonus) => {
        try {
            return handleResult(await updateBonus(JSON.parse(bonus) as AnnualBonus));
        } catch (error: unknown) {
            logError("Updating bonus failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.DELETE_BONUS, async (event, id) => {
        try {
            return handleResult(await deleteBonus(Number(id)));
        } catch (error: unknown) {
            logError("Deleting bonus failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.SAVE_BUDGETS, async (event, budgets) => {
        try {
            return handleResult(await saveBudgets(JSON.parse(budgets) as BudgetItem[]));
        } catch (error: unknown) {
            logError("Saving budgets failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.FETCH_BUDGET_EXPENSE, async (event, start, end) => {
        try {
            return handleResult(await fetchBudgetExpense(Number(start), Number(end)));
        } catch (error: unknown) {
            logError("Fetching budget expense failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.FETCH_DEPOSIT_DATA, async () => {
        try {
            return handleResult(await fetchDepositData());
        } catch (error: unknown) {
            logError("Fetching deposit data failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.CREATE_BANK, async (event, bank) => {
        try {
            return handleResult(await createBank(JSON.parse(bank) as DepositBank));
        } catch (error: unknown) {
            logError("Creating bank failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.UPDATE_BANK, async (event, bank) => {
        try {
            return handleResult(await updateBank(JSON.parse(bank) as DepositBank));
        } catch (error: unknown) {
            logError("Updating bank failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.DELETE_BANK, async (event, id) => {
        try {
            return handleResult(await deleteBank(Number(id)));
        } catch (error: unknown) {
            logError("Deleting bank failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.CREATE_DEPOSIT, async (event, deposit) => {
        try {
            return handleResult(await createDeposit(JSON.parse(deposit) as DepositRecord));
        } catch (error: unknown) {
            logError("Creating deposit failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.UPDATE_DEPOSIT, async (event, deposit) => {
        try {
            return handleResult(await updateDeposit(JSON.parse(deposit) as DepositRecord));
        } catch (error: unknown) {
            logError("Updating deposit failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.DELETE_DEPOSIT, async (event, id) => {
        try {
            return handleResult(await deleteDeposit(Number(id)));
        } catch (error: unknown) {
            logError("Deleting deposit failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.REORDER_DEPOSITS, async (event, ids) => {
        try {
            return handleResult(await reorderDeposits(JSON.parse(ids) as number[]));
        } catch (error: unknown) {
            logError("Reordering deposits failed:" + error);
            return handleError(error);
        }
    })

    ipcMain.handle(IpcType.IMPORT_PAYROLL, async (event, payload) => {
        try {
            return handleResult(await importPayroll(JSON.parse(payload)));
        } catch (error: unknown) {
            logError("Importing payroll failed:" + error);
            return handleError(error);
        }
    })
}

// 年度分析支持按收入/支出切换，这里统一收敛入参
function normalizeRecordType(recordType: unknown): "支出" | "收入" {
    return recordType === "收入" ? "收入" : "支出";
}

async function fetchTotalAmountByFilter(filter: string) {
    const { types, categorys, startTime, endTime, keyword } = JSON.parse(filter);
    let sql = ` SELECT
                SUM(CASE WHEN type = '收入' THEN amount ELSE 0 END) AS income,
                SUM(CASE WHEN type = '支出' THEN amount ELSE 0 END) AS outcome FROM record WHERE isDeleted = 0`;
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

    logInfo("fetch total amount by filter sql:" + sql);

    const recordTotal = await new Promise<{ income: number; outcome: number }>((resolve, reject) => {
        db.get(sql, params, (err, row: any) => {
            if (err) {
                reject(new Error(ErrorType.DATA_BASE_ERROR));
            } else {
                resolve({ income: row.income || 0, outcome: row.outcome || 0 });
            }
        });
    });

    // 工资/年终奖的实际到手计入总览收入；按类别或关键字筛选时不做叠加。
    const includePayroll = (!types || types.length === 0 || types.includes("收入"))
        && (!categorys || categorys.length === 0)
        && !keyword;
    if (includePayroll) {
        const payrollIncome = await fetchPayrollIncomeInRange(
            startTime ? new Date(startTime).getTime() : undefined,
            endTime ? new Date(endTime).getTime() : undefined
        );
        recordTotal.income += payrollIncome;
    }
    return recordTotal;
}

async function fetchPayrollIncomeInRange(startTime?: number, endTime?: number): Promise<number> {
    const start = startTime === undefined ? 0 : startTime;
    const end = endTime === undefined ? Number.MAX_SAFE_INTEGER : endTime;
    const row = await dbGet(
        `SELECT
            (SELECT IFNULL(SUM(netPay), 0) FROM salary_record WHERE isDeleted = 0 AND date >= ? AND date <= ?) +
            (SELECT IFNULL(SUM(netPay), 0) FROM annual_bonus WHERE isDeleted = 0 AND date >= ? AND date <= ?) AS total`,
        [start, end, start, end]
    ) as { total: number };
    return Number((row as { total: number }).total) || 0;
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
            "INSERT INTO record (date, type, subCategory, category, amount, remark, countInBudget) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [timestamp, type, subCategory, category, amount, remark, record.countInBudget === 0 ? 0 : 1],
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
    const total = await new Promise<{ income: number; outcome: number }>((resolve, reject) => {
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
    total.income += await fetchPayrollIncomeInRange();
    return total;
}

async function updateRecord(record: Record, addSyncId: Boolean): Promise<number> {
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

    const newSyncId = addSyncId ? record.syncId + 1 : record.syncId;

    const row = await new Promise((resolve, reject) => {
        db.run(
            "UPDATE record SET date = ?, type = ?, subCategory = ?, category = ?, amount = ?, remark = ?, isDeleted = ?, syncId = ?, countInBudget = ? WHERE id = ? and isDeleted = 0",
            [timestamp, type, subCategory, category, amount, remark, record.isDeleted, newSyncId, record.countInBudget === 0 ? 0 : 1, id],
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

// 收入分析里把薪酬（工资/年终奖的到手金额）作为一类单独展示，
// 否则只统计 record 表时，只有工资收入的用户切到「收入」会是一片空白。
const PAYROLL_CATEGORY = "薪酬";

async function payrollIncomeTotal(year: number): Promise<number> {
    const start = new Date(year, 0, 1).getTime();
    const end = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
    const row = await dbGet(
        `SELECT ROUND(
            IFNULL((SELECT SUM(netPay) FROM salary_record WHERE isDeleted = 0 AND date >= ? AND date <= ?), 0) +
            IFNULL((SELECT SUM(netPay) FROM annual_bonus WHERE isDeleted = 0 AND date >= ? AND date <= ?), 0)
        , 2) AS total`,
        [start, end, start, end]
    ) as { total: number };
    return Number((row && row.total) || 0);
}

async function getPayrollYearlyCategory(year: number) {
    const start = new Date(year, 0, 1).getTime();
    const end = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
    const salaries = await dbAll(
        "SELECT * FROM salary_record WHERE isDeleted = 0 AND date >= ? AND date <= ? ORDER BY date ASC",
        [start, end]
    ) as SalaryRecord[];
    const bonuses = await dbAll(
        "SELECT * FROM annual_bonus WHERE isDeleted = 0 AND date >= ? AND date <= ? ORDER BY date ASC",
        [start, end]
    ) as AnnualBonus[];

    type Bucket = { subCategory: string; total: number; records: Record[] };
    const months = Array.from({ length: 12 }, (_, index) => ({
        month: index + 1,
        total: 0,
        buckets: new Map<string, Bucket>(),
    }));

    const incomeRecord = (id: number, date: number, subCategory: string, amount: number): Record => ({
        id,
        amount,
        type: "收入",
        date: new Date(date),
        category: PAYROLL_CATEGORY,
        subCategory,
        remark: subCategory,
        isDeleted: false,
        syncId: 0,
        countInBudget: 1,
    });

    for (const salary of salaries) {
        const date = Number(salary.date);
        const month = new Date(date).getMonth();
        const amount = Number(salary.netPay) || 0;
        const bucket = months[month].buckets.get("工资") || { subCategory: "工资", total: 0, records: [] };
        bucket.total = Math.round((bucket.total + amount) * 100) / 100;
        bucket.records.push(incomeRecord(1000000 + salary.id, date, "工资", amount));
        months[month].buckets.set("工资", bucket);
        months[month].total = Math.round((months[month].total + amount) * 100) / 100;
    }

    for (const bonus of bonuses) {
        const date = Number(bonus.date);
        const month = new Date(date).getMonth();
        const amount = Number(bonus.netPay) || 0;
        const bucket = months[month].buckets.get("年终奖") || { subCategory: "年终奖", total: 0, records: [] };
        bucket.total = Math.round((bucket.total + amount) * 100) / 100;
        bucket.records.push(incomeRecord(2000000 + bonus.id, date, "年终奖", amount));
        months[month].buckets.set("年终奖", bucket);
        months[month].total = Math.round((months[month].total + amount) * 100) / 100;
    }

    const monthList = months.map((item) => ({
        month: item.month,
        total: item.total,
        subCategory: Array.from(item.buckets.values()).map((bucket) => ({
            ...bucket,
            records: bucket.records.sort((a, b) => Number(b.amount) - Number(a.amount)),
        })),
    }));

    return {
        year,
        category: PAYROLL_CATEGORY,
        total: monthList.reduce((sum, item) => sum + item.total, 0),
        months: monthList,
    };
}

async function yearlyData(years: number[], recordType: "支出" | "收入" = "支出") {
    try {
        const queries = years.map((year) => {
            return new Promise((resolve, reject) => {
                db.all(
                    "SELECT category, ROUND(SUM(amount), 2) as total FROM record where date >= ? and date <= ? and isDeleted = 0 AND type = ? group by category",
                    [
                        new Date(year, 0, 1).getTime(),
                        new Date(year, 11, 31, 23, 59, 59, 999).getTime(),
                        recordType,
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

        const result = await Promise.all(queries) as { year: number; items: { category: string; total: number }[] }[];
        if (recordType === "收入") {
            await Promise.all(result.map(async (item) => {
                const total = await payrollIncomeTotal(Number(item.year));
                if (total > 0) {
                    item.items.push({ category: PAYROLL_CATEGORY, total });
                }
            }));
        }
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

// 获取某一年所有分类的支出信息
async function getYearlyTotalInfo(year: number, recordType: "支出" | "收入" = "支出") {
    // 获取某一年所有分类的收入/支出信息
    const start = new Date(year, 0, 1).getTime();
    const end = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
    const sql = `
        SELECT category, ROUND(SUM(amount), 2) as total 
        FROM record 
        WHERE date >= ? AND date <= ? AND isDeleted = 0 AND type = ? 
        GROUP BY category
    `;
    const rows = await dbAll(sql, [start, end, recordType]) as { category: string; total: number }[];
    if (recordType === "收入") {
        const payrollTotal = await payrollIncomeTotal(year);
        if (payrollTotal > 0) {
            rows.push({ category: PAYROLL_CATEGORY, total: payrollTotal });
        }
    }
    return rows;
}

async function getTopSubCategoryByYear(year: number, category: string, recordType: "支出" | "收入" = "支出") {
    if (recordType === "收入" && category === PAYROLL_CATEGORY) {
        return await getPayrollYearlyCategory(year);
    }

    // 封装数据库查询函数
    async function queryDb(sql: string, params: any[]) {
        return dbAll(sql, params);
    }

    // 获取月份数据
    async function getMonthData(month: number) {
        const start = new Date(year, month, 1).getTime();
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

        const totalAmount = await dbGet(
            "SELECT ROUND(SUM(amount), 2) as total FROM record WHERE category = ? AND date >= ? AND date <= ? AND isDeleted = 0 AND type = ?",
            [category, start, end, recordType]
        ) as { total: number };

        const subCategories = await queryDb(
            "SELECT subCategory, ROUND(SUM(amount), 2) as total FROM record WHERE category = ? AND date >= ? AND date <= ? AND isDeleted = 0 AND type = ? GROUP BY subCategory ORDER BY total DESC",
            [category, start, end, recordType]
        ) as { subCategory: string; total: Number }[]

        const subCategoryDetails = await Promise.all(
            subCategories.map((subCategory) =>
                queryDb(
                    "SELECT * FROM record WHERE category = ? AND subCategory = ? AND date >= ? AND date <= ? AND isDeleted = 0 AND type = ? ORDER BY amount DESC",
                    [category, subCategory.subCategory, start, end, recordType]
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
        "SELECT ROUND(SUM(amount), 2) as total FROM record WHERE category = ? AND date >= ? AND date <= ? AND isDeleted = 0 AND type = ?",
        [category, yearStart, yearEnd, recordType]
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

                const incomeTotal = await dbGet(
                    "SELECT ROUND(SUM(amount), 2) as total FROM record WHERE date >= ? AND date <= ? AND isDeleted = 0 AND type = '收入'",
                    [start, end]
                ) as { total: number };

                const topExpenses = await dbAll(
                    "SELECT * FROM record WHERE date >= ? AND date <= ? AND isDeleted = 0 AND type = '支出' ORDER BY amount DESC, date DESC LIMIT 3",
                    [start, end]
                ) as Record[];

                const largestIncome = await dbGet(
                    "SELECT * FROM record WHERE date >= ? AND date <= ? AND isDeleted = 0 AND type = '收入' ORDER BY amount DESC, date DESC LIMIT 1",
                    [start, end]
                ) as Record | undefined;

                return {
                    year,
                    total: totalAmount.total,
                    earliestRecord,
                    latestRecord,
                    largestAmountRecord,
                    topExpenses,
                    largestIncome: largestIncome || null,
                    totalRecords: totalRecords.total,
                    incomeTotal: incomeTotal.total || 0,
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
            "INSERT INTO record(amount, type, category, subCategory, remark, date, countInBudget) VALUES (?, ?, ?, ?, ?, ?, ?)";
        const stmt = db.prepare(sql);
        records.forEach((record) => {
            stmt.run([
                record.amount,
                record.type,
                record.category,
                record.subCategory,
                record.remark,
                getDaliyStart(record.date),
                Number(record.countInBudget) === 0 ? 0 : 1,
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
        ids.forEach(async (id) => {
            // 查询当前的syncId
            const currentSyncIdQuery = "SELECT syncId FROM record WHERE id = ?";
            const currentSyncId = await new Promise((resolve, reject) => {
                db.get(currentSyncIdQuery, [id], (err, row: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row.syncId);
                    }
                });
            }) as number;

            // 更新记录
            const newSyncId = currentSyncId + 1;
            const sql = "UPDATE record SET isDeleted = 1, syncId = ? WHERE id = ?";
            const stmt = db.prepare(sql);
            stmt.run([newSyncId, id], (err) => {
                if (err) {
                    throw new Error(ErrorType.DATA_BASE_ERROR);
                }
            });
            stmt.finalize();
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
        db.get("SELECT COUNT(*) as total FROM record", (err, row: any) => {
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
        const sql = "SELECT * FROM record WHERE date = ? AND type = ? AND category = ? AND subCategory = ? AND amount = ? AND remark = ?";
        const stmt = db.prepare(sql);
        let insert = 0
        let skip = 0
        let update = 0
        records.forEach((record) => {
            const dateObj = new Date(record.date);
            dateObj.setHours(0, 0, 0, 0);
            const timestamp = dateObj.getTime();
            stmt.get([timestamp, record.type, record.category, record.subCategory, record.amount, record.remark], (err, row: any) => {
                if (err) {
                    reject(err);
                } else {
                    if (!row) {
                        createRecord(record);
                        console.log("Record sync - Record not exists, create it, record id:" + record.id);
                        insert += 1
                    } else if (row.syncId < record.syncId) {
                        record.id = row.id;
                        updateRecord(record, false);
                        console.log("Record sync - Record exists, update it, record id:" + record.id);
                        update += 1
                    } else {
                        console.log("Record sync - Record already exists, ignore it, record id:" + row.id);
                        skip += 1
                    }
                }
            });
        });
        console.log("Record sync - Insert:" + insert + ", Update:" + update + ", Skip:" + skip);
        resolve();
    });
}

export async function getRecordsByLimit(limit: Number, offset: Number): Promise<Record[]> {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM record order by date desc limit ? offset ?", [limit, offset], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows as Record[]);
            }
        });
    });
}

async function saveCustomCategory(newCategory: string): Promise<string> {
    logInfo("save custom category to:" + customCategoryPath);
    try {
        await fs.writeFile(customCategoryPath, newCategory);
        return newCategory;
    } catch (err: any) {
        throw new Error(ErrorType.FILE_WIRTE_FAIL);
    }
}

async function readCustomCategory(): Promise<string> {
    logInfo("read custom category from:" + customCategoryPath);
    try {
        const data = await fs.readFile(customCategoryPath, 'utf8');
        return data;
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            logInfo("File does not exist:" + customCategoryPath);
            return ""
        } else {
            logError("Read custom category failed:" + err);
            throw new Error(ErrorType.FILE_READ_FAIL); // 抛出异常供调用者处理
        }
    }
}

// ---------- 存款 ----------

async function fetchDepositData(): Promise<DepositData> {
    const banks = await dbAll(
        "SELECT * FROM deposit_bank WHERE isDeleted = 0 ORDER BY id ASC",
        []
    ) as DepositBank[];
    const deposits = await dbAll(
        "SELECT * FROM deposit_record WHERE isDeleted = 0 ORDER BY sortOrder ASC, startDate ASC, id ASC",
        []
    ) as DepositRecord[];
    return { banks, deposits };
}

async function createBank(bank: DepositBank): Promise<number> {
    const name = String(bank.name || "").trim();
    if (!name) {
        throw new Error("银行名称不能为空");
    }
    const row = await new Promise<number>((resolve, reject) => {
        db.run(
            "INSERT INTO deposit_bank (name, icon) VALUES (?, ?)",
            [name, String(bank.icon || "")],
            function (err) {
                if (err) {
                    reject(new Error(ErrorType.DATA_BASE_ERROR));
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
    return row;
}

async function updateBank(bank: DepositBank): Promise<number> {
    if (!bank.id) {
        throw new Error(ErrorType.RECORD_NOT_EXIST);
    }
    const name = String(bank.name || "").trim();
    if (!name) {
        throw new Error("银行名称不能为空");
    }
    await new Promise<void>((resolve, reject) => {
        db.run(
            "UPDATE deposit_bank SET name = ?, icon = ?, syncId = syncId + 1 WHERE id = ? AND isDeleted = 0",
            [name, String(bank.icon || ""), bank.id],
            (err) => (err ? reject(new Error(ErrorType.DATA_BASE_ERROR)) : resolve())
        );
    });
    return bank.id;
}

async function deleteBank(id: number): Promise<number> {
    const used = await dbGet(
        "SELECT COUNT(*) AS total FROM deposit_record WHERE bankKey = ? AND isDeleted = 0",
        [`c:${id}`]
    ) as { total: number };
    if (Number((used as { total: number }).total) > 0) {
        throw new Error("该银行还有存款记录，请先删除存款");
    }
    await new Promise<void>((resolve, reject) => {
        db.run(
            "UPDATE deposit_bank SET isDeleted = 1, syncId = syncId + 1 WHERE id = ?",
            [id],
            (err) => (err ? reject(new Error(ErrorType.DATA_BASE_ERROR)) : resolve())
        );
    });
    return id;
}

async function createDeposit(deposit: DepositRecord): Promise<number> {
    if (!deposit.bankKey) {
        throw new Error("请选择银行");
    }
    if (!deposit.startDate) {
        throw new Error(ErrorType.DATE_NOT_EMPTY);
    }
    const maxOrder = await dbGet(
        "SELECT IFNULL(MAX(sortOrder), 0) AS maxOrder FROM deposit_record WHERE isDeleted = 0",
        []
    ) as { maxOrder: number };
    const hasCustomOrder = Number((maxOrder as { maxOrder: number }).maxOrder) > 0;
    const sortOrder = hasCustomOrder
        ? Number((maxOrder as { maxOrder: number }).maxOrder) + 1
        : 0;
    const row = await new Promise<number>((resolve, reject) => {
        db.run(
            `INSERT INTO deposit_record (bankId, bankKey, startDate, amount, years, rate, interest, sortOrder)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                0,
                deposit.bankKey,
                dayStart(deposit.startDate),
                round2(deposit.amount),
                Number(deposit.years) || 0,
                round2(deposit.rate),
                round2(deposit.interest),
                sortOrder,
            ],
            function (err) {
                if (err) {
                    reject(new Error(ErrorType.DATA_BASE_ERROR));
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
    return row;
}

async function updateDeposit(deposit: DepositRecord): Promise<number> {
    if (!deposit.id) {
        throw new Error(ErrorType.RECORD_NOT_EXIST);
    }
    await new Promise<void>((resolve, reject) => {
        db.run(
            `UPDATE deposit_record SET bankId = 0, bankKey = ?, startDate = ?, amount = ?, years = ?, rate = ?, interest = ?,
             syncId = syncId + 1 WHERE id = ? AND isDeleted = 0`,
            [
                deposit.bankKey,
                dayStart(deposit.startDate),
                round2(deposit.amount),
                Number(deposit.years) || 0,
                round2(deposit.rate),
                round2(deposit.interest),
                deposit.id,
            ],
            (err) => (err ? reject(new Error(ErrorType.DATA_BASE_ERROR)) : resolve())
        );
    });
    return deposit.id;
}

async function deleteDeposit(id: number): Promise<number> {
    await new Promise<void>((resolve, reject) => {
        db.run(
            "UPDATE deposit_record SET isDeleted = 1, syncId = syncId + 1 WHERE id = ?",
            [id],
            (err) => (err ? reject(new Error(ErrorType.DATA_BASE_ERROR)) : resolve())
        );
    });
    return id;
}

async function reorderDeposits(ids: number[]): Promise<number[]> {
    for (let index = 0; index < ids.length; index += 1) {
        const id = Number(ids[index]);
        if (!id) {
            continue;
        }
        await new Promise<void>((resolve, reject) => {
            db.run(
                "UPDATE deposit_record SET sortOrder = ?, syncId = syncId + 1 WHERE id = ? AND isDeleted = 0",
                [index + 1, id],
                (err) => (err ? reject(new Error(ErrorType.DATA_BASE_ERROR)) : resolve())
            );
        });
    }
    return ids;
}

// ---------- 薪酬 ----------

function round2(value: number): number {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function dayStart(timestamp: number | string | Date): number {
    let value: number;
    if (timestamp instanceof Date) {
        value = timestamp.getTime();
    } else if (typeof timestamp === "number") {
        value = timestamp;
    } else {
        // 日期选择器在 IPC 序列化后可能变成 ISO 字符串
        value = new Date(timestamp).getTime();
    }
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

export async function fetchPayrollData(): Promise<PayrollData> {
    const salaries = await dbAll(
        "SELECT * FROM salary_record WHERE isDeleted = 0 ORDER BY date DESC, id DESC",
        []
    ) as SalaryRecord[];
    const bonuses = await dbAll(
        "SELECT * FROM annual_bonus WHERE isDeleted = 0 ORDER BY date DESC, id DESC",
        []
    ) as AnnualBonus[];
    const budgets = await dbAll(
        "SELECT * FROM budget_item WHERE isDeleted = 0 ORDER BY id ASC",
        []
    ) as BudgetItem[];
    return { salaries, bonuses, budgets };
}

async function recalculateSalaryYear(year: number): Promise<void> {
    const start = new Date(year, 0, 1).getTime();
    const end = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
    const rows = await dbAll(
        "SELECT * FROM salary_record WHERE isDeleted = 0 AND date >= ? AND date <= ? ORDER BY date ASC, id ASC",
        [start, end]
    ) as SalaryRecord[];

    const prior: SalaryRecord[] = [];
    for (const row of rows) {
        // 手动微调过的记录保持原值，但仍作为后续月份已缴税额的基数
        if (Number(row.taxManual) === 1) {
            prior.push(row);
            continue;
        }
        const result = calcSalaryTax(row, prior);
        if (round2(row.tax) !== result.tax || round2(row.taxRate) !== result.taxRate || round2(row.netPay) !== result.netPay) {
            row.tax = result.tax;
            row.taxRate = result.taxRate;
            row.netPay = result.netPay;
            await new Promise<void>((resolve, reject) => {
                db.run(
                    "UPDATE salary_record SET tax = ?, taxRate = ?, netPay = ?, syncId = syncId + 1 WHERE id = ?",
                    [result.tax, result.taxRate, result.netPay, row.id],
                    (err) => (err ? reject(new Error(ErrorType.DATA_BASE_ERROR)) : resolve())
                );
            });
        }
        prior.push(row);
    }
}

async function createSalary(salary: SalaryRecord): Promise<number> {
    const row = await new Promise<number>((resolve, reject) => {
        db.run(
            `INSERT INTO salary_record
             (date, baseSalary, overtimePay, oneTimeBonus, socialInsurance, tax, taxRate, netPay, taxManual)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                dayStart(salary.date),
                round2(salary.baseSalary),
                round2(salary.overtimePay),
                round2(salary.oneTimeBonus),
                round2(salary.socialInsurance),
                round2(salary.tax),
                round2(salary.taxRate),
                round2(salary.netPay),
                Number(salary.taxManual) === 1 ? 1 : 0,
            ],
            function (err) {
                if (err) {
                    logError("insert salary failed: " + err.message + ", date=" + salary.date);
                    reject(new Error(ErrorType.DATA_BASE_ERROR));
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
    return row;
}

async function updateSalary(salary: SalaryRecord): Promise<number> {
    if (!salary.id) {
        throw new Error(ErrorType.RECORD_NOT_EXIST);
    }
    await new Promise<void>((resolve, reject) => {
        db.run(
            `UPDATE salary_record SET date = ?, baseSalary = ?, overtimePay = ?, oneTimeBonus = ?,
             socialInsurance = ?, tax = ?, taxRate = ?, netPay = ?, taxManual = ?, syncId = syncId + 1
             WHERE id = ? AND isDeleted = 0`,
            [
                dayStart(salary.date),
                round2(salary.baseSalary),
                round2(salary.overtimePay),
                round2(salary.oneTimeBonus),
                round2(salary.socialInsurance),
                round2(salary.tax),
                round2(salary.taxRate),
                round2(salary.netPay),
                Number(salary.taxManual) === 1 ? 1 : 0,
                salary.id,
            ],
            (err) => (err ? reject(new Error(ErrorType.DATA_BASE_ERROR)) : resolve())
        );
    });
    return salary.id;
}

async function deleteSalary(id: number): Promise<number> {
    await new Promise<void>((resolve, reject) => {
        db.run(
            "UPDATE salary_record SET isDeleted = 1, syncId = syncId + 1 WHERE id = ?",
            [id],
            (err) => (err ? reject(new Error(ErrorType.DATA_BASE_ERROR)) : resolve())
        );
    });
    return id;
}

async function createBonus(bonus: AnnualBonus): Promise<number> {
    const row = await new Promise<number>((resolve, reject) => {
        db.run(
            `INSERT INTO annual_bonus (date, bonus, tax, taxRate, netPay)
             VALUES (?, ?, ?, ?, ?)`,
            [
                dayStart(bonus.date),
                round2(bonus.bonus),
                round2(bonus.tax),
                round2(bonus.taxRate),
                round2(bonus.netPay),
            ],
            function (err) {
                if (err) {
                    reject(new Error(ErrorType.DATA_BASE_ERROR));
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
    return row;
}

async function updateBonus(bonus: AnnualBonus): Promise<number> {
    if (!bonus.id) {
        throw new Error(ErrorType.RECORD_NOT_EXIST);
    }
    await new Promise<void>((resolve, reject) => {
        db.run(
            `UPDATE annual_bonus SET date = ?, bonus = ?, tax = ?, taxRate = ?, netPay = ?,
             syncId = syncId + 1 WHERE id = ? AND isDeleted = 0`,
            [
                dayStart(bonus.date),
                round2(bonus.bonus),
                round2(bonus.tax),
                round2(bonus.taxRate),
                round2(bonus.netPay),
                bonus.id,
            ],
            (err) => (err ? reject(new Error(ErrorType.DATA_BASE_ERROR)) : resolve())
        );
    });
    return bonus.id;
}

async function deleteBonus(id: number): Promise<number> {
    await new Promise<void>((resolve, reject) => {
        db.run(
            "UPDATE annual_bonus SET isDeleted = 1, syncId = syncId + 1 WHERE id = ?",
            [id],
            (err) => (err ? reject(new Error(ErrorType.DATA_BASE_ERROR)) : resolve())
        );
    });
    return id;
}

async function saveBudgets(items: BudgetItem[]): Promise<BudgetItem[]> {
    const existing = await dbAll(
        "SELECT id FROM budget_item WHERE isDeleted = 0",
        []
    ) as { id: number }[];
    const keepIds = items.filter((item) => item.id > 0).map((item) => item.id);

    for (const item of items) {
        if (!item.name || !item.name.trim()) {
            continue;
        }
        const name = item.name.trim();
        const amount = round2(item.amount);
        if (item.id > 0) {
            await new Promise<void>((resolve, reject) => {
                db.run(
                    "UPDATE budget_item SET name = ?, amount = ?, syncId = syncId + 1 WHERE id = ? AND isDeleted = 0",
                    [name, amount, item.id],
                    (err) => (err ? reject(new Error(ErrorType.DATA_BASE_ERROR)) : resolve())
                );
            });
        } else {
            await new Promise<void>((resolve, reject) => {
                db.run(
                    "INSERT INTO budget_item (name, amount) VALUES (?, ?)",
                    [name, amount],
                    (err) => (err ? reject(new Error(ErrorType.DATA_BASE_ERROR)) : resolve())
                );
            });
        }
    }

    const removed = existing.filter((item) => !keepIds.includes(item.id));
    for (const item of removed) {
        await new Promise<void>((resolve, reject) => {
            db.run(
                "UPDATE budget_item SET isDeleted = 1, syncId = syncId + 1 WHERE id = ?",
                [item.id],
                (err) => (err ? reject(new Error(ErrorType.DATA_BASE_ERROR)) : resolve())
            );
        });
    }

    return dbAll(
        "SELECT * FROM budget_item WHERE isDeleted = 0 ORDER BY id ASC",
        []
    ) as Promise<BudgetItem[]>;
}

async function fetchBudgetExpense(start: number, end: number): Promise<number> {
    const row = await dbGet(
        "SELECT IFNULL(SUM(amount), 0) AS total FROM record WHERE isDeleted = 0 AND type = '支出' AND countInBudget = 1 AND date >= ? AND date <= ?",
        [start, end]
    ) as { total: number };
    return Number((row as { total: number }).total) || 0;
}

export interface MobileBackupImportResult {
    records: number;
    salaries: number;
    bonuses: number;
    budgets: number;
    deposits: number;
    categories: number;
}

function mobileNumber(value: unknown): number {
    const result = Number(value);
    return isNaN(result) ? 0 : result;
}

function mobileDate(value: unknown): number {
    const date = new Date(value as string | number);
    if (isNaN(date.getTime())) {
        return 0;
    }
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

async function replaceMobileCategories(items: any[]): Promise<number> {
    if (items.length === 0) {
        try {
            await fs.unlink(customCategoryPath);
        } catch (error) {
            // 没有自定义分类文件时忽略
        }
        return 0;
    }

    const roots = new Map<string, any>();
    const childrenByParent = new Map<string, any[]>();
    const ensureRoot = (name: string, order: number) => {
        if (!roots.has(name)) {
            roots.set(name, { label: name, value: name, children: [], order });
        }
        return roots.get(name);
    };

    for (const item of items) {
        const name = String(item && item.name ? item.name : "").trim();
        if (!name) {
            continue;
        }
        const parentName = String(item && item.parentName ? item.parentName : "").trim();
        const order = mobileNumber(item && item.order);
        if (!parentName || parentName === name) {
            ensureRoot(name, order);
            continue;
        }
        ensureRoot(parentName, order);
        if (!childrenByParent.has(parentName)) {
            childrenByParent.set(parentName, []);
        }
        const children = childrenByParent.get(parentName) as any[];
        if (!children.some((child) => child.label === name)) {
            children.push({ label: name, value: name, order });
        }
    }

    for (const [parentName, children] of childrenByParent.entries()) {
        const parent = ensureRoot(parentName, 0);
        parent.children = children
            .sort((left, right) => Number(left.order) - Number(right.order))
            .map((child) => ({ label: child.label, value: child.value }));
    }

    const result = Array.from(roots.values())
        .sort((left, right) => Number(left.order) - Number(right.order))
        .map((root) => ({
            label: root.label,
            value: root.value,
            children: root.children,
        }));
    await saveCustomCategory(JSON.stringify(result));
    let count = 0;
    for (const root of result) {
        count += 1;
        count += root.children.length;
    }
    return count;
}

function runDatabase(sql: string, params: any[] = []): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        db.run(sql, params, (err) => {
            if (err) {
                reject(new Error(ErrorType.DATA_BASE_ERROR));
            } else {
                resolve();
            }
        });
    });
}

/**
 * 按移动端 v1.1 备份协议整库覆盖恢复 record-backup-*.json。
 * 业务表全部替换；银行目录保留；budgetSettings 存在时覆盖，缺失时保留本机配置。
 */
export async function importMobileBackupData(payload: any): Promise<MobileBackupImportResult> {
    const result: MobileBackupImportResult = {
        records: 0,
        salaries: 0,
        bonuses: 0,
        budgets: 0,
        deposits: 0,
        categories: 0,
    };

    const records = Array.isArray(payload && payload.records) ? payload.records : [];
    const salaryItems = Array.isArray(payload && payload.salaries) ? payload.salaries : [];
    const bonusItems = Array.isArray(payload && payload.bonuses) ? payload.bonuses : [];
    const budgetItems = Array.isArray(payload && payload.budgets) ? payload.budgets : [];
    const depositItems = Array.isArray(payload && payload.deposits) ? payload.deposits : [];
    const categoryItems = Array.isArray(payload && payload.categories) ? payload.categories : [];

    const salaryRows: SalaryRecord[] = [];
    for (const item of salaryItems) {
        const date = mobileDate(item && item.date);
        if (!date) {
            continue;
        }
        const baseSalary = mobileNumber(item && item.baseSalary);
        const overtimePay = mobileNumber(item && item.overtimePay);
        const oneTimeBonus = mobileNumber(item && item.oneTimeBonus);
        const socialInsurance = mobileNumber(item && item.socialInsurance);
        const tax = mobileNumber(item && item.tax);
        salaryRows.push({
            id: 0,
            date,
            baseSalary,
            overtimePay,
            oneTimeBonus,
            socialInsurance,
            tax,
            taxRate: mobileNumber(item && item.taxRate),
            netPay: Math.round((baseSalary + overtimePay + oneTimeBonus - socialInsurance - tax) * 100) / 100,
            taxManual: 1,
        });
    }

    const bonusRows: AnnualBonus[] = [];
    for (const item of bonusItems) {
        const date = mobileDate(item && item.date);
        if (!date) {
            continue;
        }
        const bonus = mobileNumber(item && item.bonus);
        const tax = mobileNumber(item && item.tax);
        bonusRows.push({
            id: 0,
            date,
            bonus,
            tax,
            taxRate: mobileNumber(item && item.taxRate),
            netPay: Math.round((bonus - tax) * 100) / 100,
        });
    }

    const budgetRows: BudgetItem[] = budgetItems
        .map((item: any) => ({
            id: 0,
            name: String(item && item.name ? item.name : "").trim(),
            amount: mobileNumber(item && item.amount),
        }))
        .filter((item: BudgetItem) => !!item.name);

    await new Promise<void>((resolve, reject) => {
        db.run("BEGIN IMMEDIATE", (err) => (err ? reject(new Error(ErrorType.DATA_BASE_ERROR)) : resolve()));
    });

    try {
        await runDatabase("DELETE FROM record");
        await runDatabase("DELETE FROM salary_record");
        await runDatabase("DELETE FROM annual_bonus");
        await runDatabase("DELETE FROM budget_item");
        await runDatabase("DELETE FROM deposit_record");

        for (const item of records) {
            const date = mobileDate(item && item.date);
            const rawType = item && item.typeRaw ? String(item.typeRaw) : "";
            const type = rawType === "income" || rawType === "收入" ? "收入"
                : rawType === "expense" || rawType === "支出" ? "支出" : "";
            const category = String(item && item.category ? item.category : "");
            const subCategory = String(item && item.subCategory ? item.subCategory : "");
            const amount = mobileNumber(item && item.amount);
            const remark = String(item && item.remark ? item.remark : "");
            if (!date || !type || !category || !subCategory || !amount) {
                continue;
            }
            await runDatabase(
                "INSERT INTO record (date, type, category, subCategory, amount, remark, countInBudget) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [date, type, category, subCategory, amount, remark, item && item.countInBudget === false ? 0 : 1]
            );
            result.records += 1;
        }

        const payrollResult = await importPayroll({
            salaries: salaryRows,
            bonuses: bonusRows,
            budgets: budgetRows,
        });
        result.salaries = payrollResult.insertedSalaries;
        result.bonuses = payrollResult.insertedBonuses;
        result.budgets = payrollResult.insertedBudgets;

        for (const item of depositItems) {
            const bankName = String(item && item.bankName ? item.bankName : "").trim();
            const startDate = mobileDate(item && item.startDate);
            const amount = mobileNumber(item && item.amount);
            const years = mobileNumber(item && item.years);
            const rate = mobileNumber(item && item.rate);
            if (!bankName || !startDate || !amount) {
                continue;
            }
            let bankKey = "";
            const preset = presetByName(bankName);
            if (preset) {
                bankKey = `b:${preset.icon}`;
            } else {
                const existingBank = await dbGet(
                    "SELECT id FROM deposit_bank WHERE isDeleted = 0 AND name = ?",
                    [bankName]
                ) as { id: number } | undefined;
                if (existingBank) {
                    bankKey = `c:${existingBank.id}`;
                } else {
                    const bankId = await new Promise<number>((resolve, reject) => {
                        db.run(
                            "INSERT INTO deposit_bank (name, icon) VALUES (?, ?)",
                            [bankName, ""],
                            function (err) {
                                if (err) {
                                    reject(new Error(ErrorType.DATA_BASE_ERROR));
                                } else {
                                    resolve(this.lastID);
                                }
                            }
                        );
                    });
                    bankKey = `c:${bankId}`;
                }
            }
            await runDatabase(
                `INSERT INTO deposit_record
                 (bankId, bankKey, startDate, amount, years, rate, interest, sortOrder)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    0,
                    bankKey,
                    startDate,
                    amount,
                    years,
                    rate,
                    mobileNumber(item && item.interest),
                    mobileNumber(item && item.order) + 1,
                ]
            );
            result.deposits += 1;
        }

        if (payload && payload.budgetSettings) {
            await saveBudgetSettings(payload.budgetSettings);
        }

        await new Promise<void>((resolve, reject) => {
            db.run("COMMIT", (err) => (err ? reject(new Error(ErrorType.DATA_BASE_ERROR)) : resolve()));
        });
    } catch (error) {
        await new Promise<void>((resolve) => {
            db.run("ROLLBACK", () => resolve());
        });
        throw error;
    }

    try {
        result.categories = await replaceMobileCategories(categoryItems);
    } catch (error) {
        logError("replace mobile categories failed: " + error);
    }
    return result;
}

const DEFAULT_BUDGET_SETTINGS: BudgetSettings = {
    cycleEnabled: false,
    startDay: 26,
    endDay: 25,
    incomeMode: "current",
};

function normalizeBudgetSettings(input: any): BudgetSettings {
    const startDay = Number(input && input.startDay);
    const endDay = Number(input && input.endDay);
    return {
        cycleEnabled: !!(input && input.cycleEnabled),
        startDay: startDay >= 1 && startDay <= 31 ? Math.round(startDay) : DEFAULT_BUDGET_SETTINGS.startDay,
        endDay: endDay >= 1 && endDay <= 31 ? Math.round(endDay) : DEFAULT_BUDGET_SETTINGS.endDay,
        incomeMode: input && input.incomeMode === "next" ? "next" : "current",
    };
}

export async function fetchBudgetSettings(): Promise<BudgetSettings | null> {
    const row = await dbGet(
        "SELECT value FROM app_setting WHERE key = ?",
        ["budget"]
    ) as { value: string } | undefined;
    if (!row || !row.value) {
        return null;
    }
    try {
        return normalizeBudgetSettings(JSON.parse(row.value));
    } catch (error) {
        return null;
    }
}

export async function saveBudgetSettings(settings: BudgetSettings): Promise<BudgetSettings> {
    const normalized = normalizeBudgetSettings(settings);
    await new Promise<void>((resolve, reject) => {
        db.run(
            `INSERT INTO app_setting (key, value, syncId) VALUES ('budget', ?, 0)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, syncId = syncId + 1`,
            [JSON.stringify(normalized)],
            (err) => (err ? reject(new Error(ErrorType.DATA_BASE_ERROR)) : resolve())
        );
    });
    return normalized;
}

export async function importPayroll(payload: { salaries?: SalaryRecord[]; bonuses?: AnnualBonus[]; budgets?: BudgetItem[] }) {
    let insertedSalaries = 0;
    for (const salary of payload.salaries || []) {
        const date = dayStart(salary.date);
        const exists = await dbGet(
            "SELECT id FROM salary_record WHERE isDeleted = 0 AND date = ? AND baseSalary = ? AND overtimePay = ? AND oneTimeBonus = ? AND socialInsurance = ?",
            [date, round2(salary.baseSalary), round2(salary.overtimePay), round2(salary.oneTimeBonus), round2(salary.socialInsurance)]
        );
        if (!exists) {
            await createSalary({ ...salary, date, taxManual: 1 });
            insertedSalaries += 1;
        }
    }

    let insertedBonuses = 0;
    for (const bonus of payload.bonuses || []) {
        const date = dayStart(bonus.date);
        const exists = await dbGet(
            "SELECT id FROM annual_bonus WHERE isDeleted = 0 AND date = ? AND bonus = ?",
            [date, round2(bonus.bonus)]
        );
        if (!exists) {
            await createBonus({ ...bonus, date });
            insertedBonuses += 1;
        }
    }

    let insertedBudgets = 0;
    for (const budget of payload.budgets || []) {
        if (!budget.name) {
            continue;
        }
        const exists = await dbGet(
            "SELECT id FROM budget_item WHERE isDeleted = 0 AND name = ?",
            [budget.name.trim()]
        );
        if (!exists) {
            await new Promise<void>((resolve, reject) => {
                db.run(
                    "INSERT INTO budget_item (name, amount) VALUES (?, ?)",
                    [budget.name.trim(), round2(budget.amount)],
                    (err) => (err ? reject(new Error(ErrorType.DATA_BASE_ERROR)) : resolve())
                );
            });
            insertedBudgets += 1;
        }
    }

    return { insertedSalaries, insertedBonuses, insertedBudgets };
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

