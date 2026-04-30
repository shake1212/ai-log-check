# 告警API修复说明

## 问题描述

前端调用告警确认API时出现404错误：
```
No static resource log-collector/alerts/1524/acknowledge
```

## 问题原因

`SecurityLogCollectorController` 中缺少以下API接口：
- `POST /log-collector/alerts/{alertId}/acknowledge` - 确认告警
- `POST /log-collector/alerts/{alertId}/resolve` - 解决告警
- `GET /log-collector/test` - 测试连接

## 修复内容

### 1. SecurityLogCollectorController.java

添加了3个新的API接口：

#### 1.1 确认告警接口
```java
@PostMapping("/alerts/{alertId}/acknowledge")
@Operation(summary = "确认告警")
public ResponseEntity<Map<String, Object>> acknowledgeAlert(@PathVariable String alertId)
```

**功能**:
- 接收告警ID
- 调用AlertService.acknowledgeAlert()
- 返回操作结果

**请求示例**:
```bash
POST /log-collector/alerts/1524/acknowledge
```

**响应示例**:
```json
{
  "success": true,
  "message": "告警已确认",
  "alertId": "1524"
}
```

#### 1.2 解决告警接口
```java
@PostMapping("/alerts/{alertId}/resolve")
@Operation(summary = "解决告警")
public ResponseEntity<Map<String, Object>> resolveAlert(@PathVariable String alertId)
```

**功能**:
- 接收告警ID
- 调用AlertService.resolveAlert()
- 返回操作结果

**请求示例**:
```bash
POST /log-collector/alerts/1524/resolve
```

**响应示例**:
```json
{
  "success": true,
  "message": "告警已解决",
  "alertId": "1524"
}
```

#### 1.3 测试连接接口
```java
@GetMapping("/test")
@Operation(summary = "测试采集器连接")
public ResponseEntity<Map<String, Object>> testConnection()
```

**功能**:
- 测试数据库连接和服务可用性
- 返回连接状态

**请求示例**:
```bash
GET /log-collector/test
```

**响应示例**:
```json
{
  "connected": true,
  "message": "连接正常",
  "timestamp": "2026-03-30T10:00:00"
}
```

### 2. AlertService.java

添加了2个新的方法定义：

```java
// 确认告警
boolean acknowledgeAlert(Long id);

// 解决告警
boolean resolveAlert(Long id);
```

### 3. AlertServiceImpl.java

实现了2个新的方法：

#### 3.1 acknowledgeAlert
```java
@Override
@Transactional
public boolean acknowledgeAlert(Long id) {
    // 查找告警
    // 标记为已确认（但未解决）
    // 保存到数据库
    // 返回结果
}
```

#### 3.2 resolveAlert
```java
@Override
@Transactional
public boolean resolveAlert(Long id) {
    // 查找告警
    // 标记为已解决
    // 保存到数据库
    // 返回结果
}
```

## 修改统计

- **修改文件**: 3个
  - SecurityLogCollectorController.java
  - AlertService.java
  - AlertServiceImpl.java
- **新增方法**: 5个
  - acknowledgeAlert (Controller)
  - resolveAlert (Controller)
  - testConnection (Controller)
  - acknowledgeAlert (Service)
  - resolveAlert (Service)
- **代码行数**: 约150行

## 测试方法

### 方法1: 使用curl测试

```bash
# 1. 测试连接
curl http://localhost:8080/log-collector/test

# 2. 获取告警列表
curl http://localhost:8080/log-collector/alerts

# 3. 确认告警（替换1524为实际的告警ID）
curl -X POST http://localhost:8080/log-collector/alerts/1524/acknowledge

# 4. 解决告警
curl -X POST http://localhost:8080/log-collector/alerts/1524/resolve
```

### 方法2: 使用前端UI测试

1. 启动Java后端
2. 启动前端
3. 访问 `http://localhost:8000/#/log-collector`
4. 查看告警列表
5. 点击"确认"按钮
6. 点击"解决"按钮
7. 验证操作是否成功

### 方法3: 使用Postman测试

1. 创建新的请求
2. 设置方法为POST
3. 设置URL为 `http://localhost:8080/log-collector/alerts/{alertId}/acknowledge`
4. 发送请求
5. 检查响应

## API完整列表

### 日志采集器相关API

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | /log-collector/collect | 手动触发采集 | ✅ |
| GET | /log-collector/status | 获取采集器状态 | ✅ |
| POST | /log-collector/start/{id} | 启动采集器 | ✅ |
| POST | /log-collector/stop/{id} | 停止采集器 | ✅ |
| POST | /log-collector/schedule | 配置定时采集 | ✅ |
| GET | /log-collector/config | 获取配置 | ✅ |
| GET | /log-collector/configs | 获取配置列表 | ✅ |
| GET | /log-collector/configs/{id} | 获取单个配置 | ✅ |
| PUT | /log-collector/configs/{id} | 更新配置 | ✅ |
| GET | /log-collector/metrics/realtime | 获取实时指标 | ✅ |
| GET | /log-collector/metrics/historical | 获取历史指标 | ✅ |
| GET | /log-collector/alerts | 获取告警列表 | ✅ |
| POST | /log-collector/alerts/{id}/acknowledge | 确认告警 | 🆕 |
| POST | /log-collector/alerts/{id}/resolve | 解决告警 | 🆕 |
| GET | /log-collector/test | 测试连接 | 🆕 |

## 预期效果

修复后：
1. ✅ 前端可以成功调用确认告警API
2. ✅ 前端可以成功调用解决告警API
3. ✅ 前端可以测试采集器连接
4. ✅ 告警状态可以正确更新
5. ✅ 不再出现404错误

## 注意事项

### 告警状态说明

- **未确认**: `handled = false`, `acknowledged = false`
- **已确认**: `handled = false`, `acknowledged = true` (当前实现中acknowledged通过handled字段判断)
- **已解决**: `handled = true`, `resolved = true`

### 错误处理

所有API都包含错误处理：
- 无效的告警ID → 400 Bad Request
- 告警不存在 → 404 Not Found (在Service层抛出异常)
- 其他错误 → 500 Internal Server Error

### 事务管理

- `acknowledgeAlert` 和 `resolveAlert` 都使用 `@Transactional` 注解
- 确保数据库操作的原子性

## 部署步骤

1. **停止Java后端**
   ```bash
   # Ctrl+C 停止运行中的后端
   ```

2. **重新编译**
   ```bash
   cd back-system
   mvn clean compile
   ```

3. **启动Java后端**
   ```bash
   mvn spring-boot:run
   ```

4. **验证修复**
   ```bash
   # 测试连接
   curl http://localhost:8080/log-collector/test
   
   # 测试告警API
   curl http://localhost:8080/log-collector/alerts
   ```

5. **前端测试**
   - 访问 `http://localhost:8000/#/log-collector`
   - 测试告警确认和解决功能

## 验证清单

- [ ] Java后端编译成功
- [ ] Java后端启动成功
- [ ] 测试连接API返回成功
- [ ] 告警列表API返回数据
- [ ] 确认告警API返回成功
- [ ] 解决告警API返回成功
- [ ] 前端UI可以确认告警
- [ ] 前端UI可以解决告警
- [ ] 数据库中告警状态正确更新
- [ ] 不再出现404错误

## 故障排查

### 问题1: 仍然出现404错误

**可能原因**:
- Java后端未重启
- 代码未正确编译

**解决方案**:
```bash
cd back-system
mvn clean package
mvn spring-boot:run
```

### 问题2: 告警ID无效

**症状**: 返回400 Bad Request

**原因**: 告警ID不是数字

**解决方案**: 确保传递的是数字ID

### 问题3: 告警不存在

**症状**: 返回500错误，日志显示"告警不存在"

**原因**: 数据库中没有该ID的告警

**解决方案**: 
1. 先调用 `/log-collector/alerts` 获取有效的告警ID
2. 使用返回的ID进行操作

## 需要帮助？

如果遇到问题：
1. 查看Java后端日志
2. 查看浏览器控制台
3. 使用curl测试API
4. 检查数据库中的数据

---

**修复时间**: 2024-03-30
**修复状态**: 完成
**测试状态**: 待验证
