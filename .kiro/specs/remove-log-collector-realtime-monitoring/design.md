# 设计文档：删除 Log-Collector 实时性能监控

## 概述

本次变更从两个前端页面（log-collector 和 wmi）中删除实时性能监控功能，并清理后端对应的 API 端点。这是一次纯删除操作，不引入新功能，目标是减少代码复杂度，移除不再需要的功能模块。

## 架构

当前实时性能监控功能横跨三层：

```
前端页面层
  ├── ai-log-system/src/pages/log-collector/index.tsx
  │     ├── renderPerformanceMonitoring()   ← 删除
  │     ├── renderHistoricalTrend()         ← 删除
  │     ├── renderProcessList()             ← 删除
  │     └── realtimeMetrics / historicalMetrics 状态  ← 删除
  └── ai-log-system/src/pages/wmi/index.tsx
        └── renderPerformanceMonitoring()   ← 删除（顶部卡片）

前端服务层
  ├── ai-log-system/src/services/LogCollectorService.ts
  │     ├── getRealtimeMetrics()            ← 删除
  │     ├── getHistoricalMetrics()          ← 删除
  │     ├── SystemMetrics 接口              ← 删除
  │     └── ProcessInfo 接口               ← 删除
  └── ai-log-system/src/services/PerformanceMonitor.ts  ← 整个文件删除

后端 API 层
  └── back-system/.../SecurityLogCollectorController.java
        ├── GET /log-collector/metrics/realtime    ← 删除
        ├── GET /log-collector/metrics/historical  ← 删除
        ├── createEmptyMetricsResponse()           ← 删除
        ├── parseDateTime()                        ← 删除
        └── MetricsService 依赖注入                ← 删除
```

删除后保留的功能：

```
前端页面层
  ├── log-collector/index.tsx
  │     ├── renderStatusCards()     ✓ 保留
  │     └── renderConfigTable()     ✓ 保留
  └── wmi/index.tsx
        ├── renderStatisticsCards() ✓ 保留
        ├── renderHealthStatus()    ✓ 保留
        ├── renderSystemInfo()      ✓ 保留（实时信息 Tab 内）
        └── renderProcessInfo()     ✓ 保留（实时信息 Tab 内）

后端 API 层
  └── SecurityLogCollectorController.java
        ├── GET /status             ✓ 保留
        ├── GET /configs            ✓ 保留
        ├── POST /start/{id}        ✓ 保留
        ├── POST /stop/{id}         ✓ 保留
        └── GET /alerts             ✓ 保留
```

## 组件与接口

### 前端：log-collector/index.tsx

需要删除的内容：

1. 状态变量：
   - `realtimeMetrics: SystemMetrics | null`
   - `historicalMetrics: SystemMetrics[]`
   - `loading` 对象中的 `realtime` 和 `historical` 字段

2. 函数：
   - `loadRealtimeMetrics` (useCallback)
   - `loadHistoricalMetrics` (useCallback)
   - `renderPerformanceMonitoring`
   - `renderHistoricalTrend`
   - `renderProcessList`

3. useEffect 中的调用：
   - `loadRealtimeMetrics()` 的初始调用
   - `loadHistoricalMetrics()` 的初始调用
   - `loadRealtimeMetrics` 在 `loadConfigs`、`loadStatus` 的依赖数组中的引用
   - 定时器中 `loadRealtimeMetrics()` 的调用

4. 刷新按钮中对 `loadRealtimeMetrics` 的调用

5. JSX 中的渲染调用：
   - `{renderPerformanceMonitoring()}`
   - `{renderHistoricalTrend()}`
   - `{renderProcessList()}`

6. 导入：
   - `SystemMetrics` 类型导入（来自 LogCollectorService）
   - `Line`（来自 @ant-design/charts）——如果不再使用

### 前端：wmi/index.tsx

需要删除的内容：

1. 状态变量（仅用于性能监控卡片的部分）：
   - `cpuInfo: RealTimeCpuInfo | null`
   - `memoryInfo: RealTimeMemoryInfo | null`
   - `diskInfo: RealTimeDiskInfo | null`

   > 注意：`processInfo` 同时被 `renderProcessInfo`（实时信息 Tab）使用，需要保留。`systemInfo` 同样保留。

2. 函数：
   - `renderPerformanceMonitoring`（顶部卡片）

3. `loadRealTimeInfo` 中对 CPU、内存、磁盘信息的加载（保留 system 和 processes 的加载，因为实时信息 Tab 仍需要）：
   - 移除 `systemInfoApiService.getRealTimeCpuInfo()` 调用
   - 移除 `systemInfoApiService.getRealTimeMemoryInfo()` 调用
   - 移除 `systemInfoApiService.getRealTimeDiskInfo()` 调用
   - 移除对应的 `setCpuInfo`、`setMemoryInfo`、`setDiskInfo` 调用

4. JSX 中的渲染调用：
   - `{renderPerformanceMonitoring()}`

5. 导入：
   - `RealTimeCpuInfo`、`RealTimeMemoryInfo`、`RealTimeDiskInfo` 类型导入

### 前端：LogCollectorService.ts

需要删除的内容：

1. 接口定义：
   - `SystemMetrics` 接口
   - `ProcessInfo` 接口

2. 方法：
   - `getRealtimeMetrics(): Promise<SystemMetrics>`
   - `getHistoricalMetrics(startTime, endTime): Promise<SystemMetrics[]>`

   > 注意：`ExportOptions` 接口仍被 `exportData` 方法使用，保留。`AlertInfo` 接口仍被 `getAlerts` 等方法使用，保留。

### 前端：PerformanceMonitor.ts

整个文件删除：`ai-log-system/src/services/PerformanceMonitor.ts`

已确认没有其他文件引用此模块，可以直接删除。

### 后端：SecurityLogCollectorController.java

需要删除的内容：

1. 端点方法：
   - `getRealtimeMetrics()` — `GET /log-collector/metrics/realtime`
   - `getHistoricalMetrics()` — `GET /log-collector/metrics/historical`

2. 私有辅助方法：
   - `createEmptyMetricsResponse()`
   - `parseDateTime()` — 仅被 metrics 端点使用

3. 依赖注入字段：
   - `private final MetricsService metricsService`

   > 注意：`AlertService` 仍被 `/alerts` 端点使用，保留。

4. 相关导入（如果不再使用）：
   - `Optional` 导入

## 数据模型

本次变更不涉及数据模型修改。`SystemMetrics` 实体、`MetricsRepository`、`MetricsService` 接口及其实现均保留，仅从 Controller 层移除对 `MetricsService` 的引用。

## 正确性属性

*属性是在系统所有有效执行中都应成立的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范与机器可验证正确性保证之间的桥梁。*

本次变更为纯删除操作，大多数验收标准是代码结构要求，不适合属性测试。经过前期分析，所有可测试项均为具体示例，无通用属性。

**示例测试 1：后端 metrics 端点已移除**
删除后，`GET /log-collector/metrics/realtime` 和 `GET /log-collector/metrics/historical` 应返回 404。
**验证：需求 3.1、3.2**

**示例测试 2：后端核心端点仍然可用**
删除后，`GET /log-collector/status`、`GET /log-collector/configs`、`GET /log-collector/alerts` 应仍然返回 200。
**验证：需求 6.4**

## 错误处理

本次变更为删除操作，不引入新的错误处理逻辑。需要注意：

- wmi 页面的 `loadRealTimeInfo` 函数在删除 CPU/内存/磁盘加载后，仍需保留对 system 和 processes 的加载，以支持实时信息 Tab
- 删除 `parseDateTime` 前需确认该方法仅被 metrics 端点使用（已确认）
- 删除 `MetricsService` 依赖注入前需确认 Controller 中没有其他方法使用它（已确认）

## 测试策略

本次变更为删除操作，测试重点是验证：
1. 被删除的功能确实不再存在
2. 保留的功能没有被意外破坏

**单元测试**：
- 验证 `SecurityLogCollectorControllerTest` 中与 metrics 相关的测试用例需要同步删除（`testGetRealtimeMetrics_*`、`testGetHistoricalMetrics_*` 系列）
- 验证 `RuleEngineConfigApiTest` 中的 `@MockBean MetricsService` 声明需要同步删除

**集成测试**：
- 验证后端核心端点（`/status`、`/configs`、`/alerts`）在删除后仍然正常响应
