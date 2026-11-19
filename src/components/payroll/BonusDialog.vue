<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? `${L10n.edit}${L10n.annual_bonus}` : L10n.add_bonus"
    width="480"
    align-center
    @update:model-value="close">
    <el-form label-width="88px" class="bonus-form" @focusin="selectOnFocus" @click="selectOnClick">
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
      <el-form-item :label="L10n.bonus">
        <el-input-number
          v-model="form.bonus"
          :min="0"
          :precision="2"
          :controls="false"
          class="number-input"
          @change="markDirty" />
      </el-form-item>

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
import { AnnualBonus } from "@/models/Payroll";
import { calcBonusTax } from "@/utils/PayrollTax";
import { createBonus, updateBonus } from "@/utils/DataCenter";

const props = defineProps<{
  modelValue: boolean;
  bonus: AnnualBonus | null;
}>();

const emit = defineEmits(["update:modelValue", "saved"]);

const isEdit = computed(() => !!props.bonus?.id);

const form = ref<AnnualBonus>({
  id: 0,
  date: Date.now(),
  bonus: 0,
  tax: 0,
  taxRate: 0,
  netPay: 0,
});

const saving = ref(false);
const needsCalc = ref(true);

function resetForm() {
  if (props.bonus) {
    form.value = { ...props.bonus };
    needsCalc.value = false;
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  form.value = {
    id: 0,
    date: today.getTime(),
    bonus: 0,
    tax: 0,
    taxRate: 0,
    netPay: 0,
  };
  needsCalc.value = true;
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
  input.select();
  requestAnimationFrame(() => input.select());
}

function markDirty() {
  needsCalc.value = true;
}

function markManual() {
  needsCalc.value = false;
}

function calculate() {
  const result = calcBonusTax(form.value.bonus);
  form.value.tax = result.tax;
  form.value.taxRate = result.taxRate;
  form.value.netPay = result.netPay;
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
      await updateBonus(form.value);
    } else {
      await createBonus(form.value);
    }
    ElMessage.success(isEdit.value ? L10n.bonus_updated : L10n.bonus_added);
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
.number-input {
  width: 100%;
}

.calc-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 110px 14px 14px;
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
