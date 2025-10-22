# API接口规范

## 1. 接口设计原则

### 1.1 RESTful设计
- 使用标准HTTP方法：GET、POST、PUT、DELETE
- 资源路径使用名词，动词通过HTTP方法表达
- 使用复数形式表示资源集合

### 1.2 URL设计规范
```
基础URL: http://localhost:8080/api
版本控制: /v1 (可选，当前版本)
```

### 1.3 响应格式
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 2. 接口分类

### 2.1 日志管理接口

#### 2.1.1 获取日志列表
```
GET /api/logs
参数:
  - page: 页码 (默认1)
  - size: 每页数量 (默认20)
  - startTime: 开始时间
  - endTime: 结束时间
  - level: 日志级别
  - source: 日志来源
  - keyword: 关键词搜索
```

#### 2.1.2 获取日志详情
```
GET /api/logs/{id}
```

#### 2.1.3 创建日志
```
POST /api/logs
Body: LogEntryDTO
```

#### 2.1.4 批量导入日志
```
POST /api/logs/batch
Body: LogEntryDTO[]
```

### 2.2 异常检测接口

#### 2.2.1 获取异常列表
```
GET /api/alerts
参数:
  - page: 页码
  - size: 每页数量
  - status: 状态 (PENDING, RESOLVED, IGNORED)
  - severity: 严重程度 (LOW, MEDIUM, HIGH, CRITICAL)
  - startTime: 开始时间
  - endTime: 结束时间
```

#### 2.2.2 更新异常状态
```
PUT /api/alerts/{id}/status
Body: { "status": "RESOLVED" }
```

#### 2.2.3 批量处理异常
```
PUT /api/alerts/batch
Body: { "ids": [1,2,3], "status": "RESOLVED" }
```

### 2.3 AI模型管理接口

#### 2.3.1 获取模型列表
```
GET /api/models
```

#### 2.3.2 创建模型
```
POST /api/models
Body: ModelDTO
```

#### 2.3.3 更新模型
```
PUT /api/models/{id}
Body: ModelDTO
```

#### 2.3.4 删除模型
```
DELETE /api/models/{id}
```

#### 2.3.5 训练模型
```
POST /api/models/{id}/train
Body: { "trainingData": "path/to/data" }
```

#### 2.3.6 模型预测
```
POST /api/models/{id}/predict
Body: { "data": [] }
```

### 2.4 系统管理接口

#### 2.4.1 获取系统状态
```
GET /api/system/status
```

#### 2.4.2 获取系统配置
```
GET /api/system/config
```

#### 2.4.3 更新系统配置
```
PUT /api/system/config
Body: SystemConfigDTO
```

## 3. 错误码规范

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
| 1001 | 业务逻辑错误 |
| 1002 | 数据验证失败 |
| 1003 | 模型训练失败 |
| 1004 | 预测服务不可用 |

## 4. 数据模型

### 4.1 LogEntryDTO
```json
{
  "id": "string",
  "timestamp": "2024-01-01T00:00:00Z",
  "level": "INFO|WARN|ERROR|DEBUG",
  "source": "string",
  "message": "string",
  "details": "object",
  "tags": ["string"],
  "userId": "string",
  "sessionId": "string"
}
```

### 4.2 AlertDTO
```json
{
  "id": "string",
  "logEntryId": "string",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "status": "PENDING|RESOLVED|IGNORED",
  "title": "string",
  "description": "string",
  "detectedAt": "2024-01-01T00:00:00Z",
  "resolvedAt": "2024-01-01T00:00:00Z",
  "modelId": "string",
  "confidence": 0.95
}
```

### 4.3 ModelDTO
```json
{
  "id": "string",
  "name": "string",
  "type": "ISOLATION_FOREST|LSTM|TRANSFORMER",
  "status": "TRAINING|READY|ERROR",
  "version": "string",
  "description": "string",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "accuracy": 0.95,
  "parameters": "object"
}
```

## 5. 认证授权

### 5.1 JWT Token
- 请求头: `Authorization: Bearer <token>`
- Token过期时间: 24小时
- 刷新机制: 通过refresh token

### 5.2 权限控制
- 基于角色的访问控制(RBAC)
- 角色: ADMIN, OPERATOR, VIEWER
- 权限矩阵见系统管理模块

## 6. 接口限流

### 6.1 限流规则
- 普通接口: 1000次/分钟
- 模型训练接口: 10次/分钟
- 预测接口: 100次/分钟

### 6.2 限流响应
```json
{
  "code": 429,
  "message": "请求过于频繁，请稍后再试",
  "data": null,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 7. 接口文档

### 7.1 Swagger文档
- 访问地址: http://localhost:8080/api/swagger-ui.html
- 支持在线测试
- 自动生成客户端代码

### 7.2 接口版本管理
- 当前版本: v1
- 向后兼容原则
- 废弃接口提前3个月通知
