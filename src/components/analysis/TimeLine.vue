<template>
  <div class="timeline-container">
    <div v-if="years.length === 0" class="empty-wrapper">
      <img class="empty-page" src="@/assets/empty_page.svg" />
    </div>
    <div v-else class="timeline">
      <section
        v-for="year in years"
        :key="year.year"
        class="year-block">
        <header class="year-head">
          <div class="year-title">
            <span class="year-number">{{ year.year }}</span>
            <span class="year-count">
              {{ year.totalRecords }} {{ L10n.timeline_records_suffix }}
            </span>
          </div>
          <div class="year-totals">
            <span class="year-total">
              <span class="total-label">{{ L10n.all_expense }}</span>
              <span class="total-value expense">{{ formatAmount(year.total) }}</span>
            </span>
            <span v-if="year.incomeTotal > 0" class="year-total">
              <span class="total-label">{{ L10n.all_income }}</span>
              <span class="total-value income">{{ formatAmount(year.incomeTotal) }}</span>
            </span>
          </div>
        </header>

        <div class="event-list">
          <article
            v-for="event in year.events"
            :key="event.type"
            class="event-card"
            :class="event.type"
            @click="currentEvent = event">
            <span class="event-dot"></span>
            <div class="event-head">
              <span class="event-tags">
                <span
                  v-for="tag in event.tags"
                  :key="tag.type"
                  class="event-tag"
                  :class="tag.type">
                  {{ tag.label }}
                </span>
              </span>
              <span class="event-date">
                {{ formatDateByDot(new Date(event.record.date)) }}
              </span>
            </div>
            <div class="event-main">
              <div class="event-category">
                <img :src="categoryIcon(event.record.subCategory)" />
                <span>{{ event.record.subCategory }}</span>
              </div>
              <span class="event-amount" :class="{ income: event.isIncome }">
                {{ event.isIncome ? "+" : "-" }}{{ formatAmount(event.record.amount) }}
              </span>
            </div>
            <div class="event-remark" v-if="event.record.remark">
              {{ event.record.remark }}
            </div>
          </article>
        </div>
      </section>
    </div>

    <div
      class="detail-mask"
      :class="{ 'is-open': currentEvent !== null }"
      @click="closeDetail"></div>
    <aside class="detail-drawer" :class="{ 'is-open': currentEvent !== null }">
      <div class="detail-header">
        <span class="detail-title">{{ L10n.detail }}</span>
        <button
          class="detail-close"
          type="button"
          aria-label="关闭详情"
          @click="closeDetail">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              d="M3.2 3.2l9.6 9.6M12.8 3.2l-9.6 9.6"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <div class="detail-container" v-if="currentEvent">
        <div class="detail-amount-row">
          <span class="detail-tags">
            <span
              v-for="tag in currentEvent.tags"
              :key="tag.type"
              class="detail-tag"
              :class="tag.type">
              {{ tag.label }}
            </span>
          </span>
          <span class="detail-amount" :class="{ income: currentEvent.isIncome }">
            {{ currentEvent.isIncome ? "+" : "-" }}{{ formatAmount(currentEvent.record.amount) }}
          </span>
        </div>
        <div class="detail-rows">
          <div class="detail-row">
            <span class="row-label">{{ L10n.time }}</span>
            <span class="row-value">
              {{ formatDateByDot(new Date(currentEvent.record.date)) }}
            </span>
          </div>
          <div class="detail-row">
            <span class="row-label">{{ L10n.category }}</span>
            <span class="row-value">
              {{ currentEvent.record.category }} /
              {{ currentEvent.record.subCategory }}
            </span>
          </div>
          <div class="detail-row">
            <span class="row-label">{{ L10n.remark }}</span>
            <span class="row-value">{{ currentEvent.record.remark || "-" }}</span>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onDeactivated, onUnmounted } from "vue";
import L10n from "@/configs/L10n.json";
import {
  generateTimeLineYears,
  TimeLineEvent,
  TimeLineYear,
} from "./Manager";
import { notifyCenter, NotifyType } from "@/utils/NotifyCenter";
import { ElMessage } from "element-plus";
import { formatDateByDot } from "@/utils/DateUtils";
import { findCategoryIconByValue } from "@/configs/CategoryParser";

const years = ref<TimeLineYear[]>([]);
const currentEvent = ref<TimeLineEvent | null>(null);

function closeDetail() {
  currentEvent.value = null;
}

function formatAmount(value: number): string {
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function categoryIcon(subCategory: string): string {
  return require(`@/assets/category/${findCategoryIconByValue(subCategory)}`);
}

function registerNotify() {
  notifyCenter.on(NotifyType.IMPORT_DATA_SUCCESS, loadData);
  notifyCenter.on(NotifyType.CREATE_RECORD_SUCCESS, loadData);
  notifyCenter.on(NotifyType.DELETE_RECORD_SUCCESS, loadData);
  notifyCenter.on(NotifyType.UPDATE_RECORD_SUCCESS, loadData);
}

function disableNotify() {
  notifyCenter.off(NotifyType.IMPORT_DATA_SUCCESS, loadData);
  notifyCenter.off(NotifyType.CREATE_RECORD_SUCCESS, loadData);
  notifyCenter.off(NotifyType.DELETE_RECORD_SUCCESS, loadData);
  notifyCenter.off(NotifyType.UPDATE_RECORD_SUCCESS, loadData);
}

onDeactivated(() => {
  disableNotify();
});

onUnmounted(() => {
  disableNotify();
});

async function loadData() {
  try {
    years.value = await generateTimeLineYears();
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
  }
}

onMounted(async () => {
  loadData();
  registerNotify();
});
</script>

<style scoped>
.timeline-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 520px;
  overflow: hidden;
  background-color: white;
  border: 1px solid #ebecf0;
  border-radius: 12px;
}

.empty-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.empty-page {
  max-height: 240px;
  opacity: 0.9;
}

.timeline {
  height: 100%;
  padding: 18px 28px 26px;
  overflow-y: auto;
  text-align: left;
  scrollbar-width: thin;
}

.timeline::-webkit-scrollbar {
  width: 6px;
}

.year-block + .year-block {
  margin-top: 26px;
}

.year-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px 16px;
  margin-bottom: 12px;
  padding: 0 2px 10px;
  border-bottom: 1px solid #f2f3f6;
}

.year-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.year-number {
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.5px;
  color: #1b1f27;
}

.year-count {
  font-size: 12px;
  color: #9aa0ad;
}

.year-totals {
  display: flex;
  align-items: baseline;
  gap: 22px;
}

.year-total {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.total-label {
  font-size: 12px;
  color: #9aa0ad;
}

.total-value {
  font-size: 17px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.total-value.expense {
  color: #e2434f;
}

.total-value.income {
  color: #18a472;
}

.event-list {
  position: relative;
  padding-left: 18px;
}

.event-list::before {
  content: "";
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 6px;
  width: 2px;
  background-color: #f1eff8;
}

.event-card {
  position: relative;
  margin-bottom: 10px;
  padding: 10px 14px 12px;
  background-color: white;
  border: 1px solid #eef0f4;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.event-card:last-child {
  margin-bottom: 0;
}

.event-card:hover {
  border-color: #d9d3f3;
  box-shadow: 0 4px 12px rgba(27, 31, 39, 0.06);
}

.event-dot {
  position: absolute;
  top: 16px;
  left: -16px;
  width: 8px;
  height: 8px;
  background-color: #6c5dd3;
  border-radius: 50%;
  box-shadow: 0 0 0 3px #ffffff;
}

.event-card.largest .event-dot {
  background-color: #e2434f;
}

.event-card.latest .event-dot {
  background-color: #18a472;
}

.event-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.event-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.event-tag {
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.event-card.earliest .event-tag {
  color: #6c5dd3;
  background-color: #f3f0fd;
}

.event-card.largest .event-tag {
  color: #e2434f;
  background-color: #fdeff0;
}

.event-card.latest .event-tag {
  color: #18a472;
  background-color: #eaf7f0;
}

.event-tag.large {
  color: #b26a00;
  background-color: #fff6e6;
}

.event-tag.income {
  color: #0f8a7c;
  background-color: #e8f6f4;
}

.event-card.large .event-dot {
  background-color: #f0a93b;
}

.event-card.income .event-dot {
  background-color: #0f8a7c;
}

.event-date {
  font-size: 12px;
  color: #9aa0ad;
}

.event-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
}

.event-category {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1b1f27;
}

.event-category img {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
}

.event-category span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.event-amount {
  flex: none;
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #e2434f;
}

.event-amount.income {
  color: #18a472;
}

.event-card.largest .event-amount {
  font-size: 16px;
}

.event-remark {
  margin-top: 4px;
  overflow: hidden;
  font-size: 12px;
  color: #8a90a2;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 点击时间线节点后在卡片右侧滑出详情，点击遮罩（旁边空白处）收回 */
.detail-mask {
  position: absolute;
  inset: 0;
  z-index: 2;
  background-color: rgba(27, 31, 39, 0.1);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.24s ease;
}

.detail-mask.is-open {
  opacity: 1;
  pointer-events: auto;
}

.detail-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  width: min(380px, 42%);
  padding: 14px 16px 16px;
  background-color: #ffffff;
  border-left: 1px solid #ebecf0;
  border-radius: 0 12px 12px 0;
  box-shadow: -12px 0 32px rgba(27, 31, 39, 0.08);
  transform: translateX(calc(100% + 12px));
  transition: transform 0.26s cubic-bezier(0.4, 0, 0.2, 1);
}

.detail-drawer.is-open {
  transform: translateX(0);
}

.detail-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.detail-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  color: #5a6274;
  cursor: pointer;
  background-color: transparent;
  border: none;
  border-radius: 6px;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.detail-close:hover {
  color: #6c5dd3;
  background-color: #efecfb;
}

.detail-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.detail-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.6px;
  color: #6e7686;
  text-align: left;
}

.detail-amount-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0 14px;
  border-bottom: 1px solid #f2f3f6;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.detail-tag {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.detail-tag.earliest {
  color: #6c5dd3;
  background-color: #f3f0fd;
}

.detail-tag.largest {
  color: #e2434f;
  background-color: #fdeff0;
}

.detail-tag.latest {
  color: #18a472;
  background-color: #eaf7f0;
}

.detail-tag.large {
  color: #b26a00;
  background-color: #fff6e6;
}

.detail-tag.income {
  color: #0f8a7c;
  background-color: #e8f6f4;
}

.detail-amount {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e2434f;
}

.detail-amount.income {
  color: #18a472;
}

.detail-rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
}

.detail-row {
  display: flex;
  gap: 12px;
  font-size: 13px;
  line-height: 1.6;
}

.row-label {
  flex: 0 0 42px;
  color: #9aa0ad;
}

.row-value {
  flex: 1;
  color: #4b5261;
  word-break: break-word;
}
</style>
