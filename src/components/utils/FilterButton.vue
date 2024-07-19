<template>
  <div
    v-if="buttonType === 'all'"
    class="button-style filter-all"
    @click="clickAll()">
    <span class="button-title">{{ L10n.all }}</span>
  </div>
  <div
    v-else-if="buttonType === 'category'"
    class="button-style"
    @click="clickCategory()">
    <span class="button-title-select">{{ L10n.category }}</span>
    <el-cascader
      :style="{ width: width, height: height }"
      ref="categorySelect"
      :placeholder="L10n.category"
      @visible-change="onCategoryChanged"
      v-model="categoryValue"
      :options="categoriesOptions"
      :props="categoryProps"
      filterable
      :show-all-levels="false"
      class="hide-selected-value"
      :clearable="false" />
  </div>
  <div
    v-else-if="buttonType === 'type'"
    class="button-style"
    @click="clickType()">
    <span class="button-title-select">{{ L10n.type }}</span>
    <el-cascader
      :style="{ width: width, height: height }"
      ref="typeSelect"
      @visible-change="onTypeChanged"
      v-model="typeValue"
      :options="typeOptions"
      :props="categoryProps" />
  </div>
  <div v-else-if="buttonType === 'remark'" class="button-style-search">
    <img class="search-reamrk" src="@/assets/remark_search_icon.svg" />
    <el-input
      v-model="remarkValue"
      @change="onRemarkChanged"
      class="button-search"
      :style="{ width: width, height: height }"
      :placeholder="`${L10n.search_placeholder}`"
      clearable />
  </div>
  <div
    v-else-if="buttonType === 'time'"
    class="button-style button-time"
    @click="clickTime()">
    <span class="button-title">{{ L10n.time }}</span>
    <el-date-picker
      v-model="selectedTime"
      class="time-select"
      @change="onTimeChanged"
      style="width: 1px; height: 1px; padding: 0px; margin: 0px"
      type="datetimerange"
      ref="dateSelect"
      :clearable="false" />
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  defineProps,
  PropType,
  toRefs,
  watchEffect,
  defineEmits,
  defineExpose,
  onMounted,
  onUnmounted,
  onDeactivated,
} from "vue";
import Color from "@/configs/Color.json";
import L10n from "@/configs/L10n.json";
import { getCategories, accountTypes } from "@/configs/CategoryParser";
import { notifyCenter, NotifyType } from "@/utils/NotifyCenter";

interface CategorySelectType {
  togglePopperVisible: () => void;
}

const dateSelect = ref<HTMLElement | null>(null);
const categorySelect = ref<CategorySelectType | null>(null);
const typeSelect = ref<CategorySelectType | null>(null);

const categoryProps = {
  expandTrigger: "hover" as const,
  multiple: true,
};
const categoriesOptions = ref(getCategories());
const typeOptions = accountTypes;

const categoryValue = ref(["guide", "disciplines"]);
const typeValue = ref(["expense"]);
const selectedTime = ref<[Date, Date]>([
  new Date(2000, 10, 10, 10, 10),
  new Date(2000, 10, 11, 10, 10),
]);
const remarkValue = ref("");

const width = ref("");
const height = ref("");
const buttonWidth = ref("");

defineExpose({
  setupSelectedTime,
  cleanValues,
});

function setupSelectedTime(dates: Date[]) {
  selectedTime.value = [dates[0], dates[1]];
}

function cleanValues() {
  switch (props.buttonType) {
    case "category":
      categoryValue.value = [];
      break;
    case "type":
      typeValue.value = [];
      break;
    case "remark":
      remarkValue.value = "";
      break;
    default:
      break;
  }
}

const props = defineProps({
  buttonType: {
    type: String as PropType<"all" | "category" | "type" | "time" | "remark">,
    default: "remark",
  },
  clickHandler: {
    type: Function as PropType<() => void>,
    default: () => {},
  },
});

const { buttonType } = toRefs(props);

const calculateDimensions = () => {
  switch (props.buttonType) {
    case "category":
    case "type":
    case "time":
    case "all":
      width.value = "30px";
      height.value = "28px";
      buttonWidth.value = "80px";
      break;
    case "remark":
      width.value = "216px";
      height.value = "28px";
      buttonWidth.value = "280px";
      break;
  }
};

watchEffect(() => {
  calculateDimensions();
});

function clickTime() {
  if (dateSelect.value) {
    dateSelect.value.focus();
  }
}

function clickCategory() {
  if (categorySelect.value) {
    categorySelect.value.togglePopperVisible();
  }
}

function clickType() {
  if (typeSelect.value) {
    typeSelect.value.togglePopperVisible();
  }
}

const emit = defineEmits([
  "update:category",
  "update:type",
  "update:time",
  "update:remark",
  "isAll",
]);

function clickAll() {
  emit("isAll");
}

function onCategoryChanged(isOpen: boolean) {
  if (!isOpen) {
    emit("update:category", categoryValue.value);
  }
}

function onTypeChanged(isOpen: boolean) {
  if (!isOpen) {
    emit("update:type", typeValue.value);
  }
}

function onTimeChanged() {
  emit("update:time", selectedTime.value);
}

function onRemarkChanged() {
  emit("update:remark", remarkValue.value);
}

function registerNotify() {
  notifyCenter.on(NotifyType.CATEGORY_DATA_UPDATE, () => {
    categoriesOptions.value = getCategories();
  });
}

function disableNotify() {
  notifyCenter.off(NotifyType.CATEGORY_DATA_UPDATE, () => {
    categoriesOptions.value = getCategories();
  });
}

onMounted(() => {
  registerNotify();
});

onUnmounted(() => {
  disableNotify();
});

onDeactivated(() => {
  disableNotify();
});
</script>

<style scoped>
.button-title {
  font-size: 14px;
  color: v-bind("Color.info");
}

.button-title-select {
  font-size: 14px;
  color: v-bind("Color.info");
  margin-left: 12px;
}

.filter-all {
  width: v-bind("width");
  height: v-bind("height");
}

.button-style {
  display: flex;
  align-items: center;
  justify-content: center;
  width: v-bind("buttonWidth");
  background-color: white; /* 设置背景色为白色 */
  border-radius: 6px; /* 设置圆角 */
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); /* 添加阴影 */
}

.button-style-search {
  display: flex;
  align-items: center;
  width: v-bind("buttonWidth");
  background-color: white; /* 设置背景色为白色 */
  border-radius: 6px; /* 设置圆角 */
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); /* 添加阴影 */
}

.button-style:hover,
.button-style:focus {
  border-color: v-bind("Color.primary"); /* 设置鼠标悬停时的边框颜色 */
}

.button-time {
  height: v-bind("height");
}

.search-reamrk {
  width: 22px;
  height: 20px;
  margin-left: 8px;
  margin-right: 4px;
}

:deep(.button-search .el-input__inner) {
  width: v-bind("width") !important;
}

:deep(.el-input__prefix) {
  display: none;
}

/* 如果你在全局样式文件中添加这个样式 */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  appearance: textfield;
}

/* 如果你在带有scoped属性的<style>标签中添加这个样式 */
:deep(input[type="number"]::-webkit-inner-spin-button),
:deep(input[type="number"]::-webkit-outer-spin-button) {
  -webkit-appearance: none !important;
  margin: 0 !important;
}

:deep(input[type="number"]) {
  appearance: textfield !important;
}

:deep(.el-cascader .el-input__inner) {
  border: none !important; /* 移除边框 */
  box-shadow: none !important; /* 如果有阴影也一并移除 */
  width: 1px !important;
  height: 28px !important;
}

:deep(.el-input__suffix) {
  width: 14px !important;
  height: 26px !important;
}

:deep(.el-input__wrapper) {
  box-shadow: none !important;
  flex-grow: 0 !important;
  padding: 0px;
}

/* 隐藏选中值的样式 */
:deep(.hide-selected-value .el-cascader__tags .el-tag) {
  visibility: hidden;
}

:deep(.el-cascader__tags) {
  visibility: hidden;
}

:deep(.el-date-editor .el-range__icon) {
  visibility: hidden !important;
}

:deep(.el-range-separator) {
  visibility: hidden !important;
}

:deep(.time-select) {
  flex-grow: 0 !important;
  color: white;
}
</style>
