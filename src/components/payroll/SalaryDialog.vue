<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? `${L10n.edit}${L10n.salary}` : L10n.add_salary"
    width="560"
    align-center
    @update:model-value="close">
    <el-form label-width="96px" class="salary-form" @focusin="selectOnFocus" @click="selectOnClick">
      <el-form-item :label="L10n.time">
        <el-date-picker
          v-model="form.date"
          type="date"
          value-format="x"
          :clearable="false"
          format="YYYY-MM-DD"
          style="width: 100%"
          @change="markDirty" />
      </el-form-item>

      <div class="form-grid">
        <el-form-item :label="L10n.base_salary">
          <el-input-number
            v-model="form.baseSalary"
            :min="0"
            :precision="2"
            :controls="false"
            class="number-input"
            @change="markDirty" />
        </el-form-item>
        <el-form-item :label="L10n.social_insurance">
          <el-input-number
            v-model="form.socialInsurance"
            :min="0"
            :precision="2"
            :controls="false"
            class="number-input"
            @change="markDirty" />
        </el-form-item>
        <el-form-item :label="L10n.overtime_pay">
          <el-input-number
            v-model="form.overtimePay"
            :min="0"
            :precision="2"
            :controls="false"
            class="number-input"
            @change="markDirty" />
        </el-form-item>
        <el-form-item :label="L10n.one_time_bonus">
          <el-input-number
            v-model="form.oneTimeBonus"
            :min="0"
            :precision="2"
            :controls="false"
            class="number-input"
            @change="markDirty" />
        </el-form-item>
      </div>

      <div v-if="!isEdit && usePreviousDefaults" class="default-tip">
        {{ L10n.salary_default_tip }}
      </div>

      <div class="calc-panel">
        <div class="calc-row">
          <span class="calc-label">{{ L10n.tax }}</span>
          <el-input-number
            v-model="form.tax"
            :min="0"
            :precision="2"
            :controls="false"
            class="number-input"
            @change="markManual" />
        </div>
        <div class="calc-row">
          <span class="calc-label">{{ L10n.tax_rate }}</span>
          <el-input-number
            v-model="form.taxRate"
            :min="0"
            :max="100"
            :precision="2"
            :controls="false"
            class="number-input"
            @change="markManual" />
          <span class="calc-unit">%</span>
        </div>
        <div class="calc-row">
          <span class="calc-label">{{ L10n.net_pay }}</span>
          <el-input-number
            v-model="form.netPay"
            :min="0"
            :precision="2"
            :controls="false"
            class="number-input"
            @change="markManual" />
        </div>
        <el-button class="calc-button" @click="calculate">
          {{ L10n.calculate }}
        </el-button>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="close">{{ L10n.cancel }}</el-button>
      <el-button type="primary" :loading="saving" @click="save">
        {{ L10n.save }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch, defineProps, defineEmits } from "vue";
import { ElMessage } from "element-plus";
import L10n from "@/configs/L10n.json";
import { SalaryRecord } from "@/models/Payroll";
import { calcSalaryTax, findPreviousMonthSalary } from "@/utils/PayrollTax";
import { createSalary, updateSalary } from "@/utils/DataCenter";

const props = defineProps<{
  modelValue: boolean;
  salary: SalaryRecord | null;
  salaries: SalaryRecord[];
}>();

const emit = defineEmits(["update:modelValue", "saved"]);

const isEdit = computed(() => !!props.salary?.id);

const form = ref<SalaryRecord>({
  id: 0,
  date: Date.now(),
  baseSalary: 0,
  overtimePay: 0,
  oneTimeBonus: 0,
  socialInsurance: 0,
  tax: 0,
  taxRate: 0,
  netPay: 0,
  taxManual: 0,
});

const saving = ref(false);
const needsCalc = ref(true);
const usePreviousDefaults = ref(false);

function resetForm() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (props.salary) {
    form.value = { ...props.salary };
    needsCalc.value = false;
    usePreviousDefaults.value = false;
    return;
  }
  const previous = findPreviousMonthSalary(props.salaries);
  form.value = {
    id: 0,
    date: today.getTime(),
    baseSalary: previous ? Number(previous.baseSalary) || 0 : 0,
    overtimePay: 0,
    oneTimeBonus: 0,
    socialInsurance: previous ? Number(previous.socialInsurance) || 0 : 0,
    tax: 0,
    taxRate: 0,
    netPay: 0,
    taxManual: 0,
  };
  needsCalc.value = true;
  usePreviousDefaults.value = !!previous;
}

watch(
  () => props.modelValue,
  (value) => {
    if (value) {
      resetForm();
    }
  },
  { immediate: true }
);


function selectOnClick(event: MouseEvent) {
  const input = event.target as HTMLInputElement;
  if (!input || input.tagName !== "INPUT") {
    return;
  }
  requestAnimationFrame(() => input.select());
}

function selectOnFocus(event: FocusEvent) {
  const input = event.target as HTMLInputElement;
  if (!input || input.tagName !== "INPUT") {
    return;
  }
  // 聚焦时全选，直接输入即可覆盖 0.00，不用先删除
  input.select();
  input.select();
  requestAnimationFrame(() => input.select());
}

function markDirty() {
  needsCalc.value = true;
}

function markManual() {
  needsCalc.value = false;
  form.value.taxManual = 1;
}

function calculate() {
  const result = calcSalaryTax(form.value, props.salaries);
  form.value.tax = result.tax;
  form.value.taxRate = result.taxRate;
  form.value.netPay = result.netPay;
  form.value.taxManual = 0;
  needsCalc.value = false;
}

function close() {
  emit("update:modelValue", false);
}

async function save() {
  if (!form.value.date) {
    ElMessage.warning(L10n.date_failed_reason);
    return;
  }
  if (needsCalc.value) {
    calculate();
  }
  saving.value = true;
  try {
    if (isEdit.value) {
      await updateSalary(form.value);
    } else {
      await createSalary(form.value);
    }
    ElMessage.success(isEdit.value ? L10n.salary_updated : L10n.salary_added);
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
.salary-form {
  padding-right: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 12px;
}

.number-input {
  width: 100%;
}

.number-input :deep(.el-input__wrapper) {
  padding-left: 10px;
}

.default-tip {
  margin: -2px 0 12px 96px;
  font-size: 11px;
  color: #9aa0ad;
}

.calc-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
  padding: 14px 120px 14px 14px;
  background-color: #faf9fe;
  border: 1px solid #efecfb;
  border-radius: 10px;
}

.calc-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.calc-label {
  width: 76px;
  flex: 0 0 76px;
  font-size: 13px;
  color: #5a6274;
}

.calc-unit {
  font-size: 12px;
  color: #9aa0ad;
}

.calc-button {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
}
</style>
