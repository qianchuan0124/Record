# 桌面端备份同步协议 v1.0

> 对应实现：`src/utils/CloudSync.ts`、`src/db/Database.ts`
> 适用端：Record macOS 桌面版
> 最后更新：2026-11-22

## 1. 传输方式与边界

桌面端不依赖业务后端，也不调用远端记账服务。

1. 用户在设置中选择一个同步目录，例如 iCloud Drive 下的目录。
2. 桌面端在该目录下创建固定子目录 `记账清单/`，所有桌面快照写入这里。
3. 文件由 iCloud Drive 在登录同一 Apple ID 的设备间同步；选择非 iCloud 目录时仅本机可用。
4. 不直接同步正在使用的 `records.db`，避免多设备并发写、iCloud 延迟上传和占位文件损坏数据库。
5. 桌面端快照使用 SQLite `.db`；移动端 JSON 快照可被读取并按移动端协议恢复。

目录结构：

```text
<用户选择的同步根目录>/
└── 记账清单/
    ├── latest.json
    ├── record_20261122_101500_a1b2_manual.db
    ├── record_20261122_101500_a1b2_manual.db.categories.json
    └── record_20261122_120000_a1b2_auto.db
```

## 2. 桌面快照文件

### 2.1 命名

```text
record_yyyyMMdd_HHmmss_<deviceTag>_<mode>[_n].db
```

- `deviceTag`：本机匿名设备标识（首次运行随机生成，保存在 `device-id`）的 SHA-1 前 4 位。
- `mode`：`manual`（手动）或 `auto`（自动）。
- `_n`：同一秒内重名时的递增后缀，从 2 开始。
- 时间使用本机本地时间；文件内容为 SQLite 一致性快照。
- 兼容旧命名 `record_yyyyMMdd_HHmmss_<deviceTag>.db`，旧文件按 `manual` 处理。

### 2.2 分类侧车文件

如果本机存在自定义分类文件 `category-custom.json`，快照旁边写入：

```text
<snapshot>.categories.json
```

格式为桌面端分类树 JSON：

```json
[
  {
    "label": "餐饮",
    "value": "food",
    "children": [
      { "label": "三餐", "value": "三餐" }
    ]
  }
]
```

恢复快照时，如果侧车存在，会一并覆盖本机自定义分类；不存在则保留本机分类配置。

### 2.3 数据内容

`.db` 是整库快照，包含：

| 表/文件 | 内容 |
|---|---|
| `record` | 收支流水，含删除标记、是否计入预算、同步序号 |
| `salary_record` | 工资记录，含手动个税标记 |
| `annual_bonus` | 年终奖 |
| `budget_item` | 预算项 |
| `deposit_bank` | 自定义银行目录（内置银行不落库） |
| `deposit_record` | 存款记录，含本金、利率、利息、排序 |
| `app_setting` | 本机业务设置，当前包含 `key = 'budget'` 的账期与收入口径 |
| `*.categories.json` | 自定义分类侧车 |

内置银行名称和 logo 随安装包提供，不写入数据库、不参与同步。

## 3. latest.json

每个同步子目录维护一份 `latest.json`，记录本目录最新桌面快照：

```json
{
  "snapshot": "record_20261122_101500_a1b2_manual.db",
  "created_at": "2026-11-22 10:15:00",
  "created_ts": 1795313700,
  "device": "Mac16,10",
  "app_version": "0.0.4",
  "sha256": "<db-file-sha256>",
  "size": 45056,
  "counts": {
    "record": 290,
    "salary": 17,
    "bonus": 2,
    "budget": 9,
    "deposit": 16,
    "category": 2
  },
  "custom_category": true
}
```

- `counts` 统计 `isDeleted = 0` 的业务行；`category` 为自定义分类节点数。
- `sha256` 用于恢复前校验，避免读取 iCloud 尚未下载完成或正在写入的文件。
- `latest.json` 是“最新桌面快照”的提示，不作为唯一版本来源；版本列表仍以目录中的文件为准。

## 4. 变更判定与自动备份

`contentState()` 对以下业务内容计算 SHA-256 指纹（截取前 16 位）：

- `record`
- `salary_record`
- `annual_bonus`
- `budget_item`
- `deposit_bank`
- `deposit_record`
- `app_setting`（含预算账期配置）
- `category-custom.json`（若存在）

同步簿记（`cloud-sync.json` 的 `lastState`、`lastSnapshot`、时间戳等）不参与指纹。

手动备份：

1. 计算当前内容指纹。
2. 与 `cloud-sync.json` 的 `lastState` 比较；内容未变且快照仍存在时跳过。
3. 使用 SQLite backup 生成临时 `.part` 文件。
4. 统计业务行数，重命名为正式快照。
5. 复制分类侧车。
6. 计算 SHA-256，写入 `latest.json`。
7. 按保留策略裁剪旧快照。

自动备份（设置中开启后）：

- 业务数据变化后延迟 60 秒写快照，避免连续操作频繁写盘。
- 启动后 15 秒检查一次；之后按 15 秒周期检查。
- 先判断内容指纹是否变化，再创建 `auto` 快照。
- 自动同步开启时：本地有未备份改动则自动上传；本地干净且云端 `latest.json` 更新时自动恢复最新一份。

## 5. 快照保留与清理

每个设备标识分别计数：

- 手动快照：保留最近 2 份。
- 自动快照：保留最近 3 份。
- 只清理已下载到本机的旧快照；iCloud 占位文件不主动删除。
- 恢复前本地数据库备份保留最近 5 份：
  `~/Library/Application Support/记账清单/backups/records_before_restore_*.db`

## 6. 恢复语义

桌面 `.db` 快照恢复是**整库覆盖**，不是合并：

1. 校验快照文件名、文件存在性和 `sha256`。
2. 将当前本机数据库备份到本地 `backups/`。
3. 将快照复制为临时文件，替换 `records.db`，清理 WAL/SHM/journal。
4. 重新打开数据库并执行表结构升级。
5. 若存在分类侧车，覆盖本机 `category-custom.json`。
6. 更新同步簿记，广播数据恢复事件，界面刷新。

恢复移动端 JSON 时同样先备份本机数据库，再按第 8 节执行整库覆盖。

## 7. 移动端 JSON 兼容（对应移动端协议 v1.1）

### 7.1 扫描位置

桌面端会扫描：

- 当前同步根目录；
- 同步根目录的上级目录；
- `记账清单/` 同步子目录；
- 用户桌面目录。

识别规则：

- 文件名匹配 `record-backup-*.json`；
- 子目录名匹配 `Record备份-*`，默认取该目录内文件名最新的 JSON；
- 如果同步根目录本身就是 `Record备份-*` 目录，则目录内每份 JSON 都作为一个独立版本列出。

版本列表显示 JSON 中的 `createdAt`、设备名，以及流水/工资/年终奖/预算/存款/自定义分类数量。

### 7.2 设备字段

优先使用 `hardware.name` 作为设备显示名，其次 `hardware.identifier`，最后回退到 `device`。`hardware` 缺失时旧快照仍可读取。

### 7.3 恢复映射

按移动端协议 v1.1 执行整库覆盖：

| 移动端字段 | 桌面端落点 |
|---|---|
| `records[]` | `record` |
| `categories[]` | 重建 `category-custom.json` 分类树 |
| `deposits[]` | `deposit_record`，按 `bankName` 关联内置/自定义银行 |
| `salaries[]` | `salary_record`，净收入按 `max(0, 基本工资 + 加班费 + 一次性奖金 - 五险一金 - 税)` 计算 |
| `bonuses[]` | `annual_bonus` |
| `budgets[]` | `budget_item` |
| `budgetSettings` | `app_setting` 中 `key = 'budget'` |

- `budgetSettings` 缺失时保留本机当前账期配置，不重置为默认值。
- `deposit_bank` 不删除；恢复只重建存款记录，缺失的移动端银行名称会补建为自定义银行。
- 移动端日期为 ISO 8601；桌面端统一取本地当天 00:00 存储，避免时区导致跨日。
- 移动端 `typeRaw` 的 `expense` / `income` 映射为桌面端 `支出` / `收入`。
- 未知字段忽略；缺少 `hardware` 或 `budgetSettings` 不阻断恢复。

### 7.4 恢复安全

移动端 JSON 恢复前自动生成本机数据库备份；恢复过程使用数据库事务，失败会回滚业务表。分类文件在事务提交后重建。

## 8. 冲突与限制

- 当前没有字段级合并和冲突解决；恢复以整库覆盖为准。
- 同一秒内多设备写快照会通过 `_n` 后缀避免文件名冲突，但不会自动合并内容。
- 桌面端以 `latest.json` 的 `created_ts` 判断云端是否更新；移动端 JSON 不参与自动同步，需在版本列表中手动选择恢复。
- `latest.json` 不包含 `schemaVersion`；表结构由打开数据库时的升级逻辑补齐。
- 快照是明文文件，包含账单、工资、个税、存款等敏感数据；安全性依赖用户选择的目录和系统文件保护。
- `device` 只写硬件型号标识（如 `Mac16,10`）；`deviceTag` 来自随机匿名设备标识文件 `device-id`。主机名、序列号、硬件 UUID、Apple ID、用户名均不写入快照。

## 9. 代码位置

- 桌面快照/恢复/自动同步：`src/utils/CloudSync.ts`
- 数据库表结构与移动端导入：`src/db/Database.ts`
- 预算配置读写：`src/db/Database.ts` 中 `fetchBudgetSettings` / `saveBudgetSettings`
- 同步版本列表 UI：`src/components/settings/CloudSync.vue`
- 移动端协议参考：`Record-iOS/docs/mobile-backup-sync-protocol.md`
