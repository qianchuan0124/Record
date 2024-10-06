<template>
  <div class="container">
    <div>
      <CreateView></CreateView>
    </div>
    <div>
      <FilterView
        @filterChanged="handleFilterChanged"
        ref="filterView"></FilterView>
    </div>
    <div class="content-container">
      <div class="month-select-container">
        <MonthSelect
          @monthChanged="handleMonthChanged"
          ref="monthSelect"></MonthSelect>
      </div>
      <div class="content-table-container">
        <ContentView ref="contentView"></ContentView>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  ComponentPublicInstance,
  onMounted,
  onUnmounted,
  onDeactivated,
} from "vue";
import Color from "@/configs/Color.json";
import CreateView from "./CreateView.vue";
import FilterView from "./FilterView.vue";
import MonthSelect from "./MonthSelect.vue";
import ContentView from "./ContentView.vue";
import { Month } from "@/models/Month";
import { Filter } from "@/models/Filter";

const contentView = ref<ComponentPublicInstance<typeof ContentView> | null>(
  null
);

const monthSelect = ref<ComponentPublicInstance<typeof MonthSelect> | null>(
  null
);

const filterView = ref<ComponentPublicInstance<typeof FilterView> | null>(null);

const dashboardHeight = ref<string>("700px");

function handleMonthChanged(month: Month) {
  filterView.value?.onMonthChanged(month);
}

function handleFilterChanged(filter: Filter) {
  contentView.value?.onFilterChanged(filter);
}

function handleContainerWidth() {
  dashboardHeight.value = window.innerHeight - 120 + "px";
}

onMounted(() => {
  window.addEventListener("resize", handleContainerWidth);
  handleContainerWidth();
});

onUnmounted(() => {
  window.removeEventListener("resize", handleContainerWidth);
});

onDeactivated(() => {
  window.removeEventListener("resize", handleContainerWidth);
});
</script>

<style scoped>
.container {
  background-color: v-bind("Color.background");
  width: 100%;
  min-width: 800px;
  height: v-bind("dashboardHeight");
  overflow: auto !important;
  user-select: none !important;
}

/* 针对Webkit浏览器隐藏滚动条 */
.container::-webkit-scrollbar {
  display: none;
}

/* 对于支持scrollbar-width属性的浏览器（如Firefox），也隐藏滚动条 */
.container {
  scrollbar-width: none;
}

.el-tabs--right {
  overflow-y: hidden; /* 只在垂直方向上显示滚动条 */
  overflow-x: hidden; /* 隐藏水平方向的滚动条 */
}

.content-container {
  display: flex;
  width: 100%;
}

.month-select-container {
  width: 240px;
}

.content-table-container {
  flex-grow: 1;
}
</style>
