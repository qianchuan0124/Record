<!-- 可以上下滚动无限选择月份的选择器 -->
<template>
  <div class="month-select">
    <div class="month-select__mask"></div>
    <div class="month-title">
      <span>{{ selectedYear }}</span>
    </div>
    <div class="month-title-divider"></div>
    <div v-if="isLoaded">
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
          <div class="month-single">
            <div class="month-bar" v-if="index === isSelected"></div>
            <div class="month-bar-non" v-else></div>
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
                <div class="month-income">
                  <span>+{{ month.totalIncome.toFixed(2) }}</span>
                </div>
                <div class="month-expense">
                  <span>-{{ month.totalExpense.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <div v-else>
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
import Color from "@/configs/Color.json";
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
  margin-left: 23px;
  border-radius: 10px;
  background-color: white;
  width: 200px;
  user-select: none !important;
}

.infinite-list {
  max-height: 620px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.infinite-list .infinite-list-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.infinite-list .infinite-list-item:not(:last-child) {
  border-bottom: 1px solid v-bind("Color.border"); /* 灰色分割线 */
}

.month-title {
  font-size: 18px;
  color: v-bind("Color.text");
  width: 164px;
  padding: 8px 0px 8px 24px;
  text-align: left;
  user-select: none !important;
}

.month-title-divider {
  height: 10px;
  background-color: v-bind("Color.border");
}

.year-bar {
  width: 100%;
  text-align: center;
  background-color: v-bind("Color.border");
  color: v-bind("Color.text");
  font-size: 18px;
  padding: 3px 0;
  margin-bottom: 5px;
}

.month-single {
  width: 200px;
  height: 100px;
  display: flex;
  align-items: center;
}

.month-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: calc(100%); /* 减去.month-bar的宽度 */
  height: 100%; /* 使内容容器高度与.month-single一致 */
}

.month-bar {
  width: 5px; /* 横条宽度 */
  background-color: #6c5dd3;
  height: 100%;
}

.month-bar-non {
  width: 5px; /* 横条宽度 */
  background-color: rgba(255, 255, 255, 0); /* 完全透明 */
  height: 100%;
}

.month-left,
.month-right {
  flex: 1; /* 让两个元素平分可用空间 */
}

.month-current {
  font-size: 12px;
  color: v-bind("Color.info");
  margin-left: 8px;
}

.month-content {
  font-size: 27px;
  font-weight: bold;
  color: v-bind("Color.text");
}

.month-unit {
  font-size: 15px;
  color: v-bind("Color.text");
}

.month-income {
  font-size: 12px;
  color: v-bind("Color.success");
  height: 34px;
  width: 70px;
  display: flex;
  align-items: center; /* 使文本垂直居中 */
  justify-content: flex-end; /* 使文本水平靠右对齐 */
  text-align: right;
}

.month-expense {
  font-size: 12px;
  color: v-bind("Color.delete");
  height: 34px;
  width: 70px;
  display: flex;
  align-items: center; /* 使文本垂直居中 */
  justify-content: flex-end; /* 使文本水平靠右对齐 */
  text-align: right;
}

::-webkit-scrollbar {
  display: none; /* 针对Webkit浏览器 */
}

/* 对于Firefox */
* {
  scrollbar-width: none; /* 隐藏滚动条 */
}

/* 对于IE和Edge */
* {
  -ms-overflow-style: none; /* 隐藏滚动条 */
}
</style>
./managers/MonthManager @/configs/L10n.json@/configs/Color.json
