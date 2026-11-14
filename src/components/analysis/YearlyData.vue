<template>
  <div class="yearly-data">
    <div class="yearly-container">
      <div class="select-year">
        <span class="select-year-tip-start">{{ L10n.start_year }}</span>
        <el-date-picker
          style="width: 80px"
          v-model="startYear"
          :disabled-date="disabledStartYear"
          type="year"
          format="YYYY"
          size="small"
          @change="onYearStartChanged"
          :clearable="false" />
        <span class="select-year-tip-end">{{ L10n.end_year }}</span>
        <el-date-picker
          style="width: 80px"
          v-model="endYear"
          :disabled-date="disabledEndYear"
          type="year"
          format="YYYY"
          size="small"
          @change="onYearEndChanged"
          :clearable="false" />
      </div>
      <div ref="myEchart" class="chart"></div>
    </div>
    <div
      class="detail-mask"
      :class="{ 'is-open': detailVisible }"
      @click="closeDetail"></div>
    <aside class="detail-drawer" :class="{ 'is-open': detailVisible }">
      <div class="detail-header">
        <span class="detail-title">{{ L10n.detail }}</span>
        <span class="detail-header-actions">
          <span class="all-span" @click="onTapTotal">{{ L10n.all }}</span>
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
        </span>
      </div>
      <div class="detail-container" ref="detailPanel">
        <el-tree-v2
          style="width: 100%"
          :data="data"
          :props="props"
          :height="treeHeight">
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
              <div class="sub-category-level">
                <span class="sub-category-level-left">
                  {{ data.label }}
                </span>
                <span class="sub-category-level-right">
                  {{ data.amount }}
                </span>
              </div>
            </div>
            <div v-else-if="data.level === 3" class="tree-row">
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
import {
  fetchYearlyAnalysis,
  generateYearlyCategoryNode,
  generateYearlyTotalInfo,
  CategoryNode,
} from "./Manager";
import L10n from "@/configs/L10n.json";
import { notifyCenter, NotifyType } from "@/utils/NotifyCenter";
import { ElMessage } from "element-plus";
import { logError } from "@/utils/DataCenter";
const startYear = ref<string>((new Date().getFullYear() - 4).toString());
const endYear = ref<string>(new Date().getFullYear().toString());

const beforeStartYear = ref<string>((new Date().getFullYear() - 4).toString());
const beforeEndYear = ref<string>(new Date().getFullYear().toString());

const myEchart = ref<HTMLDivElement | null>(null);

const currentYear = ref<number>(0);

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

function disabledStartYear(time: Date) {
  return time.getFullYear() > Number(endYear.value);
}

function disabledEndYear(time: Date) {
  return time.getFullYear() < Number(startYear.value);
}

function onYearStartChanged() {
  startYear.value = new Date(startYear.value).getFullYear().toString();
  onYearChanged();
}

function onYearEndChanged() {
  endYear.value = new Date(endYear.value).getFullYear().toString();
  onYearChanged();
}

function onYearChanged() {
  if (
    beforeStartYear.value !== startYear.value ||
    beforeEndYear.value !== endYear.value
  ) {
    beforeStartYear.value = startYear.value;
    beforeEndYear.value = endYear.value;
    reloadData();
  }
}

function currentYearsList() {
  const start = Number(startYear.value);
  const end = Number(endYear.value);
  return Array.from({ length: end - start + 1 }).map((_, index) => {
    return (start + index).toString();
  });
}

async function reloadData() {
  try {
    const analysisData = await fetchYearlyAnalysis(currentYearsList());
    const descriptions = analysisData[0].description;
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
        axisPointer: {
          type: "shadow",
        },
      },
      legend: {
        orient: "vertical",
        left: 10,
        top: 10,
      },
      grid: {
        left: "15%",
        right: "3%",
        bottom: "3%",
        containLabel: true,
      },
      xAxis: [
        {
          type: "category",
          data: descriptions,
        },
      ],
      yAxis: [
        {
          type: "value",
        },
      ],
      series: analysisData,
    };
    // 用 replaceMerge 整组替换 series：既清理已删除的分类，又保留已就绪的坐标系统，
    // 避免 notMerge 重建模型后 resize 时柱状图坐标系缺失导致 barPolar 报错
    if (!baseReady && yearlyChart.value) {
      baseReady = true;
      yearlyChart.value.setOption({
        xAxis: { type: "category", data: [] },
        yAxis: { type: "value" },
        series: [],
      });
    }
    yearlyChart.value?.setOption(option, { replaceMerge: ["series"] });
  } catch (error) {
    logError("reload yearly data failed " + error);
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
  }
}

const yearlyChart = ref<echarts.ECharts | null>(null);
let chartObserver: IntersectionObserver | null = null;
// 首次 setOption 会走 ECharts 的初始化分支（initBase），此后 resize 无法重建坐标系；
// 先落一次空坐标系配置，让数据渲染走 merge 分支，保证 resize / 切回页签稳定
let baseReady = false;
let chartWidth = 0;
let chartHeight = 0;

// 容器被隐藏时尺寸为 0，直接 resize 会让柱状图坐标系丢失，因此只在可见且尺寸变化时重绘
function resizeChart() {
  const el = myEchart.value;
  if (!el || el.clientWidth === 0 || el.clientHeight === 0) {
    return;
  }
  updateTreeHeight();
  if (el.clientWidth === chartWidth && el.clientHeight === chartHeight) {
    return;
  }
  chartWidth = el.clientWidth;
  chartHeight = el.clientHeight;
  yearlyChart.value?.resize();
}

function registerNotify() {
  notifyCenter.on(NotifyType.IMPORT_DATA_SUCCESS, reloadData);
  notifyCenter.on(NotifyType.CREATE_RECORD_SUCCESS, reloadData);
  notifyCenter.on(NotifyType.DELETE_RECORD_SUCCESS, reloadData);
  notifyCenter.on(NotifyType.UPDATE_RECORD_SUCCESS, reloadData);
}

function disableNotify() {
  notifyCenter.off(NotifyType.IMPORT_DATA_SUCCESS, reloadData);
  notifyCenter.off(NotifyType.CREATE_RECORD_SUCCESS, reloadData);
  notifyCenter.off(NotifyType.DELETE_RECORD_SUCCESS, reloadData);
  notifyCenter.off(NotifyType.UPDATE_RECORD_SUCCESS, reloadData);
}

onDeactivated(() => {
  disableNotify();
  closeDetail();
});

onUnmounted(() => {
  disableNotify();
  chartObserver?.disconnect();
  window.removeEventListener("resize", resizeChart);
  yearlyChart.value?.dispose();
  yearlyChart.value = null;
  baseReady = false;
});

// 容器隐藏时宽高为 0，此时初始化 echarts 会导致柱状图坐标系缺失，需等待可见后再初始化
function setupChart(): boolean {
  const el = myEchart.value;
  if (!el || el.clientWidth === 0 || el.clientHeight === 0) {
    return false;
  }
  yearlyChart.value = echarts.init(el);
  baseReady = false;
  chartWidth = el.clientWidth;
  chartHeight = el.clientHeight;
  window.addEventListener("resize", resizeChart);
  reloadData();
  yearlyChart.value.on("click", function (params) {
    const category = params.seriesName;
    const year = Number(params.name);
    currentYear.value = year;
    if (category && year) {
      reloadDetailValues(year, category);
    }
  });
  registerNotify();
  return true;
}

onMounted(() => {
  const el = myEchart.value;
  if (!el) {
    return;
  }
  setupChart();
  // 首次显示时初始化，之后每次显示时按新尺寸重绘
  chartObserver = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) {
      return;
    }
    if (!yearlyChart.value) {
      setupChart();
    } else {
      resizeChart();
    }
  });
  chartObserver.observe(el);
});

async function reloadDetailValues(year: number, category: string) {
  try {
    data.value = [await generateYearlyCategoryNode(year, category)];
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

async function onTapTotal() {
  reloadYearlyTotalInfo(currentYear.value);
}

async function reloadYearlyTotalInfo(year: number) {
  try {
    data.value = [await generateYearlyTotalInfo(year)];
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
.yearly-data {
  position: relative;
  display: flex;
  align-items: stretch;
  width: 100%;
  height: calc(100vh - 200px);
  min-height: 520px;
  padding: 8px 20px 12px 8px;
  overflow: hidden;
  background-color: white;
  border: 1px solid #ebecf0;
  border-radius: 12px;
  caret-color: transparent;
}

.yearly-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  padding: 8px 0 0 8px;
}

.select-year {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  font-size: 12px;
  color: #6e7686;
  user-select: none;
}

.select-year-tip-start,
.select-year-tip-end {
  margin: 0;
  user-select: none !important;
}

.chart {
  flex: 1;
  width: 100%;
  min-height: 0;
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
  width: min(400px, 44%);
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

.detail-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
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

.detail-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.6px;
  color: #6e7686;
  text-align: left;
}

.all-span {
  color: #6c5dd3;
  font-weight: 500;
  cursor: pointer;
}

.all-span:hover {
  text-decoration: underline;
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
