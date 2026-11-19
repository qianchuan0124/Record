<template>
  <div class="deposit-container">
    <div class="deposit-header">
      <div class="header-left">
        <span class="page-title">{{ L10n.deposit }}</span>
        <span class="page-subtitle">{{ L10n.drag_sort_tip }}</span>
      </div>
      <div class="header-stats">
        <div class="header-stat">
          <span class="stat-label">{{ L10n.bank }}</span>
          <span class="stat-value">{{ usedBanks.length }}</span>
        </div>
        <div class="header-stat">
          <span class="stat-label">{{ L10n.deposit_count }}</span>
          <span class="stat-value">{{ deposits.length }}</span>
        </div>
        <div class="header-stat">
          <span class="stat-label">{{ L10n.total_amount }}</span>
          <span class="stat-value">{{ formatAmount(totalAmount) }}</span>
        </div>
        <div class="header-stat">
          <span class="stat-label">{{ L10n.total_interest }}</span>
          <span class="stat-value interest">+{{ formatAmount(totalInterest) }}</span>
        </div>
      </div>
    </div>

    <div class="table-card" v-loading="loading">
      <div class="deposit-head">
        <span></span>
        <span>{{ L10n.bank }}</span>
        <span class="align-right">{{ L10n.amount }}</span>
        <span class="align-right">{{ L10n.deposit_time }}</span>
        <span class="align-right">{{ L10n.deposit_years }}</span>
        <span class="align-right">{{ L10n.maturity_time }}</span>
        <span class="align-right">{{ L10n.interest_rate }}</span>
        <span class="align-right">{{ L10n.interest }}</span>
        <span></span>
        <span class="align-center operation-head">{{ L10n.operation }}</span>
      </div>

      <div v-if="deposits.length === 0" class="empty-state">
        {{ L10n.no_deposits }}
      </div>
      <div v-else class="deposit-list">
        <div
          v-for="(row, index) in deposits"
          :key="row.id"
          class="deposit-row"
          :class="{ 'is-dragging': dragIndex === index, 'is-over': overIndex === index && dragIndex !== index }"
          @dragover.prevent="overIndex = index"
          @dragleave="onDragLeave(index)"
          @drop.prevent="onDrop(index)">
          <div class="drag-cell">
            <span
              class="drag-handle"
              draggable="true"
              @dragstart="onDragStart(index, $event)"
              @dragend="resetDrag">
              <span class="grip"></span>
            </span>
          </div>
          <div class="bank-cell">
            <BankIcon :icon="bankOf(row).icon" :name="bankOf(row).name" :size="24" />
            <span>{{ bankOf(row).name }}</span>
          </div>
          <span class="align-right amount-cell">{{ formatAmount(row.amount) }}</span>
          <span class="align-right date-cell">{{ formatDateByDot(new Date(Number(row.startDate))) }}</span>
          <span class="align-right">{{ formatYears(row.years) }}</span>
          <span class="align-right date-cell">{{ formatDateByDot(maturityOf(row)) }}</span>
          <span class="align-right rate-cell">{{ Number(row.rate).toFixed(3) }}%</span>
          <span class="align-right interest-cell">{{ Number(row.interest).toFixed(2) }}</span>
          <span></span>
          <div class="row-actions">
            <el-button text type="primary" size="small" @click="editDeposit(row)">
              {{ L10n.edit }}
            </el-button>
            <span class="action-divider"></span>
            <el-button text type="danger" size="small" @click="removeDeposit(row)">
              {{ L10n.delete }}
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="deposit-bottom">
      <div class="banks-card">
        <div class="banks-title">
          <span>{{ L10n.banks_with_deposit }}</span>
          <span class="banks-count">{{ usedBanks.length }}</span>
        </div>
        <div v-if="usedBanks.length === 0" class="banks-empty">{{ L10n.no_banks }}</div>
        <div v-else class="bank-chips" @wheel="onBankWheel">
          <button
            v-for="bank in usedBanks"
            :key="bank.id"
            type="button"
            class="bank-chip"
            :class="{ 'is-clickable': bank.customId }"
            @click="onBankChip(bank)">
            <BankIcon :icon="bank.icon" :name="bank.name" :size="20" />
            <span class="bank-name">{{ bank.name }}</span>
            <span class="bank-count">{{ bank.count }}</span>
          </button>
        </div>
      </div>

      <div class="action-group">
        <el-button class="action-button" :icon="OfficeBuilding" @click="openBankDialog(null)">
          {{ L10n.add_bank }}
        </el-button>
        <el-button class="action-button is-primary" type="primary" :icon="Plus" @click="openDepositDialog(null)">
          {{ L10n.add_deposit }}
        </el-button>
      </div>
    </div>

    <BankDialog v-model="bankVisible" :bank="editingBank" @saved="reloadAll" />
    <DepositDialog
      v-model="depositVisible"
      :deposit="editingDeposit"
      :banks="bankOptions"
      @saved="reloadAll" />
  </div>
</template>

<script lang="ts" setup>
import { computed, onActivated, onMounted, onUnmounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { OfficeBuilding, Plus } from "@element-plus/icons-vue";
import L10n from "@/configs/L10n.json";
import { BankOption, DepositBank, DepositRecord } from "@/models/Deposit";
import { BANK_PRESETS, presetByIcon } from "@/configs/BankPresets";
import {
  deleteDeposit,
  fetchDepositData,
  reorderDeposits,
} from "@/utils/DataCenter";
import { formatDateByDot } from "@/utils/DateUtils";
import { notifyCenter, NotifyType } from "@/utils/NotifyCenter";
import BankDialog from "./BankDialog.vue";
import DepositDialog from "./DepositDialog.vue";
import BankIcon from "./BankIcon.vue";

const banks = ref<DepositBank[]>([]);
const deposits = ref<DepositRecord[]>([]);
const loading = ref(true);
const bankVisible = ref(false);
const depositVisible = ref(false);
const editingBank = ref<DepositBank | null>(null);
const editingDeposit = ref<DepositRecord | null>(null);

const dragIndex = ref(-1);
const overIndex = ref(-1);

const bankMap = computed(() => {
  const map: Record<number, DepositBank> = {};
  banks.value.forEach((bank) => {
    map[bank.id] = bank;
  });
  return map;
});

const bankOptions = computed<BankOption[]>(() => [
  ...BANK_PRESETS.map((preset) => ({
    key: `b:${preset.icon}`,
    name: preset.name,
    icon: preset.icon,
  })),
  ...banks.value.map((bank) => ({
    key: `c:${bank.id}`,
    name: bank.name,
    icon: "",
    customId: bank.id,
  })),
]);

interface BankInfo {
  name: string;
  icon: string;
  customId?: number;
}

function bankOf(row: DepositRecord): BankInfo {
  const key = row.bankKey || "";
  if (key.startsWith("c:")) {
    const bank = bankMap.value[Number(key.slice(2))];
    if (bank) {
      return { name: bank.name, icon: "", customId: bank.id };
    }
  }
  if (key.startsWith("b:")) {
    const preset = presetByIcon(key.slice(2));
    if (preset) {
      return { name: preset.name, icon: preset.icon };
    }
  }
  const legacy = bankMap.value[Number(row.bankId) || 0];
  if (legacy) {
    return { name: legacy.name, icon: "", customId: legacy.id };
  }
  return { name: L10n.bank, icon: "" };
}

const usedBanks = computed(() => {
  const counts: Record<string, number> = {};
  deposits.value.forEach((row) => {
    counts[row.bankKey] = (counts[row.bankKey] || 0) + 1;
  });
  return bankOptions.value
    .filter((option) => (counts[option.key] || 0) > 0)
    .map((option) => ({ ...option, count: counts[option.key] }));
});

function onBankWheel(event: WheelEvent) {
  const element = event.currentTarget as HTMLElement;
  if (!element || element.scrollWidth <= element.clientWidth) {
    return;
  }
  const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
  if (!delta) {
    return;
  }
  event.preventDefault();
  element.scrollLeft += delta;
}

function onBankChip(bank: BankOption & { count: number }) {
  if (!bank.customId) {
    return;
  }
  const custom = banks.value.find((item) => item.id === bank.customId);
  if (custom) {
    editBank(custom);
  }
}

const totalAmount = computed(() =>
  deposits.value.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
);

const totalInterest = computed(() =>
  deposits.value.reduce((sum, row) => sum + (Number(row.interest) || 0), 0)
);

function formatAmount(value: number): string {
  return (Number(value) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatYears(years: number): string {
  const value = Number(years) || 0;
  return `${Number(value.toFixed(2))}${L10n.year_unit}`;
}

function maturityOf(row: DepositRecord): Date {
  const date = new Date(Number(row.startDate));
  const months = Math.max(1, Math.round((Number(row.years) || 0) * 12));
  date.setMonth(date.getMonth() + months);
  return date;
}

async function reloadAll() {
  try {
    const data = await fetchDepositData();
    banks.value = data.banks || [];
    deposits.value = data.deposits || [];
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : L10n.system_error);
  } finally {
    loading.value = false;
  }
}

function openBankDialog(bank: DepositBank | null) {
  editingBank.value = bank;
  bankVisible.value = true;
}

function editBank(bank: DepositBank) {
  openBankDialog(bank);
}

function openDepositDialog(deposit: DepositRecord | null) {
  editingDeposit.value = deposit;
  depositVisible.value = true;
}

function editDeposit(deposit: DepositRecord) {
  openDepositDialog(deposit);
}

async function removeDeposit(row: DepositRecord) {
  try {
    await ElMessageBox.confirm(L10n.confirm_delete_deposit, L10n.delete, {
      confirmButtonText: L10n.confirm,
      cancelButtonText: L10n.cancel,
      type: "warning",
    });
    await deleteDeposit(row.id);
    await reloadAll();
    notifyCenter.emit(NotifyType.IMPORT_DATA_SUCCESS);
    ElMessage.success(L10n.deposit_deleted);
  } catch (error) {
    if (error !== "cancel" && error !== "close" && error instanceof Error) {
      ElMessage.error(error.message);
    }
  }
}

function onDragStart(index: number, event: DragEvent) {
  dragIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  }
}

function onDragLeave(index: number) {
  if (overIndex.value === index) {
    overIndex.value = -1;
  }
}

function resetDrag() {
  dragIndex.value = -1;
  overIndex.value = -1;
}

async function onDrop(targetIndex: number) {
  const from = dragIndex.value;
  resetDrag();
  if (from < 0 || from === targetIndex) {
    return;
  }
  const list = [...deposits.value];
  const [moved] = list.splice(from, 1);
  list.splice(targetIndex, 0, moved);
  deposits.value = list;
  try {
    await reorderDeposits(list.map((row) => row.id));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : L10n.system_error);
    await reloadAll();
  }
}

function handleRecordChanged() {
  reloadAll();
}

onMounted(() => {
  reloadAll();
  notifyCenter.on(NotifyType.IMPORT_DATA_SUCCESS, handleRecordChanged);
});

onActivated(() => {
  reloadAll();
});

onUnmounted(() => {
  notifyCenter.off(NotifyType.IMPORT_DATA_SUCCESS, handleRecordChanged);
});
</script>

<style scoped>
.deposit-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  height: 100%;
  padding: 16px 24px 24px 16px;
  min-height: 0;
}

.deposit-header {
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
  color: #1b1f27;
  font-variant-numeric: tabular-nums;
}

.stat-value.interest {
  color: #18a472;
}

.table-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 8px 10px 10px;
  background-color: #ffffff;
  border: 1px solid #ebecf0;
  border-radius: 12px;
  overflow: hidden;
}

.deposit-head,
.deposit-row {
  display: grid;
  grid-template-columns: 34px minmax(150px, 200px) 1fr 1.05fr 0.8fr 1.05fr 0.8fr 1fr 12px 112px;
  align-items: center;
  column-gap: 8px;
  padding: 0 0 0 10px;
}

.deposit-head {
  height: 38px;
  /* 预留与列表一致的竖向滚动条宽度，避免表头与内容列错位 */
  padding-right: 8px;
  border-bottom: 1px solid #f0f1f5;
  font-size: 12px;
  color: #5a6274;
}

.deposit-list {
  flex: 1;
  min-height: 0;
  /* 始终预留滚动条宽度，和表头的 8px 右内边距保持一致 */
  overflow-y: scroll;
}

.deposit-row {
  height: 54px;
  border-bottom: 1px solid #f7f8fa;
  font-size: 13px;
  color: #1b1f27;
  transition: background-color 0.15s ease;
}

.deposit-row:hover {
  background-color: #fafafe;
}

.deposit-row.is-dragging {
  opacity: 0.4;
}

.deposit-row.is-over {
  border-top: 2px solid #6c5dd3;
}

.drag-cell {
  display: flex;
  justify-content: center;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 28px;
  color: #c9ccd4;
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.grip {
  width: 14px;
  height: 18px;
  background-image: radial-gradient(circle, #c9ccd4 1.4px, transparent 1.5px);
  background-size: 7px 7px;
}

.bank-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.bank-cell span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.amount-cell {
  color: #1b1f27;
  font-variant-numeric: tabular-nums;
}

.date-cell {
  color: #5a6274;
  font-variant-numeric: tabular-nums;
}

.align-right {
  text-align: right;
}

.align-center {
  text-align: center;
}

.rate-cell {
  color: #b26a00;
  font-variant-numeric: tabular-nums;
}

.interest-cell {
  font-weight: 600;
  color: #18a472;
  font-variant-numeric: tabular-nums;
}

.operation-head {
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 10px;
  background-color: #fafafc;
  border-left: 1px solid #eef0f4;
}

.row-actions {
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding-right: 10px;
  background-color: #fafafc;
  border-left: 1px solid #eef0f4;
}

.action-divider {
  width: 1px;
  height: 12px;
  background-color: #e3e5ea;
}

.empty-state {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  font-size: 13px;
  color: #9aa0ad;
}

.deposit-bottom {
  display: flex;
  flex: 0 0 auto;
  align-items: stretch;
  gap: 16px;
}

.banks-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  padding: 14px 18px;
  background-color: #ffffff;
  border: 1px solid #ebecf0;
  border-radius: 12px;
  min-width: 0;
}

.banks-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1b1f27;
}

.banks-count {
  font-size: 12px;
  font-weight: 400;
  color: #9aa0ad;
}

.banks-empty {
  font-size: 12px;
  color: #9aa0ad;
}

.bank-chips {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 2px;
  scrollbar-width: thin;
}

.bank-chips::-webkit-scrollbar {
  height: 6px;
}

.bank-chips::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 3px;
}

.bank-chips.is-scrolling::-webkit-scrollbar-thumb {
  background-color: #d9dce3;
}

.bank-chips::-webkit-scrollbar-track {
  background: transparent;
}

.bank-chip {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  white-space: nowrap;
  gap: 6px;
  padding: 4px 10px 4px 6px;
  background-color: #fafafc;
  border: 1px solid #eef0f4;
  border-radius: 16px;
  font-family: inherit;
  font-size: 12px;
  color: #5a6274;
  cursor: default;
}

.bank-chip.is-clickable {
  cursor: pointer;
}

.bank-chip.is-clickable:hover {
  border-color: #d9d3f5;
  color: #6c5dd3;
}

.bank-count {
  min-width: 16px;
  padding: 0 5px;
  background-color: #efecfb;
  border-radius: 8px;
  color: #6c5dd3;
  font-size: 11px;
  text-align: center;
}

.action-group {
  display: flex;
  flex: 0 0 160px;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
}

.action-button {
  width: 160px;
  height: 40px;
  margin-left: 0 !important;
  border-radius: 20px;
  box-shadow: 0 6px 16px rgba(27, 31, 39, 0.08);
}
</style>
