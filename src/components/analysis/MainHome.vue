<template>
  <div class="container">
    <el-tabs v-model="activeName" class="container_tabs">
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
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from "vue";
import TotalData from "./TotalData.vue";
import YearlyData from "./YearlyData.vue";
import TimeLine from "./TimeLine.vue";
import Color from "@/configs/Color.json";
import L10n from "@/configs/L10n.json";

const activeName = ref("first");
const containerHeight = ref("700px");
const containerWidth = ref("1000px");

function handleContainerWidth() {
  containerHeight.value = window.innerHeight - 120 + "px";
  containerWidth.value = window.innerWidth - 184 + "px";
}

onMounted(() => {
  window.addEventListener("resize", handleContainerWidth);
  handleContainerWidth();
});

onUnmounted(() => {
  window.removeEventListener("resize", handleContainerWidth);
});
</script>

<style scoped>
.analyisis-title {
  font-size: 15;
  font-weight: 700;
  color: v-bind("Color.info");
}

.container {
  height: v-bind("containerHeight");
  overflow: auto !important;
}

/* 针对Webkit浏览器隐藏滚动条 */
.container::-webkit-scrollbar {
  display: none;
}

/* 对于支持scrollbar-width属性的浏览器（如Firefox），也隐藏滚动条 */
.container {
  scrollbar-width: none;
}

.container_tabs > .el-tabs__content {
  padding: 12px;
  color: #6b778c;
  background-color: white;
  font-size: 32px;
  font-weight: 600;
}

.el-tabs--right {
  overflow-y: auto; /* 只在垂直方向上显示滚动条 */
  overflow-x: hidden; /* 隐藏水平方向的滚动条 */
}

.el-tabs .el-tabs--top {
  margin-top: 12px;
}

:deep(.el-tabs__header) {
  margin-left: 20px !important;
  margin-right: 20px !important;
  width: v-bind("containerWidth");
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
