<template>
  <div class="records-container">
    <!-- 遍历每一天的记录组 -->
    <div class="record-title">
      <el-row>
        <el-col :span="2"></el-col>
        <el-col :span="3" class="record-title-item align-left">{{ L10n.category }}</el-col>
        <el-col :span="2"></el-col>
        <el-col :span="3" class="record-title-item align-left">{{ L10n.type }}</el-col>
        <el-col :span="2"></el-col>
        <el-col :span="3" class="record-title-item align-right">{{ L10n.amount }}</el-col>
        <el-col :span="2"></el-col>
        <el-col :span="7" class="record-title-item align-left">{{ L10n.remark }}</el-col>
      </el-row>
    </div>

    <div v-if="isLoaded">
      <div v-if="records.length === 0" class="empty-container">
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
              <span class="right-daliy-income" :class="{ 'is-empty': dailyRecords.income === 0 }">
                +{{ dailyRecords.income.toFixed(2) }}
              </span>
              <span class="right-daliy-income-title">{{ L10n.expense }}</span>
              <span class="right-daliy-expense" :class="{ 'is-empty': dailyRecords.expense === 0 }">
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
                  <el-col :span="3" class="record-item align-left">
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
                  <el-col :span="3" class="record-item align-left">
                    <HightlightSpan
                      :content="record.type"
                      :keyword="currentFilter.keyword"></HightlightSpan>
                  </el-col>
                  <el-col :span="2" class="record-item"></el-col>
                  <el-col :span="3" class="record-item align-right">
                    <HightlightSpan
                      :content="String(record.amount.toFixed(2))"
                      :keyword="currentFilter.keyword"></HightlightSpan>
                  </el-col>
                  <el-col :span="2" class="record-item"></el-col>
                  <el-col :span="7" class="record-item align-left">
                    <HightlightSpan
                      :content="record.remark"
                      :keyword="currentFilter.keyword"></HightlightSpan>
                  </el-col>
                </el-row>
                <div
                  v-if="record.id === selectedRecord?.id"
                  class="select-record-container">
                  <div class="select-record-form">
                    <div class="edit-row">
                      <CreateButton
                        :ref="(el: CreateButtonType) => { if (el) categoryRefs = { button: el, recordId: record.id }; }"
                        button-type="category"
                        custom-width="auto"
                        size="small"
                        :content="selectedRecord.subCategory"></CreateButton>
                      <CreateButton
                        :ref="(el: CreateButtonType) => { if (el) typeRefs = { button: el, recordId: record.id }; }"
                        button-type="type"
                        custom-width="auto"
                        size="small"
                        :content="selectedRecord.type"></CreateButton>
                      <CreateButton
                        button-type="amount"
                        :ref="(el: CreateButtonType) => { if (el) amountRefs = { button: el, recordId: record.id }; }"
                        size="small"
                        custom-width="auto"
                        :content="selectedRecord.amount.toString()"></CreateButton>
                    </div>
                    <div class="edit-row">
                      <CreateButton
                        button-type="time"
                        custom-width="auto"
                        :ref="(el: CreateButtonType) => { if (el) timeRefs = { button: el, recordId: record.id }; }"
                        size="small"
                        :content="new Date(selectedRecord.date).toISOString()"></CreateButton>
                      <CreateButton
                        class="remark-field"
                        button-type="remark"
                        custom-width="auto"
                        :ref="(el: CreateButtonType) => { if (el) remarkRefs = { button: el, recordId: record.id }; }"
                        size="small"
                        :content="selectedRecord.remark"></CreateButton>
                    </div>
                    <div class="budget-switch">
                      <el-switch v-model="countInBudget" size="small" />
                      <el-tooltip :content="L10n.count_in_budget_tip" placement="top">
                        <span class="budget-switch-label">{{ L10n.count_in_budget }}</span>
                      </el-tooltip>
                    </div>
                  </div>
                  <div class="select-record-action">
                    <div class="delete-action">
                      <AccountButton
                        button-type="delete"
                        :button-text="L10n.delete"
                        button-height="30px"
                        :click-handler="deleteConfirm"
                        button-width="100%"></AccountButton>
                    </div>
                    <AccountButton
                      button-type="success"
                      :button-text="L10n.save"
                      button-height="30px"
                      :click-handler="updateRecord"
                      button-width="100%"></AccountButton>
                  </div>
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
      :title="L10n.delete"
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
import L10n from "@/configs/L10n.json";
import AccountButton from "@/components/utils/AccountButton.vue";
import CreateButton from "@/components/utils/CreateButton.vue";
import HightlightSpan from "@/components/utils/HightlightSpan.vue";
import { ElMessage } from "element-plus";
import { notifySuccess } from "@/utils/GlobalErrorHandler";
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
const countInBudget = ref<boolean>(true);

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
    countInBudget.value = Number(record.countInBudget ?? 1) !== 0;
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
    notifySuccess(L10n.delete_success);
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
    syncId: 0,
    countInBudget: countInBudget.value ? 1 : 0,
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
    notifySuccess(L10n.update_success);
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
  // 刷新时保留现有列表，避免骨架屏一闪而过；只有首次加载才展示骨架
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

onMounted(async () => {
  refreshData(currentFilter.value);
  // 初始化折叠状态
  collapsedIds.value = Array(records.value.length).fill(false);
  registerNotify();
});

onUnmounted(() => {
  disableNotify();
});
</script>

<style scoped>
.records-container {
  height: 100%;
  /* overlay 滚动条不占布局宽度，列表卡片右边缘与上方卡片保持对齐 */
  overflow-y: overlay;
  user-select: none !important;
}

.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100% - 44px);
  min-height: 260px;
}

.empty-page {
  max-width: 300px;
  max-height: 220px;
  opacity: 0.9;
}

ul {
  list-style-type: none;
  margin: 0;
  padding: 0;
}

/* 定义折叠动画 */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.25s ease;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

.is-selected {
  background-color: #f5f2fe;
}

.record-group {
  background-color: white;
  border: 1px solid #ebecf0;
  border-radius: 12px;
  margin-bottom: 8px;
  overflow: hidden;
}

.daliy-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  padding: 0 16px 0 8px;
  background-color: #fafafc;
  border-bottom: 1px solid #f2f3f6;
  font-size: 13px;
  cursor: pointer;
  user-select: none !important;
}

.left-daliy {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #5a6274;
  font-weight: 600;
}

.left-daliy-icon {
  width: 24px;
  height: 16px;
}

.right-daliy {
  display: flex;
  align-items: baseline;
  font-size: 12px;
  color: #5a6274;
}

.right-daliy-income-title {
  margin-left: 12px;
}

.right-daliy-income {
  margin-left: 6px;
  font-weight: 600;
  color: #18a472;
  font-variant-numeric: tabular-nums;
}

.right-daliy-expense {
  margin-left: 6px;
  font-weight: 600;
  color: #e2434f;
  font-variant-numeric: tabular-nums;
}

.right-daliy-income.is-empty,
.right-daliy-expense.is-empty {
  color: #b9bdc7;
}

.record-cell {
  display: flex;
  align-items: center;
  height: 40px;
  font-size: 13px;
  font-weight: 500;
  color: #1b1f27;
  border-top: 1px solid #f2f3f6;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.record-cell:hover {
  background-color: #fafafc;
}

.record-item {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 12px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.record-item.align-right {
  font-weight: 600;
}

.record-item > div {
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.align-left {
  justify-content: flex-start;
  text-align: left;
}

.align-center {
  justify-content: center;
  text-align: center;
}

.align-right {
  justify-content: flex-end;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.select-record-container {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 148px;
  gap: 16px;
  padding: 10px 16px 12px;
  background-color: #fafafb;
  border-top: 1px solid #f2f3f6;
}

.select-record-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.edit-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  min-width: 0;
}

.edit-row .remark-field {
  grid-column: span 2;
}

.budget-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 2px;
}

.budget-switch-label {
  font-size: 12px;
  color: #5a6274;
  cursor: default;
}

.select-record-action {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding-left: 16px;
  border-left: 1px solid #eef0f4;
}

.select-record-action :deep(.button) {
  width: 100%;
}

.delete-action :deep(.button) {
  background-color: white;
  color: #e2434f;
  border: 1px solid #f0c9ce;
  box-shadow: none;
}

.delete-action :deep(.button:hover:not(:disabled)) {
  background-color: #fff5f6;
  filter: none;
}

.record-title {
  position: sticky;
  top: 0;
  z-index: 2;
  margin-bottom: 8px;
  background-color: white;
  border: 1px solid #ebecf0;
  border-radius: 8px;
  font-size: 12px;
  color: #6e7686;
}

.record-title-item {
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 12px;
  font-weight: 500;
}

.record-category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.record-category-item img {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
}

.record-category-item > div {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

</style>
