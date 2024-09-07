# 记账清单

## 功能介绍

现在市面上的记账软件对用户数据如貔貅，轻轻松松导入数据，但是想导出数据就难如登天，基本需要开会员，开完会员也只能导出他们特有的格式。而一旦公司跑路，那自己的数据就很难再找到了。而且还面临着自己的账单数据被出售的风险，为了解决这个问题，也为了自己能够方便的记录支出花费，便自己写了一套记账软件。



软件分为两类，第一类在main分支，方式为使用nodeJS搭建本地服务器，使用vue3框架写了前端页面，开启后，在浏览器上打开对应地址，记录的数据都通过本地服务器保存在当前项目的根目录下。对功能有自己的要求，可以将代码down到本地自己进行调试使用。



第二类在electron分支，方式为使用electron作为内核，vue3框架作为前端页面的桌面客户端，界面样式基本与浏览器一致，数据也保存在用户的数据目录下，可以离线操作，不会有泄漏的风险。并且支持自动更新新版本，相关的包直接在release目录下，即开即用。



具体功能如下:

1. 记录账单数据、根据总 -> 年 -> 月 -> 日查看当前的开支数据以及总开支数据。
![dashboard](https://github.com/user-attachments/assets/850848f6-fc09-45db-a0f9-737358a94507)

2. 查看当前的总开销数据饼状分布图，点击可细分看到每一项的数据。
![total](https://github.com/user-attachments/assets/78ef2908-f2a2-4ec0-9acc-985f2c5ce409)

3. 查看对应年份总开销数据直方图，点击可细分看到每一项的数据。
![yearly](https://github.com/user-attachments/assets/6e4141c4-1876-476e-823d-85695185c4c7)

4. 查看记账时间线，记录每一项重要节点以及相关信息。
![timeline](https://github.com/user-attachments/assets/340c684a-5219-4ecf-85fd-273b84ff654a)

5. 导入excel数据以及导出数据到excel表格中，方便数据迁移。

6. 自定义你自己的账单分类，让记账数据更个性化。
![setting](https://github.com/user-attachments/assets/c18f7270-131d-4680-9083-9033522f105a)

7. 与移动端同步数据(暂electron 桌面版支持)。
![sync-data](https://github.com/user-attachments/assets/7f8af174-3e3d-408a-8024-f29941de7be4)



## 安装依赖

### 安装前端依赖

```bash
npm install
```

### 进入本地服务器目录

```bash
cd ./server 
```

### 安装服务器依赖

```bash
npm install
```



## 启动服务

### 返回上一级目录

```bash
cd ..
```



### 一次性启动服务器和前端页面

```bash
npm run start
```



## 分别启动服务器和前端页面(可以开启两个终端，方便调试)

### 第一个终端(本地服务器)：

```bash
npm run server
```



### 第二个终端(前端页面):

```bash
npm run serve
```

