<template>
  <div class="cloud-sync">
    <div class="folder-line" v-if="status && status.folder">
      <span class="folder-label">{{ L10n.sync_dir }}</span>
      <el-link type="primary" :underline="false" @click="openFolder">
        {{ shortFolder }}
      </el-link>
    </div>
    <div class="sync-tip" v-if="status && status.folder && !status.available">
      {{ L10n.sync_dir_unavailable }}
    </div>
    <div class="sync-tip" v-else-if="status && !status.folder">
      {{ L10n.no_sync_dir }}
    </div>

    <div class="sync-meta" v-if="status">
      <div class="meta-row">
        <span class="meta-label">{{ L10n.last_backup }}</span>
        <span class="meta-value">
          {{ status.lastTime || L10n.never_backup }}
          <span v-if="status.available" :class="['state-tag', dirty ? 'dirty' : 'clean']">
            {{ dirty ? L10n.sync_pending : L10n.sync_synced }}
          </span>
          <span v-else class="state-tag muted">{{ L10n.not_configured }}</span>
        </span>
      </div>
      <div class="meta-row">
        <span class="meta-label">{{ L10n.record_count }}</span>
        <span class="meta-value">
          {{ L10n.this_device }} {{ status.record_count }} · {{ L10n.cloud }} {{ cloudRecordCount }}
        </span>
      </div>
    </div>

    <div class="button-row">
      <el-button
        type="primary"
        class="action-button"
        :disabled="!status || !status.available"
        :loading="syncing"
        @click="openSync">
        {{ L10n.sync }}
      </el-button>
    </div>
    <div class="link-row">
      <el-button
        link
        type="primary"
        :disabled="!status || !status.available"
        @click="openFolder">
        {{ L10n.open_sync_dir }}
      </el-button>
      <span class="link-divider">·</span>
      <el-button link type="primary" @click="chooseDir">
        {{ L10n.change_sync_dir }}
      </el-button>
    </div>

    <el-dialog
      v-model="syncVisible"
      :title="L10n.select_version_title"
      width="680">
      <el-table
        :data="versions"
        row-key="key"
        :current-row-key="selectedVersion ? selectedVersion.key : ''"
        highlight-current-row
        :empty-text="L10n.no_snapshots"
        @current-change="onSelectVersion">
        <el-table-column :label="L10n.version" width="180">
          <template #default="{ row }">
            <span>{{ row.kind === "local" ? L10n.local_version : row.created_at }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="L10n.device" width="150">
          <template #default="{ row }">{{ row.device_label }}</template>
        </el-table-column>
        <el-table-column :label="L10n.record_count" width="90">
          <template #default="{ row }">{{ row.record_count }}</template>
        </el-table-column>
        <el-table-column :label="L10n.size" width="90">
          <template #default="{ row }">{{ formatSize(row.size) }}</template>
        </el-table-column>
        <el-table-column width="120">
          <template #default="{ row }">
            <el-tag v-if="row.kind === 'local'" size="small" type="info">
              {{ L10n.current }}
            </el-tag>
            <el-tag v-else-if="!row.downloaded" type="warning" size="small">
              {{ L10n.not_downloaded }}
            </el-tag>
            <el-tag v-else-if="row.is_latest" type="success" size="small">
              {{ L10n.latest }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-alert
        class="sync-alert"
        :title="actionTip"
        :type="selectedVersion && selectedVersion.kind === 'cloud' ? 'warning' : 'info'"
        :closable="false"
        show-icon />
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="syncVisible = false">{{ L10n.cancel }}</el-button>
          <el-button
            type="primary"
            :loading="syncing"
            :disabled="!canSync"
            @click="confirmSync">
            {{ actionText }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { ElMessage } from "element-plus";
import L10n from "@/configs/L10n.json";
import { IpcType } from "@/models/IpcResponse";
import { notifyCenter, NotifyType } from "@/utils/NotifyCenter";
import { updateCurrentCategory } from "@/configs/CategoryParser";
import { logError, logInfo } from "@/utils/DataCenter";
import {
  CloudSnapshot,
  CloudSyncStatus,
  backupToCloud,
  chooseCloudSyncDir,
  fetchCloudSnapshots,
  fetchCloudSyncStatus,
  formatSize,
  openCloudSyncDir,
  restoreCloudSnapshot,
} from "./CloudSyncManager";

type SyncVersionKind = "local" | "cloud";

interface SyncVersion {
  key: string;
  kind: SyncVersionKind;
  created_at: string;
  device_label: string;
  record_count: number;
  size: number;
  downloaded: boolean;
  is_latest: boolean;
  snapshot: string;
}

const status = ref<CloudSyncStatus | null>(null);
const syncing = ref(false);
const syncVisible = ref(false);
const versions = ref<SyncVersion[]>([]);
const selectedVersion = ref<SyncVersion | null>(null);
let unsubscribe: (() => void) | null = null;

const dirty = computed(() => (status.value ? status.value.dirty : false));
const cloudRecordCount = computed(() => {
  const latest = status.value ? status.value.latest : null;
  return latest && latest.counts ? latest.counts.record : 0;
});
const shortFolder = computed(() => {
  const folder = status.value ? status.value.folder : "";
  if (!folder) {
    return "";
  }
  const parts = folder.split(/[\\/]/).filter((item) => !!item);
  return parts.length > 3 ? `.../${parts.slice(-3).join("/")}` : folder;
});

const actionText = computed(() => {
  if (selectedVersion.value && selectedVersion.value.kind === "cloud") {
    return L10n.sync_to_local;
  }
  return L10n.sync_to_cloud;
});

const actionTip = computed(() => {
  if (selectedVersion.value && selectedVersion.value.kind === "cloud") {
    return L10n.sync_to_local_tip;
  }
  return L10n.sync_to_cloud_tip;
});

const canSync = computed(() => {
  const version = selectedVersion.value;
  if (!version) {
    return false;
  }
  return version.kind === "local" || version.downloaded;
});

async function refresh() {
  try {
    status.value = await fetchCloudSyncStatus();
  } catch (error) {
    logError("fetch cloud sync status failed:" + error);
  }
}

function localVersion(): SyncVersion {
  return {
    key: "local",
    kind: "local",
    created_at: "",
    device_label: L10n.this_device,
    record_count: status.value ? status.value.record_count : 0,
    size: status.value ? status.value.local_size : 0,
    downloaded: true,
    is_latest: false,
    snapshot: "",
  };
}

function toVersion(item: CloudSnapshot): SyncVersion {
  return {
    key: item.snapshot,
    kind: "cloud",
    created_at: item.created_at,
    device_label: item.is_mine ? L10n.this_device : item.device_label,
    record_count: item.record_count,
    size: item.size,
    downloaded: item.downloaded,
    is_latest: item.is_latest,
    snapshot: item.snapshot,
  };
}

async function openSync() {
  syncVisible.value = true;
  const local = localVersion();
  selectedVersion.value = local;
  versions.value = [local];
  try {
    const snapshots = await fetchCloudSnapshots();
    const list = [localVersion(), ...snapshots.map(toVersion)];
    versions.value = list;
    selectedVersion.value = list[0];
  } catch (error) {
    logError("fetch cloud snapshots failed:" + error);
    ElMessage.error(error instanceof Error ? error.message : L10n.unknown_error);
  }
}

function onSelectVersion(row: SyncVersion | null) {
  selectedVersion.value = row;
}

async function confirmSync() {
  const version = selectedVersion.value;
  if (!version) {
    ElMessage.warning(L10n.select_snapshot);
    return;
  }
  if (version.kind === "cloud" && !version.downloaded) {
    ElMessage.warning(L10n.not_downloaded);
    return;
  }
  syncing.value = true;
  try {
    if (version.kind === "local") {
      const result = await backupToCloud(false);
      syncVisible.value = false;
      if (result.skipped) {
        ElMessage.info(L10n.backup_skipped);
      } else {
        ElMessage.success(L10n.backup_success);
      }
    } else {
      const result = await restoreCloudSnapshot(version.snapshot);
      syncVisible.value = false;
      logInfo("cloud restore done, local backup:" + result.local_backup);
      ElMessage.success({
        message: L10n.restore_success + ", " + L10n.local_backup_tip + " " + result.local_backup,
        duration: 5000,
      });
      notifyCenter.emit(NotifyType.IMPORT_DATA_SUCCESS);
      if (result.category_restored) {
        // 重新读取自定义分类，内容有变化时会广播 CATEGORY_DATA_UPDATE
        updateCurrentCategory();
      }
    }
    await refresh();
  } catch (error) {
    logError("cloud sync failed:" + error);
    ElMessage.error(
      error instanceof Error ? error.message : version.kind === "local" ? L10n.backup_failed : L10n.restore_failed
    );
  } finally {
    syncing.value = false;
  }
}

async function chooseDir() {
  try {
    status.value = await chooseCloudSyncDir();
    if (status.value.folder) {
      ElMessage.success(L10n.sync_dir + ": " + status.value.folder);
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : L10n.unknown_error);
  }
}

async function openFolder() {
  try {
    await openCloudSyncDir();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : L10n.unknown_error);
  }
}

function onCloudSyncEvent(payload: any) {
  if (!payload) {
    return;
  }
  refresh();
}

onMounted(() => {
  refresh();
  // preload 的 on 会返回取消订阅函数，避免依赖未暴露的 off
  unsubscribe = (window.electron.ipcRenderer.on as any)(
    IpcType.CLOUD_SYNC_EVENT,
    onCloudSyncEvent
  );
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
});
</script>

<style scoped>
.cloud-sync {
  width: 100%;
  text-align: left;
}

.folder-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}

.folder-label {
  flex: none;
  color: #9aa0ad;
}

.folder-line .el-link {
  min-width: 0;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sync-tip {
  margin-bottom: 12px;
  padding: 8px 10px;
  background-color: #fff8ec;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.6;
  color: #b26a00;
}

.sync-meta {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
  padding: 8px 10px;
  background-color: #fafafc;
  border: 1px solid #f2f3f6;
  border-radius: 10px;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 22px;
  font-size: 12px;
}

.meta-row + .meta-row {
  margin-top: 2px;
  padding-top: 6px;
  border-top: 1px dashed #f0f1f5;
}

.meta-label {
  flex: none;
  color: #9aa0ad;
}

.meta-value {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #4b5261;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.state-tag {
  flex: none;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
}

.state-tag.dirty {
  color: #b26a00;
  background-color: #fff6e6;
}

.state-tag.clean {
  color: #2f9e44;
  background-color: #edf9f0;
}

.state-tag.muted {
  color: #9aa0ad;
  background-color: #f2f3f6;
}

.button-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.link-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.link-row .el-button {
  height: 20px;
  padding: 0 4px;
  font-size: 12px;
}

.link-divider {
  font-size: 12px;
  color: #d9dbe3;
}

.action-button {
  flex: 1;
  margin-left: 0 !important;
}

.sync-alert {
  margin-top: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
