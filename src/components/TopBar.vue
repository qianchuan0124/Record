<template>
  <el-row class="row-bg top" justify="space-between">
    <el-col :span="5" class="container">
      <img class="logo-img" src="@/assets/logo.svg" />
      <label class="title">记账清单</label>
    </el-col>
  </el-row>
</template>

<script setup>
import Color from "@/configs/Color.json";
import { onDeactivated, onMounted, onUnmounted, ref } from "vue";

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
