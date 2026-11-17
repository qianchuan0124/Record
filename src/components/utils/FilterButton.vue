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
    :class="{ 'is-active': categoryTouched && categoryValue.length > 0 }"
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
    :class="{ 'is-active': typeTouched && typeValue.length > 0 }"
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
  <div
    v-else-if="buttonType === 'remark'"
    class="button-style-search"
    :class="{ 'is-active': remarkValue.length > 0 }">
    <img class="search-reamrk" src="@/assets/remark_search_icon.svg" />
    <el-input
      v-model="remarkValue"
      @change="onRemarkChanged"
      class="button-search"
      :style="{ width: width, height: controlHeight }"
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

// 不预置占位值：否则只点开筛选框再关闭，也会把占位值当成筛选条件导致列表被清空
const categoryValue = ref<string[]>([]);
const typeValue = ref<string[]>([]);
const selectedTime = ref<[Date, Date]>([
  new Date(2000, 10, 10, 10, 10),
  new Date(2000, 10, 11, 10, 10),
]);
const remarkValue = ref("");
// 分类/类别带有占位默认值，这里单独记录用户是否真正选择过，避免按钮误显示为已筛选
const categoryTouched = ref(false);
const typeTouched = ref(false);

const width = ref("");
const height = ref("");
// 搜索框内部输入控件跟随外框内容区高度，避免溢出盖住外框边框
const controlHeight = ref("100%");
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
      categoryTouched.value = false;
      break;
    case "type":
      typeValue.value = [];
      typeTouched.value = false;
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
      width.value = "30px";
      height.value = "30px";
      buttonWidth.value = "88px";
      break;
    case "all":
      width.value = "30px";
      height.value = "30px";
      buttonWidth.value = "88px";
      break;
    case "remark":
      width.value = "196px";
      height.value = "30px";
      buttonWidth.value = "260px";
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
    categoryTouched.value = categoryValue.value.length > 0;
    emit("update:category", categoryValue.value);
  }
}

function onTypeChanged(isOpen: boolean) {
  if (!isOpen) {
    typeTouched.value = typeValue.value.length > 0;
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
  font-size: 13px;
  font-weight: 500;
  color: #5a6274;
}

.button-title-select {
  font-size: 13px;
  font-weight: 500;
  color: inherit;
  white-space: nowrap;
}

.filter-all {
  width: v-bind("buttonWidth");
  height: v-bind("height");
}

.button-style {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 2px;
  width: v-bind("buttonWidth");
  height: v-bind("height");
  padding: 0 12px;
  background-color: white;
  border: 1px solid #e3e5ea;
  border-radius: 8px;
  color: #5a6274;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease,
    color 0.15s ease;
}

.button-style-search {
  display: flex;
  align-items: center;
  width: v-bind("buttonWidth");
  height: v-bind("height");
  padding: 0 12px;
  background-color: white;
  border: 1px solid #e3e5ea;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.button-style:hover,
.button-style-search:hover {
  border-color: #c9c3ee;
  background-color: #fafafe;
}

/* 搜索框聚焦：与外框一体的柔和反馈，不额外画硬描边 */
.button-style-search:focus-within {
  border-color: #6c5dd3;
  background-color: white;
  box-shadow: var(--record-focus-halo, 0 0 0 3px rgba(108, 93, 211, 0.12));
}

.button-style.is-active,
.button-style-search.is-active {
  border-color: #b7aef0;
  background-color: #f3f0fd;
  color: #6c5dd3;
}

.button-time {
  height: v-bind("height");
}

.search-reamrk {
  width: 16px;
  height: 16px;
  margin-right: 6px;
  opacity: 0.7;
}

:deep(.button-search .el-input__inner) {
  width: v-bind("width") !important;
  font-size: 13px;
  font-weight: 500;
  color: #1b1f27;
}

:deep(.button-search .el-input__inner::placeholder) {
  font-weight: 400;
  color: #a4a9b6;
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
  height: 30px !important;
}

:deep(.el-input__suffix) {
  width: 14px !important;
  height: 26px !important;
}

:deep(.el-input__wrapper) {
  box-shadow: none !important;
  flex-grow: 0 !important;
  padding: 0px;
  background: transparent;
}

:deep(.button-search .el-input__wrapper) {
  min-height: 0;
  height: 100%;
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
