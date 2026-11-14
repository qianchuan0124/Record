<template>
  <el-tabs :tab-position="tabPosition" class="app-tabs">
    <el-tab-pane>
      <template #label>
        <span class="custom-tabs-label">
          <el-icon class="panel_icon"><Grid /></el-icon>
          <span class="panel_title">{{ L10n.dashboard }}</span>
        </span>
      </template>
      <DashboardHome></DashboardHome>
    </el-tab-pane>
    <el-tab-pane>
      <template #label>
        <span class="custom-tabs-label">
          <el-icon class="panel_icon"><PieChart /></el-icon>
          <span class="panel_title">{{ L10n.analysis }}</span>
        </span>
      </template>
      <AnalysisHome></AnalysisHome>
    </el-tab-pane>
    <el-tab-pane>
      <template #label>
        <span class="custom-tabs-label">
          <el-icon class="panel_icon"><Setting /></el-icon>
          <span class="panel_title">{{ L10n.settings }}</span>
        </span>
      </template>
      <SettingHome></SettingHome>
    </el-tab-pane>
  </el-tabs>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import type { TabsInstance } from "element-plus";
import { Grid, PieChart, Setting } from "@element-plus/icons-vue";
import DashboardHome from "./dashboard/MainHome.vue";
import L10n from "@/configs/L10n.json";
import AnalysisHome from "./analysis/MainHome.vue";
import SettingHome from "./settings/MainHome.vue";

const tabPosition = ref<TabsInstance["tabPosition"]>("left");
</script>

<style scoped>
.app-tabs {
  height: 100%;
  user-select: none;
}

.app-tabs > :deep(.el-tabs__header) {
  width: 200px;
  margin: 0;
  padding-top: 16px;
  background-color: transparent;
}

/* Element Plus 左侧 tab 默认给 header 10px 右外边距，收敛为 0 以减小侧边栏与内容区空隙 */
.app-tabs > :deep(.el-tabs__header.is-left) {
  margin-right: 0;
}

.app-tabs > :deep(.el-tabs__header) .el-tabs__nav-wrap::after {
  display: none;
}

.app-tabs > :deep(.el-tabs__header) .el-tabs__nav {
  width: calc(100% - 24px);
  margin: 0 12px;
}

.app-tabs > :deep(.el-tabs__header) .el-tabs__item {
  display: flex;
  align-items: center;
  height: 44px;
  margin-bottom: 4px;
  padding: 0 12px !important;
  border-radius: 8px;
  color: #5a6274;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.app-tabs > :deep(.el-tabs__header) .el-tabs__item:hover {
  background-color: #f0f0f5;
  color: #1b1f27;
}

.app-tabs > :deep(.el-tabs__header) .el-tabs__item.is-active {
  background-color: #efecfb;
  color: #6c5dd3;
}

.app-tabs > :deep(.el-tabs__header) .el-tabs__active-bar {
  display: none;
}

.app-tabs > :deep(.el-tabs__content) {
  height: 100%;
  padding: 0;
  overflow: hidden;
}

.app-tabs > :deep(.el-tabs__content) > .el-tab-pane {
  height: 100%;
}

.custom-tabs-label {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  font-size: 14px;
  font-weight: 500;
  color: inherit;
}

.panel_icon {
  width: 18px;
  height: 18px;
  opacity: 0.9;
}

.panel_title {
  color: inherit;
}
</style>
