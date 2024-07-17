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
        <div class="top-input">
          <CreateButton
            ref="categoryButton"
            class="create-item"
            button-type="category"
            size="large"></CreateButton>
          <div class="create-type-amount">
            <CreateButton
              ref="typeButton"
              button-type="type"
              size="large"
              class="left"></CreateButton>
            <CreateButton
              ref="amountButton"
              button-type="amount"
              size="large"></CreateButton>
          </div>
        </div>
        <div class="bottom-input">
          <CreateButton
            ref="timeButton"
            class="create-item"
            button-type="time"
            size="large"></CreateButton>
          <CreateButton
            ref="remarkButton"
            button-type="remark"
            size="large"></CreateButton>
        </div>
      </div>
      <div class="right-action">
        <div class="create-button">
          <AccountButton
            buttonWidth="164px"
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
import { ref, ComponentPublicInstance, onMounted, onDeactivated } from "vue";
import AccountButton from "@/components/utils/AccountButton.vue";
import CreateButton from "@/components/utils/CreateButton.vue";
import Color from "@/configs/Color.json";
import L10n from "@/configs/L10n.json";
import { ElMessage } from "element-plus";
import { asyncCreateRecord, fetchTotalAmount } from "@/utils/DataCenter";
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
  console.log(category, type, amount, date, remark);
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
    console.log(error);
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
    console.log(error);
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
    allIncome.value = "+ 0.00";
    allExpend.value = "- 0.00";
  }
}

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

onDeactivated(() => {
  notifyCenter.off(NotifyType.CREATE_RECORD_SUCCESS, onRecordChanged);
  notifyCenter.off(NotifyType.UPDATE_RECORD_SUCCESS, onRecordChanged);
  notifyCenter.off(NotifyType.DELETE_RECORD_SUCCESS, onRecordChanged);
  notifyCenter.off(NotifyType.IMPORT_DATA_SUCCESS, updateTotalAmount);
});

onMounted(async () => {
  // 获取总收入和总支出
  updateTotalAmount();
});
</script>

<style scoped>
.total-container {
  width: 350px;
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
  background-color: white;
  border-radius: 10px;
  margin-left: 22px;
  margin-right: 22px;
  display: flex;
  justify-content: flex-start;
  flex-direction: row;
}

.action-container {
  display: flex;
  width: calc(100% - 350px);
  justify-content: center;
}

.center-input {
  flex: 0.618;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
}

.top-input {
  display: flex;
  flex-direction: row;
  justify-content: center;
  width: 626px;
}

.bottom-input {
  display: flex;
  flex-direction: row;
}

.right-action {
  flex: 0.382;
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
