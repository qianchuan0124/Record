<template>
  <div class="top-bar">
    <div class="brand">
      <img class="brand-logo" src="@/assets/logo.svg" draggable="false" />
      <span class="brand-title">{{ L10n.record_list }}</span>
    </div>
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
      <div class="qrcode_display">
        <div class="qrcode_display_item">
          <h3>{{ L10n.andorid_download }}</h3>
          <img src="@/assets/qrcode/qrcode_android.png" />
        </div>
        <div class="qrcode_display_item">
          <h3>{{ L10n.ios_download }}</h3>
          <img src="@/assets/qrcode/qrcode_ios.png" />
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup>
import L10n from "@/configs/L10n.json";
</script>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 24px;
  background-color: white;
  border-bottom: 1px solid #ebecf0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  /* 品牌区图标与标题不允许被选中或拖拽选中 */
  user-select: none;
  -webkit-user-select: none;
}

.brand-logo {
  width: 40px;
  height: 40px;
  -webkit-user-drag: none;
  user-select: none;
}

.brand-title {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.6px;
  color: #1b1f27;
  user-select: none;
}

.mobile-trigger {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 2px;
  border: 0;
  border-radius: 4px;
  background-color: transparent;
  color: #8a90a2;
  font-size: 12px;
  line-height: 20px;
  letter-spacing: 0.2px;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.15s ease;
}

.mobile-trigger:hover {
  background-color: transparent;
  color: #6c5dd3;
}

.qrcode_display {
  display: flex;
  gap: 20px;
  flex-direction: row;
}

.qrcode_display_item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qrcode_display_item h3 {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: #5a6274;
}

.qrcode_display_item img {
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
