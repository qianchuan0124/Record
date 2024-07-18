<template>
  <div class="total-data">
    <div v-if="isEmpty">
      <img class="empty-page" src="@/assets/empty_page.svg" />
    </div>
    <div ref="myEchart" class="chart"></div>
    <div class="detail-data" v-if="data.length !== 0">
      <div class="detail-container">
        <div class="detail-title">{{ L10n.detail }}</div>
        <el-tree-v2
          style="width: 400px"
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
import { generateCatgeoryNode, CategoryNode } from "./Manager";
import { fetchTotalCategorysAmount } from "@/utils/DataCenter";
import Color from "@/configs/Color.json";
import L10n from "@/configs/L10n.json";
import { notifyCenter, NotifyType } from "@/utils/NotifyCenter";
import { ElMessage } from "element-plus";
const myEchart = ref<HTMLElement | null>(null);
const myChart = ref<echarts.ECharts | null>(null);
const isEmpty = ref(true);
onMounted(async () => {
  myChart.value = echarts.init(myEchart.value as HTMLDivElement);
  await loadData();
  myChart.value.on("click", function (params) {
    console.log(params);
    reloadDetailValues(params.name);
  });
});

notifyCenter.on(NotifyType.IMPORT_DATA_SUCCESS, loadData);

onDeactivated(() => {
  notifyCenter.off(NotifyType.IMPORT_DATA_SUCCESS, loadData);
});

async function reloadDetailValues(category: string) {
  try {
    data.value = [await generateCatgeoryNode(category)];
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
  }
}

async function loadData() {
  try {
    const totalData = await fetchTotalCategorysAmount();
    isEmpty.value = totalData.length === 0;
    const option = {
      title: {
        text: isEmpty.value ? "" : L10n.review,
        left: "center",
      },
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
.total-data {
  display: flex;
  align-items: top;
  min-width: 1200px;
  width: calc(100vh - 40);
  height: 100%;
  background-color: white;
  margin: 20px;
  border-radius: 10px;
}
.chart {
  flex: 0.618;
  margin-top: 12px;
  margin-left: 24px;
  width: 600px;
  height: 580px;
}

.detail-data {
  width: 600px;
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
  width: 388px;
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

.empty-page {
  max-height: calc(100vh - 450px);
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
