<template>
  <div class="common-layout">
    <el-container>
      <el-main>
        <Home></Home>
      </el-main>
    </el-container>
  </div>
</template>

<script lang="ts" setup>
import { onMounted } from "vue";
import Home from "./components/MainHome.vue";
import Color from "@/configs/Color.json";

// 记录当前的输入方式：文本输入在鼠标点击和键盘 Tab 下需要不同的焦点反馈
const root = document.documentElement;
root.dataset.inputMode = "mouse";

onMounted(() => {
  window.addEventListener(
    "pointerdown",
    () => {
      root.dataset.inputMode = "mouse";
    },
    true
  );
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Tab") {
        root.dataset.inputMode = "keyboard";
      }
    },
    true
  );
});
</script>

<style>
html:root {
  --el-color-primary: #6c5dd3;
  --el-color-primary-light-3: #8f83e0;
  --el-color-primary-light-5: #ada4e9;
  --el-color-primary-light-7: #cfc9f1;
  --el-color-primary-light-8: #dedaf6;
  --el-color-primary-light-9: #efecfb;
  --el-color-primary-dark-2: #5648b3;
  --el-color-success: #18a472;
  --el-color-danger: #e2434f;
  --el-text-color-primary: #1b1f27;
  --el-text-color-regular: #4b5261;
  --el-text-color-secondary: #6e7686;
  --el-border-color: #e3e5ea;
  --el-border-color-light: #ebecf0;
  --el-border-radius-base: 8px;
  --el-border-radius-small: 6px;
  --el-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
    "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue",
    Arial, sans-serif;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  height: 100%;
}

#app {
  height: 100%;
  font-family: var(--el-font-family);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: left;
  color: v-bind("Color.text");
}

.common-layout {
  background-color: v-bind("Color.background");
  height: 100vh;
  overflow: hidden;
}

.common-layout > .el-container {
  height: 100%;
  flex-direction: column;
}

.el-main {
  flex: 1;
  min-height: 0;
  padding: 0 !important;
  overflow: hidden;
}

/* 统一滚动条：细、低对比，避免整页隐藏滚动导致不知道可滚动 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb {
  background-color: #d3d6de;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: #bfc3ce;
}

::-webkit-scrollbar-track {
  background-color: transparent;
}

/* Element Plus 通用控件收敛 */
.el-button {
  font-weight: 500;
}

.el-button--primary {
  --el-button-hover-bg-color: #7d6fda;
  --el-button-active-bg-color: #5648b3;
}

.el-dialog {
  border-radius: 12px;
}

.el-dialog__header {
  font-weight: 600;
}

.el-message {
  border-radius: 8px;
}

/* 焦点反馈：鼠标点击走容器整体的柔和反馈，键盘操作保留清晰焦点环 */
html[data-input-mode="mouse"] {
  --record-focus-halo: 0 0 0 3px rgba(108, 93, 211, 0.12);
}

html[data-input-mode="keyboard"] {
  --record-focus-halo: 0 0 0 3px rgba(108, 93, 211, 0.42),
    0 0 0 5px rgba(108, 93, 211, 0.14);
}

/* 键盘可访问性：按钮 / 自定义可聚焦元素保留焦点环，文本输入由外框反馈 */
button:focus-visible,
.el-button:focus-visible,
[tabindex]:not(input):not(textarea):focus-visible {
  outline: 2px solid rgba(108, 93, 211, 0.55);
  outline-offset: 2px;
}

/* 文本输入：鼠标点击与键盘进入都不画内侧硬描边，反馈统一交给外框 */
input:focus,
textarea:focus {
  outline: none;
}

/* 统一提示：成功与异常同一位置、同一形态，用语义色区分 */
.el-notification.notify-success {
  border: 1px solid #cdeee0;
  background-color: #f7fdfa;
}

.el-notification.notify-success .el-notification__title {
  font-weight: 600;
  color: #147c56;
}

.el-notification.notify-success .el-notification__content {
  color: #4b5261;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
