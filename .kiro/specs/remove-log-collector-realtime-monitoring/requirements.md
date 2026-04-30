# 需求文档

## 简介

从 log-collector（日志采集器）页面和 wmi（系统信息管理）页面中删除实时性能监控功能。该功能包括前端的实时指标展示（CPU/内存/磁盘/进程）、历史趋势图、进程列表，以及后端对应的 metrics API 端点和相关服务层代码。删除后，log-collector 页面仅保留采集器状态管理和配置功能；wmi 页面保留连接管理、查询管理、查询结果和实时信息 Tab 等核心功能，仅移除顶部的性能监控卡片。

## 词汇表

- **Log-Collector**：日志采集器页面（`pages/log-collector/index.tsx`），负责触发 Python 脚本采集安全日志
- **WMI 页面**：系统信息管理页面（`pages/wmi/index.tsx`），负责管理系统信息连接和查询
- **实时性能监控**：展示 CPU、内存、磁盘、网络、进程等系统指标的功能模块，在两个页面中均以 `renderPerformanceMonitoring` 函数实现
- **MetricsService**：后端负责存储和查询系统指标的服务接口
- **SystemMetrics**：存储系统性能指标的数据库实体
- **PerformanceMonitor**：前端采集性能监控和优化模块（`PerformanceMonitor.ts`）
- **LogCollectorService**：前端日志采集服务，包含 `getRealtimeMetrics`、`getHistoricalMetrics` 等方法

## 需求

### 需求 1：删除前端实时性能监控 UI 组件

**用户故事：** 作为开发者，我希望从 log-collector 页面移除实时性能监控相关的 UI 组件，以简化页面功能。

#### 验收标准

1. WHEN log-collector 页面加载时，THE 页面 SHALL 不再渲染 `renderPerformanceMonitoring` 函数输出的实时性能监控卡片（CPU/内存/磁盘/进程圆形进度条）
2. WHEN log-collector 页面加载时，THE 页面 SHALL 不再渲染 `renderHistoricalTrend` 函数输出的历史趋势折线图
3. WHEN log-collector 页面加载时，THE 页面 SHALL 不再渲染 `renderProcessList` 函数输出的 Top 进程列表
4. THE 页面 SHALL 移除 `realtimeMetrics` 和 `historicalMetrics` 状态变量及其相关的 `useState` 声明
5. THE 页面 SHALL 移除 `loadRealtimeMetrics` 和 `loadHistoricalMetrics` 两个 `useCallback` 函数
6. THE 页面 SHALL 移除 `useEffect` 中对 `loadRealtimeMetrics`、`loadHistoricalMetrics` 的调用及定时刷新中对 `loadRealtimeMetrics` 的调用
7. THE 页面 SHALL 移除顶部操作栏中"刷新"按钮对 `loadRealtimeMetrics` 的调用
8. THE 页面 SHALL 移除 `loading` 状态对象中的 `realtime` 和 `historical` 字段
9. THE 页面 SHALL 移除对 `SystemMetrics` 类型的导入引用（如果不再使用）
10. THE 页面 SHALL 移除对 `Line`（@ant-design/charts）的导入（如果不再使用）

### 需求 2：删除前端 LogCollectorService 中的 metrics 相关方法

**用户故事：** 作为开发者，我希望从前端服务层移除不再使用的 metrics API 调用方法。

#### 验收标准

1. THE LogCollectorService SHALL 移除 `getRealtimeMetrics` 方法
2. THE LogCollectorService SHALL 移除 `getHistoricalMetrics` 方法
3. THE LogCollectorService SHALL 移除 `SystemMetrics` 接口定义（如果不再被其他地方引用）
4. THE LogCollectorService SHALL 移除 `ProcessInfo` 接口定义（如果不再被其他地方引用）
5. THE LogCollectorService SHALL 移除 `ExportOptions` 接口定义（如果不再被其他地方引用）

### 需求 3：删除后端 metrics 相关 API 端点

**用户故事：** 作为开发者，我希望从后端 SecurityLogCollectorController 中移除 metrics 相关的 REST API 端点。

#### 验收标准

1. THE SecurityLogCollectorController SHALL 移除 `GET /log-collector/metrics/realtime` 端点及其实现方法 `getRealtimeMetrics`
2. THE SecurityLogCollectorController SHALL 移除 `GET /log-collector/metrics/historical` 端点及其实现方法 `getHistoricalMetrics`
3. THE SecurityLogCollectorController SHALL 移除 `createEmptyMetricsResponse` 私有辅助方法
4. THE SecurityLogCollectorController SHALL 移除 `parseDateTime` 私有辅助方法（如果仅被 metrics 端点使用）
5. IF MetricsService 不再被 SecurityLogCollectorController 使用，THEN THE SecurityLogCollectorController SHALL 移除对 `MetricsService` 的依赖注入字段

### 需求 4：删除前端 PerformanceMonitor 模块

**用户故事：** 作为开发者，我希望删除不再使用的前端性能监控模块文件。

#### 验收标准

1. THE 系统 SHALL 删除 `ai-log-system/src/services/PerformanceMonitor.ts` 文件
2. IF 其他文件引用了 `PerformanceMonitor.ts`，THEN THE 系统 SHALL 移除这些引用

### 需求 5：删除 WMI 页面中的实时性能监控卡片

**用户故事：** 作为开发者，我希望从 wmi 页面移除顶部的性能监控卡片，以统一两个页面的功能范围。

#### 验收标准

1. WHEN wmi 页面加载时，THE 页面 SHALL 不再渲染 `renderPerformanceMonitoring` 函数输出的性能监控卡片（CPU/内存/磁盘/进程圆形进度条）
2. THE wmi 页面 SHALL 移除 `renderPerformanceMonitoring` 函数定义
3. THE wmi 页面 SHALL 移除 `cpuInfo`、`memoryInfo`、`diskInfo`、`processInfo` 状态变量及其 `useState` 声明（如果这些状态仅用于性能监控卡片）
4. THE wmi 页面 SHALL 移除 `loadRealTimeInfo` 中对 CPU、内存、磁盘、进程信息的加载调用（如果这些数据仅用于性能监控卡片）
5. THE wmi 页面 SHALL 移除 `useEffect` 中对 `loadRealTimeInfo` 的定时刷新调用（如果 `loadRealTimeInfo` 不再需要）

### 需求 6：保留核心功能不受影响

**用户故事：** 作为开发者，我希望删除性能监控功能后，两个页面的核心功能仍然正常工作。

#### 验收标准

1. WHEN 删除完成后，THE log-collector 页面 SHALL 仍然正常渲染采集器状态卡片（`renderStatusCards`）
2. WHEN 删除完成后，THE log-collector 页面 SHALL 仍然正常渲染采集器配置表格（`renderConfigTable`）
3. WHEN 删除完成后，THE log-collector 页面 SHALL 仍然支持启动/停止采集器操作及配置更新操作
4. WHEN 删除完成后，THE 后端 SecurityLogCollectorController SHALL 仍然正常提供 `/status`、`/configs`、`/start`、`/stop`、`/alerts` 等端点
5. WHEN 删除完成后，THE wmi 页面 SHALL 仍然正常渲染统计卡片（`renderStatisticsCards`）、健康状态（`renderHealthStatus`）以及连接管理、查询管理、查询结果、实时信息四个 Tab
6. WHEN 删除完成后，THE wmi 页面 SHALL 仍然正常渲染 `renderSystemInfo` 和 `renderProcessInfo`（位于实时信息 Tab 内，与顶部性能监控卡片不同）
