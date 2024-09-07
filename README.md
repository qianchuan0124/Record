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
![ios_home](https://github.com/user-attachments/assets/41fdce29-6583-42ff-9e0d-2a1b7f4c68d8)

2. 查看近五年支出记录数据及统计饼状图，点击饼状图区域查看具体年份的支出详细信息。

![ios_analysis](https://github.com/user-attachments/assets/4babda65-523c-42cd-8d1b-ae227366590c)

3. 查看本月的具体花费，自定义预算计划，查看当前的预算进度。
![ios_budget](https://github.com/user-attachments/assets/71bd93a1-ae6b-408a-9da0-f6b5318a9c05)

4. 将数据从Excel表格中导入、将数据导出到Excel表格中、和电脑端同步记账数据
![ios_setting](https://github.com/user-attachments/assets/26121b9d-7064-4d2f-a562-c91029e380af)
