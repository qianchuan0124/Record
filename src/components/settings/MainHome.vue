<template>
  <div class="container">
    <div class="page">
      <div class="page-header">
        <div class="header-text">
          <div class="page-title">{{ L10n.settings }}</div>
          <div class="page-desc">{{ L10n.settings_desc }}</div>
        </div>
        <div class="header-actions">
          <MobileDownload></MobileDownload>
          <button
            class="feedback-trigger"
            type="button"
            @click="feedbackVisible = true">
            {{ L10n.update_and_feedback }}
          </button>
        </div>
      </div>

      <div class="settings-grid">
        <div class="column-left">
          <section class="settings-card">
            <div class="card-head">
              <span class="card-title">{{ L10n.data_handle }}</span>
              <span class="card-desc">{{ L10n.data_handle_desc }}</span>
            </div>
            <div class="card-body">
              <DataHandle></DataHandle>
            </div>
          </section>

          <section class="settings-card">
            <div class="card-head">
              <span class="card-title">{{ L10n.cloud_sync }}</span>
              <span class="card-desc">{{ L10n.cloud_sync_desc }}</span>
            </div>
            <div class="card-body">
              <CloudSync></CloudSync>
            </div>
          </section>
        </div>

        <section class="settings-card category-card">
          <div class="card-head">
            <span class="card-title">{{ L10n.custom_category }}</span>
            <span class="card-desc">{{ L10n.custom_category_desc }}</span>
          </div>
          <div class="card-body category-body">
            <CategoryCustom></CategoryCustom>
          </div>
        </section>
      </div>

      <div class="settings-bottom-space"></div>

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
import { ref, onMounted, onDeactivated } from "vue";
import DataHandle from "./DataHandle.vue";
import CategoryCustom from "./CategoryCustom.vue";
import CloudSync from "./CloudSync.vue";
import MobileDownload from "./MobileDownload.vue";
import L10n from "@/configs/L10n.json";
import packageInfo from "@/../package.json";
import { ElMessage } from "element-plus";
import { IpcType } from "@/models/IpcResponse";
import { logInfo } from "@/utils/DataCenter";
import { info } from "@/configs/Info";

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
});

onDeactivated(() => {
  window.electron.ipcRenderer.off(IpcType.UPDATE_AVAILABLE, () => {});
  window.electron.ipcRenderer.off(IpcType.DOWNLOAD_PROGRESS, () => {});
  window.electron.ipcRenderer.off(IpcType.UPDATE_DOWNLOADED, () => {});
});
</script>

<style scoped>
.container {
  height: 100%;
  padding: 16px 24px 0 16px;
  overflow-x: hidden;
  overflow-y: auto;
}

.page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px 18px;
  background-color: white;
  border: 1px solid #ebecf0;
  border-radius: 12px;
  text-align: left;
}

.page-title {
  font-size: 19px;
  font-weight: 600;
  color: #1b1f27;
}

.page-desc {
  margin-top: 6px;
  font-size: 12px;
  color: #9aa0ad;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.feedback-trigger {
  flex: none;
  height: 30px;
  padding: 0 12px;
  background-color: white;
  color: #5a6274;
  border: 1px solid #e3e5ea;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.feedback-trigger:hover {
  border-color: #c9c3ee;
  color: #6c5dd3;
}

.settings-grid {
  display: flex;
  /* 高度由两侧内容中较高的一侧决定：左右卡片底边始终对齐，内容超出时整页滚动 */
  flex: 1 0 auto;
  gap: 16px;
  align-items: stretch;
  min-height: 0;
}

/* 放在 page 里的固定高度占位，保证无论是否滚动到底都有底部间距 */
.settings-bottom-space {
  flex: 0 0 40px;
  height: 40px;
}

.column-left {
  display: flex;
  flex: 0 0 380px;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  min-height: 0;
  /* 宽而矮的窗口下内容会超出左栏，交给页面容器滚动，不要裁掉 */
  overflow: visible;
}

/* 只允许拉伸，不允许压到内容高度以下，避免数据处理内容盖到 iCloud 卡片上 */
.column-left .settings-card:first-child {
  flex: 1 0 auto;
  min-height: 0;
}

.category-card {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.settings-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 10px 14px;
  background-color: white;
  border: 1px solid #ebecf0;
  border-radius: 12px;
  text-align: left;
}

.card-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1b1f27;
}

.card-desc {
  font-size: 12px;
  line-height: 1.5;
  color: #9aa0ad;
}

.card-body {
  flex: 1;
  min-height: 0;
}

.category-body {
  display: flex;
  overflow: hidden;
}

.top-updater {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background-color: #fafafb;
  border: 1px solid #f2f3f6;
  border-radius: 10px;
}

.left-info {
  display: flex;
  align-items: center;
  flex-direction: row;
}

.left-info img {
  width: 36px;
  height: 36px;
  margin-right: 14px;
}

.title-info {
  font-size: 14px;
  font-weight: 600;
  color: #1b1f27;
}

.version-info {
  margin-top: 2px;
  font-size: 12px;
  color: #9aa0ad;
}

.feed-back {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feed-back span {
  font-size: 12px;
  color: #b26a00;
}

.feed-back .back-button {
  align-self: flex-start;
  margin-top: 8px;
}

.open-action {
  display: flex;
  flex-direction: row;
  gap: 12px;
  margin-bottom: 24px;
}

.open-action > * {
  flex: 1;
}

.open-action .el-button + .el-button {
  margin-left: 0;
}

.update-progress {
  width: 100%;
  margin-bottom: 12px;
}

.el-progress__text {
  min-width: 18px;
}

.inner-info-url {
  margin: 0 4px;
}

/* 小屏：左右两栏改为单栏堆叠，页面整体滚动 */
@media (max-width: 1120px) {
  .page-header {
    flex-wrap: wrap;
  }

  .settings-grid {
    flex-direction: column;
  }

  .column-left {
    flex: none;
    width: 100%;
  }

  .column-left .settings-card:first-child {
    flex: none;
  }

  .category-card {
    flex: none;
  }
}

</style>
