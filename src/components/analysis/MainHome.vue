<template>
  <div class="container">
    <el-tabs v-model="activeName" class="analysis-tabs">
      <el-tab-pane name="first" lazy>
        <template #label>
          <span class="analysis-title">{{ L10n.review }}</span>
        </template>
        <TotalData></TotalData>
      </el-tab-pane>
      <el-tab-pane name="second" lazy>
        <template #label>
          <span class="analysis-title">{{ L10n.yearly }}</span>
        </template>
        <YearlyData></YearlyData>
      </el-tab-pane>
      <el-tab-pane name="third" lazy>
        <template #label>
          <span class="analysis-title">{{ L10n.timeline }}</span>
        </template>
        <TimeLine></TimeLine>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import TotalData from "./TotalData.vue";
import YearlyData from "./YearlyData.vue";
import TimeLine from "./TimeLine.vue";
import L10n from "@/configs/L10n.json";

const activeName = ref("first");
</script>

<style scoped>
.container {
  height: 100%;
  padding: 16px 24px 24px 16px;
  overflow-y: auto;
}

.analysis-tabs :deep(.el-tabs__header) {
  margin: 0 0 12px;
}

.analysis-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.analysis-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

.analysis-tabs :deep(.el-tabs__nav) {
  padding: 3px;
  background-color: #eff0f4;
  border-radius: 8px;
}

.analysis-tabs :deep(.el-tabs__item) {
  height: 30px;
  line-height: 30px;
  margin-right: 2px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #5a6274;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.analysis-tabs :deep(.el-tabs__item:last-child) {
  margin-right: 0;
}

/* Element Plus 会去掉首/末个 tab 的外侧内边距，这里补齐，保持分段控件左右对称 */
.analysis-tabs :deep(.el-tabs__nav .el-tabs__item:nth-child(2)) {
  padding-left: 14px;
}

.analysis-tabs :deep(.el-tabs__nav .el-tabs__item.is-top:last-child) {
  padding-right: 14px;
}

.analysis-tabs :deep(.el-tabs__item.is-active) {
  background-color: white;
  color: #6c5dd3;
  box-shadow: 0 1px 2px rgba(27, 31, 39, 0.08);
}

.analysis-tabs :deep(.el-tabs__content) {
  overflow: visible;
}

.analysis-title {
  font-size: 13px;
  color: inherit;
}
</style>
