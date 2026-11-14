import type { App } from "vue";
import { h } from "vue";
import { ElNotification } from "element-plus";

// 同一错误在这段时间内只提示一次，避免连续刷屏
const DEDUPE_WINDOW = 8000;
// 同一成功提示在短时间内只弹一次，避免同一次操作重复提示
const SUCCESS_DEDUPE_WINDOW = 600;

let lastSignature = "";
let lastReportAt = 0;
let lastSuccessTitle = "";
let lastSuccessAt = 0;

function messageOf(error: unknown): string {
  if (error instanceof Error) {
    return error.message || "未知错误";
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function notify(title: string, error: unknown, source: string) {
  const message = messageOf(error);

  // 完整错误始终输出到控制台，便于排查，避免兜底把真实错误吞掉
  console.error(`[GlobalError][${source}]`, error);

  const signature = `${title}|${message}`.slice(0, 200);
  const now = Date.now();
  if (signature === lastSignature && now - lastReportAt < DEDUPE_WINDOW) {
    lastReportAt = now;
    return;
  }
  lastSignature = signature;
  lastReportAt = now;

  try {
    ElNotification({
      title,
      type: "error",
      position: "bottom-right",
      duration: 9000,
      showClose: true,
      message: h("div", { style: "line-height: 1.6;" }, [
        h("div", { style: "word-break: break-word;" }, message),
        h(
          "div",
          { style: "margin-top: 6px; font-size: 12px; color: #8a90a2;" },
          "完整错误已输出到控制台，可查看堆栈定位问题。"
        ),
        h(
          "button",
          {
            type: "button",
            style:
              "margin-top: 10px; padding: 2px 10px; border: 1px solid #cfc9f1; border-radius: 6px; background: #f3f0fd; color: #6c5dd3; font-size: 12px; cursor: pointer;",
            onClick: () => window.location.reload(),
          },
          "重新加载"
        ),
      ]),
    });
  } catch (notifyError) {
    // 提示组件自身异常时只记录，不再递归提示
    console.error("[GlobalError][notify]", notifyError);
  }
}

/**
 * 操作成功提示：与异常提示同一位置与形态，用成功语义色区分
 * 同一条成功提示在短时间内只弹一次，避免同一次操作重复提示
 */
export function notifySuccess(title: string) {
  const now = Date.now();
  if (title === lastSuccessTitle && now - lastSuccessAt < SUCCESS_DEDUPE_WINDOW) {
    lastSuccessAt = now;
    return;
  }
  lastSuccessTitle = title;
  lastSuccessAt = now;

  try {
    ElNotification({
      title,
      type: "success",
      position: "bottom-right",
      duration: 3000,
      showClose: true,
      customClass: "notify-success",
    });
  } catch (notifyError) {
    console.error("[Notify][success]", notifyError);
  }
}

/**
 * 统一兜底：组件渲染/生命周期、未捕获全局异常、未处理的 Promise 拒绝
 * 只在应用入口安装一次，页面其余部分保持可用
 */
export function setupGlobalErrorHandlers(app: App) {
  app.config.errorHandler = (error, instance, info) => {
    notify("页面组件异常", error, `vue:${info}`);
    // 组件实例一并输出，方便定位具体组件
    if (instance) {
      console.error("[GlobalError][instance]", instance);
    }
  };

  window.addEventListener("error", (event) => {
    // 静态资源加载失败等非运行时错误不在此处理
    if (event.target && event.target !== window) {
      return;
    }
    notify("运行时异常", event.error ?? event.message, "window.error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    notify("未处理的异步异常", event.reason, "unhandledrejection");
  });
}
