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
import { ref, ComponentPublicInstance } from "vue";
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

function handleMonthChanged(month: Month) {
  filterView.value?.onMonthChanged(month);
}

function handleFilterChanged(filter: Filter) {
  contentView.value?.onFilterChanged(filter);
}
</script>

<style scoped>
.container {
  background-color: v-bind("Color.background");
  height: 100%;
  width: 100%;
  min-width: 1200px;
  overflow-x: auto;
  user-select: none !important;
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
./managers/MonthManager./managers/FilterManager @/configs/Color.json
