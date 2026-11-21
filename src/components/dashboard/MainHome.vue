<template>
  <div class="container">
    <CreateView></CreateView>
    <FilterView @filterChanged="handleFilterChanged" ref="filterView"></FilterView>
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
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 16px 24px 24px 16px;
  overflow-y: auto;
}

.content-container {
  display: flex;
  flex: 1;
  align-items: stretch;
  gap: 16px;
  width: 100%;
  min-height: 0;
}

.month-select-container {
  display: flex;
  flex: 0 0 220px;
  width: 220px;
  min-height: 0;
}

.content-table-container {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

@media (max-width: 1120px) {
  .month-select-container {
    flex: 0 0 180px;
    width: 180px;
  }
}
</style>
