<template>
  <div class="filter-table-container">
    <el-row class="filter-table">
      <el-col :span="7" class="filter-list-left">
        <span class="filter-title">{{ L10n.bill_list }}</span>
        <span class="filter-title-time">{{ displayDate }}</span>
      </el-col>
      <el-col :span="5"></el-col>
      <el-col :span="11" class="filter-list-right">
        <span class="filter-item-title">{{ L10n.all_income }}</span>
        <span class="filter-item-income">{{ income }}</span>
        <span class="filter-item-reamin-units span-divider">|</span>
        <span class="filter-item-title">{{ L10n.all_expense }}</span>
        <span class="filter-item-expend">{{ expend }}</span>
        <span class="filter-item-reamin-units span-divider">|</span>
        <span class="filter-item-title">{{ L10n.remain }}</span>
        <span class="filter-item-remain">{{ remain }}</span>
        <span class="filter-item-reamin-units">{{ L10n.bill_unit }}</span>
      </el-col>
    </el-row>
    <el-row class="filter-table filter-items">
      <el-col :span="12">
        <div class="filter-button-list">
          <FilterButton
            button-type="all"
            @is-all="handleClickAll"></FilterButton>
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
      </el-col>
      <el-col :span="5"></el-col>
      <el-col :span="7">
        <div class="remark-filter">
          <FilterButton
            button-type="remark"
            ref="remarkFilter"
            @update:remark="handleRemarkUpdate"></FilterButton>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts" setup>
import FilterButton from "@/components/utils/FilterButton.vue";
import Color from "@/configs/Color.json";
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
import { fetchTotalAmountByDateRange } from "@/utils/DataCenter";
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
  emit("filterChanged", currentFilter.value);
}

function handleCategoryUpdate(category: string[]) {
  const filterCategory = category.map((item) => {
    return item[1];
  });
  currentFilter.value.categorys = filterCategory;
  emit("filterChanged", currentFilter.value);
}

function handleTypeUpdate(type: string[]) {
  currentFilter.value.types = type.map((item) => {
    return findTypeLabelByValue(item[0]);
  });
  emit("filterChanged", currentFilter.value);
}

function handleTimeUpdate(time: Date[]) {
  currentFilter.value.startTime = time[0];
  currentFilter.value.endTime = time[1];
  updateTime(time[0], time[1]);
  emit("filterChanged", currentFilter.value);
}

function handleRemarkUpdate(remark: string) {
  currentFilter.value.keyword = remark;
  emit("filterChanged", currentFilter.value);
}

async function updateDisplayValues(startDate: Date, endDate: Date) {
  try {
    const res = await fetchTotalAmountByDateRange(startDate, endDate);
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
  updateDisplayValues(startTime, endTime);
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
    updateDisplayValues(
      currentFilter.value.startTime,
      currentFilter.value.endTime
    );
  }
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
span {
  user-select: none;
}

.filter-table-container {
  margin: 5px 22px 12px 22px;
  background-color: white;
  border-radius: 10px;
  user-select: none !important;
}

.filter-table {
  margin-top: 20px;
  padding-top: 8px;
}

.filter-items {
  margin-left: 10px;
  padding-bottom: 12px;
}

.filter-title {
  font-size: 24px;
  color: v-bind("Color.text");
}

.filter-title-time {
  font-size: 14px;
  font-weight: bold;
  margin-left: 10px;
  color: v-bind("Color.text");
}

.filter-list-left {
  text-align: left;
  margin-left: 10px;
}

.filter-list-right {
  text-align: right;
  margin-right: 10px;
}

.filter-item-title {
  font-size: 14px;
  font-weight: bold;
  color: v-bind("Color.text");
}

.filter-item-income {
  font-size: 16px;
  font-weight: bold;
  margin-left: 10px;
  color: v-bind("Color.success");
}

.filter-item-expend {
  font-size: 16px;
  font-weight: bold;
  margin-left: 10px;
  color: v-bind("Color.delete");
}

.filter-item-remain {
  font-size: 16px;
  font-weight: bold;
  margin-left: 10px;
  color: v-bind("Color.info");
}

.filter-item-reamin-units {
  font-size: 14px;
  font-weight: bold;
  margin-left: 10px;
  color: v-bind("Color.info");
}

.span-divider {
  margin-left: 10px;
  margin-right: 10px;
}

.remark-filter {
  display: flex;
  justify-content: flex-end;
  margin-right: 36px;
}

.filter-button-list {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
}

.filter-button-list > * {
  margin-right: 24px;
}
</style>
