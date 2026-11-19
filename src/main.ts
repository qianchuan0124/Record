import { createApp } from 'vue'
import App from './App.vue'
import 'element-plus/dist/index.css'
import ElementPlus, { ElMessage, ElNotification } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { setupGlobalErrorHandlers } from '@/utils/GlobalErrorHandler'

const app = createApp(App)

const debounce = (fn: any, delay: any) => {
    let timer: NodeJS.Timeout | null = null
    return (...args: any[]) => {
        if (timer) {
            clearTimeout(timer)
        }
        timer = setTimeout(() => {
            fn(...args)
        }, delay)
    }
}

const _ResizeObserver = window.ResizeObserver;
window.ResizeObserver = class ResizeObserver extends _ResizeObserver {
    constructor(callback: any) {
        callback = debounce(callback, 200);
        super(callback);
    }
}

// 统一异常兜底：组件渲染/生命周期、全局异常、未处理 Promise 拒绝
setupGlobalErrorHandlers(app)

app.use(ElementPlus, {
    locale: zhCn,
})

// 统一把 ElMessage 的顶部提示改为右下角通知，和全局错误/成功提示保持一致
function installBottomRightMessage() {
    const show = (type: 'success' | 'warning' | 'info' | 'error') => (options: any) => {
        const opts = typeof options === 'string' ? { message: options } : { ...(options || {}) };
        return ElNotification({
            ...opts,
            type,
            position: 'bottom-right',
            offset: 16,
            duration: typeof opts.duration === 'number' ? opts.duration : 3000,
            customClass: 'notify-message',
        });
    };
    const message = ElMessage as any;
    message.success = show('success');
    message.warning = show('warning');
    message.info = show('info');
    message.error = show('error');
    message.closeAll = () => ElNotification.closeAll();
}

installBottomRightMessage()

app.mount('#app')
