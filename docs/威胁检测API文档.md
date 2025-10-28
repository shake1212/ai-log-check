# 威胁检测和告警系统 API 文档

## 概述

威胁检测和告警系统提供了完整的威胁检测规则管理和告警处理功能，支持多种检测模式、自动化响应和实时监控。

**基础URL**: `/api/threat-detection`

**认证方式**: JWT Bearer Token

---

## 目录

1. [威胁检测规则管理](#威胁检测规则管理)
2. [告警管理](#告警管理)
3. [数据模型](#数据模型)
4. [错误码](#错误码)

---

## 威胁检测规则管理

### 1. 创建威胁检测规则

**接口**: `POST /threat-detection/rules`

**描述**: 创建新的威胁检测规则

**请求体**:
```json
{
  "name": "SQL注入检测",
  "description": "检测SQL注入攻击尝试",
  "threatType": "SQL_INJECTION",
  "severity": "CRITICAL",
  "detectionMode": "PATTERN_MATCH",
  "conditions": "{\"patterns\": [\"' or '1'='1\", \"union select\", \"drop table\"]}",
  "timeWindowSeconds": 300,
  "thresholdValue": 5,
  "enabled": true,
  "responseAction": "ALERT_ONLY",
  "responseParams": "{}",
  "targetSource": "web_server",
  "priority": 10,
  "createdBy": "admin"
}
```

**响应**:
```json
{
  "success": true,
  "message": "规则创建成功",
  "data": {
    "id": 1,
    "name": "SQL注入检测",
    "threatType": "SQL_INJECTION",
    "severity": "CRITICAL",
    "enabled": true,
    "createdAt": "2024-01-15T10:00:00",
    "updatedAt": "2024-01-15T10:00:00"
  }
}
```

---

### 2. 更新威胁检测规则

**接口**: `PUT /threat-detection/rules/{id}`

**描述**: 更新指定ID的威胁检测规则

**路径参数**:
- `id` (Long): 规则ID

**请求体**: 同创建接口

**响应**: 同创建接口

---

### 3. 删除威胁检测规则

**接口**: `DELETE /threat-detection/rules/{id}`

**描述**: 删除指定ID的威胁检测规则

**路径参数**:
- `id` (Long): 规则ID

**响应**:
```json
{
  "success": true,
  "message": "规则删除成功"
}
```

---

### 4. 获取规则详情

**接口**: `GET /threat-detection/rules/{id}`

**描述**: 获取指定ID的规则详细信息

**路径参数**:
- `id` (Long): 规则ID

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "SQL注入检测",
    "description": "检测SQL注入攻击尝试",
    "threatType": "SQL_INJECTION",
    "severity": "CRITICAL",
    "detectionMode": "PATTERN_MATCH",
    "conditions": "{\"patterns\": [...]}",
    "enabled": true,
    "triggerCount": 125,
    "lastTriggeredAt": "2024-01-15T14:30:00",
    "createdAt": "2024-01-15T10:00:00",
    "updatedAt": "2024-01-15T14:30:00"
  }
}
```

---

### 5. 分页查询规则

**接口**: `GET /threat-detection/rules`

**描述**: 分页查询威胁检测规则

**查询参数**:
- `threatType` (String, 可选): 威胁类型
- `severity` (String, 可选): 严重程度
- `detectionMode` (String, 可选): 检测模式
- `enabled` (Boolean, 可选): 启用状态
- `page` (Integer, 默认0): 页码
- `size` (Integer, 默认20): 每页数量

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "SQL注入检测",
      "threatType": "SQL_INJECTION",
      "severity": "CRITICAL",
      "enabled": true
    }
  ],
  "total": 100,
  "page": 0,
  "size": 20,
  "totalPages": 5
}
```

---

### 6. 启用/禁用规则

**接口**: `PUT /threat-detection/rules/{id}/toggle`

**描述**: 启用或禁用指定规则

**路径参数**:
- `id` (Long): 规则ID

**查询参数**:
- `enabled` (Boolean): true=启用, false=禁用

**响应**:
```json
{
  "success": true,
  "message": "规则已启用",
  "data": {
    "id": 1,
    "enabled": true
  }
}
```

---

### 7. 批量启用/禁用规则

**接口**: `PUT /threat-detection/rules/batch/toggle`

**描述**: 批量启用或禁用多个规则

**查询参数**:
- `enabled` (Boolean): true=启用, false=禁用

**请求体**:
```json
[1, 2, 3, 4, 5]
```

**响应**:
```json
{
  "success": true,
  "message": "成功启用 5 个规则"
}
```

---

### 8. 获取规则统计

**接口**: `GET /threat-detection/rules/statistics`

**描述**: 获取威胁检测规则的统计信息

**响应**:
```json
{
  "success": true,
  "data": {
    "totalCount": 50,
    "enabledCount": 45,
    "byThreatType": {
      "SQL_INJECTION": 10,
      "XSS_ATTACK": 8,
      "BRUTE_FORCE": 12
    },
    "recentlyTriggered": [...]
  }
}
```

---

### 9. 初始化默认规则

**接口**: `POST /threat-detection/rules/init-defaults`

**描述**: 创建系统默认的威胁检测规则

**响应**:
```json
{
  "success": true,
  "message": "默认规则初始化成功"
}
```

---

### 10. 刷新检测引擎规则

**接口**: `POST /threat-detection/rules/refresh`

**描述**: 刷新检测引擎的规则缓存

**响应**:
```json
{
  "success": true,
  "message": "规则刷新成功"
}
```

---

## 告警管理

### 1. 分页查询告警

**接口**: `GET /threat-detection/alerts`

**描述**: 分页查询威胁告警

**查询参数**:
- `threatType` (String, 可选): 威胁类型
- `severity` (String, 可选): 严重程度
- `status` (String, 可选): 告警状态
- `startTime` (DateTime, 可选): 开始时间 (ISO 8601格式)
- `endTime` (DateTime, 可选): 结束时间 (ISO 8601格式)
- `sourceIp` (String, 可选): 源IP地址
- `userAccount` (String, 可选): 用户账号
- `page` (Integer, 默认0): 页码
- `size` (Integer, 默认20): 每页数量

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "alertId": "ALERT-1705300000-ABC123",
      "threatType": "SQL_INJECTION",
      "severity": "CRITICAL",
      "title": "检测到SQL注入 - SQL注入检测",
      "status": "NEW",
      "sourceIp": "192.168.1.100",
      "aiConfidence": 85,
      "createdAt": "2024-01-15T14:30:00"
    }
  ],
  "total": 500,
  "page": 0,
  "size": 20,
  "totalPages": 25
}
```

---

### 2. 获取告警详情

**接口**: `GET /threat-detection/alerts/{id}`

**描述**: 获取指定ID的告警详细信息

**路径参数**:
- `id` (Long): 告警ID

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "alertId": "ALERT-1705300000-ABC123",
    "ruleId": 1,
    "ruleName": "SQL注入检测",
    "threatType": "SQL_INJECTION",
    "severity": "CRITICAL",
    "title": "检测到SQL注入",
    "description": "在来源 web_server 检测到潜在的SQL注入威胁",
    "source": "web_server",
    "sourceIp": "192.168.1.100",
    "userAccount": "test_user",
    "status": "NEW",
    "aiConfidence": 85,
    "evidence": "{\"logId\": 12345, \"message\": \"...\"}",
    "impact": "严重威胁，可能导致系统被完全入侵或数据大规模泄露",
    "recommendations": "1. 立即检查数据库访问日志\n2. 验证输入参数过滤是否有效",
    "firstDetectedAt": "2024-01-15T14:30:00",
    "lastDetectedAt": "2024-01-15T14:30:00",
    "repeatCount": 1,
    "createdAt": "2024-01-15T14:30:00",
    "updatedAt": "2024-01-15T14:30:00"
  }
}
```

---

### 3. 更新告警状态

**接口**: `PUT /threat-detection/alerts/{id}/status`

**描述**: 更新告警的状态、处理人和处理备注

**路径参数**:
- `id` (Long): 告警ID

**请求体**:
```json
{
  "status": "RESOLVED",
  "assignee": "张三",
  "resolution": "已修复漏洞并加强了输入验证"
}
```

**响应**:
```json
{
  "success": true,
  "message": "告警状态更新成功",
  "data": {
    "id": 1,
    "status": "RESOLVED",
    "assignee": "张三",
    "resolution": "已修复漏洞并加强了输入验证",
    "resolvedAt": "2024-01-15T15:00:00"
  }
}
```

---

### 4. 批量更新告警状态

**接口**: `PUT /threat-detection/alerts/batch/status`

**描述**: 批量更新多个告警的状态

**请求体**:
```json
{
  "ids": [1, 2, 3, 4, 5],
  "status": "ACKNOWLEDGED"
}
```

**响应**:
```json
{
  "success": true,
  "message": "成功更新 5 个告警状态"
}
```

---

### 5. 标记为误报

**接口**: `PUT /threat-detection/alerts/{id}/false-positive`

**描述**: 将告警标记为误报

**路径参数**:
- `id` (Long): 告警ID

**请求体**:
```json
{
  "reason": "经验证为正常业务操作"
}
```

**响应**:
```json
{
  "success": true,
  "message": "已标记为误报",
  "data": {
    "id": 1,
    "status": "FALSE_POSITIVE",
    "resolution": "经验证为正常业务操作"
  }
}
```

---

### 6. 确认告警

**接口**: `PUT /threat-detection/alerts/{id}/acknowledge`

**描述**: 确认告警并分配处理人

**路径参数**:
- `id` (Long): 告警ID

**请求体**:
```json
{
  "assignee": "张三"
}
```

**响应**:
```json
{
  "success": true,
  "message": "告警已确认",
  "data": {
    "id": 1,
    "status": "ACKNOWLEDGED",
    "assignee": "张三"
  }
}
```

---

### 7. 解决告警

**接口**: `PUT /threat-detection/alerts/{id}/resolve`

**描述**: 标记告警为已解决

**路径参数**:
- `id` (Long): 告警ID

**请求体**:
```json
{
  "resolution": "已修复漏洞并验证解决方案有效"
}
```

**响应**:
```json
{
  "success": true,
  "message": "告警已解决",
  "data": {
    "id": 1,
    "status": "RESOLVED",
    "resolution": "已修复漏洞并验证解决方案有效",
    "resolvedAt": "2024-01-15T15:00:00"
  }
}
```

---

### 8. 获取待处理告警

**接口**: `GET /threat-detection/alerts/pending`

**描述**: 获取所有待处理的告警（状态为NEW）

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "alertId": "ALERT-1705300000-ABC123",
      "threatType": "SQL_INJECTION",
      "severity": "CRITICAL",
      "status": "NEW",
      "createdAt": "2024-01-15T14:30:00"
    }
  ],
  "total": 25
}
```

---

### 9. 获取高优先级告警

**接口**: `GET /threat-detection/alerts/high-priority`

**描述**: 获取所有高优先级告警（严重程度为HIGH或CRITICAL且未解决）

**响应**:
```json
{
  "success": true,
  "data": [...],
  "total": 15
}
```

---

### 10. 获取告警统计

**接口**: `GET /threat-detection/alerts/statistics`

**描述**: 获取告警的统计信息

**查询参数**:
- `startTime` (DateTime, 可选): 开始时间
- `endTime` (DateTime, 可选): 结束时间

**响应**:
```json
{
  "success": true,
  "data": {
    "totalCount": 1000,
    "pendingCount": 25,
    "byStatus": {
      "NEW": 25,
      "ACKNOWLEDGED": 50,
      "RESOLVED": 800,
      "FALSE_POSITIVE": 125
    },
    "byThreatType": {
      "SQL_INJECTION": 200,
      "XSS_ATTACK": 150,
      "BRUTE_FORCE": 300
    },
    "bySeverity": {
      "CRITICAL": 100,
      "HIGH": 250,
      "MEDIUM": 400,
      "LOW": 250
    },
    "topSourceIps": [
      {
        "ip": "192.168.1.100",
        "count": 50
      }
    ]
  }
}
```

---

### 11. 获取告警趋势

**接口**: `GET /threat-detection/alerts/trend`

**描述**: 获取指定时间范围内的告警趋势数据

**查询参数**:
- `startTime` (DateTime, 必需): 开始时间
- `endTime` (DateTime, 必需): 结束时间
- `granularity` (String, 默认"hour"): 粒度 (hour/day/week)

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "time": "2024-01-15 10:00",
      "count": 25
    },
    {
      "time": "2024-01-15 11:00",
      "count": 30
    }
  ]
}
```

---

### 12. 删除告警

**接口**: `DELETE /threat-detection/alerts/{id}`

**描述**: 删除指定ID的告警

**路径参数**:
- `id` (Long): 告警ID

**响应**:
```json
{
  "success": true,
  "message": "告警删除成功"
}
```

---

### 13. 批量删除告警

**接口**: `DELETE /threat-detection/alerts/batch`

**描述**: 批量删除多个告警

**请求体**:
```json
[1, 2, 3, 4, 5]
```

**响应**:
```json
{
  "success": true,
  "message": "成功删除 5 个告警"
}
```

---

### 14. 清理过期告警

**接口**: `DELETE /threat-detection/alerts/cleanup`

**描述**: 清理指定天数之前的已解决和误报告警

**查询参数**:
- `daysToKeep` (Integer, 默认30): 保留天数

**响应**:
```json
{
  "success": true,
  "message": "成功清理 150 个过期告警",
  "deletedCount": 150
}
```

---

## 数据模型

### 威胁类型 (ThreatType)

| 值 | 描述 |
|---|---|
| SQL_INJECTION | SQL注入 |
| XSS_ATTACK | XSS攻击 |
| BRUTE_FORCE | 暴力破解 |
| ABNORMAL_LOGIN | 异常登录 |
| DATA_LEAK | 数据泄露 |
| PRIVILEGE_ESCALATION | 权限提升 |
| MALICIOUS_SCAN | 恶意扫描 |
| DDOS | DDoS攻击 |
| UNAUTHORIZED_ACCESS | 未授权访问 |
| SUSPICIOUS_ACTIVITY | 可疑活动 |
| MALWARE | 恶意软件 |
| PHISHING | 钓鱼攻击 |
| COMMAND_INJECTION | 命令注入 |
| PATH_TRAVERSAL | 路径遍历 |
| FILE_UPLOAD | 恶意文件上传 |

### 严重程度 (SeverityLevel)

| 值 | 描述 |
|---|---|
| LOW | 低 |
| MEDIUM | 中 |
| HIGH | 高 |
| CRITICAL | 严重 |

### 检测模式 (DetectionMode)

| 值 | 描述 |
|---|---|
| PATTERN_MATCH | 模式匹配 |
| THRESHOLD | 阈值检测 |
| ANOMALY | 异常检测 |
| FREQUENCY | 频率检测 |
| BEHAVIOR | 行为分析 |
| CORRELATION | 关联分析 |

### 响应动作 (ResponseAction)

| 值 | 描述 |
|---|---|
| ALERT_ONLY | 仅告警 |
| BLOCK_IP | 阻断IP |
| LOCK_ACCOUNT | 锁定账户 |
| NOTIFY_ADMIN | 通知管理员 |
| EXECUTE_SCRIPT | 执行脚本 |
| RATE_LIMIT | 限流 |
| QUARANTINE | 隔离 |

### 告警状态 (AlertStatus)

| 值 | 描述 |
|---|---|
| NEW | 新建 |
| ACKNOWLEDGED | 已确认 |
| INVESTIGATING | 调查中 |
| RESOLVED | 已解决 |
| FALSE_POSITIVE | 误报 |
| CLOSED | 已关闭 |

---

## 错误码

| HTTP状态码 | 错误码 | 描述 |
|---|---|---|
| 200 | - | 成功 |
| 400 | BAD_REQUEST | 请求参数错误 |
| 401 | UNAUTHORIZED | 未授权 |
| 403 | FORBIDDEN | 禁止访问 |
| 404 | NOT_FOUND | 资源不存在 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

**错误响应格式**:
```json
{
  "success": false,
  "message": "错误描述信息",
  "errorCode": "ERROR_CODE"
}
```

---

## 使用示例

### 示例1: 创建SQL注入检测规则

```bash
curl -X POST http://localhost:8080/api/threat-detection/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "SQL注入检测",
    "description": "检测SQL注入攻击尝试",
    "threatType": "SQL_INJECTION",
    "severity": "CRITICAL",
    "detectionMode": "PATTERN_MATCH",
    "conditions": "{\"patterns\": [\"' or '1'='1\", \"union select\"]}",
    "enabled": true,
    "responseAction": "ALERT_ONLY",
    "priority": 10
  }'
```

### 示例2: 查询待处理的高危告警

```bash
curl -X GET "http://localhost:8080/api/threat-detection/alerts?severity=CRITICAL&status=NEW&page=0&size=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 示例3: 处理告警

```bash
curl -X PUT http://localhost:8080/api/threat-detection/alerts/123/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "RESOLVED",
    "assignee": "张三",
    "resolution": "已修复漏洞并验证解决方案有效"
  }'
```

---

## 最佳实践

1. **规则管理**
   - 定期审查和更新检测规则
   - 根据实际情况调整规则优先级
   - 使用规则统计分析规则效果

2. **告警处理**
   - 优先处理高严重程度和高置信度的告警
   - 及时标记误报以优化检测准确性
   - 定期清理已解决的历史告警

3. **性能优化**
   - 合理设置时间窗口和阈值
   - 避免创建过于宽泛的规则
   - 定期刷新检测引擎规则缓存

4. **监控和维护**
   - 使用统计API监控系统运行状态
   - 关注待处理告警数量
   - 分析告警趋势发现潜在问题

---

## 更新日志

### v1.0.0 (2024-01-15)
- 初始版本发布
- 支持威胁检测规则CRUD操作
- 支持告警管理和处理
- 提供统计和趋势分析功能

---

## 技术支持

如有问题，请联系技术支持团队或查阅系统文档。

