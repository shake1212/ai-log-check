# 实现计划：删除 Log-Collector 实时性能监控

## 概述

按层次从前端到后端逐步删除实时性能监控相关代码，每步完成后确保页面和服务仍可正常运行。

## 任务

- [完成] 1. 删除前端 log-collector 页面中的实时性能监控
  - 删除 `realtimeMetrics`、`historicalMetrics` 状态变量及 `loading` 中的 `realtime`/`historical` 字段
  - 删除 `loadRealtimeMetrics`、`loadHistoricalMetrics` 两个 useCallback 函数
  - 删除 `renderPerformanceMonitoring`、`renderHistoricalTrend`、`renderProcessList` 三个渲染函数
  - 清理 `useEffect` 中对上述函数的调用及定时器中的 `loadRealtimeMetrics` 调用
  - 清理刷新按钮中对 `loadRealtimeMetrics` 的调用
  - 移除 JSX 中的 `{renderPerformanceMonitoring()}`、`{renderHistoricalTrend()}`、`{renderProcessList()}` 调用
  - 移除不再使用的 `SystemMetrics` 类型导入和 `Line` 组件导入
  - _需求：1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [完成] 2. 删除前端 wmi 页面中的实时性能监控卡片
  - 删除 `cpuInfo`、`memoryInfo`、`diskInfo` 状态变量
  - 删除 `renderPerformanceMonitoring` 函数（顶部卡片）
  - 在 `loadRealTimeInfo` 中移除对 `getRealTimeCpuInfo`、`getRealTimeMemoryInfo`、`getRealTimeDiskInfo` 的调用及对应的 `setCpuInfo`、`setMemoryInfo`、`setDiskInfo` 调用
  - 移除 JSX 中的 `{renderPerformanceMonitoring()}` 调用
  - 移除 `RealTimeCpuInfo`、`RealTimeMemoryInfo`、`RealTimeDiskInfo` 类型导入
  - 保留 `systemInfo`、`processInfo` 状态及 `renderSystemInfo`、`renderProcessInfo` 函数（实时信息 Tab 仍需要）
  - _需求：5.1, 5.2, 5.3, 5.4, 5.5, 6.5, 6.6_

- [完成] 3. 删除前端 LogCollectorService 中的 metrics 相关方法和接口
  - 删除 `SystemMetrics` 接口定义
  - 删除 `ProcessInfo` 接口定义
  - 删除 `getRealtimeMetrics` 方法
  - 删除 `getHistoricalMetrics` 方法
  - 保留 `ExportOptions`、`AlertInfo` 等其他接口和方法
  - _需求：2.1, 2.2, 2.3, 2.4_

- [完成] 4. 删除前端 PerformanceMonitor.ts 文件
  - 删除 `ai-log-system/src/services/PerformanceMonitor.ts` 整个文件
  - _需求：4.1_

- [完成] 5. 删除后端 SecurityLogCollectorController 中的 metrics 端点
  - 删除 `getRealtimeMetrics` 方法（`GET /log-collector/metrics/realtime`）
  - 删除 `getHistoricalMetrics` 方法（`GET /log-collector/metrics/historical`）
  - 删除 `createEmptyMetricsResponse` 私有方法
  - 删除 `parseDateTime` 私有方法
  - 删除 `private final MetricsService metricsService` 依赖注入字段
  - 移除不再使用的 `Optional` 导入
  - _需求：3.1, 3.2, 3.3, 3.4, 3.5_

- [完成] 6. 同步清理后端测试文件
  - 在 `SecurityLogCollectorControllerTest.java` 中删除 `@MockBean MetricsService` 声明及所有 metrics 相关测试方法（`testGetRealtimeMetrics_*`、`testGetHistoricalMetrics_*` 系列）
  - 在 `RuleEngineConfigApiTest.java` 中删除 `@MockBean MetricsService` 声明
  - _需求：3.1, 3.2_

- [完成] 7. 检查点 — 确保所有修改编译通过，核心功能正常
  - 确认前端 TypeScript 无编译错误（log-collector 页面、wmi 页面、LogCollectorService）
  - 确认后端 Java 无编译错误（SecurityLogCollectorController、相关测试文件）
  - 确认 log-collector 页面仍正常渲染状态卡片和配置表格
  - 确认 wmi 页面仍正常渲染统计卡片、健康状态及实时信息 Tab
  - 如有问题，请向用户说明并请求指导

## 备注

- 任务按前端到后端顺序执行，减少中间状态下的依赖问题
- MetricsService 接口、实现类、数据库实体等均不删除，仅从 Controller 层移除引用
- wmi 页面的实时信息 Tab（`renderSystemInfo`、`renderProcessInfo`）与顶部性能监控卡片是不同的组件，前者保留
