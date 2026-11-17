<template>
  <div class="payroll-container">
    <div class="payroll-header">
      <div class="header-left">
        <span class="page-title">{{ L10n.payroll }}</span>
        <span class="page-subtitle">{{ L10n.salary }} · {{ L10n.annual_bonus }}</span>
      </div>
      <div class="header-stats">
        <div class="header-stat">
          <span class="stat-label">{{ L10n.payroll_year_income }}</span>
          <span class="stat-value income">+{{ yearIncome.toFixed(2) }}</span>
        </div>
        <div class="header-stat">
          <span class="stat-label">{{ L10n.payroll_year_tax }}</span>
          <span class="stat-value tax">-{{ yearTax.toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <div class="table-card" v-loading="loading" ref="tableCard">
      <el-table
        :data="tableRows"
        size="small"
        height="100%"
        :empty-text="L10n.payroll_empty"
        class="payroll-table">
        <el-table-column :label="L10n.date_label" :width="columnWidths.date" align="center">
          <template #default="{ row }">{{ formatDateByDot(new Date(row.date)) }}</template>
        </el-table-column>
        <el-table-column :label="L10n.record_type" :width="columnWidths.type" align="center">
          <template #default="{ row }">
            <span class="type-tag" :class="row.kind === 'salary' ? 'is-salary' : 'is-bonus'">
              {{ row.kind === 'salary' ? L10n.salary : L10n.annual_bonus }}
            </span>
          </template>
        </el-table-column>
        <el-table-column :label="L10n.base_salary" :width="columnWidths.base" align="right">
          <template #default="{ row }">
            <span v-if="row.kind === 'salary'">{{ money(row.baseSalary) }}</span>
            <span v-else class="placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column :label="L10n.overtime_pay" :width="columnWidths.overtime" align="right">
          <template #default="{ row }">
            <span v-if="row.kind === 'salary'">{{ money(row.overtimePay) }}</span>
            <span v-else class="placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column :label="L10n.one_time_bonus" :width="columnWidths.oneTime" align="right">
          <template #default="{ row }">
            <span v-if="row.kind === 'salary'">{{ money(row.oneTimeBonus) }}</span>
            <span v-else class="placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column :label="L10n.social_insurance" :width="columnWidths.insurance" align="right">
          <template #default="{ row }">
            <span v-if="row.kind === 'salary'">{{ money(row.socialInsurance) }}</span>
            <span v-else class="placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column :label="L10n.bonus" :width="columnWidths.bonus" align="right">
          <template #default="{ row }">
            <span v-if="row.kind === 'bonus'">{{ money(row.bonus) }}</span>
            <span v-else class="placeholder">—</span>
          </template>
        </el-table-column>
        <el-table-column :label="L10n.tax" :width="columnWidths.tax" align="right">
          <template #default="{ row }">{{ money(row.tax) }}</template>
        </el-table-column>
        <el-table-column :label="L10n.tax_rate" :width="columnWidths.rate" align="right">
          <template #default="{ row }">{{ percent(row.taxRate) }}</template>
        </el-table-column>
        <el-table-column :label="L10n.net_pay" :width="columnWidths.net" align="right">
          <template #default="{ row }"><span class="net-pay">{{ money(row.netPay) }}</span></template>
        </el-table-column>
        <el-table-column
          :label="L10n.operation"
          :width="columnWidths.operation"
          align="center"
          class-name="operation-column"
          label-class-name="operation-column">
          <template #default="{ row }">
            <div class="operation-actions">
              <el-button text type="primary" size="small" @click="editRow(row)">
                {{ L10n.edit }}
              </el-button>
              <span class="operation-divider"></span>
              <el-button text type="danger" size="small" @click="removeRow(row)">
                {{ L10n.delete }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="payroll-bottom">
      <div class="budget-card">
        <div class="budget-head">
          <span class="budget-title">{{ L10n.month_budget }}</span>
          <span class="budget-month">{{ monthLabel }}</span>
        </div>
        <div class="budget-stats">
          <div class="budget-stat">
            <span class="stat-label">{{ L10n.monthly_net_income }}</span>
            <span class="stat-number income">+{{ monthIncome.toFixed(2) }}</span>
          </div>
          <div class="budget-stat">
            <span class="stat-label">{{ L10n.budget_total }}</span>
            <span class="stat-number">-{{ budgetTotal.toFixed(2) }}</span>
          </div>
          <div class="budget-stat">
            <span class="stat-label">{{ L10n.total_budget }}</span>
            <span class="stat-number">{{ totalBudget.toFixed(2) }}</span>
          </div>
          <div class="budget-stat">
            <span class="stat-label">{{ L10n.month_expense }}</span>
            <span class="stat-number expense">-{{ monthExpense.toFixed(2) }}</span>
          </div>
          <div class="budget-stat is-highlight">
            <span class="stat-label">{{ remaining < 0 ? L10n.over_budget : L10n.current_budget }}</span>
            <span class="stat-number" :class="remaining < 0 ? 'expense' : 'income'">
              {{ (remaining < 0 ? -remaining : remaining).toFixed(2) }}
            </span>
          </div>
        </div>
        <div v-if="budgets.length > 0" class="budget-chips">
          <span v-for="item in budgets" :key="item.id" class="budget-chip">
            {{ item.name }} ¥{{ Number(item.amount).toFixed(2) }}
          </span>
        </div>
      </div>

      <div class="fab-group">
        <el-button class="fab" :icon="Setting" @click="budgetVisible = true">
          {{ L10n.set_budget }}
        </el-button>
        <el-dropdown trigger="click" @command="handleAddCommand">
          <el-button class="fab fab-primary" :icon="Plus">
            {{ L10n.add }}
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="salary">{{ L10n.add_salary }}</el-dropdown-item>
              <el-dropdown-item command="bonus">{{ L10n.add_bonus }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <SalaryDialog
      v-model="salaryVisible"
      :salary="editingSalary"
      :salaries="salaries"
      @saved="reloadAll" />
    <BonusDialog
      v-model="bonusVisible"
      :bonus="editingBonus"
      @saved="reloadAll" />
    <BudgetDrawer
      v-model="budgetVisible"
      :budgets="budgets"
      @saved="reloadAll" />
  </div>
</template>

<script lang="ts" setup>
import { computed, onActivated, onMounted, onUnmounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Setting } from "@element-plus/icons-vue";
import L10n from "@/configs/L10n.json";
import { AnnualBonus, BudgetItem, SalaryRecord } from "@/models/Payroll";
import {
  deleteBonus,
  deleteSalary,
  fetchBudgetExpense,
  fetchPayrollData,
} from "@/utils/DataCenter";
import { formatDateByDot } from "@/utils/DateUtils";
import { getFirstAndLastDate } from "@/components/dashboard/managers/MonthManager";
import { notifyCenter, NotifyType } from "@/utils/NotifyCenter";
import { applyPayrollCache, payrollCache, payrollDataChanged } from "./PayrollStore";
import SalaryDialog from "./SalaryDialog.vue";
import BonusDialog from "./BonusDialog.vue";
import BudgetDrawer from "./BudgetDrawer.vue";

interface PayrollRow {
  key: string;
  kind: "salary" | "bonus";
  id: number;
  date: number;
  baseSalary?: number;
  overtimePay?: number;
  oneTimeBonus?: number;
  socialInsurance?: number;
  bonus?: number;
  tax: number;
  taxRate: number;
  netPay: number;
}

const salaries = ref<SalaryRecord[]>(payrollCache.salaries);
const bonuses = ref<AnnualBonus[]>(payrollCache.bonuses);
const budgets = ref<BudgetItem[]>(payrollCache.budgets);
const monthExpense = ref(payrollCache.monthExpense);
const loading = ref(!payrollCache.loaded);
const BASE_COLUMN_WIDTHS = {
  date: 100,
  type: 84,
  base: 110,
  overtime: 96,
  oneTime: 108,
  insurance: 108,
  bonus: 100,
  tax: 92,
  rate: 96,
  net: 112,
};
const OPERATION_WIDTH = 128;

function computeColumnWidths(available: number) {
  const keys = Object.keys(BASE_COLUMN_WIDTHS) as (keyof typeof BASE_COLUMN_WIDTHS)[];
  const baseSum = keys.reduce((sum, key) => sum + BASE_COLUMN_WIDTHS[key], 0);
  const extra = Math.max(0, available - baseSum - OPERATION_WIDTH);
  const per = Math.floor(extra / keys.length);
  const next = { ...BASE_COLUMN_WIDTHS, operation: OPERATION_WIDTH } as {
    date: number; type: number; base: number; overtime: number; oneTime: number;
    insurance: number; bonus: number; tax: number; rate: number; net: number; operation: number;
  };
  keys.forEach((key) => {
    next[key] = BASE_COLUMN_WIDTHS[key] + per;
  });
  const used = keys.reduce((sum, key) => sum + next[key], 0) + OPERATION_WIDTH;
  next.net += available - used;
  return next;
}

// 首屏按窗口宽度预计算，避免切换 tab 时表格从旧宽度重新分配造成“弹一下”
const initialAvailable = Math.max(600, window.innerWidth - 266);
const columnWidths = ref(computeColumnWidths(initialAvailable));
const tableCard = ref<HTMLElement | null>(null);

function updateColumnWidths() {
  const card = tableCard.value;
  let available = card ? Math.floor(card.clientWidth - 20) : 0;
  if (available < 600) {
    available = window.innerWidth - 266;
  }
  if (available < 600) {
    return;
  }
  columnWidths.value = computeColumnWidths(available);
}

const salaryVisible = ref(false);
const bonusVisible = ref(false);
const budgetVisible = ref(false);
const editingSalary = ref<SalaryRecord | null>(null);
const editingBonus = ref<AnnualBonus | null>(null);

const tableRows = computed<PayrollRow[]>(() => {
  const salaryItems: PayrollRow[] = salaries.value.map((item) => ({
    key: `salary-${item.id}`,
    kind: "salary",
    id: item.id,
    date: Number(item.date),
    baseSalary: Number(item.baseSalary),
    overtimePay: Number(item.overtimePay),
    oneTimeBonus: Number(item.oneTimeBonus),
    socialInsurance: Number(item.socialInsurance),
    tax: Number(item.tax),
    taxRate: Number(item.taxRate),
    netPay: Number(item.netPay),
  }));
  const bonusItems: PayrollRow[] = bonuses.value.map((item) => ({
    key: `bonus-${item.id}`,
    kind: "bonus",
    id: item.id,
    date: Number(item.date),
    bonus: Number(item.bonus),
    tax: Number(item.tax),
    taxRate: Number(item.taxRate),
    netPay: Number(item.netPay),
  }));
  return [...salaryItems, ...bonusItems].sort((left, right) => {
    if (right.date !== left.date) {
      return right.date - left.date;
    }
    // 同一天先列工资，再列年终奖
    return left.kind === right.kind ? left.id - right.id : (left.kind === "salary" ? -1 : 1);
  });
});

const now = new Date();
const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
const monthLabel = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}`;

function inCurrentMonth(timestamp: number): boolean {
  return timestamp >= currentMonthStart && timestamp <= currentMonthEnd;
}

const monthIncome = computed(() => {
  const salaryNet = salaries.value
    .filter((item) => inCurrentMonth(Number(item.date)))
    .reduce((sum, item) => sum + Number(item.netPay || 0), 0);
  const bonusNet = bonuses.value
    .filter((item) => inCurrentMonth(Number(item.date)))
    .reduce((sum, item) => sum + Number(item.netPay || 0), 0);
  return salaryNet + bonusNet;
});

const budgetTotal = computed(() =>
  budgets.value.reduce((sum, item) => sum + Number(item.amount || 0), 0)
);

const totalBudget = computed(() => monthIncome.value - budgetTotal.value);

const remaining = computed(() => totalBudget.value - monthExpense.value);

const yearIncome = computed(() => {
  const year = now.getFullYear();
  const salaryNet = salaries.value
    .filter((item) => new Date(Number(item.date)).getFullYear() === year)
    .reduce((sum, item) => sum + Number(item.netPay || 0), 0);
  const bonusNet = bonuses.value
    .filter((item) => new Date(Number(item.date)).getFullYear() === year)
    .reduce((sum, item) => sum + Number(item.netPay || 0), 0);
  return salaryNet + bonusNet;
});

const yearTax = computed(() => {
  const year = now.getFullYear();
  const salaryTax = salaries.value
    .filter((item) => new Date(Number(item.date)).getFullYear() === year)
    .reduce((sum, item) => sum + Number(item.tax || 0), 0);
  const bonusTax = bonuses.value
    .filter((item) => new Date(Number(item.date)).getFullYear() === year)
    .reduce((sum, item) => sum + Number(item.tax || 0), 0);
  return salaryTax + bonusTax;
});

function money(value?: number): string {
  return Number(value || 0).toFixed(2);
}

function percent(value?: number): string {
  return `${Number(value || 0).toFixed(2)}%`;
}

async function loadExpense() {
  const [start, end] = getFirstAndLastDate(new Date());
  const expense = await fetchBudgetExpense(start.getTime(), end.getTime());
  monthExpense.value = expense;
  payrollCache.monthExpense = expense;
}

let reloadPromise: Promise<void> | null = null;

async function reloadAll() {
  if (reloadPromise) {
    return reloadPromise;
  }
  reloadPromise = (async () => {
    try {
      const [start, end] = getFirstAndLastDate(new Date());
      const [data, expense] = await Promise.all([
        fetchPayrollData(),
        fetchBudgetExpense(start.getTime(), end.getTime()),
      ]);
      const next = {
        salaries: data.salaries || [],
        bonuses: data.bonuses || [],
        budgets: data.budgets || [],
      };
      if (payrollDataChanged(next, {
        salaries: salaries.value,
        bonuses: bonuses.value,
        budgets: budgets.value,
      })) {
        salaries.value = next.salaries;
        bonuses.value = next.bonuses;
        budgets.value = next.budgets;
      }
      monthExpense.value = expense;
      applyPayrollCache(next, expense);
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : L10n.system_error);
    } finally {
      loading.value = false;
      reloadPromise = null;
    }
  })();
  return reloadPromise;
}

function editRow(row: PayrollRow) {
  if (row.kind === "salary") {
    editingSalary.value = salaries.value.find((item) => item.id === row.id) || null;
    salaryVisible.value = true;
  } else {
    editingBonus.value = bonuses.value.find((item) => item.id === row.id) || null;
    bonusVisible.value = true;
  }
}

async function removeRow(row: PayrollRow) {
  const isSalary = row.kind === "salary";
  try {
    await ElMessageBox.confirm(
      isSalary ? L10n.confirm_delete_salary : L10n.confirm_delete_bonus,
      L10n.delete,
      {
        confirmButtonText: L10n.confirm,
        cancelButtonText: L10n.cancel,
        type: "warning",
      }
    );
    if (isSalary) {
      await deleteSalary(row.id);
    } else {
      await deleteBonus(row.id);
    }
    await reloadAll();
    notifyCenter.emit(NotifyType.IMPORT_DATA_SUCCESS);
  } catch (error) {
    if (error !== "cancel" && error !== "close" && error instanceof Error) {
      ElMessage.error(error.message);
    }
  }
}

function handleAddCommand(command: string) {
  if (command === "salary") {
    editingSalary.value = null;
    salaryVisible.value = true;
  } else {
    editingBonus.value = null;
    bonusVisible.value = true;
  }
}

function handleRecordChanged() {
  loadExpense();
}

function handleImportChanged() {
  reloadAll();
}

function registerNotify() {
  notifyCenter.on(NotifyType.CREATE_RECORD_SUCCESS, handleRecordChanged);
  notifyCenter.on(NotifyType.UPDATE_RECORD_SUCCESS, handleRecordChanged);
  notifyCenter.on(NotifyType.DELETE_RECORD_SUCCESS, handleRecordChanged);
  notifyCenter.on(NotifyType.IMPORT_DATA_SUCCESS, handleImportChanged);
}

function disableNotify() {
  notifyCenter.off(NotifyType.CREATE_RECORD_SUCCESS, handleRecordChanged);
  notifyCenter.off(NotifyType.UPDATE_RECORD_SUCCESS, handleRecordChanged);
  notifyCenter.off(NotifyType.DELETE_RECORD_SUCCESS, handleRecordChanged);
  notifyCenter.off(NotifyType.IMPORT_DATA_SUCCESS, handleImportChanged);
}

let cardObserver: ResizeObserver | null = null;

onMounted(() => {
  reloadAll();
  registerNotify();
  updateColumnWidths();
  if (tableCard.value) {
    cardObserver = new ResizeObserver(() => updateColumnWidths());
    cardObserver.observe(tableCard.value);
  }
  window.addEventListener("resize", updateColumnWidths);
});

onUnmounted(() => {
  disableNotify();
  if (cardObserver) {
    cardObserver.disconnect();
    cardObserver = null;
  }
  window.removeEventListener("resize", updateColumnWidths);
});

onActivated(() => {
  updateColumnWidths();
  reloadAll();
});
</script>

<style scoped>
.payroll-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  height: 100%;
  padding: 16px 24px 24px 16px;
  min-height: 0;
}

.payroll-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background-color: #ffffff;
  border: 1px solid #ebecf0;
  border-radius: 12px;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #1b1f27;
}

.page-subtitle {
  font-size: 12px;
  color: #9aa0ad;
}

.header-stats {
  display: flex;
  align-items: center;
  gap: 28px;
}

.header-stat {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.stat-label {
  font-size: 12px;
  color: #5a6274;
}

.stat-value {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.income {
  color: #18a472;
}

.expense {
  color: #e2434f;
}

.tax {
  color: #b26a00;
}

.table-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  padding: 8px 10px 10px;
  background-color: #ffffff;
  border: 1px solid #ebecf0;
  border-radius: 12px;
  overflow: hidden;
}

.table-section {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 2px 6px 0;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #1b1f27;
}

.section-count {
  font-size: 11px;
  color: #9aa0ad;
}

.table-divider {
  height: 1px;
  margin: 2px 6px;
  background-color: #f2f3f6;
}

.payroll-table {
  width: 100%;
  font-size: 12px;
}

.placeholder {
  color: #c9ccd4;
}

.type-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 9px;
  font-size: 11px;
  line-height: 18px;
}

.type-tag.is-salary {
  background-color: #efecfb;
  color: #6c5dd3;
}

.type-tag.is-bonus {
  background-color: #fff4e5;
  color: #b26a00;
}

.payroll-table :deep(.operation-column) {
  background-color: #fafafc;
  border-left: 1px solid #eef0f4;
}

.payroll-table :deep(th.operation-column) {
  color: #8a90a2;
}

.operation-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.operation-divider {
  width: 1px;
  height: 12px;
  background-color: #e3e5ea;
}

.net-pay {
  font-weight: 600;
  color: #1b1f27;
}

.payroll-bottom {
  display: flex;
  flex: 0 0 auto;
  align-items: stretch;
  gap: 16px;
}

.budget-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  padding: 14px 20px;
  background-color: #ffffff;
  border: 1px solid #ebecf0;
  border-radius: 12px;
  min-width: 0;
}

.budget-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.budget-title {
  font-size: 14px;
  font-weight: 600;
  color: #1b1f27;
}

.budget-month {
  font-size: 12px;
  color: #9aa0ad;
}

.budget-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.budget-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background-color: #fafafc;
  border-radius: 8px;
}

.budget-stat.is-highlight {
  background-color: #f3f0fd;
}

.stat-number {
  font-size: 17px;
  font-weight: 600;
  color: #1b1f27;
  font-variant-numeric: tabular-nums;
}

.budget-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.budget-chip {
  padding: 2px 8px;
  background-color: #f6f5fb;
  border-radius: 10px;
  font-size: 11px;
  color: #6c5dd3;
}

.fab-group {
  display: flex;
  flex: 0 0 128px;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
}

.fab {
  width: 128px;
  height: 40px;
  border-radius: 20px;
  border: 1px solid #ebecf0;
  box-shadow: 0 6px 16px rgba(27, 31, 39, 0.08);
  background-color: #ffffff;
  color: #5a6274;
}

.fab:hover {
  color: #6c5dd3;
  border-color: #d9d3f5;
}

.fab-primary {
  background-color: #6c5dd3;
  border-color: #6c5dd3;
  color: #ffffff;
}

.fab-primary:hover {
  background-color: #5a4cc0;
  border-color: #5a4cc0;
  color: #ffffff;
}
</style>
