<template>
  <div class="timeline-container">
    <div v-if="activities.length === 0" class="empty-wrapper">
      <img class="empty-page" src="@/assets/empty_page.svg" />
    </div>
    <div class="timeline" v-else>
      <el-timeline>
        <el-timeline-item
          v-for="(activity, index) in activities"
          @click="currentActivity = activity"
          :key="index"
          :color="activity.isLastest ? Color.success : Color.info"
          :timestamp="activity.timestamp">
          {{ activity.content }}
        </el-timeline-item>
      </el-timeline>
    </div>
    <div
      class="detail-mask"
      :class="{ 'is-open': currentActivity !== null }"
      @click="closeDetail"></div>
    <aside class="detail-drawer" :class="{ 'is-open': currentActivity !== null }">
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
      <div class="detail-container">
        <span class="detail-text" v-if="currentActivity">
          {{ recordDetails(currentActivity.type, currentActivity.record) }}
        </span>
      </div>
    </aside>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onDeactivated, onUnmounted } from "vue";
import Color from "@/configs/Color.json";
import L10n from "@/configs/L10n.json";
import { generateTimeLineNodes, TimeLineNode, recordDetails } from "./Manager";
import { notifyCenter, NotifyType } from "@/utils/NotifyCenter";
import { ElMessage } from "element-plus";

const activities = ref<TimeLineNode[]>([]);

const currentActivity = ref<TimeLineNode | null>(null);

function closeDetail() {
  currentActivity.value = null;
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
    activities.value = await generateTimeLineNodes();
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
  display: flex;
  flex-direction: row;
  width: 100%;
  height: calc(100vh - 200px);
  min-height: 520px;
  padding: 8px 8px 8px 0;
  overflow: hidden;
  background-color: white;
  border: 1px solid #ebecf0;
  border-radius: 12px;
}

.empty-wrapper {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
}

.empty-page {
  max-height: 240px;
  opacity: 0.9;
}

.timeline {
  flex: 1;
  min-width: 0;
  height: 100%;
  margin: 16px 0;
  padding: 8px 20px 8px 24px;
  overflow-y: auto;
  text-align: left;
  scrollbar-width: thin;
}

.timeline :deep(.el-timeline) {
  padding-left: 4px;
}

.timeline :deep(.el-timeline-item) {
  padding-bottom: 18px;
  cursor: pointer;
}

.timeline :deep(.el-timeline-item__timestamp) {
  font-size: 12px;
  color: #9aa0ad;
}

.timeline :deep(.el-timeline-item__content) {
  font-size: 13px;
  color: #4b5261;
  line-height: 1.6;
}

.timeline::-webkit-scrollbar {
  width: 6px;
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

.detail-text {
  width: auto;
  font-size: 13px;
  line-height: 1.7;
  color: #4b5261;
  word-wrap: break-word;
  overflow-wrap: break-word;
  text-align: left;
}
</style>
