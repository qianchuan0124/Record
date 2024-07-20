import sqlite3 from "sqlite3";
import fs from "fs/promises";
import { ErrorType } from "./errorInfo.js";

// 连接到数据库，如果数据库不存在则会被创建
export const db = new sqlite3.Database("./records.db", (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Connected to the records database.");
});

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
`;

// 检查record表是否存在
db.serialize(() => {
  db.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='record';",
    (err, row) => {
      if (err) {
        console.error(err.message);
        return;
      }
      if (row) {
        console.log('Table "record" already exists.');
      } else {
        console.log('Table "record" does not exist. Creating table...');
        try {
          db.exec(createTableSql);
          console.log('Table "record" has been created.');
        } catch (err) {
          console.error(err.message);
        }
      }
    }
  );
});

// 查询所有记录
export function selectAllRecords() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM record where isDeleted = 0;", (err, rows) => {
      if (err) {
        reject(new Error(ErrorType.DATA_BASE_ERROR));
      } else {
        resolve(rows);
      }
    });
  });
}

// 根据条件查询记录
export function selectFilterRecords(filter) {
  return new Promise((resolve, reject) => {
    const { types, categorys, startTime, endTime, keyword } = filter;
    console.log("filter records by: ", filter);
    console.log("get all records");
    // 查询type在types中，category在categorys中，日期在startDate和endDate之间，备注包含keyword的记录
    let sql = "SELECT * FROM record where isDeleted = 0";
    if (types != null && types.length > 0) {
      sql += " and type in (";
      types.forEach((type, index) => {
        sql += `'${type}'`;
        if (index !== types.length - 1) {
          sql += ",";
        }
      });
      sql += ")";
    }
    if (categorys != null && categorys.length > 0) {
      sql += " and subCategory in (";
      categorys.forEach((category, index) => {
        sql += `'${category}'`;
        if (index !== categorys.length - 1) {
          sql += ",";
        }
      });
      sql += ")";
    }
    if (startTime) {
      sql += ` and date >= ${getDaliyStart(startTime)}`;
    }
    if (endTime) {
      sql += ` and date <= ${getDaliyEnd(endTime)}`;
    }
    if (keyword) {
      sql += ` and (remark like '%${keyword}%' or type like '%${keyword}%' or subCategory like '%${keyword}%' or amount like '%${keyword}%')`;
    }
    console.log("sql: ", sql);
    db.all(sql, (err, rows) => {
      if (err) {
        reject(new Error(ErrorType.DATA_BASE_ERROR));
      } else {
        resolve(rows);
      }
    });
  });
}

function getDaliyStart(date) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  return startDate.getTime();
}

function getDaliyEnd(date) {
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  return endDate.getTime();
}

// 查询总收入
export async function searchTotalIncome() {
  try {
    const row = await new Promise((resolve, reject) => {
      db.get(
        "SELECT SUM(amount) as total FROM record WHERE type = '收入' AND isDeleted = 0",
        (err, row) => {
          if (err) {
            reject(new Error(ErrorType.DATA_BASE_ERROR));
          } else {
            resolve(row);
          }
        }
      );
    });
    return row ? row : 0; // 确保如果row是undefined，返回0
  } catch (error) {
    throw new Error(ErrorType.DATA_BASE_ERROR); // 抛出具体的错误类型
  }
}

// 查询总支出
export async function searchTotalExpense() {
  try {
    const row = await new Promise((resolve, reject) => {
      db.get(
        "SELECT SUM(amount) as total FROM record WHERE type = '支出' AND isDeleted = 0",
        (err, row) => {
          if (err) {
            reject(new Error(ErrorType.DATA_BASE_ERROR));
          } else {
            resolve(row);
          }
        }
      );
    });
    return row ? row : 0; // 确保如果row是undefined，返回0
  } catch (error) {
    throw new Error(ErrorType.DATA_BASE_ERROR); // 抛出具体的错误类型
  }
}

// 查询某个时间段内的总收入
export async function searchTotalIncomeByRange(start, end) {
  try {
    if (!start) {
      throw new Error(ErrorType.START_TIME_NOT_EMPTY);
    }
    if (!end) {
      throw new Error(ErrorType.END_TIME_NOT_EMPTY);
    }
    const row = await new Promise((resolve, reject) => {
      db.get(
        `SELECT SUM(amount) as total FROM record WHERE type = '收入' AND date >= ${getDaliyStart(
          start
        )} AND date <= ${getDaliyEnd(end)} AND isDeleted = 0`,
        (err, row) => {
          if (err) {
            reject(new Error(ErrorType.DATA_BASE_ERROR));
          } else {
            resolve(row);
          }
        }
      );
    });
    return row ? row : 0; // 确保如果row是undefined，返回0
  } catch (error) {
    throw new Error(ErrorType.DATA_BASE_ERROR); // 抛出具体的错误类型
  }
}

// 查询某个时间段内的总支出
export async function searchTotalExpenseByRange(start, end) {
  try {
    if (!start) {
      throw new Error(ErrorType.START_TIME_NOT_EMPTY);
    }
    if (!end) {
      throw new Error(ErrorType.END_TIME_NOT_EMPTY);
    }
    const row = await new Promise((resolve, reject) => {
      db.get(
        `SELECT SUM(amount) as total FROM record WHERE type = '支出' AND date >= ${getDaliyStart(
          start
        )} AND date <= ${getDaliyEnd(end)} AND isDeleted = 0`,
        (err, row) => {
          if (err) {
            reject(new Error(ErrorType.DATA_BASE_ERROR));
          } else {
            resolve(row);
          }
        }
      );
    });
    return row ? row : 0; // 确保如果row是undefined，返回0
  } catch (error) {
    throw new Error(ErrorType.DATA_BASE_ERROR); // 抛出具体的错误类型
  }
}

// 查询某年每个月的收入
export async function searchTotalCategoryByYears(years) {
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

// 根据id查询记录
export async function serchRecordById(id) {
  try {
    const row = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM record WHERE id = ? and isDeleted = 0",
        [id],
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
    throw new Error(ErrorType.DATA_BASE_ERROR); // 抛出具体的错误类型
  }
}

// 插入记录
export async function insertRecord(record) {
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
    });
    return row;
  } catch (error) {
    throw error; // 抛出具体的错误类型
  }
}

// 更新记录
export async function updateRecord(record) {
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
            resolve(id);
          }
        }
      );
    });
    return row;
  } catch (error) {
    throw error; // 抛出具体的错误类型
  }
}

// 删除记录
export async function deleteRecord(id) {
  try {
    if (!id) {
      throw new Error(ErrorType.RECORD_NOT_EXIST);
    }
    const row = await new Promise((resolve, reject) => {
      db.run(
        "UPDATE record SET isDeleted = 1 WHERE id = ? and isDeleted = 0",
        [id],
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
  } catch (error) {
    throw error; // 抛出具体的错误类型
  }
}

// 获取每个分类的总花费并按照金额排序
export async function getTopCategoryByAmount() {
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
    throw error; // 抛出具体的错误类型
  }
}

// 获取某一个分类的子分类花费总金额， 并按照金额排序
export async function getTopSubCategoryByAmount(category) {
  try {
    const row = await new Promise((resolve, reject) => {
      const result = {
        category: category,
        total: 0,
        subCategory: [],
      };
      db.get(
        "SELECT ROUND(SUM(amount), 2) as total FROM record where category = ? and isDeleted = 0 AND type = '支出'",
        [category],
        (err, row) => {
          if (err) {
            console.error(err.message);
            reject(new Error(ErrorType.DATA_BASE_ERROR));
          } else {
            result.total = row.total;
            db.all(
              "SELECT subCategory, total FROM (SELECT subCategory, ROUND(SUM(amount), 2) as total FROM record WHERE category = ? AND isDeleted = 0 AND type = '支出' GROUP BY subCategory) AS groupedData ORDER BY CAST(total AS REAL) DESC",
              [category],
              (err, rows) => {
                if (err) {
                  console.error(err.message);
                  reject(new Error(ErrorType.DATA_BASE_ERROR));
                } else {
                  rows.forEach((subCategory) => {
                    const subCategoryItem = {
                      subCategory: subCategory.subCategory,
                      total: subCategory.total,
                      records: [],
                    };
                    db.all(
                      "SELECT * FROM record where category = ? and subCategory = ? and isDeleted = 0 AND type = '支出' order by amount DESC",
                      [category, subCategory.subCategory],
                      (err, records) => {
                        if (err) {
                          console.error(err.message);
                          reject(new Error(ErrorType.DATA_BASE_ERROR));
                        } else {
                          subCategoryItem.records = records;
                          result.subCategory.push(subCategoryItem);
                          if (result.subCategory.length === rows.length) {
                            console.log("get total amount by category success");
                            resolve(result);
                          }
                        }
                      }
                    );
                  });
                }
              }
            );
          }
        }
      );
    });
    return row;
  } catch (error) {
    throw error;
  }
}

// 获取对应年份和分类的子分类的各项支出
export async function getTopSubCategoryByYears(year, category) {
  try {
    // 封装数据库查询函数
    async function queryDb(sql, params) {
      return dbAll(sql, params);
    }

    // 获取月份数据
    async function getMonthData(month) {
      const start = new Date(year, month, 1).getTime();
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

      const totalAmount = await queryDb(
        "SELECT ROUND(SUM(amount), 2) as total FROM record WHERE category = ? AND date >= ? AND date <= ? AND isDeleted = 0 AND type = '支出'",
        [category, start, end]
      );

      const subCategories = await queryDb(
        "SELECT subCategory, ROUND(SUM(amount), 2) as total FROM record WHERE category = ? AND date >= ? AND date <= ? AND isDeleted = 0 AND type = '支出' GROUP BY subCategory ORDER BY total DESC",
        [category, start, end]
      );

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
        total: totalAmount[0]?.total || 0,
        subCategory: subCategoryDetails,
      };
    }

    const monthList = await Promise.all(
      Array.from({ length: 12 }, (_, i) => getMonthData(i))
    );

    const yearStart = new Date(year, 0, 1).getTime();
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
    const totalAmount = await queryDb(
      "SELECT ROUND(SUM(amount), 2) as total FROM record WHERE category = ? AND date >= ? AND date <= ? AND isDeleted = 0 AND type = '支出'",
      [category, yearStart, yearEnd]
    );

    return {
      year,
      category,
      total: totalAmount[0]?.total || 0,
      months: monthList,
    };
  } catch (error) {
    throw error;
  }
}

function dbGet(query, params) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(new Error(ErrorType.DATA_BASE_ERROR));
      else resolve(row);
    });
  });
}

function dbAll(query, params) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(new Error(ErrorType.DATA_BASE_ERROR));
      else resolve(rows);
    });
  });
}

// 查询最早的年份和最晚的年份，获取两者之间的所有年份，并查询每一年的最早、最晚、最多的一条记录
export async function getTimeLineByYears() {
  try {
    const minMaxYear = await dbGet(
      "SELECT MIN(date) as min, MAX(date) as max FROM record WHERE isDeleted = 0 AND type = '支出'"
    );

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
        );

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
        );

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
    throw error; // 抛出具体的错误类型
  }
}

// 保存自定义Category内容
export async function saveCustomCategory(category) {
  try {
    const filePath = "./custom-category.json";

    // 直接写入新内容，覆盖文件中的现有内容
    const categories = category; // 将category作为数组的唯一元素
    fs.writeFile(filePath, JSON.stringify(categories), (err) => {
      if (err) {
        console.error(err.message);
        throw err;
      }
    });
  } catch (error) {
    throw new Error(ErrorType.FILE_WIRTE_FAIL);
  }
}

// 读取自定义Category内容
export async function readCustomCategory() {
  try {
    // 检查文件是否存在
    try {
      await fs.access("./custom-category.json");
    } catch (error) {
      console.log("File does not exist, returning empty data.");
      return {}; // 文件不存在时返回空对象
    }

    // 异步读取文件内容
    const data = await fs.readFile("./custom-category.json", "utf8");
    return data;
  } catch (error) {
    console.error(error.message);
    throw new Error(ErrorType.FILE_READ_FAIL); // 抛出读取失败的错误
  }
}

// 按照时间逆序查询所有记录
export async function selectAllRecordsOrderByTime() {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM record where isDeleted = 0 order by date DESC;",
      (err, rows) => {
        if (err) {
          reject(new Error(ErrorType.DATA_BASE_ERROR));
        } else {
          resolve(rows);
        }
      }
    );
  });
}

// 批量写入记录
export async function batchInsertRecords(records) {
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

// 批量删除记录
export async function batchDeleteRecords(ids) {
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
