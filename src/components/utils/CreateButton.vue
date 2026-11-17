<template>
  <div
    v-if="buttonType === 'category'"
    class="button-style"
    :style="{ width: buttonWidth }">
    <span class="button-title">{{ L10n.category }}</span>
    <el-cascader
      :style="{ width: width, height: controlHeight }"
      v-model="categoryValue"
      :options="categoriesOptions"
      :props="categoryProps"
      :show-all-levels="false"
      popper-class="custom-poper"
      filterable />
  </div>
  <div
    v-else-if="buttonType === 'amount'"
    class="button-style"
    :style="{ width: buttonWidth }">
    <span class="button-title">{{ L10n.amount }}</span>
    <el-input
      v-model="amountValue"
      :style="{ width: width, height: controlHeight }"
      type="number"
      :placeholder="`${L10n.amount_placeholder}`" />
  </div>
  <div
    v-else-if="buttonType === 'type'"
    class="button-style"
    :style="{ width: buttonWidth }">
    <span class="button-title">{{ L10n.type }}</span>
    <el-cascader
      :style="{ width: width, height: controlHeight }"
      v-model="typeValue"
      :options="typeOptions"
      :props="categoryProps" />
  </div>
  <div
    v-else-if="buttonType === 'remark'"
    class="button-style"
    :style="{ width: buttonWidth }">
    <span class="button-title">{{ L10n.remark }}</span>
    <el-input
      v-model="remarkValue"
      :style="{ width: width, height: controlHeight }"
      :placeholder="`${L10n.remark_placeholder}`"
      clearable />
  </div>
  <div
    v-else-if="buttonType === 'time'"
    class="button-style"
    :style="{ width: buttonWidth }">
    <span class="button-title">{{ L10n.time }}</span>
    <el-date-picker
      :style="`width:${width};height:${controlHeight}`"
      v-model="selectedTime"
      type="date"
      :placeholder="L10n.select_date"
      :clearable="false" />
  </div>
</template>

<script lang="ts" setup>
import {
  PropType,
  defineProps,
  toRefs,
  ref,
  watchEffect,
  onMounted,
  defineExpose,
  watch,
  onUnmounted,
  onDeactivated,
} from "vue";
import Color from "@/configs/Color.json";
import L10n from "@/configs/L10n.json";
import {
  accountTypes,
  findCategoryByChildValue,
  findTypeValueByLabel,
  getFirstCategoryItem,
  getFirstTypeItem,
  findTypeLabelByValue,
  findCategoryLabelByValue,
  getCategories,
  CategoryItem,
} from "@/configs/CategoryParser";
import { notifyCenter, NotifyType } from "@/utils/NotifyCenter";

const categoryValue = ref<string[]>([]);
const typeValue = ref<string[]>([]);
const selectedTime = ref(Date.now());
const amountValue = ref("");
const remarkValue = ref("");

const categoryProps = {
  expandTrigger: "hover" as const,
};

function setupValues() {
  typeValue.value = getFirstTypeItem();
  amountValue.value = "";
  remarkValue.value = "";
}

function getCurrentValue() {
  switch (props.buttonType) {
    case "category":
      return categoryValue.value.map((item) => {
        return findCategoryLabelByValue(item);
      });
    case "type":
      return findTypeLabelByValue(typeValue.value[0]);
    case "amount":
      return amountValue.value;
    case "remark":
      return remarkValue.value;
    case "time":
      return new Date(selectedTime.value);
    default:
      return "";
  }
}

function cleanValue() {
  setupValues();
}

function initValue() {
  setupValues();
  categoryValue.value = getFirstCategoryItem();
}

defineExpose({
  getCurrentValue,
  cleanValue,
});

const categoriesOptions = ref<CategoryItem[]>([]);

const typeOptions = accountTypes;

const props = defineProps({
  size: {
    type: String as PropType<"small" | "large">,
    default: "small",
  },
  content: {
    type: String,
    default: "",
  },
  customWidth: {
    type: String,
    default: "0",
  },
  buttonType: {
    type: String as PropType<
      "category" | "type" | "amount" | "time" | "remark"
    >,
    default: "remark",
  },
  clickHandler: {
    type: Function as PropType<() => void>,
    default: () => {},
  },
});

const { buttonType } = toRefs(props);

const width = ref("");
const height = ref("");
// 内部控件高度跟随外框内容区，避免溢出后发现的白底盖住外框上下边框
const controlHeight = ref("100%");

const buttonWidth = ref("");

// 根据size和buttonType计算宽高
const calculateDimensions = () => {
  // 自适应模式：由父级栅格决定宽度，控件填满可用空间
  if (props.customWidth === "auto") {
    buttonWidth.value = "100%";
    width.value = "calc(100% - 32px)";
    height.value = props.size === "large" ? "36px" : "30px";
    return;
  }
  switch (props.buttonType) {
    case "category":
    case "type":
      switch (props.size) {
        case "small":
          if (props.customWidth === "0") {
            width.value = "115px";
            buttonWidth.value = "165px";
            height.value = "30px";
          } else {
            width.value = `${parseInt(props.customWidth) - 50}px`;
            buttonWidth.value = props.customWidth + "px";
            height.value = "30px";
          }
          break;
        case "large":
          if (props.customWidth === "0") {
            width.value = "145px";
            buttonWidth.value = "195px";
            height.value = "30px";
          } else {
            width.value = `${parseInt(props.customWidth) - 50}px`;
            buttonWidth.value = props.customWidth + "px";
            height.value = "30px";
          }
          break;
        default:
          if (props.customWidth === "0") {
            width.value = "115px";
            buttonWidth.value = "165px";
            height.value = "30px";
          } else {
            width.value = `${parseInt(props.customWidth) - 50}px`;
            buttonWidth.value = props.customWidth + "px";
            height.value = "30px";
          }
          width.value = "115px"; // 默认值
          buttonWidth.value = "165px";
          height.value = "30px";
      }
      break;
    case "remark":
      switch (props.size) {
        case "small":
          if (props.customWidth === "0") {
            width.value = "295px";
            buttonWidth.value = "345px";
            height.value = "30px";
          } else {
            width.value = `${parseInt(props.customWidth) - 50}px`;
            buttonWidth.value = props.customWidth + "px";
            height.value = "30px";
          }
          break;
        case "large":
          if (props.customWidth === "0") {
            width.value = "355px";
            buttonWidth.value = "405px";
            height.value = "30px";
          } else {
            width.value = `${parseInt(props.customWidth) - 50}px`;
            buttonWidth.value = props.customWidth + "px";
            height.value = "30px";
          }
          break;
        default:
          width.value = "115px";
          buttonWidth.value = "165px";
          height.value = "30px";
      }
      break;
    default:
      switch (props.size) {
        case "small":
          if (props.customWidth === "0") {
            width.value = "115px";
            buttonWidth.value = "165px";
            height.value = "30px";
          } else {
            width.value = `${parseInt(props.customWidth) - 50}px`;
            buttonWidth.value = props.customWidth + "px";
            height.value = "30px";
          }
          break;
        case "large":
          if (props.customWidth === "0") {
            width.value = "145px";
            buttonWidth.value = "195px";
            height.value = "30px";
          } else {
            width.value = `${parseInt(props.customWidth) - 50}px`;
            buttonWidth.value = props.customWidth + "px";
            height.value = "30px";
          }
          break;
        default:
          width.value = "115px";
          buttonWidth.value = "165px";
          height.value = "30px";
      }
  }
};

watch(
  () => props.customWidth,
  () => {
    calculateDimensions();
  },
  {
    immediate: true, // 立即执行一次
  }
);

watchEffect(() => {
  calculateDimensions();
});

onMounted(() => {
  notifyCenter.on(NotifyType.CATEGORY_DATA_UPDATE, updateCategorys);
  const content = props.content;
  let findType; // Move the declaration outside of the switch statement
  if (content) {
    switch (props.buttonType) {
      case "category":
        categoriesOptions.value = getCategories();
        findType = findCategoryByChildValue(content);
        if (findType.length == 2) {
          categoryValue.value = [findType[0].value, findType[1].value];
        }
        break;
      case "type":
        findType = findTypeValueByLabel(content);
        if (findType) {
          typeValue.value = [findType];
        }
        break;
      case "amount":
        amountValue.value = content;
        break;
      case "remark":
        remarkValue.value = content;
        break;
      case "time":
        selectedTime.value = new Date(content).getTime();
        break;
      default:
        break;
    }
  } else {
    updateCategorys();
  }
});

onUnmounted(() => {
  notifyCenter.off(NotifyType.CATEGORY_DATA_UPDATE, updateCategorys);
});

onDeactivated(() => {
  notifyCenter.off(NotifyType.CATEGORY_DATA_UPDATE, updateCategorys);
});

function updateCategorys() {
  categoriesOptions.value = getCategories();
  initValue();
}
</script>

<style scoped>
.button-title {
  font-size: 12px;
  font-weight: 400;
  color: #9aa0ad;
  margin-right: 6px;
  min-width: 24px;
  text-align: left;
  white-space: nowrap;
  user-select: none !important;
}
.button-style {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: v-bind("buttonWidth");
  height: v-bind("height");
  padding: 0 10px;
  background-color: white;
  border: 1px solid #e3e5ea;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  -webkit-app-region: drag;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.button-style:hover {
  border-color: #c9c3ee;
}

.button-style:focus-within {
  border-color: v-bind("Color.primary");
  box-shadow: var(--record-focus-halo, 0 0 0 3px rgba(108, 93, 211, 0.12));
}

:deep(.el-input__prefix) {
  display: none;
}

:deep(.el-date-editor .el-input__suffix) {
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

.el-cascader .el-input__inner {
  border: none !important; /* 移除边框 */
  box-shadow: none !important; /* 如果有阴影也一并移除 */
  user-select: none !important; /* 禁止选中 */
}

:deep(.el-input),
:deep(.el-cascader),
:deep(.el-date-editor) {
  height: 100%;
  line-height: normal;
}

:deep(.el-input__wrapper) {
  box-shadow: none !important;
  padding: 0px;
  min-height: 0;
  height: 100%;
  background-color: transparent;
}

:deep(.el-input__inner) {
  font-size: 13px;
  font-weight: 600;
  color: #1b1f27;
}

:deep(.el-input__inner::placeholder) {
  font-weight: 400;
  color: #a4a9b6;
}

/* 窄窗口下标签换到控件上方，避免栅格列太窄把值截断 */
@media (max-width: 1023px) {
  .button-style {
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    gap: 1px;
    height: 48px;
    padding: 3px 8px;
  }

  .button-style .button-title {
    min-width: 0;
    margin-right: 0;
    font-size: 11px;
    line-height: 1.2;
    color: #9aa0ad;
  }

  .button-style :deep(.el-input),
  .button-style :deep(.el-cascader),
  .button-style :deep(.el-date-editor) {
    width: 100% !important;
    height: 26px !important;
  }
}

:deep(.el-select__placeholder),
:deep(.el-cascader__search-input) {
  font-size: 13px;
  font-weight: 400;
  color: #a4a9b6;
}
</style>

<style>
.custom-poper .el-cascader-menu__wrap {
  height: 350px !important;
}
</style>
