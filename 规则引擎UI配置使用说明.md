# 规则引擎UI配置使用说明

## 功能概述

通过前端UI配置启用/禁用规则引擎，Python采集器自动从Java后端读取配置并应用规则引擎分析。

## 使用步骤

### 1. 数据库迁移

Flyway 会在后端启动时自动执行。或手动执行：

```sql
ALTER TABLE log_collector_configs
ADD COLUMN IF NOT EXISTS enable_rule_engine BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE log_collector_configs
ADD COLUMN IF NOT EXISTS rule_engine_timeout INT DEFAULT 10;
```

### 2. 启动服务

```bash
# 后端
cd back-system && mvn spring-boot:run

# 前端
cd ai-log-system && npm start

# Python采集器
cd back-system/src/scripts && python unified_log_collector.py
```

### 3. 配置规则引擎

1. 访问 `http://localhost:8000/#/log-collector`
2. 点击"配置"按钮
3. 启用"规则引擎分析"开关
4. 设置超时时间（默认10秒，范围1-60秒）
5. 保存配置，重启Python采集器

## 配置说明

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 启用规则引擎分析 | 启用 | 控制是否对采集事件进行规则引擎分析 |
| 规则引擎超时 | 10秒 | 分析单个事件的最大等待时间 |

## 增强后的事件数据

启用后，每个事件将包含额外字段：

- `threat_score`：威胁分数（0-100）
- `threat_level`：威胁等级（LOW/MEDIUM/HIGH/CRITICAL）
- `rule_matched`：是否匹配规则
- `matched_rule_count`：匹配的规则数量
- `matched_rules`：匹配的规则详情列表

## 数据流程

```
前端UI配置 → 数据库 → API → Python采集器读取 → 规则引擎分析 → 增强数据 → 后端存储
```

## 故障排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 规则引擎已禁用 | UI开关未打开 | 打开开关，重启采集器 |
| 模块未找到 | rule_engine_integration.py 缺失 | 确认文件在 scripts 目录 |
| 分析失败 | Java后端未运行 | 启动后端，测试 API |
| 分析超时 | 超时时间过短 | 增加超时时间或优化规则 |

## 性能影响

- 每个事件增加约 50-100ms 处理时间
- 可通过调整超时时间控制
