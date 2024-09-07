# 记账清单 (iOS版)

iOS版使用Swift作为开发语言，SwiftUI作为UI框架。



## 具体结构

本地数据库 - WCDB.swift

网络请求 - Alamofire

数据解析 - 原生能力

CSV文件导入与导出 - 原生能力

二维码扫码与解析 - 原生能力


## 运行流程

1. git clone https://github.com/qianchuan0124/Record.git 此代码仓库
2. git checkout iOS
3. 终端打开根目录文件夹，运行 `pod install --repo-update`
4. 运行，如果WCDB有报错`nonisolated(unsafe)`问题，全局搜索`nonisolated(unsafe)`删掉再运行即可。



## 主要功能

1. 查看总收入与本月具体记账数据、新增记账数据、左滑删除记录、右滑更新记录、过滤相关记录、查询相关记录。

![ios_home_compressed](https://github.com/user-attachments/assets/6270da8b-1b14-445a-a1b8-0a8bbcb4a881)


2. 查看近五年支出记录数据及统计饼状图，点击饼状图区域查看具体年份的支出详细信息。

![ios_analysis_compressed](https://github.com/user-attachments/assets/41f5037e-a197-4e34-89b1-721ebd18b718)


3. 查看本月的具体花费，自定义预算计划，查看当前的预算进度。

![ios_budget_compressed](https://github.com/user-attachments/assets/8f5fa1cb-2435-4ac1-a2f2-ac1abe8c844f)


4. 将数据从Excel表格中导入、将数据导出到Excel表格中、和电脑端同步记账数据

![ios_setting_compressed](https://github.com/user-attachments/assets/c630742b-e8b4-4bc1-b26c-5a7f548e231e)

