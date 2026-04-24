# 规则引擎UI配置使用说明

## 🎯 功能概述

现在你可以通过前端UI (`http://localhost:8000/#/log-collector`) 来配置和启用规则引擎，无需手动修改Python代码或运行脚本。

## 📋 已完成的修改

### 1. 数据库层
- ✅ 添加 `enable_rule_engine` 字段（是否启用规则引擎）
- ✅ 添加 `rule_engine_timeout` 字段（规则引擎超时时间）
- ✅ 创建数据库迁移脚本

### 2. Java后端
- ✅ 更新 `LogCollectorConfig` 实体类
- ✅ 支持规则引擎配置的读取和保存

### 3. 前端UI
- ✅ 更新 `LogCollectorService` TypeScript接口
- ✅ 在配置模态框中添加规则引擎开关
- ✅ 添加规则引擎超时配置

### 4. Python采集器
- ✅ 导入规则引擎集成模块
- ✅ 从Java后端API读取配置
- ✅ 根据配置动态启用/禁用规则引擎
- ✅ 在事件收集后应用规则分析
- ✅ 添加规则引擎统计信息

## 🚀 使用步骤

### 步骤1: 运行数据库迁移

首先需要运行数据库迁移脚本来添加新字段：

```bash
# 如果使用Flyway，迁移会自动执行
# 如果手动执行，运行以下SQL：
cd back-system/src/main/resources/db/migration
# 执行 V1.0.5__add_rule_engine_config.sql
```

或者手动执行SQL：

```sql
ALTER TABLE log_collector_configs 
ADD COLUMN IF NOT EXISTS enable_rule_engine BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE log_collector_configs 
ADD COLUMN IF NOT EXISTS rule_engine_timeout INT DEFAULT 10;

UPDATE log_collector_configs 
SET enable_rule_engine = TRUE, 
    rule_engine_timeout = 10 
WHERE enable_rule_engine IS NULL;
```

### 步骤2: 启动Java后端

```bash
cd back-system
mvn spring-boot:run
```

确保后端在 `http://localhost:8080` 运行。

### 步骤3: 启动前端

```bash
cd ai-log-system
npm start
```

前端将在 `http://localhost:8000` 运行。

### 步骤4: 在前端UI配置规则引擎

1. 打开浏览器访问 `http://localhost:8000/#/log-collector`

2. 找到"采集器配置"表格

3. 点击"配置"按钮打开配置模态框

4. 在模态框中找到以下新增配置项：

   - **启用规则引擎分析** (开关)
     - 启用后将对采集的安全事件进行威胁分析和规则匹配
     - 默认：启用
   
   - **规则引擎超时（秒）**
     - 规则引擎分析单个事件的最大等待时间
     - 范围：1-60秒
     - 默认：10秒

5. 配置完成后点击"确定"保存

### 步骤5: 启动Python采集器

```bash
cd back-system/src/scripts
python unified_log_collector.py
```

采集器启动时会：
1. 从Java后端加载配置
2. 根据配置启用/禁用规则引擎
3. 开始收集和分析事件

## 📊 验证规则引擎是否工作

### 方法1: 查看采集器日志

启动采集器后，查看日志输出：

```
2026-03-30 10:00:00 - SecurityAlertCollector - INFO - 规则引擎集成模块已加载
2026-03-30 10:00:00 - SecurityAlertCollector - INFO - 规则引擎客户端已初始化
2026-03-30 10:00:00 - SecurityAlertCollector - INFO - 规则引擎状态: 启用
2026-03-30 10:00:05 - SecurityAlertCollector - INFO - 开始规则引擎分析 10 个事件...
2026-03-30 10:00:06 - SecurityAlertCollector - INFO - 规则引擎分析完成: 分析=10, 匹配=3, 失败=0
```

### 方法2: 运行测试脚本

```bash
cd back-system/src/scripts
python test_rule_engine_integration.py
```

测试脚本会验证：
- ✅ 规则引擎模块导入
- ✅ 规则引擎客户端初始化
- ✅ 事件分析功能
- ✅ 采集器集成
- ✅ 配置加载

### 方法3: 检查数据库

查看采集的事件是否包含规则引擎分析结果：

```sql
SELECT 
    event_type,
    severity,
    threat_level,
    threat_score,
    matched_rule_count
FROM unified_security_events
WHERE threat_score IS NOT NULL
ORDER BY timestamp DESC
LIMIT 10;
```

如果 `threat_level` 和 `threat_score` 字段有值，说明规则引擎正在工作。

## 🎨 UI界面说明

### 配置模态框新增字段

```
┌─────────────────────────────────────────┐
│  采集器配置                              │
├─────────────────────────────────────────┤
│                                         │
│  采集器名称: [默认采集器            ]   │
│                                         │
│  启用状态: [✓]                          │
│                                         │
│  采集间隔（秒）: [300              ]    │
│                                         │
│  数据源: [多选下拉框               ]    │
│                                         │
│  CPU告警阈值（%）: [80             ]    │
│                                         │
│  内存告警阈值（%）: [90            ]    │
│                                         │
│  磁盘告警阈值（%）: [85            ]    │
│                                         │
│  数据保留天数: [7                  ]    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🆕 启用规则引擎分析: [✓]        │   │
│  │    ℹ️ 启用后将对采集的安全事件   │   │
│  │       进行威胁分析和规则匹配     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🆕 规则引擎超时（秒）: [10]     │   │
│  │    ℹ️ 规则引擎分析单个事件的     │   │
│  │       最大等待时间               │   │
│  └─────────────────────────────────┘   │
│                                         │
│         [取消]          [确定]          │
└─────────────────────────────────────────┘
```

## 🔧 配置说明

### 启用规则引擎分析

- **作用**: 控制是否对采集的事件进行规则引擎分析
- **默认值**: 启用
- **建议**: 
  - 生产环境：启用（提供威胁检测）
  - 测试环境：可选（减少性能开销）
  - 开发环境：可选

### 规则引擎超时

- **作用**: 控制规则引擎分析单个事件的最大等待时间
- **默认值**: 10秒
- **范围**: 1-60秒
- **建议**:
  - 规则数量少（<100条）：5-10秒
  - 规则数量中等（100-500条）：10-20秒
  - 规则数量多（>500条）：20-30秒
  - 如果经常超时，可以适当增加

## 📈 数据流程

```
用户在前端UI配置
    ↓
保存到数据库 (log_collector_configs表)
    ↓
Python采集器启动时调用API
    ↓
GET /log-collector/configs/default
    ↓
读取 enableRuleEngine 和 ruleEngineTimeout
    ↓
根据配置初始化规则引擎客户端
    ↓
收集安全事件
    ↓
[如果启用] 调用规则引擎分析每个事件
    ↓
POST /api/rule-engine/analyze
    ↓
事件增强（添加威胁分数、匹配规则等）
    ↓
发送到Java后端存储
    ↓
前端展示增强后的事件数据
```

## 🎯 增强后的事件数据

启用规则引擎后，每个事件将包含以下额外字段：

```json
{
  "timestamp": "2026-03-30T10:00:00",
  "event_type": "LOGIN_FAILED",
  "severity": "WARN",
  "message": "登录失败",
  
  // 🆕 规则引擎增强字段
  "threat_score": 75.5,           // 威胁分数 (0-100)
  "threat_level": "HIGH",         // 威胁等级 (LOW/MEDIUM/HIGH/CRITICAL)
  "rule_matched": true,           // 是否匹配规则
  "matched_rule_count": 2,        // 匹配的规则数量
  "matched_rules": [              // 匹配的规则详情
    {
      "rule_id": 1,
      "rule_name": "暴力破解检测",
      "threat_type": "BRUTE_FORCE",
      "severity": "HIGH",
      "score": 80,
      "category": "认证安全"
    },
    {
      "rule_id": 5,
      "rule_name": "异常登录时间",
      "threat_type": "ANOMALY",
      "severity": "MEDIUM",
      "score": 60,
      "category": "行为异常"
    }
  ]
}
```

## 🔍 故障排查

### 问题1: 规则引擎未启用

**症状**: 采集器日志显示"规则引擎已禁用"

**解决方案**:
1. 检查前端UI配置，确保"启用规则引擎分析"开关已打开
2. 检查数据库配置：
   ```sql
   SELECT enable_rule_engine FROM log_collector_configs WHERE id = 'default';
   ```
3. 重启Python采集器

### 问题2: 规则引擎模块不可用

**症状**: 采集器日志显示"规则引擎集成模块未找到"

**解决方案**:
1. 确保 `rule_engine_integration.py` 文件存在于 `back-system/src/scripts/` 目录
2. 检查Python导入路径
3. 重启Python采集器

### 问题3: 规则引擎连接失败

**症状**: 采集器日志显示"规则引擎分析失败"

**解决方案**:
1. 确保Java后端正在运行
2. 检查后端地址配置是否正确
3. 测试规则引擎API：
   ```bash
   curl http://localhost:8080/api/rule-engine/statistics
   ```
4. 检查防火墙设置

### 问题4: 规则引擎超时

**症状**: 采集器日志显示"规则引擎分析超时"

**解决方案**:
1. 在前端UI增加超时时间（如改为20秒）
2. 检查规则数量，考虑优化规则
3. 检查Java后端性能

## 📝 总结

现在你可以：

✅ 通过前端UI配置规则引擎（无需修改代码）
✅ 动态启用/禁用规则引擎
✅ 调整规则引擎超时时间
✅ 实时查看规则引擎分析结果
✅ 监控规则引擎统计信息

**不再需要：**
❌ 手动运行补丁脚本
❌ 修改Python代码
❌ 重新部署采集器

一切都通过前端UI配置完成！🎉
