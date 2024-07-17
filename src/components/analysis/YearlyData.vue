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
    <div class="detail-data" v-if="data.length !== 0">
      <div class="detail-container">
        <div class="detail-title">{{ L10n.detail }}</div>
        <el-tree-v2
          style="max-width: calc(100vh)"
          :data="data"
          :props="props"
          :height="550">
          <template #default="{ data }">
            <div v-if="data.level === 0">
              <div class="category-level">
                <span class="category-level-left">
                  {{ data.label }}
                </span>
                <span class="category-level-right">
                  {{ data.amount }}
                </span>
              </div>
            </div>
            <div v-else-if="data.level === 1">
              <div class="sub-category-level">
                <span class="sub-category-level-left">
                  {{ data.label }}
                </span>
                <span class="sub-category-level-right">
                  {{ data.amount }}
                </span>
              </div>
            </div>
            <div v-else-if="data.level === 2">
              <div class="sub-category-level">
                <span class="sub-category-level-left">
                  {{ data.label }}
                </span>
                <span class="sub-category-level-right">
                  {{ data.amount }}
                </span>
              </div>
            </div>
            <div v-else-if="data.level === 3">
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
      <div class="detail-space"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, onDeactivated } from "vue";
import * as echarts from "echarts";
import {
  fetchYearlyAnalysis,
  generateYearlyCategoryNode,
  CategoryNode,
} from "./Manager";
import Color from "@/configs/Color.json";
import L10n from "@/configs/L10n.json";
import { notifyCenter, NotifyType } from "@/utils/NotifyCenter";
import { ElMessage } from "element-plus";
const startYear = ref<string>((new Date().getFullYear() - 4).toString());
const endYear = ref<string>(new Date().getFullYear().toString());

const beforeStartYear = ref<string>((new Date().getFullYear() - 4).toString());
const beforeEndYear = ref<string>(new Date().getFullYear().toString());

const myEchart = ref<HTMLDivElement | null>(null);

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
    yearlyChart.value?.setOption(option, true);
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
  }
}

const yearlyChart = ref<echarts.ECharts | null>(null);

notifyCenter.on(NotifyType.IMPORT_DATA_SUCCESS, reloadData);

onDeactivated(() => {
  notifyCenter.off(NotifyType.IMPORT_DATA_SUCCESS, reloadData);
});

onMounted(async () => {
  yearlyChart.value = echarts.init(myEchart.value as HTMLDivElement);

  reloadData();
  yearlyChart.value.on("click", function (params) {
    const category = params.seriesName;
    const year = Number(params.name);
    if (category && year) {
      reloadDetailValues(year, category);
    }
  });
});

async function reloadDetailValues(year: number, category: string) {
  try {
    data.value = [await generateYearlyCategoryNode(year, category)];
  } catch (error) {
    console.log(error);
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
  display: flex;
  align-items: top;
  min-width: 1200px;
  width: calc(100vh - 40);
  height: 100%;
  background-color: white;
  margin: 20px;
  border-radius: 10px;
  caret-color: transparent;
}

.yearly-container {
  flex: 0.618;
  margin-top: 12px;
  margin-left: 38px;
}

.select-year {
  font-size: 13px;
  color: v-bind("Color.info");
  text-align: left;
  padding: 12px 0px 0px 16px;
  display: flex;
  align-items: center;
  user-select: none;
}

.select-year-tip-start {
  margin-right: 12px;
  user-select: none !important;
}

.select-year-tip-end {
  margin-left: 12px;
  margin-right: 12px;
  user-select: none;
}

.chart {
  display: flex;
  align-items: center;
  width: 600px;
  height: 600px;
}

.detail-data {
  width: calc(100vh - 12);
  height: 100%;
  margin-right: 12px;
  margin-top: 12px;
  flex: 0.382;
  display: flex;
  animation: fadeIn 1s ease-out;
}

.detail-space {
  flex: 0.2;
}

.detail-container {
  flex: 0.8;
}

.detail-title {
  font-size: 16px;
  font-weight: 700;
  color: v-bind("Color.primary");
  background-color: v-bind("Color.border");
  width: calc(100vh - 12);
  border-radius: 2px;
  margin-bottom: 12px;
  margin-top: 12px;
  text-align: left;
  padding: 4px 0px 4px 12px;
}

.record-level {
  display: flex;
  width: 100%;
}

.record-level-left {
  flex: 1;
  width: 150px;
  text-align: left;
}

.record-level-right {
  flex: 1;
  width: 150px;
  text-align: right;
}

.category-level {
  display: flex;
  width: 100%;
}

.category-level-left {
  flex: 1;
  width: 150px;
  text-align: left;
}

.category-level-right {
  flex: 1;
  width: 182px;
  text-align: right;
}

.sub-category-level {
  display: flex;
  width: 100%;
}

.sub-category-level-left {
  flex: 1;
  width: 150px;
  text-align: left;
}

.sub-category-level-right {
  flex: 1;
  width: 166px;
  text-align: right;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
./AnalysisManager @/configs/Color.json@/configs/L10n.json ./Manager
