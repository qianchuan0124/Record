import { IpcType } from "@/models/IpcResponse";
import L10n from "@/configs/L10n.json";

export interface DataCounts {
  record: number;
  salary: number;
  bonus: number;
  budget: number;
  deposit: number;
  category: number;
}

export interface CloudSnapshot {
  snapshot: string;
  tag: string;
  mode: "manual" | "auto";
  counts: DataCounts | null;
  created_at: string;
  created_ts: number;
  device_label: string;
  is_mine: boolean;
  is_latest: boolean;
  downloaded: boolean;
  size: number;
  record_count: number;
  has_category: boolean;
  app_version: string;
  sha256: string;
}

export interface CloudSyncManifest {
  snapshot: string;
  created_at: string;
  created_ts: number;
  device: string;
  app_version: string;
  sha256: string;
  size: number;
  counts: Partial<DataCounts> & { record: number };
  custom_category: boolean;
}

export interface CloudSyncStatus {
  platform: string;
  autoBackup: boolean;
  autoSync: boolean;
  counts: DataCounts;
  folder: string;
  detected: boolean;
  available: boolean;
  lastTime: string;
  lastSnapshot: string;
  dirty: boolean;
  record_count: number;
  local_size: number;
  latest: CloudSyncManifest | null;
  latest_downloaded: boolean;
  snapshot_count: number;
}

export interface CloudBackupResult {
  skipped: boolean;
  folder: string;
  snapshot: string;
  created_at: string;
  record_count: number;
  device: string;
}

export interface CloudRestoreResult {
  snapshot: string;
  record_count: number;
  local_backup: string;
  category_restored: boolean;
  created_at: string;
}

async function invoke<T>(channel: string, ...args: any[]): Promise<T> {
  const response = await window.electron.ipcRenderer.invoke(channel, ...args);
  if (!response || response.ok !== true) {
    throw new Error((response && response.error) || L10n.unknown_error);
  }
  return response.data as T;
}

export function fetchCloudSyncStatus(): Promise<CloudSyncStatus> {
  return invoke<CloudSyncStatus>(IpcType.CLOUD_SYNC_STATUS);
}

export function updateCloudSyncSettings(patch: { autoBackup: boolean; autoSync: boolean }): Promise<CloudSyncStatus> {
  return invoke<CloudSyncStatus>(IpcType.CLOUD_SYNC_SETTINGS, patch);
}

export function backupToCloud(force = false): Promise<CloudBackupResult> {
  return invoke<CloudBackupResult>(IpcType.CLOUD_SYNC_BACKUP, force);
}

export function fetchCloudSnapshots(): Promise<CloudSnapshot[]> {
  return invoke<CloudSnapshot[]>(IpcType.CLOUD_SYNC_SNAPSHOTS);
}

export function restoreCloudSnapshot(snapshot: string): Promise<CloudRestoreResult> {
  return invoke<CloudRestoreResult>(IpcType.CLOUD_SYNC_RESTORE, snapshot);
}

export function chooseCloudSyncDir(): Promise<CloudSyncStatus> {
  return invoke<CloudSyncStatus>(IpcType.CLOUD_SYNC_CHOOSE_DIR);
}

export function openCloudSyncDir(): Promise<boolean> {
  return invoke<boolean>(IpcType.CLOUD_SYNC_OPEN_DIR);
}

export function formatSize(bytes: number): string {
  if (!bytes) {
    return "-";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
