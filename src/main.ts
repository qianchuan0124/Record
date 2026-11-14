import { createApp } from 'vue'
import App from './App.vue'
import 'element-plus/dist/index.css'
import ElementPlus from 'element-plus'
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
app.mount('#app')
