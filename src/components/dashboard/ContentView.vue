<template>
  <div class="records-container">
    <!-- 遍历每一天的记录组 -->
    <div class="record-title">
      <el-row>
        <el-col :span="2"></el-col>
        <el-col :span="3" class="record-title-item">{{ L10n.category }}</el-col>
        <el-col :span="2" class="record-title-item"></el-col>
        <el-col :span="3" class="record-title-item">{{ L10n.type }}</el-col>
        <el-col :span="2" class="record-title-item"></el-col>
        <el-col :span="3" class="record-title-item">{{ L10n.amount }}</el-col>
        <el-col :span="2" class="record-title-item"></el-col>
        <el-col :span="7" class="record-title-item">{{ L10n.remark }}</el-col>
      </el-row>
    </div>

    <div v-if="isLoaded">
      <div v-if="records.length === 0">
        <img class="empty-page" src="@/assets/empty_page.svg" />
      </div>
      <div v-else>
        <div
          v-for="(dailyRecords, index) in records"
          :key="dailyRecords.id.toString()"
          class="record-group">
          <!-- 展示该组的日期，假设Record对象有一个date属性 -->
          <div @click="toggleCollapse(index)" class="daliy-container">
            <div class="left-daliy">
              <img
                class="left-daliy-icon"
                :src="
                  require(`@/assets/${
                    collapsedIds[index] ? 'day_right.svg' : 'day_down.svg'
                  }`)
                " />
              <span>{{ formatDateBySlash(dailyRecords.records[0].date) }}</span>
            </div>

            <div class="right-daliy">
              <span>{{ L10n.income }}</span>
              <span class="right-daliy-income">
                +{{ dailyRecords.income.toFixed(2) }}
              </span>
              <span class="right-daliy-income-title">{{ L10n.expense }}</span>
              <span class="right-daliy-expense">
                -{{ dailyRecords.expense.toFixed(2) }}
              </span>
            </div>
          </div>
          <!-- 遍历该天的每条记录 -->
          <transition name="collapse">
            <ul v-show="!collapsedIds[index]">
              <li
                v-for="record in dailyRecords.records"
                :key="record.id.toString()">
                <!-- 展示每条记录的内容，这里假设有一个content属性 -->
                <el-row
                  class="record-cell"
                  :class="{ 'is-selected': selectedRecord?.id === record.id }"
                  @click="onTapCell(record)">
                  <el-col :span="2"></el-col>
                  <el-col :span="3" class="record-item">
                    <div class="record-category-item">
                      <img
                        :src="
                          require(`@/assets/category/${findCategoryIconByValue(
                            record.subCategory
                          )}`)
                        " />
                      <HightlightSpan
                        :content="record.subCategory"
                        :keyword="currentFilter.keyword"></HightlightSpan>
                    </div>
                  </el-col>
                  <el-col :span="2" class="record-item"></el-col>
                  <el-col :span="3" class="record-item">
                    <HightlightSpan
                      :content="record.type"
                      :keyword="currentFilter.keyword"></HightlightSpan>
                  </el-col>
                  <el-col :span="2" class="record-item"></el-col>
                  <el-col :span="3" class="record-item">
                    <HightlightSpan
                      :content="String(record.amount.toFixed(2))"
                      :keyword="currentFilter.keyword"></HightlightSpan>
                  </el-col>
                  <el-col :span="2" class="record-item"></el-col>
                  <el-col :span="7" class="record-item">
                    <HightlightSpan
                      :content="record.remark"
                      :keyword="currentFilter.keyword"></HightlightSpan>
                  </el-col>
                </el-row>
                <div
                  v-if="record.id === selectedRecord?.id"
                  class="select-record-container">
                  <el-row class="select-record-cell">
                    <!-- <el-col :span="2" class="select-record-item"></el-col> -->
                    <el-col :span="16" ref="editContainer">
                      <div class="top-input-elements">
                        <CreateButton
                          :ref="(el: CreateButtonType) => { if (el) categoryRefs = { button: el, recordId: record.id }; }"
                          button-type="category"
                          :custom-width="normalInputWidth"
                          size="small"
                          :content="selectedRecord.subCategory"></CreateButton>
                        <CreateButton
                          class="first-button"
                          :ref="(el: CreateButtonType) => { if (el) typeRefs = { button: el, recordId: record.id }; }"
                          button-type="type"
                          :custom-width="normalInputWidth"
                          size="small"
                          :content="selectedRecord.type"></CreateButton>
                        <CreateButton
                          button-type="amount"
                          :ref="(el: CreateButtonType) => { if (el) amountRefs = { button: el, recordId: record.id }; }"
                          size="small"
                          :custom-width="normalInputWidth"
                          :content="
                            selectedRecord.amount.toString()
                          "></CreateButton>
                      </div>
                    </el-col>
                    <el-col :span="1" class="select-record-item"></el-col>
                    <el-col :span="7" class="select-record-action">
                      <AccountButton
                        button-type="delete"
                        :button-text="L10n.delete"
                        button-height="30px"
                        :click-handler="deleteConfirm"
                        button-width="120px"></AccountButton>
                    </el-col>
                  </el-row>
                  <el-row class="select-record-cell">
                    <!-- <el-col :span="2" class="select-record-item"></el-col> -->
                    <el-col :span="16">
                      <div class="top-input-elements">
                        <CreateButton
                          button-type="time"
                          :custom-width="normalInputWidth"
                          :ref="(el: CreateButtonType) => { if (el) timeRefs = { button: el, recordId: record.id }; }"
                          size="small"
                          :content="
                            new Date(selectedRecord.date).toISOString()
                          "></CreateButton>
                        <CreateButton
                          button-type="remark"
                          :custom-width="remarkInputWidth"
                          :ref="(el: CreateButtonType) => { if (el) remarkRefs = { button: el, recordId: record.id }; }"
                          size="small"
                          :content="selectedRecord.remark"></CreateButton>
                      </div>
                    </el-col>
                    <el-col :span="1" class="select-record-item"></el-col>
                    <el-col :span="7" class="select-record-action">
                      <AccountButton
                        button-type="success"
                        :button-text="L10n.save"
                        button-height="30px"
                        :click-handler="updateRecord"
                        button-width="120px"></AccountButton>
                    </el-col>
                  </el-row>
                </div>
              </li>
            </ul>
          </transition>
        </div>
      </div>
    </div>
    <div v-else>
      <el-skeleton :rows="8" animated />
    </div>

    <el-dialog
      v-model="deleteConfirmVisible"
      title="Warning"
      width="500"
      align-center>
      <span>{{ L10n.confirm_delete_tip }}</span>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="deleteConfirmVisible = false">
            {{ L10n.cancel }}
          </el-button>
          <el-button type="primary" @click="deleteRecord">
            {{ L10n.confirm }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import {
  onMounted,
  ref,
  defineExpose,
  ComponentPublicInstance,
  onDeactivated,
  onUnmounted,
} from "vue";
import Color from "@/configs/Color.json";
import L10n from "@/configs/L10n.json";
import AccountButton from "@/components/utils/AccountButton.vue";
import CreateButton from "@/components/utils/CreateButton.vue";
import HightlightSpan from "@/components/utils/HightlightSpan.vue";
import { ElMessage } from "element-plus";
import { Filter } from "@/models/Filter";
import { getFirstAndLastDate } from "./managers/MonthManager";
import { Record, DailyRecords } from "@/models/Record";
import { fetchRecordsAndGroupByDate } from "./managers/RecordManager";
import {
  asyncUpdateRecord,
  asyncDeleteRecord,
  logInfo,
} from "@/utils/DataCenter";
import { findCategoryIconByValue } from "@/configs/CategoryParser";
import { formatDateBySlash } from "@/utils/DateUtils";
import {
  notifyCenter,
  NotifyType,
  sendRecordChangeNotify,
} from "@/utils/NotifyCenter";

type CreateButtonType = ComponentPublicInstance<typeof CreateButton>;

interface CreateButtonItem {
  button: CreateButtonType;
  recordId: Number;
}

const records = ref<DailyRecords[]>([]);
const collapsedIds = ref<boolean[]>([]);
const selectedRecord = ref<Record | null>(null);

const categoryRefs = ref<CreateButtonItem | null>(null);

const typeRefs = ref<CreateButtonItem | null>(null);

const amountRefs = ref<CreateButtonItem | null>(null);

const timeRefs = ref<CreateButtonItem | null>(null);

const remarkRefs = ref<CreateButtonItem | null>(null);

const deleteConfirmVisible = ref<boolean>(false);

const currentFilter = ref<Filter>({
  categorys: [],
  types: [],
  startTime: getFirstAndLastDate(new Date())[0],
  endTime: getFirstAndLastDate(new Date())[1],
  keyword: "",
  isAll: false,
});

const isLoaded = ref<boolean>(false);

// 切换日期的折叠状态
function toggleCollapse(id: number) {
  collapsedIds.value[id] = !collapsedIds.value[id];
}

function onTapCell(record: Record) {
  if (selectedRecord.value != null && selectedRecord.value.id === record.id) {
    selectedRecord.value = null;
  } else {
    selectedRecord.value = record;
  }
}

function deleteConfirm() {
  deleteConfirmVisible.value = true;
}

async function deleteRecord() {
  if (!selectedRecord.value) {
    return;
  }

  try {
    await asyncDeleteRecord(selectedRecord.value);
    if (selectedRecord.value) {
      sendRecordChangeNotify(
        NotifyType.DELETE_RECORD_SUCCESS,
        selectedRecord.value
      );
    }
    selectedRecord.value = null;
    ElMessage.success(L10n.delete_success);
    deleteConfirmVisible.value = false;
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.delete_failed);
    }
    deleteConfirmVisible.value = false;
  }
}

async function updateRecord() {
  const selectedId: Number = selectedRecord?.value?.id ?? 0;

  const category: string =
    categoryRefs?.value?.button.getCurrentValue()[0] ??
    selectedRecord.value?.category;
  const subCategory: string =
    categoryRefs?.value?.button.getCurrentValue()[1] ??
    selectedRecord.value?.subCategory;
  const type: string =
    typeRefs.value?.button.getCurrentValue() ?? selectedRecord.value?.type;
  const amount: number =
    amountRefs.value?.button.getCurrentValue() ?? selectedRecord.value?.amount;
  const date: Date =
    timeRefs.value?.button.getCurrentValue() ?? selectedRecord.value?.date;
  const remark: string =
    remarkRefs.value?.button.getCurrentValue() ?? selectedRecord.value?.remark;

  const newRecord: Record = {
    id: selectedId,
    category: category,
    subCategory: subCategory,
    type: type,
    amount: amount,
    date: date,
    remark: remark,
    isDeleted: false,
  };

  try {
    await asyncUpdateRecord(newRecord);
    if (selectedRecord.value) {
      sendRecordChangeNotify(
        NotifyType.DELETE_RECORD_SUCCESS,
        selectedRecord.value
      );
    }
    selectedRecord.value = null;
    ElMessage.success(L10n.update_success);
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.update_failed);
    }
  }
}

// 对外提供一个刷新数据的方法
async function refreshData(filter: Filter) {
  isLoaded.value = false;
  try {
    const data = await fetchRecordsAndGroupByDate(filter);
    records.value = data;
    isLoaded.value = true;
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
  }
}

function onFilterChanged(filter: Filter) {
  currentFilter.value = filter;
  refreshData(filter);
}

function reloadData() {
  refreshData(currentFilter.value);
}

defineExpose({
  reloadData,
  onFilterChanged,
});

function registerNotify() {
  notifyCenter.on(NotifyType.IMPORT_DATA_SUCCESS, reloadData);
  notifyCenter.on(NotifyType.CREATE_RECORD_SUCCESS, (record: Record) => {
    onRecordChanged(record);
  });
  notifyCenter.on(NotifyType.UPDATE_RECORD_SUCCESS, (record: Record) => {
    onRecordChanged(record);
  });
  notifyCenter.on(NotifyType.DELETE_RECORD_SUCCESS, (record: Record) => {
    onRecordChanged(record);
  });
}

function disableNotify() {
  notifyCenter.off(NotifyType.IMPORT_DATA_SUCCESS, reloadData);
  notifyCenter.off(NotifyType.CREATE_RECORD_SUCCESS, onRecordChanged);
  notifyCenter.off(NotifyType.UPDATE_RECORD_SUCCESS, onRecordChanged);
  notifyCenter.off(NotifyType.DELETE_RECORD_SUCCESS, onRecordChanged);
}

onDeactivated(() => {
  disableNotify();
});

async function onRecordChanged(record: Record) {
  try {
    logInfo("onRecordChanged" + record);
    const newRecords = await fetchRecordsAndGroupByDate(currentFilter.value);
    records.value = newRecords;
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
  }
}

const normalInputWidth = ref("125px");
const remarkInputWidth = ref("250px");
const normalInputLeftMargin = ref("12px");
const editContainer = ref<HTMLElement>();

function handleContainerWidth() {
  const totalWidth =
    editContainer.value?.offsetWidth ?? window.innerWidth * 0.5 - 48;
  normalInputWidth.value = Math.min(260, (totalWidth - 2 * 24) / 3) + "";
  if (normalInputWidth.value === "260") {
    normalInputLeftMargin.value =
      (totalWidth - Number(normalInputWidth.value) * 3) / 4 + "px";
  } else {
    normalInputLeftMargin.value = "12px";
  }
  remarkInputWidth.value =
    parseInt(normalInputWidth.value) * 2 +
    parseInt(normalInputLeftMargin.value) +
    "";
}

onMounted(async () => {
  refreshData(currentFilter.value);
  // 初始化折叠状态
  collapsedIds.value = Array(records.value.length).fill(false);
  window.addEventListener("resize", handleContainerWidth);
  handleContainerWidth();
  registerNotify();
});

onUnmounted(() => {
  window.removeEventListener("resize", handleContainerWidth);
  disableNotify();
});
</script>

<style scoped>
.records-container {
  max-height: 620px;
  overflow-y: auto;
  user-select: none !important;
}

.empty-page {
  max-height: 620px;
}

ul {
  list-style-type: none; /* 移除列表项前的点 */
}

/* 定义折叠动画 */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.is-selected {
  background-color: rgba(0, 0, 0, 0.05); /* 半透明的灰色遮罩 */
}

.daliy-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 44px;
  font-size: 18px;
  user-select: none !important;
}

.record-group {
  background-color: white;
  border-radius: 10px;
  margin: 12px 22px 12px 12px;
}

.left-daliy-icon {
  width: 38px;
  height: 24px;
}

.left-daliy {
  display: flex;
  color: v-bind("Color.text");
  align-items: center;
}

.right-daliy {
  color: v-bind("Color.text");
  font-size: 15px;
}

.right-daliy-expense {
  color: v-bind("Color.delete");
  margin-left: 10px;
  padding-right: 36px;
}

.right-daliy-income-title {
  margin-left: 10px;
}

.right-daliy-income {
  color: v-bind("Color.success");
  margin-left: 10px;
}

.record-cell {
  font-size: 16px;
  color: v-bind("Color.text");
  height: 44px;
  display: flex;
  align-items: center;
  border-top: 1px solid v-bind("Color.border");
  user-select: none;
}

.record-item {
  height: 44px;
  border-left: 1px solid v-bind("Color.border");
  padding-top: 10px;
  overflow: hidden; /* 确保内容超出容器时被隐藏 */
  white-space: nowrap; /* 保持内容在一行显示 */
  text-overflow: ellipsis; /* 超出部分显示为省略号 */
}

.select-record-container {
  border-top: 1px solid v-bind("Color.border");
}

.select-record-cell {
  height: 60px;
  display: flex;
  align-items: center;
}

.select-record-action {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  border-left: 1px solid v-bind("Color.border");
}

.select-type-amount {
  width: 100%;
  display: flex;
  align-items: center;
}

.select-record-item {
  height: 60px;
}

.select-type-amount .first-button {
  margin-right: 24px;
}

.record-title {
  font-size: 15px;
  color: v-bind("Color.info");
  background-color: white;
  margin: 0px 22px 12px 12px;
  border-radius: 10px;
  position: sticky;
  top: 0; /* 从顶部0px的位置开始固定 */
  z-index: 1000;
}

.record-title-item {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 1px solid v-bind("Color.border");
}

.record-category-item {
  display: flex;
  align-items: center;
  justify-content: center;
}

.record-category-item img {
  width: 22px;
  height: 22px;
  margin-right: 12px;
}

ul {
  margin: 0;
  padding: 0;
}

.top-input-elements {
  display: flex;
  flex-direction: row;
}

.top-input-elements > * {
  margin-left: v-bind("normalInputLeftMargin");
}
</style>
