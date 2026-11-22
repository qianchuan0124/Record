<template>
  <div class="cloud-sync">
    <div class="folder-line" v-if="status && status.folder">
      <span class="folder-label">{{ L10n.sync_dir }}</span>
      <el-link
        type="primary"
        :underline="false"
        :title="status.folder"
        @click="openFolder">
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

    <div class="auto-settings" v-if="status && status.available">
      <el-tooltip :content="L10n.auto_backup_tip" placement="top">
        <div class="auto-item">
          <span class="auto-title">{{ L10n.auto_backup }}</span>
          <el-switch
            :model-value="status.autoBackup"
            :loading="autoSaving"
            @change="toggleAuto('autoBackup', $event)" />
        </div>
      </el-tooltip>
      <span class="auto-divider"></span>
      <el-tooltip :content="L10n.auto_sync_tip" placement="top">
        <div class="auto-item">
          <span class="auto-title">{{ L10n.auto_sync }}</span>
          <el-switch
            :model-value="status.autoSync"
            :loading="autoSaving"
            @change="toggleAuto('autoSync', $event)" />
        </div>
      </el-tooltip>
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
      width="1080"
      align-center
      class="sync-dialog">
      <el-table
        :data="versions"
        row-key="key"
        :current-row-key="selectedVersion ? selectedVersion.key : ''"
        highlight-current-row
        :empty-text="L10n.no_snapshots"
        @current-change="onSelectVersion">
        <el-table-column :label="L10n.version" width="168">
          <template #default="{ row }">
            <span>{{ row.kind === "local" ? L10n.local_version : row.created_at }}</span>
            <el-tag
              v-if="row.kind === 'cloud'"
              size="small"
              class="mode-tag"
              :type="row.mode === 'auto' ? 'info' : 'primary'">
              {{ row.mode === "auto" ? L10n.auto_backup_tag : L10n.manual_backup_tag }}
            </el-tag>
            <el-tag v-else-if="row.kind === 'mobile'" size="small" class="mode-tag" type="warning">
              {{ L10n.mobile_backup_tag }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="L10n.device" width="136">
          <template #default="{ row }">{{ row.device_label }}</template>
        </el-table-column>
        <el-table-column :label="L10n.record_count" width="92" align="center">
          <template #default="{ row }">
            <span>{{ row.counts ? row.counts.record : "-" }}</span>
            <span v-if="diffOf(row, 'record')" class="count-diff">{{ diffOf(row, "record") }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="L10n.salary" width="78" align="center">
          <template #default="{ row }">
            <span>{{ row.counts ? row.counts.salary : "-" }}</span>
            <span v-if="diffOf(row, 'salary')" class="count-diff">{{ diffOf(row, "salary") }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="L10n.annual_bonus" width="88" align="center">
          <template #default="{ row }">
            <span>{{ row.counts ? row.counts.bonus : "-" }}</span>
            <span v-if="diffOf(row, 'bonus')" class="count-diff">{{ diffOf(row, "bonus") }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="L10n.budget" width="76" align="center">
          <template #default="{ row }">
            <span>{{ row.counts ? row.counts.budget : "-" }}</span>
            <span v-if="diffOf(row, 'budget')" class="count-diff">{{ diffOf(row, "budget") }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="L10n.deposit" width="76" align="center">
          <template #default="{ row }">
            <span>{{ row.counts ? row.counts.deposit : "-" }}</span>
            <span v-if="diffOf(row, 'deposit')" class="count-diff">{{ diffOf(row, "deposit") }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="L10n.category" width="76" align="center">
          <template #default="{ row }">
            <span>{{ row.counts ? row.counts.category : "-" }}</span>
            <span v-if="diffOf(row, 'category')" class="count-diff">{{ diffOf(row, "category") }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="L10n.size" width="80">
          <template #default="{ row }">{{ formatSize(row.size) }}</template>
        </el-table-column>
        <el-table-column width="110">
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
      <div class="count-tip">{{ L10n.sync_count_diff_tip }}</div>
      <el-alert
        class="sync-alert"
        :title="actionTip"
        :type="selectedVersion && selectedVersion.kind !== 'local' ? 'warning' : 'info'"
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
  DataCounts,
  MobileBackupItem,
  backupToCloud,
  chooseCloudSyncDir,
  fetchCloudSnapshots,
  fetchCloudSyncStatus,
  fetchMobileBackups,
  formatSize,
  importMobileBackup,
  openCloudSyncDir,
  restoreCloudSnapshot,
  updateCloudSyncSettings,
} from "./CloudSyncManager";

type SyncVersionKind = "local" | "cloud" | "mobile";

interface SyncVersion {
  key: string;
  kind: SyncVersionKind;
  mode?: "manual" | "auto";
  counts?: DataCounts | null;
  created_at: string;
  created_ts: number;
  device_label: string;
  record_count: number;
  size: number;
  downloaded: boolean;
  is_latest: boolean;
  snapshot: string;
  file?: string;
}

const status = ref<CloudSyncStatus | null>(null);
const syncing = ref(false);
const autoSaving = ref(false);
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
  return parts.length > 2 ? `.../${parts.slice(-2).join("/")}` : folder;
});

const actionText = computed(() => {
  if (selectedVersion.value && selectedVersion.value.kind === "cloud") {
    return L10n.sync_to_local;
  }
  if (selectedVersion.value && selectedVersion.value.kind === "mobile") {
    return L10n.import_mobile_backup;
  }
  return L10n.sync_to_cloud;
});

const actionTip = computed(() => {
  if (selectedVersion.value && selectedVersion.value.kind === "cloud") {
    return L10n.sync_to_local_tip;
  }
  if (selectedVersion.value && selectedVersion.value.kind === "mobile") {
    return L10n.import_mobile_tip;
  }
  return L10n.sync_to_cloud_tip;
});

const canSync = computed(() => {
  const version = selectedVersion.value;
  if (!version) {
    return false;
  }
  return version.kind !== "cloud" || version.downloaded;
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
    created_ts: 0,
    device_label: L10n.this_device,
    record_count: status.value ? status.value.record_count : 0,
    size: status.value ? status.value.local_size : 0,
    downloaded: true,
    is_latest: false,
    counts: status.value ? status.value.counts : null,
    snapshot: "",
  };
}

function toVersion(item: CloudSnapshot): SyncVersion {
  return {
    key: item.snapshot,
    kind: "cloud",
    created_at: item.created_at,
    created_ts: item.created_ts,
    device_label: item.is_mine ? L10n.this_device : item.device_label,
    record_count: item.record_count,
    size: item.size,
    downloaded: item.downloaded,
    is_latest: item.is_latest,
    mode: item.mode,
    counts: item.counts,
    snapshot: item.snapshot,
  };
}

function toMobileVersion(item: MobileBackupItem): SyncVersion {
  return {
    key: `mobile:${item.file}`,
    kind: "mobile",
    created_at: item.created_at,
    created_ts: item.created_ts,
    device_label: item.device,
    record_count: item.counts.record,
    size: item.size,
    downloaded: true,
    is_latest: false,
    counts: item.counts,
    snapshot: "",
    file: item.file,
  };
}

async function toggleAuto(key: "autoBackup" | "autoSync", value: boolean) {
  if (!status.value) {
    return;
  }
  const patch = {
    autoBackup: status.value.autoBackup,
    autoSync: status.value.autoSync,
    [key]: value === true,
  };
  autoSaving.value = true;
  try {
    status.value = await updateCloudSyncSettings(patch);
    ElMessage.success(L10n.auto_setting_saved);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : L10n.unknown_error);
    await refresh();
  } finally {
    autoSaving.value = false;
  }
}

async function openSync() {
  syncVisible.value = true;
  const local = localVersion();
  selectedVersion.value = local;
  versions.value = [local];
  try {
    const [snapshots, mobileBackups] = await Promise.all([
      fetchCloudSnapshots(),
      fetchMobileBackups(),
    ]);
    const remote = [...snapshots.map(toVersion), ...mobileBackups.map(toMobileVersion)]
      .sort((left, right) => right.created_ts - left.created_ts);
    const list = [localVersion(), ...remote];
    versions.value = list;
    selectedVersion.value = list[0];
  } catch (error) {
    logError("fetch cloud snapshots failed:" + error);
    ElMessage.error(error instanceof Error ? error.message : L10n.unknown_error);
  }
}

function diffOf(row: SyncVersion, key: keyof DataCounts): string {
  if (row.kind === "local" || !row.counts || !status.value || !status.value.counts) {
    return "";
  }
  const diff = Number(row.counts[key] || 0) - Number(status.value.counts[key] || 0);
  if (!diff) {
    return "";
  }
  return diff > 0 ? `(+${diff})` : `(${diff})`;
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
    } else if (version.kind === "mobile") {
      if (!version.file) {
        throw new Error(L10n.mobile_backup_missing);
      }
      const result = await importMobileBackup(version.file);
      syncVisible.value = false;
      ElMessage.success({
        message: `${L10n.mobile_import_success}：${L10n.record_count} ${result.records} · ${L10n.salary} ${result.salaries} · ${L10n.deposit} ${result.deposits} · ${L10n.local_backup_tip} ${result.local_backup}`,
        duration: 6000,
      });
      notifyCenter.emit(NotifyType.IMPORT_DATA_SUCCESS);
      updateCurrentCategory();
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
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 10px;
  width: 100%;
  text-align: left;
}

.auto-settings {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  background-color: #fafafc;
  border: 1px solid #f2f3f6;
  border-radius: 10px;
}

.auto-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.auto-title {
  font-size: 12px;
  color: #5a6274;
  white-space: nowrap;
}

.auto-divider {
  width: 1px;
  height: 14px;
  background-color: #e3e5ea;
}

.mode-tag {
  margin-left: 8px;
}

.count-diff {
  margin-left: 4px;
  font-size: 11px;
  color: #b26a00;
}

.count-tip {
  margin: 6px 2px 0;
  font-size: 11px;
  color: #9aa0ad;
}

.folder-line {
  display: flex;
  align-items: center;
  gap: 8px;
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
  margin-bottom: 8px;
  padding: 6px 8px;
  background-color: #fff8ec;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.6;
  color: #b26a00;
}

.sync-meta {
  display: flex;
  flex-direction: column;
  padding: 6px 8px;
  background-color: #fafafc;
  border: 1px solid #f2f3f6;
  border-radius: 10px;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 20px;
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
