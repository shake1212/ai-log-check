# 日志异常检测与预警系统

基于 Spring Boot + React 的安全日志采集、分析与告警平台，支持 Windows 事件日志采集、规则引擎检测、实时告警推送。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + UMI 4 + Ant Design 5 |
| 后端 | Spring Boot 3.2.0 + Java 21 |
| 数据库 | MySQL 8.0 |
| 实时通信 | WebSocket (STOMP) |
| 日志采集 | Python 3 脚本 |
| 认证 | JWT |

## 项目结构

```
├── ai-log-system/          # 前端（React + UMI）
│   ├── src/pages/          # 页面组件
│   ├── src/services/       # API 服务层
│   └── src/utils/          # 工具函数
├── back-system/            # 后端（Spring Boot）
│   ├── src/main/java/      # Java 源码
│   ├── src/scripts/        # Python 采集脚本
│   └── database/all.sql    # 完整数据库建表脚本
└── README.md
```

## 快速启动

### 前置条件

- Java 21+
- Node.js 18+ / pnpm
- Python 3.8+
- MySQL 8.0

### 1. 数据库初始化

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE ai_log_system CHARACTER SET utf8mb4;"

# 导入完整建表脚本（包含所有表结构）
mysql -u root -p ai_log_system < back-system/database/all.sql
```

> Flyway 迁移脚本（`back-system/src/main/resources/db/migration/`）会在后端启动时自动执行增量变更，无需手动运行。

### 2. 后端配置

编辑 `back-system/src/main/resources/application.yml`，配置数据库连接：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/ai_log_system
    username: root
    password: your_password
```

### 3. 启动服务

**终端 1 — 后端**
```bash
cd back-system
mvn spring-boot:run
# 启动成功：Started AiLogSystemApplication（端口 8080）
```

**终端 2 — 前端**
```bash
cd ai-log-system
pnpm install
pnpm dev
# 访问 http://localhost:8000
```

**终端 3 — Python 采集器（可选）**
```bash
cd back-system/src/scripts
python unified_log_collector.py
```

### 4. 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | ADMIN |

---

## 功能状态

| 功能模块 | 状态 | 说明 |
|----------|------|------|
| JWT 认证 | ✅ | 登录鉴权，接口保护 |
| 安全事件管理 | ✅ | 事件采集、查询、统计 |
| 规则引擎 | ✅ | 正则/关键词/条件匹配，支持 UI 配置启用/禁用 |
| 实时告警推送 | ✅ | WebSocket 推送 |
| Python 日志采集 | ✅ | Windows 事件日志 + 系统性能数据 |
| 威胁检测 | ✅ | 暴力破解、权限提升、异常登录 |
| 数据库管理 | ⚠️ | 连接配置已实现，部分高级操作待完善 |
| AI 异常检测 | ⚠️ | 字段已预留，模型推理未接入 |
| AI 模型管理 | ❌ | 页面框架存在，后端未实现 |

---

## 数据库说明

完整建表脚本：`back-system/database/all.sql`

核心表：

| 表名 | 说明 |
|------|------|
| `unified_security_events` | 统一安全事件（核心数据表） |
| `security_events` | 安全事件分析表 |
| `security_alerts` | 安全告警记录 |
| `windows_security_logs` | Windows 安全日志原始数据 |
| `log_entries` | 通用日志条目 |
| `system_metrics` | 系统性能指标历史 |
| `log_collector_configs` | 采集器配置（含规则引擎开关） |
| `threat_signatures` | 威胁检测规则库 |
| `threat_intelligence` | 威胁情报 |
| `users` | 系统用户 |
| `rules` / `rule_conditions` | 规则及条件 |
| `alerts` | 告警（含 AI 置信度） |
| `analysis_results` | 分析结果 |

> `windows_security_logs`、`log_entries`、`alerts`、`rules`、`analysis_results` 这几张表在 `all.sql` 中**缺失**，需补充建表语句（见下方 SQL 问题说明）。

---

## SQL 文件已知问题

`back-system/database/all.sql` 存在以下问题，接手后需修复：

1. **外键引用缺失表**：`security_alerts` 表的外键 `log_id` 引用了 `windows_security_logs(id)`，但该表建表语句不在 `all.sql` 中。
2. **存储过程引用缺失表**：`CleanExpiredData`、`GetAlertStats`、`GetLogStats` 及定时事件引用了 `log_entries` 和 `alerts` 表，但这两张表的建表语句缺失。
3. **重复约束**：`system_configs` 表有两个相同的唯一约束 `UKi7df408gtsfb1tpemt19a8k02` 和 `uk_config_key_group`，需删除其中一个。
4. **users 表触发器**：`update_user_last_login` 触发器向 `log_entries` 表写入数据，该表建表语句缺失。
5. **`password_hash` 字段冗余**：`users` 表同时存在 `password_hash`（旧字段）和 `password`（BCrypt），建议统一使用 `password`。
