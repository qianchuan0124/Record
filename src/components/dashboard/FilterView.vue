<template>
  <div class="filter-table-container">
    <div class="filter-header">
      <div class="filter-header-left">
        <span class="filter-title">{{ L10n.bill_list }}</span>
        <span class="filter-title-time">{{ displayDate }}</span>
      </div>
      <div class="filter-summary">
        <div class="summary-item">
          <span class="summary-label">{{ L10n.all_income }}</span>
          <span class="summary-value summary-income">{{ income }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ L10n.all_expense }}</span>
          <span class="summary-value summary-expend">{{ expend }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ L10n.remain }}</span>
          <span class="summary-value">{{ remain }}</span>
        </div>
        <span class="summary-unit">{{ L10n.bill_unit }}</span>
      </div>
    </div>
    <div class="filter-toolbar">
      <div class="filter-button-list">
        <FilterButton button-type="all" @is-all="handleClickAll"></FilterButton>
        <FilterButton
          button-type="category"
          ref="categoryFilter"
          @update:category="handleCategoryUpdate"></FilterButton>
        <FilterButton
          button-type="type"
          ref="typeFilter"
          @update:type="handleTypeUpdate"></FilterButton>
        <FilterButton
          button-type="time"
          ref="timeFilter"
          @update:time="handleTimeUpdate"></FilterButton>
      </div>
      <div class="remark-filter">
        <FilterButton
          button-type="remark"
          ref="remarkFilter"
          @update:remark="handleRemarkUpdate"></FilterButton>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import FilterButton from "@/components/utils/FilterButton.vue";
import L10n from "@/configs/L10n.json";
import {
  ref,
  onMounted,
  onDeactivated,
  defineExpose,
  ComponentPublicInstance,
  defineEmits,
  onUnmounted,
} from "vue";
import { Record } from "@/models/Record";
import { Month } from "@/models/Month";
import { getFirstAndLastDate } from "./managers/MonthManager";
import { fetchTotalAmountByFilter } from "@/utils/DataCenter";
import { Filter } from "@/models/Filter";
import { findTypeLabelByValue } from "@/configs/CategoryParser";
import { notifyCenter, NotifyType } from "@/utils/NotifyCenter";
import { isBetweenDates, formatDateByDot } from "@/utils/DateUtils";
import { ElMessage } from "element-plus";

type FilterButtonType = ComponentPublicInstance<typeof FilterButton>;

const timeFilter = ref<FilterButtonType | null>(null);
const categoryFilter = ref<FilterButtonType | null>(null);
const typeFilter = ref<FilterButtonType | null>(null);
const remarkFilter = ref<FilterButtonType | null>(null);

const income = ref<string>();
const expend = ref<string>();
const remain = ref<string>();

const currentDate = ref<Date>(new Date());

const displayDate = ref<string>("");

const currentFilter = ref<Filter>({
  types: [],
  categorys: [],
  keyword: "",
  startTime: new Date(),
  endTime: new Date(),
  isAll: true,
});

const emit = defineEmits(["filterChanged"]);

function buildFilterSnapshot(): string {
  return JSON.stringify({
    types: currentFilter.value.types,
    categorys: currentFilter.value.categorys,
    keyword: currentFilter.value.keyword,
    start: currentFilter.value.startTime.getTime(),
    end: currentFilter.value.endTime.getTime(),
  });
}

let lastFilterSnapshot = "";

// 筛选条件没变化时不重复通知列表刷新，避免点开/关闭筛选框时内容闪一下
function emitFilterChanged() {
  const snapshot = buildFilterSnapshot();
  if (snapshot === lastFilterSnapshot) {
    return;
  }
  lastFilterSnapshot = snapshot;
  emit("filterChanged", currentFilter.value);
}

function handleClickAll() {
  currentFilter.value.isAll = true;
  currentFilter.value.categorys = [];
  currentFilter.value.types = [];
  currentFilter.value.keyword = "";
  currentDate.value = new Date();
  const [startTime, endTime] = getFirstAndLastDate(currentDate.value);
  updateTime(startTime, endTime);
  categoryFilter.value?.cleanValues();
  typeFilter.value?.cleanValues();
  remarkFilter.value?.cleanValues();
  emitFilterChanged();
}

function handleCategoryUpdate(category: string[]) {
  const filterCategory = category.map((item) => {
    return item[1];
  });
  currentFilter.value.categorys = filterCategory;
  refreshInfos()
  emitFilterChanged();
}

function handleTypeUpdate(type: string[]) {
  currentFilter.value.types = type.map((item) => {
    return findTypeLabelByValue(item[0]);
  });
  emitFilterChanged();
}

function handleTimeUpdate(time: Date[]) {
  currentFilter.value.startTime = time[0];
  currentFilter.value.endTime = time[1];
  updateTime(time[0], time[1]);
  emitFilterChanged();
}

function handleRemarkUpdate(remark: string) {
  currentFilter.value.keyword = remark;
  emitFilterChanged();
}

async function updateDisplayValues(filter: string) {
  try {
    const res = await fetchTotalAmountByFilter(filter);
    income.value = "+ " + res.income.toFixed(2);
    expend.value = "- " + res.outcome.toFixed(2);
    const remainValue = res.income - res.outcome;
    remain.value =
      remainValue > 0
        ? "+ " + remainValue.toFixed(2)
        : "- " + Math.abs(remainValue).toFixed(2);
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
    income.value = "+ 0.00";
    expend.value = "- 0.00";
  }
}

function onMonthChanged(changedMonth: Month) {
  currentDate.value = changedMonth.date;
  const [startTime, endTime] = getFirstAndLastDate(currentDate.value);
  updateTime(startTime, endTime);
  handleTimeUpdate([startTime, endTime]);
}

function updateTime(startTime: Date, endTime: Date) {
  displayDate.value =
    formatDateByDot(startTime) + " ~ " + formatDateByDot(endTime);
  const filter: Filter = {
    types: currentFilter.value.types,
    categorys: currentFilter.value.categorys,
    keyword: currentFilter.value.keyword,
    startTime: startTime,
    endTime: endTime,
    isAll: currentFilter.value.isAll,
  };
  updateDisplayValues(JSON.stringify(filter));
  timeFilter.value?.setupSelectedTime([startTime, endTime]);
  currentFilter.value.startTime = startTime;
  currentFilter.value.endTime = endTime;
}

function onRecordChanged(record: Record) {
  if (
    isBetweenDates(
      record.date,
      currentFilter.value.startTime,
      currentFilter.value.endTime
    )
  ) {
    refreshInfos()
  }
}

function refreshInfos() {
  const filter: Filter = {
      types: currentFilter.value.types,
      categorys: currentFilter.value.categorys,
      keyword: currentFilter.value.keyword,
      startTime: currentFilter.value.startTime,
      endTime: currentFilter.value.endTime,
      isAll: currentFilter.value.isAll,
    };
    updateDisplayValues(JSON.stringify(filter));
}

function registerNotify() {
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
  notifyCenter.off(NotifyType.CREATE_RECORD_SUCCESS, onRecordChanged);
  notifyCenter.off(NotifyType.UPDATE_RECORD_SUCCESS, onRecordChanged);
  notifyCenter.off(NotifyType.DELETE_RECORD_SUCCESS, onRecordChanged);
}

onDeactivated(() => {
  disableNotify();
});

defineExpose({
  onMonthChanged,
});

notifyCenter.on(NotifyType.IMPORT_DATA_SUCCESS, loadData);

function loadData() {
  currentDate.value = new Date();
  const [startTime, endTime] = getFirstAndLastDate(currentDate.value);
  updateTime(startTime, endTime);
  lastFilterSnapshot = buildFilterSnapshot();
}

onMounted(() => {
  loadData();
  registerNotify();
});

onUnmounted(() => {
  disableNotify();
});
</script>

<style scoped>
.filter-table-container {
  width: 100%;
  margin-bottom: 12px;
  padding: 16px 20px;
  background-color: white;
  border: 1px solid #ebecf0;
  border-radius: 12px;
  user-select: none !important;
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.filter-header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
}

.filter-title {
  font-size: 15px;
  font-weight: 600;
  color: #1b1f27;
  white-space: nowrap;
}

.filter-title-time {
  font-size: 12px;
  color: #5a6274;
  white-space: nowrap;
}

.filter-summary {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 4px 16px;
}

.summary-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  white-space: nowrap;
}

.summary-label {
  font-size: 12px;
  color: #5a6274;
}

.summary-value {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #1b1f27;
}

.summary-income {
  color: #18a472;
}

.summary-expend {
  color: #e2434f;
}

.summary-unit {
  font-size: 12px;
  color: #7e8697;
  white-space: nowrap;
}

.filter-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
}

.filter-button-list {
  display: flex;
  flex-direction: row;
  gap: 8px;
}

.remark-filter {
  display: flex;
  justify-content: flex-end;
}
</style>
