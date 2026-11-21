<!-- 可以上下滚动无限选择月份的选择器 -->
<template>
  <div class="month-select">
    <div class="month-title">
      <span>{{ selectedYear }}</span>
    </div>
    <div class="month-title-divider"></div>
    <div v-if="isLoaded" class="month-list">
      <ul
        v-infinite-scroll="load"
        direction="top"
        class="infinite-list"
        style="overflow: auto"
        ref="scrollList">
        <li
          v-for="(month, index) in months"
          :key="month.display"
          ref="monthList"
          class="infinite-list-item"
          @click="onTapCell(index)">
          <div v-if="isLastMonthOfYear(month.date)" class="year-bar">
            {{ getYearFromMonth(month.date) }}
          </div>
          <div class="month-single" :class="{ 'is-selected': index === isSelected }">
            <div class="month-bar" v-if="index === isSelected"></div>
            <div class="month-wrapper">
              <div class="month-left">
                <div v-if="month.isCurrent" class="month-current">
                  <span>{{ L10n.current_month }}</span>
                </div>
                <div class="month-content">
                  <span>{{ month.content }}</span>
                  <span class="month-unit">{{ L10n.month_unit }}</span>
                </div>
              </div>
              <div class="month-right">
                <div class="month-income" :class="{ 'is-empty': month.totalIncome === 0 }">
                  <span>+{{ month.totalIncome.toFixed(2) }}</span>
                </div>
                <div class="month-expense" :class="{ 'is-empty': month.totalExpense === 0 }">
                  <span>-{{ month.totalExpense.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div v-else class="month-skeleton">
      <el-skeleton :rows="8" animated />
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  onMounted,
  ref,
  nextTick,
  defineEmits,
  onDeactivated,
  onUnmounted,
} from "vue";
import { Record } from "@/models/Record";
import { Month } from "@/models/Month";
import {
  generateMonths,
  generateMonthsForYears,
  fetchTotalAmountByMonth,
} from "./managers/MonthManager";
import L10n from "@/configs/L10n.json";
import { notifyCenter, NotifyType } from "@/utils/NotifyCenter";
import { ElMessage } from "element-plus";
//  获取今年、明年、去年的月份数据
const months = ref<Month[]>([]);
const currentMonth = ref<string>("");
const monthList = ref<HTMLElement[]>([]);
const scrollList = ref<HTMLElement | null>(null);
const isSelected = ref<number>(0);
const selectedYear = ref<string>(new Date().getFullYear().toString());

const isLoaded = ref(false);

onMounted(async () => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    currentMonth.value = `${year}-${month}`;
    const currentMonths = await generateMonths();
    months.value = currentMonths.reverse();
    isLoaded.value = true;
    await nextTick();
    scrollTo();
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
  }
  registerNotify();
});
const load = async () => {
  const currentYear = months.value[months.value.length - 1].date.getFullYear();
  // 加载前两年的数据
  try {
    const lastYearMonths = await generateMonthsForYears(currentYear - 1);
    const beforeLastYearMonths = await generateMonthsForYears(currentYear - 2);
    const previousYearsMonths = [
      ...lastYearMonths.reverse(),
      ...beforeLastYearMonths.reverse(),
    ];
    // 将新加载的数据添加到现有数据的前面
    months.value = [...months.value, ...previousYearsMonths];
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
  }
};

function scrollTo() {
  if (!monthList.value.length) {
    return;
  }
  const monthIndex = months.value.findIndex((item) => item.isCurrent);
  const monthItem = monthList.value[monthIndex];
  if (monthItem && scrollList.value) {
    scrollList.value.scrollTop =
      monthItem.offsetTop - scrollList.value.offsetTop;
    isSelected.value = monthIndex;
  }
}

const emit = defineEmits(["monthChanged"]);

function onTapCell(index: number) {
  isSelected.value = index;
  const selectedItem = months.value[index];
  selectedYear.value = selectedItem.date.getFullYear().toString();
  emit("monthChanged", selectedItem);
}

function isLastMonthOfYear(date: Date) {
  const month = new Date(date).getMonth() + 1;
  return month === 12;
}

function getYearFromMonth(date: Date) {
  return new Date(date).getFullYear();
}

async function onRecordChanged(record: Record) {
  const changedDate = new Date(record.date);
  const monthIndex = months.value.findIndex(
    (item) =>
      item.date.getFullYear() === changedDate.getFullYear() &&
      item.date.getMonth() + 1 === changedDate.getMonth() + 1
  );
  const monthItem = months.value[monthIndex];
  if (monthItem) {
    try {
      const res = await fetchTotalAmountByMonth(monthItem.date);
      monthItem.totalIncome = res.income;
      monthItem.totalExpense = res.outcome;
    } catch (error) {
      monthItem.totalIncome = 0;
      monthItem.totalExpense = 0;
      if (error instanceof Error) {
        ElMessage.error(error.message);
      } else {
        ElMessage.error(L10n.system_error);
      }
    }
  }
}

async function reloadMonthsTotalAmount() {
  months.value.forEach(async (month) => {
    try {
      const data = await fetchTotalAmountByMonth(month.date);
      month.totalIncome = data.income;
      month.totalExpense = data.outcome;
    } catch (error) {
      if (error instanceof Error) {
        ElMessage.error(error.message);
      } else {
        ElMessage.error(L10n.system_error);
      }
      month.totalIncome = 0;
      month.totalExpense = 0;
    }
  });
}

function registerNotify() {
  notifyCenter.on(NotifyType.IMPORT_DATA_SUCCESS, reloadMonthsTotalAmount);

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
  notifyCenter.off(NotifyType.IMPORT_DATA_SUCCESS, reloadMonthsTotalAmount);
  notifyCenter.off(NotifyType.CREATE_RECORD_SUCCESS, onRecordChanged);
  notifyCenter.off(NotifyType.UPDATE_RECORD_SUCCESS, onRecordChanged);
  notifyCenter.off(NotifyType.DELETE_RECORD_SUCCESS, onRecordChanged);
}

onDeactivated(() => {
  disableNotify();
});

onUnmounted(() => {
  disableNotify();
});
</script>

<style scoped>
.month-select {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 320px;
  background-color: white;
  border: 1px solid #ebecf0;
  border-radius: 12px;
  overflow: hidden;
  user-select: none !important;
}

.month-list {
  flex: 1;
  min-height: 0;
}

.infinite-list {
  height: 100%;
  padding: 0;
  margin: 0;
  list-style: none;
  scrollbar-width: none;
}

.infinite-list::-webkit-scrollbar {
  display: none;
}

.infinite-list .infinite-list-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.infinite-list .infinite-list-item:not(:last-child) {
  border-bottom: 1px solid #f2f3f6;
}

.month-title {
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  color: #1b1f27;
  text-align: left;
}

.month-title-divider {
  height: 1px;
  background-color: #ebecf0;
}

.year-bar {
  width: 100%;
  padding: 4px 0;
  text-align: center;
  background-color: #f7f7fa;
  color: #5a6274;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.8px;
}

.month-single {
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 70px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.month-single:hover {
  background-color: #fafafc;
}

.month-single.is-selected {
  background-color: #f3f0fd;
}

.month-wrapper {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 14px;
}

.month-bar {
  flex: 0 0 3px;
  width: 3px;
  height: 100%;
  background-color: #6c5dd3;
  border-radius: 0 3px 3px 0;
}

.month-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.month-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  margin-left: auto;
}

.month-current {
  width: fit-content;
  padding: 0 6px;
  border-radius: 999px;
  background-color: #efecfb;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  color: #6c5dd3;
}

.month-content {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  color: #1b1f27;
  font-variant-numeric: tabular-nums;
}

.month-unit {
  margin-left: 2px;
  font-size: 11px;
  font-weight: 400;
  color: #7e8697;
}

.month-income,
.month-expense {
  width: auto;
  height: auto;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.month-income {
  color: #18a472;
}

.month-expense {
  color: #e2434f;
}

.month-income.is-empty,
.month-expense.is-empty {
  color: #b9bdc7;
}

.month-skeleton {
  flex: 1;
  padding: 12px;
  overflow: hidden;
}
</style>

