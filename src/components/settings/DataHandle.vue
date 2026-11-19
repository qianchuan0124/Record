<template>
  <div class="data-handle">
    <div class="action-row">
      <el-button
        type="primary"
        class="action-btn"
        :loading="exportLoading"
        @click="confirmExport">
        <template #loading>
          <div class="custom-loading">
            <svg class="circular" viewBox="-10, -10, 50, 50">
              <path
                class="path"
                d="
              M 30 15
              L 28 17
              M 25.61 25.61
              A 15 15, 0, 0, 1, 15 30
              A 15 15, 0, 1, 1, 27.99 7.5
              L 15 15
            "
                style="stroke-width: 4px; fill: rgba(0, 0, 0, 0)" />
            </svg>
          </div>
        </template>
        {{ L10n.export_data }}
      </el-button>

      <el-button class="action-btn" @click="syncData">
        {{ L10n.mobile_sync }}
      </el-button>
    </div>

    <div class="import-section">
      <div class="section-head">
        <span class="section-title">{{ L10n.import_data }}</span>
        <span class="upload-tip">{{ L10n.only_support_excel }}</span>
      </div>

      <div class="column-chips">
        <span
          v-for="column in importColumns"
          :key="column"
          class="column-chip">
          {{ column }}
        </span>
      </div>

      <div class="upload-file">
        <el-upload
          class="upload-select"
          ref="upload"
          drag
          :limit="1"
          accept="xlsx"
          :auto-upload="false"
          :on-error="handleError"
          :on-success="handleSuccess"
          :on-change="handleChange"
          :on-exceed="handleExceed"
          action="">
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            {{ L10n.drag_file_here }}
            <em>{{ L10n.click_to_upload }}</em>
          </div>
        </el-upload>

        <div v-if="importResult !== null" class="upload-info">
          <el-tooltip
            class="box-item"
            effect="dark"
            :content="L10n.review_failed_info"
            placement="right-start">
            <div v-if="importResult === true">
              <el-button
                type="success"
                @click="importFailedVisible = true"
                :icon="Check"
                circle />
            </div>
            <div v-else>
              <el-button
                type="danger"
                @click="importFailedVisible = true"
                :icon="WarnTriangleFilled"
                circle />
            </div>
          </el-tooltip>
        </div>
      </div>

      <span class="import-tip">{{ L10n.import_data_tips }}</span>
    </div>

    <el-dialog v-model="tipVisible" :title="L10n.data_handle" width="500" align-center>
      <span>{{ tipInfo }}</span>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="tipVisible = false">{{ L10n.cancel }}</el-button>
          <el-button type="primary" @click="handleTipAction">
            {{ L10n.confirm }}
          </el-button>
        </div>
      </template>
    </el-dialog>
    <el-dialog
      v-model="importFailedVisible"
      :title="L10n.failed_info"
      width="500"
      align-center>
      <el-table :data="failedData">
        <el-table-column
          property="errorIndex"
          :label="L10n.failed_index"
          width="150" />
        <el-table-column
          property="errorInfo"
          :label="L10n.failed_reason"
          width="260" />
      </el-table>
    </el-dialog>

    <el-dialog v-model="syncDataVisible" width="640" align-center>
      <div v-if="syncType === 'prepare'" class="sync-start-container">
        <div class="sync-start-left">
          <span class="sync-title">{{ L10n.sync_data }}</span>
          <qrcode-vue :value="qrCode" size="300" />
        </div>
        <div>
          <div>
            <h3>{{ L10n.step_title }}</h3>
            <div class="setp-content">
              {{ L10n.step_1 }}
              <el-link type="primary" @click="clikOuterURL">
                {{ L10n.download }}
              </el-link>
              {{ L10n.step_1_suffix }}
            </div>
            <div>
              <div class="setp-content">{{ L10n.step_2 }}</div>
              <img
                src="../../assets/sync-step-1.png"
                class="sync-step-image"
                alt="sync" />
            </div>
            <div>
              <div class="setp-content">{{ L10n.step_3 }}</div>
              <img
                src="../../assets/sync-step-2.png"
                class="sync-step-image"
                alt="sync" />
            </div>
            <div class="setp-content">{{ L10n.step_4 }}</div>
          </div>
        </div>
      </div>
      <div
        v-else-if="syncType === 'start'"
        v-loading="true"
        :element-loading-text="L10n.sync_dataing"
        :element-loading-svg="svg"
        class="custom-loading-svg sync-info"
        element-loading-svg-view-box="-10, -10, 50, 50"></div>
      <div v-else-if="syncType === 'success'" class="sync-info">
        <el-result
          icon="success"
          :title="L10n.sync_data_success"
          :sub-title="L10n.sync_data_success_info">
          <template #extra>
            <el-button type="primary" @click="syncDataVisible = false">
              {{ L10n.close }}
            </el-button>
          </template>
        </el-result>
      </div>
      <div v-else-if="syncType === 'failed'" class="sync-info">
        <el-result
          icon="error"
          :title="L10n.sync_data_failed"
          :sub-title="L10n.sync_data_failed_info">
          <template #extra>
            <el-button type="primary" @click="syncDataVisible = false">
              {{ L10n.close }}
            </el-button>
          </template>
        </el-result>
      </div>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from "vue";
import { Check, WarnTriangleFilled } from "@element-plus/icons-vue";
import {
  ElMessage,
  UploadFile,
  UploadInstance,
  UploadProps,
  UploadRawFile,
  genFileId,
} from "element-plus";
import { UploadFilled } from "@element-plus/icons-vue";
import L10n from "@/configs/L10n.json";
import { formatDate } from "@/utils/DateUtils";
import {
  parseImportData,
  ImportFailedResult,
  importData,
  downloadWorkbook,
  exportWorkbookData,
  parsePayrollRows,
} from "./Manager";
import * as XLSX from "xlsx";
import { notifyCenter, NotifyType } from "@/utils/NotifyCenter";
import { importPayroll, logError } from "@/utils/DataCenter";
import { IpcType } from "@/models/IpcResponse";
import QrcodeVue from "qrcode.vue";
import { info } from "@/configs/Info";

const tipVisible = ref(false);
const tipInfo = ref("");
const tipType = ref<"export" | "import">("export");
const exportLoading = ref(false);
const importColumns = [
  L10n.time,
  L10n.type,
  L10n.category,
  L10n.sub_category,
  L10n.amount,
  L10n.remark,
  L10n.count_in_budget,
];

const importFailedVisible = ref(false);
const failedData = ref<ImportFailedResult[]>([]);
const importResult = ref<Boolean | null>(null);
const upload = ref<UploadInstance>();
const syncDataVisible = ref(false);
const qrCode = ref("");
const syncType = ref<"prepare" | "start" | "success" | "failed">("prepare");

async function syncData() {
  syncDataVisible.value = true;
  const url = await window.electron.ipcRenderer.invoke(IpcType.OPEN_SERVER, "");
  qrCode.value = url;
}

onMounted(() => {
  window.electron.ipcRenderer.on(IpcType.SYNC_STATUS, (status) => {
    if (status === "success") {
      syncType.value = "success";
      setTimeout(() => {
        notifyCenter.emit(NotifyType.IMPORT_DATA_SUCCESS);
      }, 1000);
    } else if (status == "failed") {
      syncType.value = "failed";
    } else if (status == "start") {
      syncType.value = "start";
    }
  });
});

watch(syncDataVisible, (value) => {
  if (!value) {
    syncType.value = "prepare";
  }
});

function clikOuterURL() {
  window.electron.ipcRenderer.send(IpcType.OPEN_URL, info.outerRelease);
}

function handleChange(file: UploadFile) {
  if (file.raw) {
    importResult.value = null;
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file.raw);
    fileReader.onload = async (e) => {
      const arrayBuffer = e.target?.result;
      const workbook = XLSX.read(arrayBuffer, { type: "buffer" });
      const sheetJson = (name?: string) => {
        if (!name || !workbook.Sheets[name]) {
          return [];
        }
        return XLSX.utils.sheet_to_json(workbook.Sheets[name]);
      };
      const payrollSheetNames = [L10n.salary, L10n.annual_bonus, "预算"];
      const hasPayrollSheets = workbook.SheetNames.some((name) => payrollSheetNames.includes(name));
      const recordSheetName = workbook.SheetNames.includes(L10n.record_list)
        ? L10n.record_list
        : (hasPayrollSheets ? "" : workbook.SheetNames[0]);
      const jsonData = sheetJson(recordSheetName);
      const [failedRes, records] = parseImportData(jsonData);
      const payroll = parsePayrollRows(
        sheetJson(L10n.salary),
        sheetJson(L10n.annual_bonus),
        sheetJson("预算")
      );
      if (
        (records.length === 0 && failedRes.length !== 0) ||
        failedRes.length > 10
      ) {
        ElMessage.error(L10n.import_failed);
        importResult.value = false;
        failedData.value = failedRes;
        return;
      } else {
        try {
          await importData(records);
          if (payroll.salaries.length > 0 || payroll.bonuses.length > 0 || payroll.budgets.length > 0) {
            await importPayroll({
              salaries: payroll.salaries,
              bonuses: payroll.bonuses,
              budgets: payroll.budgets,
            });
          }
          importResult.value = true;
          failedData.value = [...failedRes, ...payroll.failed];
          ElMessage.success(L10n.import_success);
          notifyCenter.emit(NotifyType.IMPORT_DATA_SUCCESS);
        } catch (error) {
          if (error instanceof Error) {
            ElMessage.error(error.message);
          } else {
            ElMessage.error(L10n.import_failed);
          }
          importResult.value = false;
          failedData.value = failedRes;
        }
      }
    };
  }
}

const handleExceed: UploadProps["onExceed"] = (files) => {
  upload.value!.clearFiles();
  const file = files[0] as UploadRawFile;
  file.uid = genFileId();
  upload.value!.handleStart(file);
};

function handleError(error: Error) {
  const info = JSON.parse(error.message);
  logError("handle error info:" + info);
  ElMessage.error(L10n.upload_failed);
  logError("handle error" + error);
}

function handleSuccess() {
  ElMessage.success(L10n.upload_success);
}

function handleTipAction() {
  if (tipType.value === "export") {
    exportExcel();
  }
}

function confirmExport() {
  tipInfo.value = L10n.confirm_export_tip;
  tipVisible.value = true;
  tipType.value = "export";
}

async function exportExcel() {
  try {
    tipVisible.value = false;
    exportLoading.value = true;
    const sheets = await exportWorkbookData();
    const title = L10n.record_list + "-" + formatDate(new Date());
    downloadWorkbook(sheets, title);
    ElMessage.success(L10n.export_success);
    exportLoading.value = false;
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.export_failed);
    }
    exportLoading.value = false;
  }
}

const svg = `
        <path class="path" d="
          M 30 15
          L 28 17
          M 25.61 25.61
          A 15 15, 0, 0, 1, 15 30
          A 15 15, 0, 1, 1, 27.99 7.5
          L 15 15
        " style="stroke-width: 4px; fill: rgba(0, 0, 0, 0)"/>
      `;
</script>

<style scoped>
.el-button .custom-loading .circular {
  margin-right: 6px;
  width: 18px;
  height: 18px;
  animation: loading-rotate 2s linear infinite;
}
.el-button .custom-loading .circular .path {
  animation: loading-dash 1.5s ease-in-out infinite;
  stroke-dasharray: 90, 150;
  stroke-dashoffset: 0;
  stroke-width: 2;
  stroke: var(--el-button-text-color);
  stroke-linecap: round;
}

.data-handle {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  min-height: 0;
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.action-btn {
  width: 100%;
  height: 32px;
  margin-left: 0 !important;
}

.import-section {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid #f2f3f6;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #1b1f27;
}

.upload-tip {
  font-size: 11px;
  color: #9aa0ad;
}

.column-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.column-chip {
  padding: 1px 6px;
  background-color: #f6f5fb;
  border-radius: 10px;
  font-size: 11px;
  color: #6c5dd3;
}

.upload-file {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 0;
  text-align: left;
}

.upload-select {
  flex: 1;
  align-self: stretch;
  min-width: 0;
  height: 100%;
}

.upload-select :deep(.el-upload) {
  height: 100%;
}

.upload-select :deep(.el-upload-dragger) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.upload-select :deep(.el-upload) {
  width: 100%;
}

.upload-select :deep(.el-upload-dragger) {
  padding: 8px 10px;
  background-color: #fafafb;
  border: 1px dashed #e3e5ea;
  border-radius: 8px;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.upload-select :deep(.el-upload-dragger:hover) {
  border-color: #c9c3ee;
  background-color: #fafafe;
}

.upload-select :deep(.el-icon--upload) {
  margin-bottom: 0;
  font-size: 20px;
  color: #b9bdc7;
}

.upload-select :deep(.el-upload__text) {
  font-size: 11px;
  line-height: 1.5;
  color: #5a6274;
}

.upload-info {
  display: flex;
  align-items: center;
}

.import-tip {
  font-size: 11px;
  line-height: 1.5;
  color: #b26a00;
}

.sync-info {
  height: 330px;
}

.sync-start-container {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
}

.sync-title {
  margin-bottom: 12px;
  font-size: 22px;
  font-weight: 600;
  color: #1b1f27;
}

.sync-start-left {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sync-step-image {
  width: 300px;
}

.setp-content {
  margin-top: 6px;
  margin-bottom: 6px;
  font-size: 14px;
  color: #4b5261;
}

.el-link {
  font-size: 14px;
  margin-bottom: 6px;
}

.sync-data {
  margin-top: 16px;
}

.sync-data-enter {
  width: 100%;
}

.el-button + .el-button {
  margin-left: 0px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
