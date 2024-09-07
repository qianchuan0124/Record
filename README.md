# 记账清单 (安卓版)

安卓版使用Kotlin作为开发语言，使用Compose声明式UI布局框架 + material3 风格UI组件库。



## 具体结构

本地数据库 - room

网络请求 - retrofit2

数据解析 - Gson

二维码解析 - mlkit

xslx文件导入与导出 - poi



## 运行流程

1. git clone https://github.com/qianchuan0124/Record.git 此代码仓库
2. git checkout android
3. 使用Android Studio 打开 克隆下来的文件夹
4. 进入build.gradle.kts文件中，点击Sync同步相关库
5. Run



## 主要功能



1. 查看总收入与本月具体记账数据、新增记账数据、左滑删除记录、右滑更新记录、过滤相关记录、查询相关记录。
![android_home](https://github.com/user-attachments/assets/d2b38ea4-df91-4b85-9a64-09c81b6b04ed)

2. 查看近五年支出记录数据及统计饼状图，点击饼状图区域查看具体年份的支出详细信息。
![android_analysis](https://github.com/user-attachments/assets/3e23aa13-c036-4d23-a1c0-c3941160b605)

3. 查看本月的具体花费，自定义预算计划，查看当前的预算进度。
![android_budget](https://github.com/user-attachments/assets/8fbc3e9b-fdfb-4311-ba51-9094ad015329)

4. 将数据从Excel表格中导入、将数据导出到Excel表格中、和电脑端同步记账数据
![android_setting](https://github.com/user-attachments/assets/1e4e4a7f-728f-4086-8b17-8a654303655d)
