<template>
  <el-row class="row-bg top" justify="space-between">
    <el-col :span="5" class="container">
      <img class="logo-img" src="@/assets/logo.svg" />
      <label class="title">{{ L10n.record_list }}</label>
    </el-col>
    <el-col :span="16"></el-col>

    <el-col :span="3">
      <el-popover
        class="hover-container"
        :width="460"
        popper-style="box-shadow: rgb(14 18 22 / 35%) 0px 10px 38px -10px, rgb(14 18 22 / 20%) 0px 10px 20px -15px; padding: 20px; margin-left: -20px;">
        <template #reference>
          <h3>{{ L10n.moblie_client }}</h3>
        </template>
        <template #default>
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
        </template>
      </el-popover>
    </el-col>
  </el-row>
</template>

<script setup>
import Color from "@/configs/Color.json";
import { onDeactivated, onMounted, onUnmounted, ref } from "vue";
import L10n from "@/configs/L10n.json";

const containerWidth = ref("1200px");
function handleContainerWidth() {
  containerWidth.value = window.innerWidth + "px";
}

onMounted(() => {
  window.addEventListener("resize", handleContainerWidth);
  handleContainerWidth();
});

onUnmounted(() => {
  window.removeEventListener("resize", handleContainerWidth);
});

onDeactivated(() => {
  window.removeEventListener("resize", handleContainerWidth);
});
</script>

<style scoped>
.hover-container {
  margin-right: -124px;
}

.qrcode_display {
  display: flex;
  gap: 16px;
  flex-direction: row;
}

.qrcode_display_item {
  display: flex;
  flex-direction: column;
}

.qrcode_display_item h3 {
  margin-left: 12px;
}

.qrcode_display_item img {
  width: 200px;
  height: 200px;
}

.logo-img {
  width: 84px;
  height: 84px;
  margin-left: 32px;
}

.top {
  height: 72px;
  background-color: white;
  margin-bottom: 20px;
  width: v-bind("containerWidth");
}

.title {
  font-size: 30px;
  font-weight: bold;
  color: #000000;
  margin-left: 10px;
}

.container {
  display: flex;
  align-items: center; /* 垂直居中对齐 */
  height: 60px;
  margin: 5px 0px 10px 0px;
}

.container img {
  width: 42;
  height: 42;
  margin-left: 32px;
}

input:focus {
  outline: none; /* 移除聚焦时的边框 */
}

input::placeholder {
  color: v-bind("Color.info"); /* 设置占位符文本颜色 */
  font-size: 16px;
}
</style>
