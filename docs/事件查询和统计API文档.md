# 事件查询和统计API文档

## 概述

本文档描述了AI网络安全日志异常检测与预警系统的事件查询和统计API接口。这些接口提供了强大的事件查询、统计分析和报表功能，支持多维度的数据分析和实时监控。

## 基础信息

- **基础URL**: `http://localhost:8080/api/events`
- **认证方式**: JWT Token (Bearer Token)
- **响应格式**: JSON
- **字符编码**: UTF-8

## 接口列表

### 1. 综合事件统计

#### 获取综合事件统计信息
```
GET /api/events/statistics/comprehensive
```

**描述**: 获取系统完整的事件统计信息，包括基础统计、时间范围统计、来源统计、级别统计、异常统计、趋势数据、热点IP统计和用户活动统计。

**响应示例**:
```json
{
  "basic": {
    "totalEvents": 15000,
    "totalAlerts": 1200,
    "anomalyEvents": 800,
    "normalEvents": 14200,
    "anomalyRate": 0.0533,
    "firstEventTime": "2024-01-01T00:00:00",
    "lastEventTime": "2024-01-15T23:59:59"
  },
  "timeRange": {
    "todayEvents": 500,
    "yesterdayEvents": 480,
    "thisWeekEvents": 3500,
    "lastWeekEvents": 3200,
    "thisMonthEvents": 15000,
    "lastMonthEvents": 12000,
    "last24HoursEvents": 520,
    "last7DaysEvents": 3600,
    "last30DaysEvents": 15000
  },
  "sourceStatistics": {
    "web-server": 8000,
    "database": 4000,
    "api-gateway": 3000
  },
  "levelStatistics": {
    "info": 10000,
    "warn": 3000,
    "error": 1500,
    "debug": 500
  },
  "anomaly": {
    "totalAnomalies": 800,
    "pendingAlerts": 200,
    "resolvedAlerts": 500,
    "falsePositiveAlerts": 100,
    "averageConfidence": 0.85,
    "anomalyByType": {},
    "anomalyByLevel": {
      "error": 400,
      "warn": 300,
      "info": 100
    }
  },
  "trends": [
    {
      "timestamp": "2024-01-15T00:00:00",
      "eventCount": 25,
      "anomalyCount": 2,
      "anomalyRate": 0.08
    }
  ],
  "topIps": [
    {
      "ipAddress": "192.168.1.100",
      "eventCount": 500,
      "anomalyCount": 25,
      "anomalyRate": 0.05,
      "lastActivity": "2024-01-15T23:59:59"
    }
  ],
  "userActivity": [
    {
      "userId": "user001",
      "eventCount": 300,
      "anomalyCount": 15,
      "anomalyRate": 0.05,
      "lastActivity": "2024-01-15T23:59:59",
      "topActions": ["login", "view", "edit"]
    }
  ]
}
```

### 2. 时间范围统计

#### 获取指定时间范围的事件统计
```
GET /api/events/statistics/range?startTime=2024-01-01T00:00:00&endTime=2024-01-02T00:00:00
```

**参数**:
- `startTime` (必需): 开始时间，ISO 8601格式
- `endTime` (必需): 结束时间，ISO 8601格式

**响应**: 返回指定时间范围内的统计信息，格式与综合统计相同。

### 3. 事件趋势分析

#### 获取事件趋势数据
```
GET /api/events/trends?startTime=2024-01-01T00:00:00&endTime=2024-01-02T00:00:00&granularity=hour
```

**参数**:
- `startTime` (可选): 开始时间，默认7天前
- `endTime` (可选): 结束时间，默认当前时间
- `granularity` (可选): 时间粒度，可选值: `hour`, `day`，默认`hour`

**响应示例**:
```json
[
  {
    "timestamp": "2024-01-01T00:00:00",
    "eventCount": 25,
    "anomalyCount": 2,
    "anomalyRate": 0.08
  },
  {
    "timestamp": "2024-01-01T01:00:00",
    "eventCount": 30,
    "anomalyCount": 3,
    "anomalyRate": 0.10
  }
]
```

### 4. 来源统计

#### 获取各来源的事件统计
```
GET /api/events/statistics/sources?startTime=2024-01-01T00:00:00&endTime=2024-01-02T00:00:00
```

**参数**:
- `startTime` (可选): 开始时间
- `endTime` (可选): 结束时间

**响应示例**:
```json
{
  "web-server": 8000,
  "database": 4000,
  "api-gateway": 3000,
  "firewall": 2000
}
```

### 5. 级别统计

#### 获取各日志级别的事件统计
```
GET /api/events/statistics/levels?startTime=2024-01-01T00:00:00&endTime=2024-01-02T00:00:00
```

**参数**:
- `startTime` (可选): 开始时间
- `endTime` (可选): 结束时间

**响应示例**:
```json
{
  "info": 10000,
  "warn": 3000,
  "error": 1500,
  "debug": 500
}
```

### 6. 异常统计

#### 获取异常事件和告警统计
```
GET /api/events/statistics/anomalies?startTime=2024-01-01T00:00:00&endTime=2024-01-02T00:00:00
```

**参数**:
- `startTime` (可选): 开始时间
- `endTime` (可选): 结束时间

**响应示例**:
```json
{
  "totalAnomalies": 800,
  "pendingAlerts": 200,
  "resolvedAlerts": 500,
  "falsePositiveAlerts": 100,
  "averageConfidence": 0.85,
  "anomalyByType": {
    "security_breach": 300,
    "unusual_access": 250,
    "data_anomaly": 150,
    "performance_issue": 100
  },
  "anomalyByLevel": {
    "error": 400,
    "warn": 300,
    "info": 100
  }
}
```

### 7. 热点IP统计

#### 获取事件数量最多的IP地址统计
```
GET /api/events/statistics/top-ips?limit=10&startTime=2024-01-01T00:00:00&endTime=2024-01-02T00:00:00
```

**参数**:
- `limit` (可选): 返回数量限制，默认10
- `startTime` (可选): 开始时间
- `endTime` (可选): 结束时间

**响应示例**:
```json
[
  {
    "ipAddress": "192.168.1.100",
    "eventCount": 500,
    "anomalyCount": 25,
    "anomalyRate": 0.05,
    "lastActivity": "2024-01-15T23:59:59"
  },
  {
    "ipAddress": "10.0.0.50",
    "eventCount": 450,
    "anomalyCount": 30,
    "anomalyRate": 0.067,
    "lastActivity": "2024-01-15T23:58:30"
  }
]
```

### 8. 用户活动统计

#### 获取用户活动统计信息
```
GET /api/events/statistics/user-activity?limit=10&startTime=2024-01-01T00:00:00&endTime=2024-01-02T00:00:00
```

**参数**:
- `limit` (可选): 返回数量限制，默认10
- `startTime` (可选): 开始时间
- `endTime` (可选): 结束时间

**响应示例**:
```json
[
  {
    "userId": "user001",
    "eventCount": 300,
    "anomalyCount": 15,
    "anomalyRate": 0.05,
    "lastActivity": "2024-01-15T23:59:59",
    "topActions": ["login", "view", "edit", "delete", "upload"]
  },
  {
    "userId": "admin",
    "eventCount": 250,
    "anomalyCount": 5,
    "anomalyRate": 0.02,
    "lastActivity": "2024-01-15T23:55:30",
    "topActions": ["login", "config", "monitor", "backup"]
  }
]
```

### 9. 高级事件查询

#### 支持多条件组合的高级事件查询
```
GET /api/events/search/advanced?source=web-server&level=ERROR&isAnomaly=true&page=0&size=20
```

**参数**:
- `source` (可选): 事件来源
- `level` (可选): 日志级别
- `ipAddress` (可选): IP地址
- `userId` (可选): 用户ID
- `action` (可选): 操作类型
- `isAnomaly` (可选): 是否异常
- `minAnomalyScore` (可选): 最小异常分数
- `maxAnomalyScore` (可选): 最大异常分数
- `startTime` (可选): 开始时间
- `endTime` (可选): 结束时间
- `keyword` (可选): 关键字搜索
- `page` (可选): 页码，默认0
- `size` (可选): 每页大小，默认20

**响应示例**:
```json
{
  "content": [
    {
      "id": "12345",
      "timestamp": "2024-01-15T10:30:00",
      "source": "web-server",
      "level": "ERROR",
      "content": "Database connection failed",
      "ipAddress": "192.168.1.100",
      "userId": "user001",
      "action": "login",
      "isAnomaly": true,
      "anomalyScore": 0.95,
      "anomalyReason": "Unusual login pattern detected",
      "rawData": "{\"error\": \"Connection timeout\"}",
      "features": {
        "response_time": 5.2,
        "error_count": 3
      },
      "createdAt": "2024-01-15T10:30:00",
      "updatedAt": "2024-01-15T10:30:00"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20
  },
  "totalElements": 150,
  "totalPages": 8,
  "first": true,
  "last": false
}
```

### 10. 事件聚合统计

#### 按指定维度进行事件聚合统计
```
GET /api/events/aggregations?groupBy=source&aggregationType=count&startTime=2024-01-01T00:00:00&endTime=2024-01-02T00:00:00
```

**参数**:
- `groupBy` (必需): 分组维度，可选值: `source`, `level`, `ip`, `user`, `hour`, `day`
- `aggregationType` (可选): 聚合类型，可选值: `count`, `sum`, `avg`，默认`count`
- `startTime` (可选): 开始时间
- `endTime` (可选): 结束时间

**响应示例**:
```json
{
  "data": {
    "web-server": 8000,
    "database": 4000,
    "api-gateway": 3000
  },
  "groupBy": "source",
  "aggregationType": "count",
  "timeRange": {
    "start": "2024-01-01T00:00:00",
    "end": "2024-01-02T00:00:00"
  }
}
```

### 11. 实时事件统计

#### 获取最近1小时和24小时的事件统计
```
GET /api/events/statistics/realtime
```

**响应示例**:
```json
{
  "lastHourEvents": 25,
  "lastHourAnomalies": 2,
  "last24HoursEvents": 500,
  "last24HoursAnomalies": 30,
  "totalEvents": 15000,
  "totalAnomalies": 800,
  "pendingAlerts": 200
}
```

### 12. 事件分布统计

#### 按指定维度获取事件分布统计
```
GET /api/events/statistics/distribution?dimension=source&startTime=2024-01-01T00:00:00&endTime=2024-01-02T00:00:00
```

**参数**:
- `dimension` (必需): 分布维度，可选值: `source`, `level`, `ip`, `user`
- `startTime` (可选): 开始时间
- `endTime` (可选): 结束时间

**响应示例**:
```json
{
  "web-server": 8000,
  "database": 4000,
  "api-gateway": 3000,
  "firewall": 2000
}
```

### 13. 查询帮助

#### 获取事件查询和统计功能的帮助信息
```
GET /api/events/help
```

**响应示例**:
```json
{
  "description": "事件查询和统计API帮助信息",
  "endpoints": {
    "comprehensive": "GET /api/events/statistics/comprehensive - 获取综合统计",
    "timeRange": "GET /api/events/statistics/range - 获取时间范围统计",
    "trends": "GET /api/events/trends - 获取趋势数据",
    "sources": "GET /api/events/statistics/sources - 获取来源统计",
    "levels": "GET /api/events/statistics/levels - 获取级别统计",
    "anomalies": "GET /api/events/statistics/anomalies - 获取异常统计",
    "topIps": "GET /api/events/statistics/top-ips - 获取热点IP统计",
    "userActivity": "GET /api/events/statistics/user-activity - 获取用户活动统计",
    "advancedSearch": "GET /api/events/search/advanced - 高级事件查询",
    "aggregations": "GET /api/events/aggregations - 获取聚合统计",
    "realtime": "GET /api/events/statistics/realtime - 获取实时统计",
    "distribution": "GET /api/events/statistics/distribution - 获取分布统计"
  },
  "parameters": {
    "timeFormat": "ISO 8601格式: 2024-01-01T00:00:00",
    "granularity": "时间粒度: hour, day",
    "groupBy": "分组维度: source, level, ip, user, hour, day",
    "aggregationType": "聚合类型: count, sum, avg",
    "dimension": "分布维度: source, level, ip, user"
  },
  "examples": {
    "comprehensive": "/api/events/statistics/comprehensive",
    "timeRange": "/api/events/statistics/range?startTime=2024-01-01T00:00:00&endTime=2024-01-02T00:00:00",
    "trends": "/api/events/trends?startTime=2024-01-01T00:00:00&endTime=2024-01-02T00:00:00&granularity=hour",
    "advancedSearch": "/api/events/search/advanced?source=web-server&level=ERROR&isAnomaly=true&page=0&size=20"
  }
}
```

## 错误处理

### 错误响应格式
```json
{
  "timestamp": "2024-01-15T10:30:00",
  "status": 500,
  "error": "Internal Server Error",
  "message": "获取统计信息失败",
  "path": "/api/events/statistics/comprehensive"
}
```

### 常见错误码
- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未授权访问
- `403 Forbidden`: 禁止访问
- `404 Not Found`: 资源不存在
- `500 Internal Server Error`: 服务器内部错误

## 使用示例

### JavaScript/TypeScript 示例
```javascript
// 获取综合统计
const getComprehensiveStats = async () => {
  const response = await fetch('/api/events/statistics/comprehensive', {
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
  });
  return await response.json();
};

// 获取趋势数据
const getTrends = async (startTime, endTime, granularity = 'hour') => {
  const params = new URLSearchParams({
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    granularity
  });
  
  const response = await fetch(`/api/events/trends?${params}`, {
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
  });
  return await response.json();
};

// 高级查询
const advancedSearch = async (filters, page = 0, size = 20) => {
  const params = new URLSearchParams({
    ...filters,
    page: page.toString(),
    size: size.toString()
  });
  
  const response = await fetch(`/api/events/search/advanced?${params}`, {
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
  });
  return await response.json();
};
```

### Python 示例
```python
import requests
from datetime import datetime

class EventQueryClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def get_comprehensive_stats(self):
        response = requests.get(
            f'{self.base_url}/api/events/statistics/comprehensive',
            headers=self.headers
        )
        return response.json()
    
    def get_trends(self, start_time, end_time, granularity='hour'):
        params = {
            'startTime': start_time.isoformat(),
            'endTime': end_time.isoformat(),
            'granularity': granularity
        }
        response = requests.get(
            f'{self.base_url}/api/events/trends',
            headers=self.headers,
            params=params
        )
        return response.json()
    
    def advanced_search(self, filters, page=0, size=20):
        params = {**filters, 'page': page, 'size': size}
        response = requests.get(
            f'{self.base_url}/api/events/search/advanced',
            headers=self.headers,
            params=params
        )
        return response.json()

# 使用示例
client = EventQueryClient('http://localhost:8080', 'your-jwt-token')

# 获取综合统计
stats = client.get_comprehensive_stats()
print(f"总事件数: {stats['basic']['totalEvents']}")

# 获取最近24小时的趋势
end_time = datetime.now()
start_time = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
trends = client.get_trends(start_time, end_time, 'hour')

# 高级查询
filters = {
    'source': 'web-server',
    'level': 'ERROR',
    'isAnomaly': 'true'
}
results = client.advanced_search(filters, page=0, size=50)
```

## 性能优化建议

1. **分页查询**: 对于大量数据，使用分页查询避免一次性加载过多数据
2. **时间范围限制**: 查询时尽量指定合理的时间范围
3. **缓存策略**: 对于频繁查询的统计数据，建议在前端实现缓存
4. **异步处理**: 对于复杂的统计查询，考虑使用异步处理
5. **索引优化**: 确保数据库表有适当的索引以支持快速查询

## 注意事项

1. 所有时间参数都使用ISO 8601格式
2. 分页参数从0开始
3. 异常分数范围为0.0-1.0
4. 查询结果可能因为数据量大而需要较长时间，建议设置合理的超时时间
5. 某些统计查询可能消耗较多系统资源，建议在非高峰时段执行
