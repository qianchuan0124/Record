<template>
  <div class="timeline-container">
    <div class="timeline">
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
    <div class="detail-data" v-if="currentActivity">
      <div class="detail-space"></div>
      <div class="detail-container">
        <div class="detail-title">{{ L10n.detail }}</div>
        <span class="detail-text">
          {{ recordDetails(currentActivity.type, currentActivity.record) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onDeactivated } from "vue";
import Color from "@/configs/Color.json";
import L10n from "@/configs/L10n.json";
import { generateTimeLineNodes, TimeLineNode, recordDetails } from "./Manager";
import { notifyCenter, NotifyType } from "@/utils/NotifyCenter";
import { ElMessage } from "element-plus";
const activities = ref<TimeLineNode[]>([]);

const currentActivity = ref<TimeLineNode | null>(null);

notifyCenter.on(NotifyType.IMPORT_DATA_SUCCESS, loadData);

onDeactivated(() => {
  notifyCenter.off(NotifyType.IMPORT_DATA_SUCCESS, loadData);
});

async function loadData() {
  try {
    activities.value = await generateTimeLineNodes();
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.system_error);
    }
  }
}

onMounted(async () => {
  loadData();
});
</script>

<style scoped>
.timeline-container {
  display: flex;
  flex-direction: row;
  min-width: 1200px;
  width: calc(100vh - 40);
  height: 100%;
  background-color: white;
  margin: 20px;
  border-radius: 10px;
}

.timeline {
  margin-top: 42px;
  padding-left: 38px;
  margin-bottom: 42px;
  max-width: 600px;
  text-align: left;
  flex: 0.618;

  max-height: 500px;
  overflow-y: auto;
}

/* 隐藏滚动条的样式 */
.timeline::-webkit-scrollbar {
  display: none; /* 对于WebKit浏览器隐藏滚动条 */
}

/* IE和Edge */
.timeline {
  -ms-overflow-style: none;
}

/* Firefox */
.timeline {
  scrollbar-width: none;
}

.detail-data {
  width: 100%;
  height: 100%;
  margin-right: 12px;
  margin-top: 12px;
  flex: 0.382;
  display: flex;
}

.detail-container {
  flex: 0.6;
}

.detail-space {
  flex: 0.4;
}

.detail-title {
  font-size: 16px;
  font-weight: 700;
  color: v-bind("Color.primary");
  background-color: v-bind("Color.border");
  width: calc(100vh - 12);
  border-radius: 2px;
  margin-bottom: 12px;
  margin-top: 12px;
  text-align: left;
  padding: 4px 0px 4px 12px;
}

.detail-text {
  font-size: 16px;
  color: v-bind("Color.text");
  width: 300px;
  word-wrap: break-word;
  overflow-wrap: break-word; /* 同上，更现代的属性名称 */
  text-align: left; /* 确保文本左对齐 */
}
</style>
./AnalysisManager @/configs/Color.json ./Manager
