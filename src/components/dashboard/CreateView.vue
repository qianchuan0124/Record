<template>
  <div class="create-table">
    <div class="total-container">
      <img class="all-account-img" src="@/assets/all_account_icon.svg" />
      <div class="total-text">
        <div class="income-span">{{ allIncome }}</div>
        <div class="expend-span">{{ allExpend }}</div>
      </div>
    </div>
    <div class="action-container">
      <div class="center-input">
        <div class="top-input" ref="centerInput">
          <CreateButton
            ref="categoryButton"
            class="create-item"
            button-type="category"
            :custom-width="normalInputWidth"
            size="large"></CreateButton>
          <CreateButton
            ref="typeButton"
            button-type="type"
            size="large"
            :custom-width="normalInputWidth"
            class="left"></CreateButton>
          <CreateButton
            ref="amountButton"
            button-type="amount"
            :custom-width="normalInputWidth"
            size="large"></CreateButton>
        </div>
        <div class="bottom-input">
          <CreateButton
            ref="timeButton"
            class="create-item"
            button-type="time"
            :custom-width="normalInputWidth"
            size="large"></CreateButton>
          <CreateButton
            ref="remarkButton"
            button-type="remark"
            :custom-width="remarkInputWidth"
            size="large"></CreateButton>
        </div>
      </div>
      <div class="right-action">
        <div class="create-button">
          <AccountButton
            :buttonWidth="createButtonWidth"
            buttonHeight="77px"
            :button-text="L10n.create"
            textFontSize="28px"
            :clickHandler="createRecord"
            button-type="primary"></AccountButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  ComponentPublicInstance,
  onMounted,
  onDeactivated,
  onUnmounted,
} from "vue";
import AccountButton from "@/components/utils/AccountButton.vue";
import CreateButton from "@/components/utils/CreateButton.vue";
import Color from "@/configs/Color.json";
import L10n from "@/configs/L10n.json";
import { ElMessage } from "element-plus";
import {
  asyncCreateRecord,
  fetchTotalAmount,
  logInfo,
} from "@/utils/DataCenter";
import {
  notifyCenter,
  NotifyType,
  sendRecordChangeNotify,
} from "@/utils/NotifyCenter";

type CreateButtonType = ComponentPublicInstance<typeof CreateButton>;

const categoryButton = ref<CreateButtonType | null>(null);

const typeButton = ref<CreateButtonType | null>(null);

const amountButton = ref<CreateButtonType | null>(null);

const timeButton = ref<CreateButtonType | null>(null);

const remarkButton = ref<CreateButtonType | null>(null);

const allIncome = ref<string>("");
const allExpend = ref<string>("");

async function createRecord() {
  const category = categoryButton.value?.getCurrentValue()[0];
  const subCategory = categoryButton.value?.getCurrentValue()[1];
  const type = typeButton.value?.getCurrentValue();
  const amount = amountButton.value?.getCurrentValue();
  const date = timeButton.value?.getCurrentValue();
  const remark = remarkButton.value?.getCurrentValue();
  const id = 0;
  const isDeleted = false;
  logInfo(
    "will create record catrgoey: " +
      category +
      " type: " +
      type +
      " amount: " +
      amount +
      " date: " +
      date +
      " reamrk: " +
      remark
  );
  // 获取返回的内容进一步处理
  const record = {
    id,
    category,
    subCategory,
    type,
    amount,
    date,
    remark,
    isDeleted,
  };

  try {
    await asyncCreateRecord(record);
    categoryButton.value?.cleanValue();
    typeButton.value?.cleanValue();
    amountButton.value?.cleanValue();
    timeButton.value?.cleanValue();
    remarkButton.value?.cleanValue();
    sendRecordChangeNotify(NotifyType.CREATE_RECORD_SUCCESS, record);
    ElMessage.success(L10n.create_success);
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
  }
}

function onRecordChanged() {
  updateTotalAmount();
}

async function updateTotalAmount() {
  try {
    const data = await fetchTotalAmount();
    allIncome.value = "+ " + data.income.toFixed(2);
    allExpend.value = "- " + data.outcome.toFixed(2);
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
    allIncome.value = "+ 0.00";
    allExpend.value = "- 0.00";
  }
}

function registerNotify() {
  notifyCenter.on(NotifyType.CREATE_RECORD_SUCCESS, () => {
    onRecordChanged();
  });
  notifyCenter.on(NotifyType.UPDATE_RECORD_SUCCESS, () => {
    onRecordChanged();
  });
  notifyCenter.on(NotifyType.DELETE_RECORD_SUCCESS, () => {
    onRecordChanged();
  });

  notifyCenter.on(NotifyType.IMPORT_DATA_SUCCESS, updateTotalAmount);
}

function disableNotify() {
  notifyCenter.off(NotifyType.CREATE_RECORD_SUCCESS, onRecordChanged);
  notifyCenter.off(NotifyType.UPDATE_RECORD_SUCCESS, onRecordChanged);
  notifyCenter.off(NotifyType.DELETE_RECORD_SUCCESS, onRecordChanged);
  notifyCenter.off(NotifyType.IMPORT_DATA_SUCCESS, updateTotalAmount);
}

const totalContainerWidth = ref("250px");
const inputContainerWidth = ref("550px");
const actionContainerWidth = ref("750px");
const normalInputWidth = ref("167px");
const remarkInputWidth = ref("385px");
const createButtonWidth = ref("200px");
const createContainerWidth = ref("142px");
const createViewWidth = ref("1000px");
const normalInputRightMargin = ref("12px");
const centerInput = ref<HTMLElement>();

function handleContainerWidth() {
  const totalWidth = Math.max(window.innerWidth - 200, 1000);
  createViewWidth.value = totalWidth + "px";
  totalContainerWidth.value = totalWidth * 0.35 + "px";
  inputContainerWidth.value = totalWidth * 0.5 + "px";
  actionContainerWidth.value = totalWidth * 0.85 + "px";
  normalInputWidth.value =
    Math.min(260, (parseInt(inputContainerWidth.value) - 2 * 24) / 3) + "";
  if (normalInputWidth.value === "260") {
    normalInputRightMargin.value =
      (parseInt(inputContainerWidth.value) -
        parseInt(normalInputWidth.value) * 3) /
        4 +
      "px";
  } else {
    normalInputRightMargin.value = "12px";
  }

  remarkInputWidth.value =
    parseInt(normalInputWidth.value) * 2 +
    parseInt(normalInputRightMargin.value) +
    "";
  createContainerWidth.value = totalWidth * 0.15 + "px";
  createButtonWidth.value = parseInt(createContainerWidth.value) - 48 + "px";
}

onMounted(async () => {
  // 获取总收入和总支出
  updateTotalAmount();
  window.addEventListener("resize", handleContainerWidth);
  handleContainerWidth();
  registerNotify();
});

onUnmounted(() => {
  window.removeEventListener("resize", handleContainerWidth);
  disableNotify();
});

onDeactivated(() => {
  window.removeEventListener("resize", handleContainerWidth);
  disableNotify();
});
</script>

<style scoped>
.total-container {
  width: v-bind("totalContainerWidth");
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
}

.all-account-img {
  width: 70px;
  height: 100px;
  margin-right: 24px;
  margin-left: 24px;
  margin-bottom: 42px;
}

.total-text {
  display: flex;
  flex-direction: column;
  text-align: right;
  justify-content: space-evenly;
}

.create-item {
  margin-right: 24px;
}

.create-table {
  width: v-bind("createViewWidth");
  background-color: white;
  border-radius: 10px;
  margin-left: 22px;
  margin-right: 22px;
  margin-top: 12px;
  display: flex;
  justify-content: flex-start;
  flex-direction: row;
  min-width: 1000px;
}

.action-container {
  display: flex;
  width: v-bind("actionContainerWidth");
  justify-content: center;
}

.center-input {
  flex: 0.618;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
}

.top-input {
  display: flex;
  flex-direction: row;
  width: v-bind("inputContainerWidth");
}

.top-input > * {
  margin-right: v-bind("normalInputRightMargin");
}

.bottom-input {
  display: flex;
  flex-direction: row;
}

.bottom-input > * {
  margin-right: v-bind("normalInputRightMargin");
}

.right-action {
  flex: 0.382;
  width: v-bind("createContainerWidth");
  margin-left: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
}

.income-span {
  font-size: 28px;
  height: 32px;
  color: v-bind("Color.success");
}

.expend-span {
  font-size: 28px;
  height: 32px;
  color: v-bind("Color.delete");
}

.create-type-amount {
  display: flex;
  align-items: center;
  width: 407px;
}

.create-type-amount .left {
  margin-right: 24px;
}

.create-button {
  display: flex;
  justify-content: space-around;
  margin-right: 36px;
}
</style>
