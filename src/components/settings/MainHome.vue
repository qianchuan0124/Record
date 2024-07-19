<template>
  <div class="container">
    <div class="inner-container">
      <div class="container-top">
        <div @click="feedbackVisible = true">
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

      <el-dialog
        v-model="feedbackVisible"
        :title="L10n.update_and_feedback"
        width="500"
        height="300">
        <div class="top-updater">
          <div class="left-info">
            <img src="@/assets/logo.svg" />
            <div>
              <div class="title-info">{{ L10n.record_list }}</div>
              <div class="version-info">v{{ currentVersion }}</div>
            </div>
          </div>
          <el-button
            type="primary"
            :disabled="updateButtonDisabled()"
            @click="onTapAction">
            {{ updateTitle }}
          </el-button>
        </div>
        <el-progress
          class="update-progress"
          v-if="isDownloading"
          :percentage="downloadPercent"
          :stroke-width="15"
          status="success"
          striped
          striped-flow
          :duration="10" />
        <div class="bottom-action">
          <div class="open-action">
            <el-button type="primary" @click="openDatabaseDir">
              {{ L10n.open_database_path }}
            </el-button>
            <el-button type="primary" @click="openLogDir">
              {{ L10n.open_log_path }}
            </el-button>
          </div>
          <div class="feed-back">
            <span>{{ L10n.suggest_tips }}</span>
            <span>{{ L10n.bug_tips }}</span>
            <el-button type="primary" class="back-button" @click="copyMailInfo">
              {{ L10n.feed_back_questions }}
            </el-button>
          </div>
        </div>
        <el-dialog v-model="innerInfoVisible">
          <span>{{ L10n.inner_version_tips_prefix }}</span>
          <el-button
            class="inner-info-url"
            key="plain"
            type="primary"
            link
            @click="clickInnerURL">
            Gitee
          </el-button>
          {{ L10n.inner_version_tips_suffix }}
          <span>
            {{ L10n.inner_version_tips_suffix_2 }}
            <el-button
              class="inner-info-url"
              type="primary"
              link
              @click="clikOuterURL">
              Github
            </el-button>
            {{ L10n.inner_version_tips_suffix_3 }}
          </span>
        </el-dialog>
      </el-dialog>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onDeactivated, onUnmounted } from "vue";
import DataHandle from "./DataHandle.vue";
import CategoryCustom from "./CategoryCustom.vue";
import Color from "@/configs/Color.json";
import L10n from "@/configs/L10n.json";
import packageInfo from "@/../package.json";
import { ElMessage } from "element-plus";
import { IpcType } from "@/models/IpcResponse";
import { logInfo } from "@/utils/DataCenter";
import { info } from "@/configs/Info";

const containerHeight = ref("700px");
const containerWidth = ref("100px");

const isLatestVersion = ref(true);
const feedbackVisible = ref(false);
const currentVersion = ref(packageInfo.version);
const isDownloading = ref(false);
const downloadPercent = ref(0);
const innerInfoVisible = ref(false);
const updateTitle = ref(
  info.env === "outer" ? L10n.is_lastest_version : L10n.find_new_version
);
const status = ref<"lastest" | "download" | "install">("lastest");

function updateButtonDisabled() {
  if (info.env === "inner") {
    return false;
  }
  return isLatestVersion.value || isDownloading.value;
}

function clickInnerURL() {
  logInfo("click innter url");
  window.electron.ipcRenderer.send(IpcType.OPEN_URL, info.innerRelease);
}

function clikOuterURL() {
  logInfo("click outer url");
  window.electron.ipcRenderer.send(IpcType.OPEN_URL, info.outerRelease);
}

function onTapAction() {
  if (info.env === "inner") {
    innerInfoVisible.value = true;
  } else {
    if (status.value === "download") {
      logInfo("click download button");
      window.electron.ipcRenderer.send(IpcType.UPDATE_DOWNLOAD, "");
      isDownloading.value = true;
    } else if (status.value === "install") {
      logInfo("click install button");
      window.electron.ipcRenderer.send(IpcType.UPDATE_INSTALL, "");
      isDownloading.value = false;
    }
  }
}

function openDatabaseDir() {
  logInfo("send open database dir message");
  window.electron.ipcRenderer.send(IpcType.OPEN_DATABASE_DIR, "");
}

function openLogDir() {
  logInfo("send open log dir message");
  window.electron.ipcRenderer.send(IpcType.OPEN_LOG_DIR, "");
}

async function copyMailInfo() {
  logInfo("send copy mail info message");
  await window.electron.ipcRenderer.invoke(IpcType.COPY_MAIL_INFO);
  ElMessage.success(L10n.copy_mail_to_clipboard);
}

function handleContainerWidth() {
  containerHeight.value = window.innerHeight - 120 + "px";
  containerWidth.value = window.innerWidth - 184 + "px";
}

onMounted(() => {
  window.electron.ipcRenderer.on(IpcType.UPDATE_AVAILABLE, (info) => {
    logInfo("receive update avaliable, version:" + info.version);
    updateTitle.value = L10n.dowload_new_version;
    status.value = "download";
    isLatestVersion.value = false;
  });
  window.electron.ipcRenderer.on(IpcType.DOWNLOAD_PROGRESS, (progress) => {
    isDownloading.value = true;
    updateTitle.value = L10n.downloading;
    downloadPercent.value = Number(progress);
  });
  window.electron.ipcRenderer.on(IpcType.UPDATE_DOWNLOADED, () => {
    logInfo("receive update downloaded");
    isDownloading.value = false;
    updateTitle.value = L10n.install_new_version;
    status.value = "install";
    ElMessage.success(L10n.new_version_download_success);
  });
  window.addEventListener("resize", handleContainerWidth);
  handleContainerWidth();
});

onDeactivated(() => {
  window.electron.ipcRenderer.off(IpcType.UPDATE_AVAILABLE, () => {});
  window.electron.ipcRenderer.off(IpcType.DOWNLOAD_PROGRESS, () => {});
  window.electron.ipcRenderer.off(IpcType.UPDATE_DOWNLOADED, () => {});
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
