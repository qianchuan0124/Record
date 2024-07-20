import express from "express";

import {
  selectAllRecords,
  searchTotalCategoryByYears,
  searchTotalExpense,
  selectFilterRecords,
  searchTotalIncome,
  searchTotalIncomeByRange,
  searchTotalExpenseByRange,
  insertRecord,
  updateRecord,
  deleteRecord,
  getTopCategoryByAmount,
  getTopSubCategoryByAmount,
  getTopSubCategoryByYears,
  getTimeLineByYears,
  saveCustomCategory,
  readCustomCategory,
  selectAllRecordsOrderByTime,
  batchInsertRecords,
  batchDeleteRecords,
} from "./database.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(function (req, res, next) {
  // 跨域同源策略
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:8080");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  next();
});

app.use(express.json());

// GET all records
app.get("/records", async (req, res) => {
  console.log("get all records");
  try {
    const data = await selectAllRecords();
    console.log("get all records success");
    res.send(data);
  } catch (err) {
    handleError(res, err);
  }
});

// POST filter records
app.post("/filter/records", async (req, res) => {
  try {
    const data = await selectFilterRecords(req.body);
    console.log("get filter records success");
    res.send(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Error handler
function handleError(res, err) {
  console.error(err);
  if (err instanceof Error) {
    res.status(500).send(err.message);
  } else {
    res.status(500).send("Internal server error");
  }
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

// GET single record by ID
app.get("/records/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("get single record by id: ", id);
    const data = await selectRecordById(id);
    res.send(data);
  } catch (err) {
    handleError(res, err);
  }
});

// // POST new record
app.post("/record", async (req, res) => {
  try {
    console.log("create new record: ", req.body);
    const data = await insertRecord(req.body);
    console.log("create new record success");
    res.send(200, data);
  } catch (err) {
    handleError(res, err);
  }
});

// PUT update product by ID
app.put("/records/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("update record by body:", req.body);
    const data = await updateRecord(req.body);
    console.log("update record success, id: ", id);
    res.send(200, data);
  } catch (err) {
    handleError(res, err);
  }
});

// DELETE record by ID
app.delete("/records/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("delete record by id: ", id);
    const data = await deleteRecord(id);
    console.log("delete record success, id: ", id);
    res.send(200, data);
  } catch (err) {
    handleError(res, err);
  }
});

// 获取数据库中所有记录收入的总金额
app.get("/records/total/income", async (req, res) => {
  console.log("get total income amount");
  try {
    const data = await searchTotalIncome();
    console.log("get total income amount success");
    res.send(data);
  } catch (err) {
    handleError(res, err);
  }
});

// 获取数据库中所有类型为支出的记录的总金额
app.get("/records/total/expense", async (req, res) => {
  console.log("get total expense amount");
  try {
    const data = await searchTotalExpense();
    console.log("get total expense amount success");
    res.send(data);
  } catch (err) {
    handleError(res, err);
  }
});

// 获取在某个时间段内的总收入
app.get("/records/total/income/:start/:end", async (req, res) => {
  try {
    const { start, end } = req.params;
    console.log("get total income amount between: ", start, end);
    const startDate = getDaliyStart(new Date(start));
    const endDate = getDaliyEnd(new Date(start));
    const data = await searchTotalIncomeByRange(startDate, endDate);
    console.log("get total income amount success");
    res.send(data);
  } catch (err) {
    handleError(res, err);
  }
});

// 获取在某个时间段内的总支出
app.get("/records/total/expense/:start/:end", async (req, res) => {
  try {
    const { start, end } = req.params;
    const startDate = getDaliyStart(new Date(start));
    const endDate = getDaliyEnd(new Date(end));
    console.log("get total expense amount between: ", start, end);
    const data = await searchTotalExpenseByRange(startDate, endDate);
    console.log("get total expense amount success");
    res.send(data);
  } catch (err) {
    handleError(res, err);
  }
});

// 获取在某个分类某年的总支出
app.post("/records/total/category", async (req, res) => {
  const { years } = req.body;
  console.log("get total amount by category in years: ", years);
  try {
    const data = await searchTotalCategoryByYears(years);
    console.log("get total amount by category in years success");
    res.send(200, data);
  } catch (err) {
    handleError(res, err);
  }
});

// 获取所有的cattegory的总金额，按照amount DESC排序，取top5，返回一个数组，数组中每一个元素是一个对象，对象的第一个key是"name", value是category，第二个key是"value", value是该category的总金额
app.get("/records/total/category/top", async (req, res) => {
  try {
    console.log("get top category by total amount");
    const data = await getTopCategoryByAmount();
    console.log("get top category by total amount success");
    res.send(data);
  } catch (err) {
    handleError(res, err);
  }
});

// 根据category获取该category的总金额，再获取该category的所有subCategory的总金额，再获取每一个subCategory的记录，最后返回一个对象，对象的结构有三层，第一层是category，第二层是subCategory，第三层是记录
app.post("/records/analysis/single/category", async (req, res) => {
  try {
    const { category } = req.body;
    console.log("get total amount by category: ", category);
    const data = await getTopSubCategoryByAmount(category);
    console.log("get total amount by category success");
    res.send(200, data);
  } catch (err) {
    handleError(res, err);
  }
});

// 根据传来的年份和category，根据年份获取该年的每一个月，然后获取每一个月对应category的总金额，再获取该月份该category的所有subCategory的记录，最后返回一个对象，对象有三层，第一层是月份，按总金额逆序排序，第二层是subCategory， 按总金额逆序排序，第三层是记录，按金额逆序排序
app.post("/records/analysis/single/category/month", async (req, res) => {
  try {
    const { year, category } = req.body;
    console.log("get total amount by category in year: ", year, category);
    const data = await getTopSubCategoryByYears(year, category);
    console.log("get total amount by category in year success");
    res.send(200, data);
  } catch (err) {
    handleError(res, err);
  }
});

// 首先查询最早的年份和最晚的年份，然后获取这两个年份之间的所有年份，查询每一年总共记录多少条，时间最早的一条记录、时间最晚的一条记录、最大金额的记录以及该年的总金额，最后以年份为单位的数组返回
app.get("/records/analysis/years", async (req, res) => {
  try {
    console.log("get analysis years");
    const data = await getTimeLineByYears();
    console.log("get analysis years success");
    res.send(data);
  } catch (err) {
    handleError(res, err);
  }
});

// 接收过来的category内容，将内容写入到custom-category.json文件中,如果没有该文件就创建一个
app.post("/records/custom/category", async (req, res) => {
  try {
    const { category } = req.body;
    console.log("create new category: ", category);
    await saveCustomCategory(category);
    console.log("create new category success");
    res.status(200).send("success");
  } catch (err) {
    handleError(res, err);
  }
});

// 读取custom-category.json文件，将其以json形式返回
app.get("/records/custom/category", async (req, res) => {
  try {
    console.log("get custom category");
    const data = await readCustomCategory();
    console.log("get custom category success");
    res.status(200).send(data);
  } catch (err) {
    handleError(res, err);
  }
});

// 按照时间逆序返回所有的数据
app.get("/records/export/all", async (req, res) => {
  try {
    console.log("get all records");
    const data = await selectAllRecordsOrderByTime();
    console.log("get all records success");
    res.send(data);
  } catch (err) {
    handleError(res, err);
  }
});

// 接收传来的一组records，将其写入到数据库中
app.post("/records/import", async (req, res) => {
  try {
    const records = req.body;
    console.log("import records: ", records);
    const data = await batchInsertRecords(records);
    console.log("import records success");
    res.send(200, data);
  } catch (err) {
    handleError(res, err);
  }
});

// 接收一组ID，删除这些ID对应的记录
app.post("/records/delete", async (req, res) => {
  try {
    const ids = req.body;
    console.log("delete records by ids: ", ids);
    const data = await batchDeleteRecords(ids);
    console.log("delete records success");
    res.send(200, data);
  } catch (err) {
    handleError(res, err);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}.`);
});
