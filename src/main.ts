import { createApp } from 'vue'
import App from './App.vue'
import 'element-plus/dist/index.css'
import { ElMessage } from "element-plus";
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const app = createApp(App)

// 全局异常处理
app.config.errorHandler = (err, vm, info) => {
    // 处理错误
    // `info` 是 Vue 特定的错误信息，比如错误所在的生命周期钩子

    console.log(err, vm, info);
    if (err instanceof Error) {
        ElMessage.error(err.message);
    }
};

app.use(ElementPlus, {
    locale: zhCn,
})
app.mount('#app')
