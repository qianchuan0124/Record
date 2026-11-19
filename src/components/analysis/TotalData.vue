<template>
  <div class="total-data">
    <div v-if="loaded && isEmpty" class="empty-wrapper">
      <img class="empty-page" src="@/assets/empty_page.svg" />
    </div>
    <div class="chart-wrap">
      <div ref="myEchart" class="chart"></div>
      <div class="overview-footer">
        <div v-if="totalOutcome > 0" class="overview-item">
          <span class="overview-label">{{ L10n.all_expense }}</span>
          <span class="overview-value expense">{{ formatAmount(totalOutcome) }}</span>
        </div>
        <div v-if="totalIncome > 0" class="overview-item">
          <span class="overview-label">{{ L10n.all_income }}</span>
          <span class="overview-value income">{{ formatAmount(totalIncome) }}</span>
        </div>
      </div>
    </div>
    <div
      class="detail-mask"
      :class="{ 'is-open': detailVisible }"
      @click="closeDetail"></div>
    <aside class="detail-drawer" :class="{ 'is-open': detailVisible }">
      <div class="detail-header">
        <span class="detail-title">{{ L10n.detail }}</span>
        <button
          class="detail-close"
          type="button"
          aria-label="关闭详情"
          @click="closeDetail">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              d="M3.2 3.2l9.6 9.6M12.8 3.2l-9.6 9.6"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <div class="detail-container" ref="detailPanel">
        <el-tree-v2 :data="data" :props="props" :height="treeHeight">
          <template #default="{ data }">
            <div v-if="data.level === 0" class="tree-row">
              <div class="category-level">
                <span class="category-level-left">
                  {{ data.label }}
                </span>
                <span class="category-level-right">
                  {{ data.amount }}
                </span>
              </div>
            </div>
            <div v-else-if="data.level === 1" class="tree-row">
              <div class="sub-category-level">
                <span class="sub-category-level-left">
                  {{ data.label }}
                </span>
                <span class="sub-category-level-right">
                  {{ data.amount }}
                </span>
              </div>
            </div>
            <div v-else-if="data.level === 2" class="tree-row">
              <el-tooltip
                class="box-item"
                effect="dark"
                :content="
                  data.record.remark.length > 0
                    ? data.record.remark
                    : data.record.subCategory
                "
                placement="left-start">
                <div class="record-level">
                  <span class="record-level-left">
                    {{ data.label }}
                  </span>
                  <span class="record-level-right">
                    {{ data.record.amount }}
                  </span>
                </div>
              </el-tooltip>
            </div>
            <div v-else>{{ L10n.not_support }}</div>
          </template>
        </el-tree-v2>
      </div>
    </aside>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, onDeactivated, onUnmounted, nextTick } from "vue";
import * as echarts from "echarts";
import { generateCatgeoryNode, CategoryNode } from "./Manager";
import {
  fetchTotalCategorysAmount,
  fetchTotalAmount,
  logError,
  logInfo,
} from "@/utils/DataCenter";
import L10n from "@/configs/L10n.json";
import { notifyCenter, NotifyType } from "@/utils/NotifyCenter";
import { ElMessage } from "element-plus";
const myEchart = ref<HTMLElement | null>(null);
const myChart = ref<echarts.ECharts | null>(null);
const isEmpty = ref(true);
const loaded = ref(false);
const totalIncome = ref(0);
const totalOutcome = ref(0);

function formatAmount(value: number): string {
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
// 详情树高度按容器实时高度计算，避免固定 550px 超出卡片被裁
const detailPanel = ref<HTMLElement | null>(null);
const treeHeight = ref(420);
// 详情改为侧边滑出，不常驻占位
const detailVisible = ref(false);

function closeDetail() {
  detailVisible.value = false;
}

function updateTreeHeight() {
  const el = detailPanel.value;
  if (!el) {
    return;
  }
  treeHeight.value = Math.max(180, el.clientHeight);
}

let chartObserver: ResizeObserver | null = null;
let initTimer: number | null = null;
let chartWidth = 0;
let chartHeight = 0;

// 容器被隐藏时尺寸为 0，跳过重绘，等可见后再调整
function resizeChart() {
  const el = myEchart.value;
  if (!el || el.clientWidth === 0 || el.clientHeight === 0) {
    return;
  }
  updateTreeHeight();
  // 尺寸没变化时无需重绘，避免页签切换瞬间触发的无效更新
  if (el.clientWidth === chartWidth && el.clientHeight === chartHeight) {
    return;
  }
  chartWidth = el.clientWidth;
  chartHeight = el.clientHeight;
  myChart.value?.resize();
}
function setupChart(): boolean {
  const el = myEchart.value;
  if (!el || el.clientWidth === 0 || el.clientHeight === 0) {
    return false;
  }
  myChart.value = echarts.init(el);
  chartWidth = el.clientWidth;
  chartHeight = el.clientHeight;
  window.addEventListener("resize", resizeChart);
  loadData();
  myChart.value.on("click", function (params) {
    // 只有点击扇区才下钻，点击图例不打开详情，避免遮挡图形
    if (params.componentType !== "series") {
      return;
    }
    logInfo("TotalData click" + params);
    reloadDetailValues(params.name);
  });
  registerNotify();
  return true;
}

function setupChartWithRetry(attempt = 0) {
  if (myChart.value) {
    return;
  }
  if (setupChart()) {
    return;
  }
  // 首次进入页签时容器可能还没完成布局，短暂重试，避免图表一直空白
  if (attempt < 20) {
    initTimer = window.setTimeout(() => setupChartWithRetry(attempt + 1), 50);
  }
}

onMounted(() => {
  const el = myEchart.value;
  if (!el) {
    return;
  }
  setupChartWithRetry();
  // 页签隐藏时容器尺寸为 0，初始化会失败；用 ResizeObserver 在容器尺寸变化时补初始化/重绘
  chartObserver = new ResizeObserver(() => {
    if (!myChart.value) {
      setupChartWithRetry();
    } else {
      resizeChart();
    }
  });
  chartObserver.observe(el);
});

function registerNotify() {
  notifyCenter.on(NotifyType.IMPORT_DATA_SUCCESS, loadData);
  notifyCenter.on(NotifyType.CREATE_RECORD_SUCCESS, loadData);
  notifyCenter.on(NotifyType.DELETE_RECORD_SUCCESS, loadData);
  notifyCenter.on(NotifyType.UPDATE_RECORD_SUCCESS, loadData);
}

function disableNotify() {
  notifyCenter.off(NotifyType.IMPORT_DATA_SUCCESS, loadData);
  notifyCenter.off(NotifyType.CREATE_RECORD_SUCCESS, loadData);
  notifyCenter.off(NotifyType.DELETE_RECORD_SUCCESS, loadData);
  notifyCenter.off(NotifyType.UPDATE_RECORD_SUCCESS, loadData);
}

onDeactivated(() => {
  disableNotify();
  closeDetail();
});

onUnmounted(() => {
  disableNotify();
  if (initTimer) {
    window.clearTimeout(initTimer);
    initTimer = null;
  }
  chartObserver?.disconnect();
  window.removeEventListener("resize", resizeChart);
  myChart.value?.dispose();
  myChart.value = null;
});

async function reloadDetailValues(category: string) {
  try {
    data.value = [await generateCatgeoryNode(category)];
    detailVisible.value = true;
    await nextTick();
    updateTreeHeight();
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
  }
}

async function loadData() {
  try {
    const [totalData, amount] = await Promise.all([
      fetchTotalCategorysAmount(),
      fetchTotalAmount(),
    ]);
    isEmpty.value = totalData.length === 0;
    loaded.value = true;
    totalIncome.value = amount.income;
    totalOutcome.value = amount.outcome;
    const option = {
      color: [
        "#6c5dd3",
        "#8b7fdf",
        "#18a472",
        "#f0a93b",
        "#4c9be8",
        "#e2434f",
        "#59c3c3",
        "#8a90a2",
        "#b7aef0",
        "#d8a7b1",
        "#7fbf7f",
      ],
      tooltip: {
        trigger: "item",
        formatter: "{a} <br/>{b} : {c} ({d}%)",
      },
      legend: {
        type: "scroll",
        orient: "vertical",
        left: 10,
        top: 20,
        bottom: 20,
        data: totalData.map((item) => item.name),
        selectedMode: false,
      },
      series: [
        {
          name: L10n.category,
          type: "pie",
          radius: "55%",
          center: ["50%", "50%"],
          data: totalData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        },
      ],
    };
    myChart.value?.setOption(option);
  } catch (error) {
    loaded.value = true;
    logError("total load data failed " + error);
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
  }
}

const props = {
  value: "id",
  label: "label",
  level: "level",
  amount: "amount",
  record: "record",
  children: "children",
};
const data = ref<CategoryNode[]>([]);
</script>
<style scoped>
.total-data {
  position: relative;
  display: flex;
  align-items: stretch;
  width: 100%;
  height: 100%;
  min-height: 520px;
  padding: 8px 20px 12px 8px;
  overflow: hidden;
  background-color: white;
  border: 1px solid #ebecf0;
  border-radius: 12px;
}

.empty-wrapper {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background-color: rgba(255, 255, 255, 0.6);
}

.empty-page {
  max-height: 240px;
  opacity: 0.9;
}

.chart-wrap {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.chart {
  flex: 1;
  min-width: 0;
  min-height: 0;
  margin-top: 8px;
  margin-left: 8px;
}

.overview-footer {
  display: flex;
  flex: 0 0 46px;
  align-items: center;
  justify-content: center;
  gap: 40px;
  height: 46px;
  border-top: 1px solid #f2f3f6;
}

.overview-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.overview-label {
  font-size: 12px;
  color: #6e7686;
}

.overview-value {
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.overview-value.expense {
  color: #e2434f;
}

.overview-value.income {
  color: #18a472;
}

/* 点击图表项后在卡片右侧滑出详情，点击遮罩（旁边空白处）收回 */
.detail-mask {
  position: absolute;
  inset: 0;
  z-index: 2;
  background-color: rgba(27, 31, 39, 0.1);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.24s ease;
}

.detail-mask.is-open {
  opacity: 1;
  pointer-events: auto;
}

.detail-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  width: min(380px, 42%);
  padding: 14px 16px 16px;
  background-color: #ffffff;
  border-left: 1px solid #ebecf0;
  border-radius: 0 12px 12px 0;
  box-shadow: -12px 0 32px rgba(27, 31, 39, 0.08);
  transform: translateX(calc(100% + 12px));
  transition: transform 0.26s cubic-bezier(0.4, 0, 0.2, 1);
}

.detail-drawer.is-open {
  transform: translateX(0);
}

.detail-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.detail-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  color: #5a6274;
  cursor: pointer;
  background-color: transparent;
  border: none;
  border-radius: 6px;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.detail-close:hover {
  color: #6c5dd3;
  background-color: #efecfb;
}

.detail-container {
  flex: 1;
  min-height: 0;
}

/* 虚拟列表的滚动条是覆盖式，给每行右侧留出空间，避免盖住金额文字 */
.detail-container :deep(.el-tree-node__content) {
  padding-right: 18px;
}

.detail-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.6px;
  color: #6e7686;
  text-align: left;
}

.record-level,
.category-level,
.sub-category-level {
  display: flex;
  align-items: center;
  width: 100%;
  font-size: 13px;
}

.tree-row {
  flex: 1;
  min-width: 0;
  width: 100%;
}

.record-level-left,
.category-level-left,
.sub-category-level-left {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-align: left;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.record-level-right,
.category-level-right,
.sub-category-level-right {
  flex: 0 0 88px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: #1b1f27;
}

.category-level-left {
  font-weight: 600;
  color: #1b1f27;
}

.sub-category-level-left,
.record-level-left {
  color: #4b5261;
}
</style>
