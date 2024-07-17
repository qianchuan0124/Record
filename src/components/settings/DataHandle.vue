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
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
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
const tipVisible = ref(false);
const tipInfo = ref("");
const tipType = ref<"export" | "import">("export");
const exportLoading = ref(false);

const importFailedVisible = ref(false);
const failedData = ref<ImportFailedResult[]>([]);
const importResult = ref<Boolean | null>(null);
const upload = ref<UploadInstance>();

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
          console.log(error);
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
  console.log(info);
  ElMessage.error(L10n.upload_failed);
  console.log(error);
}

function handleSuccess() {
  ElMessage.success(L10n.upload_success);
}

function handleTipAction() {
  if (tipType.value === "export") {
    console.log("export");
    exportExcel();
  } else {
    console.log("import");
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
    console.log(error);
    if (error instanceof Error) {
      ElMessage.error(error.message);
    } else {
      ElMessage.error(L10n.export_failed);
    }
    exportLoading.value = false;
  }
}
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
</style>
