<template>
  <el-tabs
    :tab-position="tabPosition"
    style="height: calc(100vh - 72px)"
    class="demo-tabs">
    <el-tab-pane class="first-top">
      <template #label>
        <span class="custom-tabs-label">
          <img class="panel_icon" src="@/assets/dashboard_icon.svg" />
          <span class="panel_title">{{ L10n.dashboard }}</span>
        </span>
      </template>
      <DashboardHome></DashboardHome>
    </el-tab-pane>
    <el-tab-pane label="User">
      <template #label>
        <span class="custom-tabs-label">
          <img class="panel_icon" src="@/assets/analysis_icon.svg" />
          <span class="panel_title">{{ L10n.analysis }}</span>
        </span>
      </template>
      <AnalysisHome></AnalysisHome>
    </el-tab-pane>
    <el-tab-pane label="Config">
      <template #label>
        <span class="custom-tabs-label">
          <img class="panel_icon" src="@/assets/dashboard_icon.svg" />
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
import DashboardHome from "./dashboard/MainHome.vue";
import Color from "@/configs/Color.json";
import L10n from "@/configs/L10n.json";
import AnalysisHome from "./analysis/MainHome.vue";
import SettingHome from "./settings/MainHome.vue";

const tabPosition = ref<TabsInstance["tabPosition"]>("left");
</script>

<style>
.first-top {
  margin-top: 16px;
}

.empty-page {
  width: 50%;
  height: 50%;
  padding-top: 100px;
}

.custom-tabs-label {
  display: flex;
  align-items: center;
}
.panel_icon {
  width: 24px;
  height: 24px;
}

.panel_title {
  font-size: 15;
  font-weight: 700;
  color: v-bind("Color.info");
  margin-left: 10px;
}

.demo-tabs {
  padding-top: 12px;
  user-select: none;
}

.demo-tabs > .el-tabs__content {
  color: #6b778c;
  font-size: 32px;
  font-weight: 600;
}

.el-tabs__item {
  margin-right: 100px;
  margin-left: 32px;
  margin-bottom: 15px;
  padding-left: 0px !important;
  height: 40px !important;
}

.el-tabs__header {
  margin-top: 32px;
  margin-right: 0px !important;
  background-color: white;
}

.el-tabs--right .el-tabs__content,
.el-tabs--left .el-tabs__content {
  height: 100%;
}

.el-tabs__nav-wrap:after {
  background-color: transparent !important;
}

.el-tabs__nav {
  margin-top: 20px;
}
</style>
@/configs/Color.json@/configs/L10n.json
