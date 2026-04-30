# 日志异常检测与预警系统

基于 Spring Boot + React 的安全日志采集、分析与告警平台。

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

- Java 21+ / Node.js 18+ / pnpm / Python 3.8+ / MySQL 8.0

### 1. 数据库初始化

```bash
mysql -u root -p -e "CREATE DATABASE ai_log_system CHARACTER SET utf8mb4;"
mysql -u root -p ai_log_system < back-system/database/all.sql
```

> Flyway 迁移脚本会在后端启动时自动执行增量变更。

### 2. 后端配置

编辑 `back-system/src/main/resources/application.yml`：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/ai_log_system
    username: root
    password: your_password
```

### 3. 启动服务

```bash
# 后端（端口 8080）
cd back-system && mvn spring-boot:run

# 前端（端口 8000）
cd ai-log-system && pnpm install && pnpm dev

# Python 采集器（可选）
cd back-system/src/scripts && python unified_log_collector.py
```

### 4. 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | ADMIN |

## 功能状态

### 前端页面

| 路由 | 页面 | 状态 |
|------|------|------|
| `/dashboard` | 仪表盘 | 已实现 |
| `/events` | 事件查询 | 已实现 |
| `/security-events` | 安全事件 | 已实现 |
| `/alerts` | 告警管理 | 已实现 |
| `/rules` | 规则管理 | 已实现 |
| `/logs` | 日志查询 | 已实现 |
| `/realtime` | 实时监控 | 已实现 |
| `/log-collector` | 日志采集器 | 已实现 |
| `/data-export` | 数据导出 | 已实现 |
| `/batch-operations` | 批量操作 | 已实现 |
| `/wmi` | 系统信息管理 | 部分实现 |
| `/database` | 数据库管理 | 部分实现 |
| `/whitelist` | 白名单管理 | 部分实现（后端未实现） |
| `/models` | AI 模型管理 | 未实现 |

### 核心功能

| 功能 | 状态 | 说明 |
|------|------|------|
| JWT 认证 | 已实现 | 登录鉴权，接口保护 |
| 规则引擎检测 | 已实现 | 正则/关键词/条件匹配，支持 UI 配置启用/禁用 |
| 威胁检测 | 已实现 | 暴力破解、权限提升、异常登录 |
| 实时告警推送 | 已实现 | WebSocket 推送 |
| Python 日志采集 | 已实现 | Windows 事件日志 + 系统性能数据 |
| 数据导出 | 已实现 | CSV/Excel/JSON/ZIP，支持批量导出 |
| AI 异常检测 | 部分实现 | 评分字段已预留，模型推理未接入 |
| AI 模型管理 | 未实现 | 页面框架存在，后端未实现 |
| 白名单过滤 | 未实现 | 前端页面存在，后端未实现 |

## 数据库

完整建表脚本：`back-system/database/all.sql`

核心表：`unified_security_events`、`security_events`、`security_alerts`、`windows_security_logs`、`log_entries`、`system_metrics`、`log_collector_configs`、`threat_signatures`、`threat_intelligence`、`users`、`rules`/`rule_conditions`、`alerts`、`analysis_results`

### SQL 已知问题

1. `security_alerts` 外键引用的 `windows_security_logs` 建表语句缺失
2. 存储过程引用的 `log_entries`、`alerts` 建表语句缺失
3. `system_configs` 存在重复唯一约束
4. `users` 表 `password_hash` 字段冗余，建议统一使用 `password`
