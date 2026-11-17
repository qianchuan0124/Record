<template>
  <el-popover
    :width="420"
    trigger="hover"
    placement="bottom-end"
    popper-class="mobile-popover">
    <template #reference>
      <button class="mobile-trigger" type="button">
        {{ L10n.moblie_client }}
      </button>
    </template>
    <div class="qrcode-display">
      <div class="qrcode-item">
        <h3>{{ L10n.andorid_download }}</h3>
        <img src="@/assets/qrcode/qrcode_android.png" />
      </div>
      <div class="qrcode-item">
        <h3>{{ L10n.ios_download }}</h3>
        <img src="@/assets/qrcode/qrcode_ios.png" />
      </div>
    </div>
  </el-popover>
</template>

<script lang="ts" setup>
import L10n from "@/configs/L10n.json";
</script>

<style scoped>
.mobile-trigger {
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

.mobile-trigger:hover {
  border-color: #c9c3ee;
  color: #6c5dd3;
}

.qrcode-display {
  display: flex;
  gap: 20px;
  flex-direction: row;
}

.qrcode-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qrcode-item h3 {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: #5a6274;
}

.qrcode-item img {
  width: 180px;
  height: 180px;
}
</style>

<style>
.mobile-popover.el-popover {
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #ebecf0;
  box-shadow: 0 12px 32px rgba(27, 31, 39, 0.12);
}
</style>
