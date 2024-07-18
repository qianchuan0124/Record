<template>
  <el-tabs v-model="activeName" class="container_tabs" @tab-click="handleClick">
    <el-tab-pane name="first">
      <template #label>
        <span class="analyisis-title">{{ L10n.review }}</span>
      </template>
      <TotalData></TotalData>
    </el-tab-pane>
    <el-tab-pane name="second">
      <template #label>
        <span class="analyisis-title">{{ L10n.yearly }}</span>
      </template>
      <YearlyData></YearlyData>
    </el-tab-pane>
    <el-tab-pane name="third">
      <template #label>
        <span class="analyisis-title">{{ L10n.timeline }}</span>
      </template>
      <TimeLine></TimeLine>
    </el-tab-pane>
  </el-tabs>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import type { TabsPaneContext } from "element-plus";
import TotalData from "./TotalData.vue";
import YearlyData from "./YearlyData.vue";
import TimeLine from "./TimeLine.vue";
import Color from "@/configs/Color.json";
import L10n from "@/configs/L10n.json";

const activeName = ref("first");

const handleClick = (tab: TabsPaneContext, event: Event) => {
  console.log(tab, event);
};
</script>

<style scoped>
.analyisis-title {
  font-size: 15;
  font-weight: 700;
  color: v-bind("Color.info");
}

.container_tabs > .el-tabs__content {
  padding: 12px;
  color: #6b778c;
  background-color: white;
  font-size: 32px;
  font-weight: 600;
}

.el-tabs .el-tabs--top {
  margin-top: 24px;
}

:deep(.el-tabs__header) {
  margin-left: 20px !important;
  margin-right: 20px !important;
  min-width: 1200px;
  border-radius: 8px;
}

:deep(.el-tabs__nav) {
  margin-top: 4px !important;
}

:deep(.el-tabs__item) {
  margin-left: 12px !important;
  margin-bottom: 4px !important;
  margin-right: 12px !important;
}

:deep(.el-tabs__header) {
  margin-bottom: 0px;
}
</style>
