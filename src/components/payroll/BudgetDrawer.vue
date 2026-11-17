<template>
  <el-drawer
    :model-value="modelValue"
    :title="L10n.set_budget"
    size="440"
    @update:model-value="close">
    <div class="budget-body" @focusin="selectOnFocus" @click="selectOnClick">
      <div class="budget-total">
        <span>{{ L10n.budget_total }}</span>
        <span class="budget-total-value">¥ {{ totalAmount.toFixed(2) }}</span>
      </div>

      <div v-if="items.length === 0" class="budget-empty">
        {{ L10n.no_budget }}
      </div>

      <div v-else class="budget-list">
        <div v-for="(item, index) in items" :key="index" class="budget-row">
          <el-input
            v-model="item.name"
            :placeholder="L10n.budget_name"
            class="budget-name" />
          <el-input-number
            v-model="item.amount"
            :min="0"
            :precision="2"
            :controls="false"
            class="budget-amount" />
          <el-button
            text
            type="danger"
            :icon="Delete"
            class="budget-delete"
            @click="removeItem(index)" />
        </div>
      </div>

      <el-button class="add-button" :icon="Plus" @click="addItem">
        {{ L10n.add_budget }}
      </el-button>
    </div>

    <template #footer>
      <el-button @click="close">{{ L10n.cancel }}</el-button>
      <el-button type="primary" :loading="saving" @click="save">
        {{ L10n.save_budget }}
      </el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { computed, ref, watch, defineProps, defineEmits } from "vue";
import { ElMessage } from "element-plus";
import { Delete, Plus } from "@element-plus/icons-vue";
import L10n from "@/configs/L10n.json";
import { BudgetItem } from "@/models/Payroll";
import { saveBudgets } from "@/utils/DataCenter";

const props = defineProps<{
  modelValue: boolean;
  budgets: BudgetItem[];
}>();

const emit = defineEmits(["update:modelValue", "saved"]);

const items = ref<BudgetItem[]>([]);
const saving = ref(false);

const totalAmount = computed(() =>
  items.value.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
);

watch(
  () => props.modelValue,
  (value) => {
    if (value) {
      items.value = props.budgets.map((item) => ({ ...item }));
      if (items.value.length === 0) {
        items.value.push({ id: 0, name: "", amount: 0 });
      }
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

function addItem() {
  items.value.push({ id: 0, name: "", amount: 0 });
}

function removeItem(index: number) {
  items.value.splice(index, 1);
}

function close() {
  emit("update:modelValue", false);
}

async function save() {
  // 允许保存空列表，用于清空全部预算
  const valid = items.value.filter((item) => item.name.trim());
  saving.value = true;
  try {
    await saveBudgets(valid);
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
.budget-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
}

.budget-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #faf9fe;
  border: 1px solid #efecfb;
  border-radius: 10px;
  font-size: 13px;
  color: #5a6274;
}

.budget-total-value {
  font-size: 18px;
  font-weight: 600;
  color: #6c5dd3;
  font-variant-numeric: tabular-nums;
}

.budget-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: calc(100vh - 300px);
  overflow-y: auto;
}

.budget-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.budget-name {
  flex: 1;
}

.budget-amount {
  width: 120px;
}

.budget-delete {
  flex: 0 0 auto;
}

.budget-empty {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: #9aa0ad;
}

.add-button {
  align-self: flex-start;
  width: 100%;
  border-style: dashed;
}
</style>
