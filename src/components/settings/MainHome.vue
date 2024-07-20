<template>
  <div class="container">
    <div class="inner-container">
      <div class="container-top">
        <div @click="onTapAction">
          {{ L10n.update_and_feedback }}
        </div>
      </div>
      <div class="container-bottom">
        <div class="container-left">
          <div class="text-title">{{ L10n.data_handle }}</div>
          <DataHandle></DataHandle>
        </div>
        <div class="container-right">
          <div class="text-title">{{ L10n.custom_category }}</div>
          <CategoryCustom></CategoryCustom>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onDeactivated, onUnmounted } from "vue";
import DataHandle from "./DataHandle.vue";
import CategoryCustom from "./CategoryCustom.vue";
import Color from "@/configs/Color.json";
import L10n from "@/configs/L10n.json";
import { ElMessage } from "element-plus";
import useClipboard from "vue-clipboard3";
import { info } from "@/configs/Info";

const containerHeight = ref("700px");
const containerWidth = ref("100px");

const { toClipboard } = useClipboard();

async function onTapAction() {
  try {
    await toClipboard(info.mail);
    ElMessage.success(L10n.copy_mail_to_clipboard);
  } catch (e) {
    ElMessage.error(L10n.copy_failed);
  }
}

function handleContainerWidth() {
  containerHeight.value = window.innerHeight - 120 + "px";
  containerWidth.value = window.innerWidth - 184 + "px";
}

onMounted(() => {
  window.addEventListener("resize", handleContainerWidth);
  handleContainerWidth();
});

onDeactivated(() => {
  window.removeEventListener("resize", handleContainerWidth);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleContainerWidth);
});
</script>

<style scoped>
.container {
  height: v-bind("containerHeight");
  overflow: auto !important;
}

/* 针对Webkit浏览器隐藏滚动条 */
.container::-webkit-scrollbar {
  display: none;
}

/* 对于支持scrollbar-width属性的浏览器（如Firefox），也隐藏滚动条 */
.container {
  scrollbar-width: none;
}

.inner-container {
  margin: 20px;
  padding: 20px 20px 20px 20px;
  background-color: white;
  border-radius: 10px;
  overflow: auto;
  height: 700px;
  width: 100% - 24px;
  text-align: left;
  font-size: 16px;
}

.container-top {
  display: flex;
  justify-content: flex-end;
}

.container-bottom {
  display: flex;
  min-height: 480px;
  overflow-y: auto;
}

.container-left {
  flex: 0.382;
  margin-left: 20px;
}

.container-right {
  flex: 0.618;
  text-align: left;
}

.text-title {
  font-size: 20px;
  color: v-bind("Color.text");
  padding-top: 20px;
  padding-bottom: 20px;
}

.top-updater {
  display: flex;
  margin-bottom: 24px;
  justify-content: space-between;
}

.left-info {
  display: flex;
  flex-direction: row;
  align-items: left;
}

.left-info img {
  width: 42px;
  height: 42px;
  margin-right: 16px;
}

.title-info {
  font-size: 16px;
  font-weight: bold;
  color: v-bind("Color.text");
}

.version-info {
  font-size: 12px;
  margin-top: 5px;
  color: v-bind("Color.info");
}

.feed-back {
  display: flex;
  flex-direction: column;
}

.feed-back span {
  font-size: 13px;
  font-weight: bold;
  color: v-bind("Color.delete");
}

.feed-back .back-button {
  margin-top: 12px;
}

.open-action {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  margin-bottom: 36px;
}

.open-action > * {
  flex-grow: 0.5;
}

.update-progress {
  width: 100%;
  margin-bottom: 12px;
}

.el-progress__text {
  min-width: 18px;
}

.inner-info-url {
  margin-bottom: 4px;
}
</style>
