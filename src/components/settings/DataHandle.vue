<template>
  <div>
    <div class="export-data">
      <div class="data-title">
        <span>{{ L10n.export_data }}</span>
      </div>

      <el-button type="primary" :loading="exportLoading" @click="confirmExport">
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

      <div class="data-title sync-data">
        <span>{{ L10n.sync_data }}</span>
      </div>

      <el-button type="primary" @click="syncData" class="sync-data-enter">
        {{ L10n.sync_data }}
      </el-button>
    </div>

    <div class="upload-container">
      <div class="data-title">
        <span>{{ L10n.import_data }}</span>
      </div>

      <span class="import-tip">
        {{ L10n.import_data_tips }}
      </span>
      <div class="table-title">
        <span>{{ L10n.time }}</span>
        <span>{{ L10n.type }}</span>
        <span>{{ L10n.category }}</span>
        <span>{{ L10n.sub_category }}</span>
        <span>{{ L10n.amount }}</span>
        <span>{{ L10n.remark }}</span>
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
          <template #tip>
            <div class="el-upload__tip">{{ L10n.only_support_excel }}</div>
          </template>
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
    </div>

    <el-dialog v-model="tipVisible" :title="L10n.data_handle" width="500">
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
      width="500">
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

    <el-dialog v-model="syncDataVisible" witdh="500" height="500">
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
  downloadXlsx,
  exportAllData,
} from "./Manager";
import * as XLSX from "xlsx";
import Color from "@/configs/Color.json";
import { notifyCenter, NotifyType } from "@/utils/NotifyCenter";
import { logError } from "@/utils/DataCenter";
import { IpcType } from "@/models/IpcResponse";
import QrcodeVue from "qrcode.vue";
import { info } from "@/configs/Info";

const tipVisible = ref(false);
const tipInfo = ref("");
const tipType = ref<"export" | "import">("export");
const exportLoading = ref(false);

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
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const [failedRes, records] = parseImportData(jsonData);
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
          importResult.value = true;
          failedData.value = failedRes;
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
    let datalist: string[][] = await exportAllData(); // 需要导出的表格数据
    const title = L10n.record_list + "-" + formatDate(new Date());
    downloadXlsx(datalist, title);
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

.export-data {
  display: flex;
  flex-direction: column;
  width: 210px;
  margin-top: 12px;
}

.upload-file {
  display: flex;
  width: 280px;
  height: 300px;
  text-align: left;
}

.upload-select {
  width: 210px;
  height: 200px;
}

.upload-container {
  margin-top: 64px;
  width: 380px;
}

.upload-info {
  margin-top: 174px;
  height: 300px;
  margin-left: 12px;
  align-items: flex-end;
}

.data-title {
  margin-bottom: 12px;
}

.table-title {
  height: 24px;
  padding-top: 6px;
  margin-bottom: 20px;
}

.table-title span {
  background-color: v-bind("Color.border");
  font-size: 15px;
  padding: 4px 12px 4px 12px;
  border-top: 1px solid v-bind("Color.info");
  border-right: 1px solid v-bind("Color.info");
  border-bottom: 1px solid v-bind("Color.info");
}

.table-title span:first-child {
  border-left: 1px solid v-bind("Color.info");
}

.import-tip {
  font-size: 12px;
  font-weight: 800;
  color: v-bind("Color.delete");
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
  font-size: 24px;
  font-weight: bold;
  color: v-bind("Color.text");
  margin-bottom: 12px;
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
  font-size: 16px;
  color: v-bind("Color.text");
  margin-bottom: 6px;
  margin-top: 6px;
}

.el-link {
  font-size: 16px;
  margin-bottom: 6px;
}

.sync-data {
  margin-top: 12px;
}

.sync-data-enter {
  width: 210px;
}

.el-button + .el-button {
  margin-left: 0px;
}
</style>
