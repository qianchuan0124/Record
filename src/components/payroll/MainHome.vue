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
        ref="tableRef"
        :data="tableRows"
        size="small"
        height="100%"
        :empty-text="L10n.payroll_empty"
        class="payroll-table">
        <el-table-column :label="L10n.date_label" :width="columnWidths.date" align="right">
          <template #default="{ row }">
            <span class="date-cell">{{ formatDateByDot(new Date(row.date)) }}</span>
          </template>
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
            <span v-if="row.kind === 'salary'" class="money-negative">{{ money(row.socialInsurance) }}</span>
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
          <template #default="{ row }"><span class="money-negative">{{ money(row.tax) }}</span></template>
        </el-table-column>
        <el-table-column
          v-if="showTaxRate"
          :label="L10n.tax_rate"
          :width="columnWidths.rate"
          align="right">
          <template #default="{ row }">
            <span class="tax-rate" :class="taxRateClass(row.taxRate)">{{ percent(row.taxRate) }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="L10n.net_pay" :width="columnWidths.net" align="right">
          <template #default="{ row }"><span class="net-pay">{{ money(row.netPay) }}</span></template>
        </el-table-column>
        <el-table-column
          width="12"
          class-name="operation-spacer"
          label-class-name="operation-spacer" />
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
import { computed, defineProps, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Setting } from "@element-plus/icons-vue";
import type { TableInstance } from "element-plus";
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

// 由外层页签控制当前是否可见：el-tabs 用 v-show 隐藏页签，组件不会重新挂载，
// 只有通过 active 才能知道“切到薪酬页”的准确时机。
const props = defineProps({
  active: { type: Boolean, default: false },
});

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
const OPERATION_WIDTH = 112;
const OPERATION_SPACER = 12;
const OPERATION_RESERVED = OPERATION_WIDTH + OPERATION_SPACER;
const MIN_COLUMN_WIDTHS: Record<keyof typeof BASE_COLUMN_WIDTHS, number> = {
  date: 95,
  type: 72,
  base: 84,
  overtime: 76,
  oneTime: 80,
  insurance: 80,
  bonus: 88,
  tax: 75,
  rate: 72,
  net: 88,
};

// 小屏隐藏税率列后，其余列用更紧凑的最小宽度，保证 960 宽也能完整显示
const MIN_COLUMN_WIDTHS_COMPACT: Record<Exclude<keyof typeof BASE_COLUMN_WIDTHS, "rate">, number> = {
  date: 88,
  type: 66,
  base: 78,
  overtime: 72,
  oneTime: 76,
  insurance: 76,
  bonus: 82,
  tax: 72,
  net: 84,
};

function computeColumnWidths(available: number) {
  const allKeys = Object.keys(BASE_COLUMN_WIDTHS) as (keyof typeof BASE_COLUMN_WIDTHS)[];
  const keys = showTaxRate.value ? allKeys : allKeys.filter((key) => key !== "rate");
  const minWidths = showTaxRate.value ? MIN_COLUMN_WIDTHS : MIN_COLUMN_WIDTHS_COMPACT;
  const baseSum = keys.reduce((sum, key) => sum + BASE_COLUMN_WIDTHS[key], 0);
  const dataAvailable = Math.max(360, available - OPERATION_RESERVED);
  const next = { ...BASE_COLUMN_WIDTHS, operation: OPERATION_WIDTH } as {
    date: number; type: number; base: number; overtime: number; oneTime: number;
    insurance: number; bonus: number; tax: number; rate: number; net: number; operation: number;
  };

  if (dataAvailable >= baseSum) {
    const extra = dataAvailable - baseSum;
    const per = Math.floor(extra / keys.length);
    keys.forEach((key) => {
      next[key] = BASE_COLUMN_WIDTHS[key] + per;
    });
  } else {
    // 最小窗口下按比例收窄列宽，同时保住日期/类型/金额等列的最小可读宽度
    const scale = dataAvailable / baseSum;
    keys.forEach((key) => {
      next[key] = Math.max((minWidths as Record<string, number>)[key], Math.floor(BASE_COLUMN_WIDTHS[key] * scale));
    });
  }

  let used = keys.reduce((sum, key) => sum + next[key], 0);
  // 若按最小宽度仍超出，则从还有余量的列里逐像素回收，保证整表正好铺满
  while (used > dataAvailable) {
    let changed = false;
    for (const key of keys) {
      if (used <= dataAvailable) {
        break;
      }
      if (next[key] > MIN_COLUMN_WIDTHS[key]) {
        next[key] -= 1;
        used -= 1;
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }
  next.net += dataAvailable - used;
  // 极端窄屏时宁可横向滚动，也不出现负数列宽
  if (next.net < 60) {
    next.net = 60;
  }
  return next;
}

// 首屏和隐藏状态下只能按窗口宽度估算可用宽度；<=1120 时侧栏收成 64px，
// 不能再用 266 这个间距，否则切回薪酬页会先按错误宽度渲染、200ms 后再跳一次。
function fallbackAvailable(): number {
  const chrome = window.innerWidth <= 1120 ? 138 : 266;
  return window.innerWidth - chrome;
}

// 首次量到真实宽度后记下「窗口宽度 - 表格可用宽度」的差值，之后隐藏状态下都用实测值推算，
// 这样即使以后调整侧栏/内边距，切页首帧也不会因为常量过期而跳一下。
let measuredChrome: number | null = null;

function applyColumnWidths(available: number) {
  const next = computeColumnWidths(available);
  const current = columnWidths.value;
  // 列宽没变就不要重新赋值：避免 el-table 做无意义的重排
  const changed = (Object.keys(next) as (keyof typeof next)[]).some((key) => next[key] !== current[key]);
  if (changed) {
    columnWidths.value = next;
  }
}

// 含税率列的 12 列即使按最小宽度也铺不下时（可用宽度小于这个值），就该收起税率列，
// 否则表格会横向溢出、多出一条横向滚动条。
const RATE_COLUMN_MIN_AVAILABLE =
  Object.values(MIN_COLUMN_WIDTHS).reduce((sum, width) => sum + width, 0) + OPERATION_RESERVED;

// 首屏按窗口宽度预计算，避免切换 tab 时表格从旧宽度重新分配造成“弹一下”
const initialAvailable = Math.max(600, fallbackAvailable());
const showTaxRate = ref(initialAvailable >= RATE_COLUMN_MIN_AVAILABLE);
const columnWidths = ref(computeColumnWidths(initialAvailable));
const tableCard = ref<HTMLElement | null>(null);
const tableRef = ref<TableInstance | null>(null);

function updateColumnWidths() {
  const card = tableCard.value;
  const cardAvailable = card ? Math.floor(card.clientWidth - 20) : 0;
  let available = cardAvailable;
  if (cardAvailable >= 600) {
    measuredChrome = window.innerWidth - cardAvailable;
  } else {
    available = measuredChrome == null ? fallbackAvailable() : window.innerWidth - measuredChrome;
  }
  if (available < 600) {
    return;
  }
  const nextShowTaxRate = available >= RATE_COLUMN_MIN_AVAILABLE;
  if (nextShowTaxRate !== showTaxRate.value) {
    showTaxRate.value = nextShowTaxRate;
  }
  applyColumnWidths(available);
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

function taxRateClass(value?: number): string {
  const rate = Number(value || 0);
  if (rate <= 10) {
    return "rate-low";
  }
  if (rate < 30) {
    return "rate-mid";
  }
  return "rate-high";
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
    ElMessage.success(isSalary ? L10n.salary_deleted : L10n.bonus_deleted);
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

// 切到薪酬页时立刻按真实宽度收口，并让 el-table 当场重算布局：
// 不再依赖 main.ts 里带 200ms 防抖的 ResizeObserver，否则页签显示后
// 列宽/行高会在 200ms 后再跳一次。
watch(
  () => props.active,
  (active) => {
    if (!active) {
      return;
    }
    updateColumnWidths();
    nextTick(() => {
      tableRef.value?.doLayout?.();
      updateColumnWidths();
    });
  },
  { flush: "post" }
);
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
  color: #e2434f;
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
  font-size: 13px;
  --el-table-border-color: #f0f1f5;
  --el-table-row-hover-bg-color: #fafafe;
}

.payroll-table :deep(th.el-table__cell) {
  height: 38px;
  padding: 0;
  background-color: #ffffff;
  border-bottom: 1px solid #f0f1f5;
  font-size: 12px;
  font-weight: 400;
  color: #5a6274;
}

.payroll-table :deep(td.el-table__cell) {
  height: 54px;
  padding: 0;
  border-bottom: 1px solid #f7f8fa;
  color: #1b1f27;
  font-variant-numeric: tabular-nums;
}

.payroll-table :deep(.cell) {
  padding: 0 10px;
  line-height: 54px;
}

.payroll-table :deep(th.el-table__cell .cell) {
  line-height: 38px;
}

.payroll-table :deep(.el-table__body tr:hover > td.el-table__cell) {
  background-color: #fafafe;
}

/*
 * el-table 在隐藏的页签里挂载时量不到高度，而 main.ts 给 ResizeObserver 加了 200ms 防抖，
 * 切换页签后空文案会先贴在顶部、等表格重新测量后再跳到中间。这里让空状态直接铺满表格主体，
 * 位置只由 CSS 决定，不再依赖后续测量。
 */
.table-card :deep(.el-table__empty-block) {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: auto !important;
  height: auto !important;
  min-height: 0;
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
  background-color: #fafafc;
}

.payroll-table :deep(.operation-spacer) {
  background-color: #ffffff;
  border-left: 0;
}

.payroll-table :deep(.el-table__body tr:hover > td.operation-column) {
  background-color: #fafafc;
}

.payroll-table :deep(th.operation-column) {
  color: #5a6274;
}

.payroll-table :deep(td.operation-column .cell) {
  padding-right: 10px;
}

.payroll-table :deep(.operation-actions) {
  justify-content: center;
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

.date-cell {
  color: #5a6274;
}

.money-negative {
  color: #e2434f;
}

.net-pay {
  font-weight: 600;
  color: #18a472;
}

.tax-rate {
  font-weight: 600;
}

.tax-rate.rate-low {
  color: #18a472;
}

.tax-rate.rate-mid {
  color: #b26a00;
}

.tax-rate.rate-high {
  color: #e2434f;
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

/* 数字列禁止换行，避免大金额把行高撑成两倍 */
.payroll-table :deep(td.el-table__cell .cell),
.payroll-table :deep(th.el-table__cell .cell) {
  white-space: nowrap;
}

@media (max-width: 1300px) {
  .payroll-table {
    font-size: 12px;
  }

  .payroll-table :deep(.cell) {
    padding: 0 8px;
  }
}

@media (max-width: 1100px) {
  .payroll-table,
  .payroll-table :deep(th.el-table__cell) {
    font-size: 11px;
  }

  .payroll-table :deep(.cell) {
    padding: 0 6px;
  }
}

</style>
