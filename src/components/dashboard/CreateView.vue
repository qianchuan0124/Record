<template>
  <div class="create-table">
    <div class="total-container">
      <img class="all-account-img" src="@/assets/all_account_icon.svg" />
      <div class="total-text">
        <div class="total-item">
          <span class="total-label">{{ L10n.income }}</span>
          <span class="income-span">{{ allIncome }}</span>
        </div>
        <div class="total-item">
          <span class="total-label">{{ L10n.expense }}</span>
          <span class="expend-span">{{ allExpend }}</span>
        </div>
      </div>
    </div>
    <div class="action-container">
      <div class="center-input">
        <div class="top-input">
          <CreateButton
            ref="categoryButton"
            button-type="category"
            custom-width="auto"
            size="large"></CreateButton>
          <CreateButton
            ref="typeButton"
            button-type="type"
            size="large"
            custom-width="auto"></CreateButton>
          <CreateButton
            ref="amountButton"
            button-type="amount"
            custom-width="auto"
            size="large"></CreateButton>
        </div>
        <div class="bottom-input">
          <CreateButton
            ref="timeButton"
            button-type="time"
            custom-width="auto"
            size="large"></CreateButton>
          <CreateButton
            ref="remarkButton"
            button-type="remark"
            custom-width="auto"
            size="large"></CreateButton>
        </div>
      </div>
      <div class="right-action">
        <div class="create-button">
          <AccountButton
            buttonWidth="168px"
            buttonHeight="100%"
            :button-text="L10n.create"
            textFontSize="26px"
            :clickHandler="createRecord"
            :disabled="submitting"
            button-type="primary"></AccountButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, ComponentPublicInstance, onMounted, onDeactivated, onUnmounted } from "vue";
import AccountButton from "@/components/utils/AccountButton.vue";
import CreateButton from "@/components/utils/CreateButton.vue";
import L10n from "@/configs/L10n.json";
import { ElMessage } from "element-plus";
import { notifySuccess } from "@/utils/GlobalErrorHandler";
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
// 提交中标记，防止连点重复创建账单
const submitting = ref<boolean>(false);

async function createRecord() {
  // 上一次提交未完成时，直接忽略后续点击
  if (submitting.value) {
    return;
  }
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

  submitting.value = true;
  try {
    await asyncCreateRecord(record);
    categoryButton.value?.cleanValue();
    typeButton.value?.cleanValue();
    amountButton.value?.cleanValue();
    timeButton.value?.cleanValue();
    remarkButton.value?.cleanValue();
    sendRecordChangeNotify(NotifyType.CREATE_RECORD_SUCCESS, record);
    notifySuccess(L10n.create_success);
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
  } finally {
    // 无论成功或失败都复位，避免异常时一直无法再次提交
    submitting.value = false;
  }
}

function onRecordChanged() {
  updateTotalAmount();
}

async function updateTotalAmount() {
  try {
    const data = await fetchTotalAmount();
    allIncome.value = "+" + data.income.toFixed(2);
    allExpend.value = "-" + data.outcome.toFixed(2);
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
    allIncome.value = "+0.00";
    allExpend.value = "-0.00";
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

onMounted(async () => {
  // 获取总收入和总支出
  updateTotalAmount();
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
.create-table {
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: 12px;
  padding: 16px 20px;
  background-color: white;
  border: 1px solid #ebecf0;
  border-radius: 12px;
}

.total-container {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 12px;
  padding-right: 24px;
  border-right: 1px solid #ebecf0;
}

.all-account-img {
  width: 44px;
  height: 60px;
  object-fit: contain;
}

.total-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.total-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.total-label {
  min-width: 24px;
  font-size: 12px;
  color: #5a6274;
}

.income-span,
.expend-span {
  font-size: 20px;
  line-height: 1.2;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.income-span {
  color: #18a472;
}

.expend-span {
  color: #e2434f;
}

.action-container {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 24px;
  min-width: 0;
  padding-left: 24px;
}

.center-input {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 10px;
  min-width: 0;
}

.top-input {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
}

.bottom-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 12px;
  width: 100%;
}

.right-action {
  display: flex;
  align-items: stretch;
  align-self: stretch;
  flex: 0 0 auto;
  padding-left: 8px;
}

.create-button {
  display: flex;
}
</style>
