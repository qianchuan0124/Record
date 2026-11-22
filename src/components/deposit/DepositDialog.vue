<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? L10n.edit_deposit : L10n.add_deposit"
    width="560"
    align-center
    @update:model-value="close">
    <el-form label-width="88px" class="deposit-form" @focusin="selectOnFocus" @click="selectOnClick">
      <el-form-item :label="L10n.bank">
        <el-select v-model="form.bankKey" filterable style="width: 100%" :placeholder="L10n.select_bank">
          <el-option
            v-for="bank in banks"
            :key="bank.key"
            :label="bank.name"
            :value="bank.key">
            <div class="bank-option">
              <BankIcon :icon="bank.icon" :name="bank.name" :size="20" />
              <span>{{ bank.name }}</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <div class="form-grid">
        <el-form-item :label="L10n.deposit_time">
          <el-date-picker
            v-model="form.startDate"
            type="date"
            value-format="x"
            format="YYYY-MM-DD"
            :clearable="false"
            style="width: 100%" />
        </el-form-item>
        <el-form-item :label="L10n.amount">
          <div class="amount-field">
            <el-input-number
              v-model="form.amount"
              :min="0"
              :precision="2"
              :controls="false"
              class="number-input"
              @change="recalcInterest" />
            <span v-if="amountUnitText" class="amount-unit">{{ amountUnitText }}</span>
          </div>
        </el-form-item>
      </div>

      <div class="form-grid">
        <el-form-item :label="L10n.deposit_years">
          <el-input-number
            v-model="form.years"
            :min="0.5"
            :step="0.5"
            :precision="2"
            controls-position="right"
            class="number-input"
            @change="recalcInterest" />
        </el-form-item>
        <el-form-item :label="L10n.interest_rate">
          <div class="rate-field">
            <el-input-number
              v-model="form.rate"
              :min="0"
              :max="100"
              :step="0.05"
              :precision="3"
              controls-position="right"
              class="number-input"
              @change="recalcInterest" />
            <span class="unit">%</span>
          </div>
        </el-form-item>
      </div>

      <el-form-item :label="L10n.interest">
        <div class="interest-field">
          <el-input-number
            v-model="form.interest"
            :min="0"
            :precision="2"
            :controls="false"
            class="number-input interest-input" />
          <span class="auto-tip">{{ L10n.auto_interest_tip }}</span>
        </div>
      </el-form-item>

      <div class="maturity-line">
        <span>{{ L10n.maturity_time }}</span>
        <strong>{{ maturityText }}</strong>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="close">{{ L10n.cancel }}</el-button>
      <el-button type="primary" :loading="saving" @click="save">{{ L10n.save }}</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch, defineProps, defineEmits } from "vue";
import { ElMessage } from "element-plus";
import L10n from "@/configs/L10n.json";
import { BankOption, DepositRecord } from "@/models/Deposit";
import { createDeposit, updateDeposit } from "@/utils/DataCenter";
import { formatDateByDot } from "@/utils/DateUtils";
import BankIcon from "./BankIcon.vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  deposit: { type: Object as () => DepositRecord | null, default: null },
  banks: { type: Array as () => BankOption[], default: () => [] },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const isEdit = computed(() => !!props.deposit?.id);
const form = ref<DepositRecord>({
  id: 0,
  bankKey: "",
  startDate: Date.now(),
  amount: 0,
  years: 1,
  rate: 0,
  interest: 0,
  sortOrder: 0,
});
const saving = ref(false);

watch(
  () => props.modelValue,
  (value) => {
    if (!value) {
      return;
    }
    if (props.deposit) {
      form.value = { ...props.deposit };
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const defaultBank = props.banks.find((bank) => bank.name === "中国工商银行") || props.banks[0];
      form.value = {
        id: 0,
        bankKey: defaultBank?.key || "",
        startDate: today.getTime(),
        amount: 0,
        years: 1,
        rate: 0,
        interest: 0,
        sortOrder: 0,
      };
    }
  },
  { immediate: true }
);

const maturityText = computed(() => {
  if (!form.value.startDate || !form.value.years) {
    return "-";
  }
  const date = new Date(Number(form.value.startDate));
  const months = Math.max(1, Math.round(Number(form.value.years) * 12));
  date.setMonth(date.getMonth() + months);
  return formatDateByDot(date);
});

function round2(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

const amountUnitText = computed(() => {
  const amount = Number(form.value.amount) || 0;
  if (amount < 1000) {
    return "";
  }
  const format = (value: number) => {
    const truncated = Math.floor(value * 100) / 100;
    return String(truncated);
  };
  if (amount < 10000) {
    return `${format(amount / 1000)}千`;
  }
  if (amount < 100000000) {
    return `${format(amount / 10000)}万`;
  }
  return `${format(amount / 100000000)}亿`;
});

function recalcInterest() {
  const amount = Number(form.value.amount) || 0;
  const years = Number(form.value.years) || 0;
  const rate = Number(form.value.rate) || 0;
  form.value.interest = round2(amount * (rate / 100) * years);
}

function selectOnFocus(event: FocusEvent) {
  const input = event.target as HTMLInputElement;
  if (!input || input.tagName !== "INPUT") {
    return;
  }
  input.select();
  input.select();
  requestAnimationFrame(() => input.select());
}

function selectOnClick(event: MouseEvent) {
  const input = event.target as HTMLInputElement;
  if (!input || input.tagName !== "INPUT") {
    return;
  }
  requestAnimationFrame(() => input.select());
}

function close() {
  emit("update:modelValue", false);
}

async function save() {
  if (!form.value.bankKey) {
    ElMessage.warning(L10n.select_bank);
    return;
  }
  if (!form.value.startDate) {
    ElMessage.warning(L10n.date_failed_reason);
    return;
  }
  if (!form.value.amount || Number(form.value.amount) <= 0) {
    ElMessage.warning(L10n.deposit_amount_required);
    return;
  }
  if (!form.value.years || Number(form.value.years) <= 0) {
    ElMessage.warning(L10n.deposit_years);
    return;
  }
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateDeposit(form.value);
    } else {
      await createDeposit(form.value);
    }
    ElMessage.success(isEdit.value ? L10n.deposit_updated : L10n.deposit_added);
    emit("saved");
    close();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : L10n.system_error);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.deposit-form {
  padding-right: 8px;
}

.bank-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 14px;
}

.number-input {
  width: 100%;
}

.rate-field {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  min-width: 0;
}

.rate-field .number-input {
  flex: 1;
  min-width: 0;
}

.unit {
  flex: 0 0 auto;
  font-size: 12px;
  color: #9aa0ad;
}

.amount-field {
  position: relative;
  width: 100%;
  min-width: 0;
}

.amount-field .number-input {
  width: 100%;
}

.amount-field :deep(.el-input__wrapper) {
  padding-right: 52px;
}

.amount-unit {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  font-size: 11px;
  color: #6c5dd3;
  pointer-events: none;
}

.interest-field {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.interest-input {
  width: 200px;
  flex: 0 0 auto;
}

.auto-tip {
  font-size: 11px;
  color: #9aa0ad;
  line-height: 1.4;
}

.maturity-line {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
  padding: 8px 12px;
  background-color: #faf9fe;
  border: 1px solid #efecfb;
  border-radius: 8px;
  font-size: 12px;
  color: #5a6274;
}

.maturity-line strong {
  color: #6c5dd3;
}
</style>
