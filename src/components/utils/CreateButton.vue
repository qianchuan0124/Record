<template>
  <div
    v-if="buttonType === 'category'"
    class="button-style"
    :style="{ width: buttonWidth }">
    <span class="button-title">{{ L10n.category }}</span>
    <el-cascader
      :style="{ width: width, height: height }"
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
      :style="{ width: width, height: height }"
      type="number"
      :placeholder="`${L10n.amount_placeholder}`" />
  </div>
  <div
    v-else-if="buttonType === 'type'"
    class="button-style"
    :style="{ width: buttonWidth }">
    <span class="button-title">{{ L10n.type }}</span>
    <el-cascader
      :style="{ width: width, height: height }"
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
      :style="{ width: width, height: height }"
      :placeholder="`${L10n.remark_placeholder}`"
      clearable />
  </div>
  <div
    v-else-if="buttonType === 'time'"
    class="button-style"
    :style="{ width: buttonWidth }">
    <span class="button-title">{{ L10n.time }}</span>
    <el-date-picker
      :style="`width:${width}`"
      v-model="selectedTime"
      type="date"
      placeholder="Pick a day"
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

const buttonWidth = ref("");

// 根据size和buttonType计算宽高
const calculateDimensions = () => {
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
  font-size: 14px;
  color: v-bind("Color.info");
  margin-right: 10px;
  min-width: 30px;
  user-select: none !important;
}
.button-style {
  display: flex;
  align-items: center;
  justify-content: center;
  width: v-bind("buttonWidth");
  background-color: white; /* 设置背景色为白色 */
  box-shadow: 2px 2px 4px v-bind("Color.info");
  -webkit-app-region: drag;
  border-radius: 6px; /* 设置圆角 */
}

.button-style:hover,
.button-style:focus {
  border-color: v-bind("Color.primary"); /* 设置鼠标悬停时的边框颜色 */
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

.el-cascader .el-input__inner {
  border: none !important; /* 移除边框 */
  box-shadow: none !important; /* 如果有阴影也一并移除 */
  user-select: none !important; /* 禁止选中 */
}

:deep(.el-input__wrapper) {
  box-shadow: none !important;
  padding: 0px;
}
</style>

<style>
.custom-poper .el-cascader-menu__wrap {
  height: 350px !important;
}
</style>
