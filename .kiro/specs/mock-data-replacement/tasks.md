# Implementation Plan: Mock Data Replacement

## Overview

Replace all mock/randomly-generated data in the frontend with real API calls to the Spring Boot backend. One new backend endpoint is also required. Tasks are ordered by priority: backend infrastructure first, then high-priority frontend services, then pages, then components.

## 任务

- [完成] 1. Add new API client methods to `api.ts`
  - `performanceApi` with `getStats()` and `getHealth()` methods — done
  - `performanceApi` exported from the unified `api` object — done
  - `batchApi.getHistory()` — NOT yet added (see task 2.5)
  - _Requirements: 1.1, 3.1, 3.2, 7.2_

- [待完成] 2. Add backend batch operation history endpoint
  - [待完成] 2.1 Create `BatchOperationRecord` JPA entity in `back-system/src/main/java/com/security/ailogsystem/entity/`
    - Fields: id, operation, timestamp, totalCount, successCount, errorCount, status, duration
    - _Requirements: 7.4_
  - [待完成] 2.2 Create `BatchOperationRecordRepository` extending `JpaRepository`
    - _Requirements: 7.4_
  - [待完成] 2.3 Add `GET /api/logs/batch/history` endpoint to `BatchLogController`
    - Returns list of `BatchOperationRecord` ordered by timestamp descending
    - Record each batch operation (import, delete, cleanup, mark-anomaly) to the history table
    - _Requirements: 7.2, 7.4_
  - [待完成] 2.4 Add `getHistory()` to `batchApi` in `api.ts`
    - `getHistory: (): Promise<ApiResponse<BatchOperationRecord[]>> => request('/api/logs/batch/history')`
    - Export `BatchOperationRecord` interface from `api.ts`
    - _Requirements: 7.2_
  - [待完成]* 2.5 Write unit tests for batch history endpoint
    - _Requirements: 7.4_

- [待完成] 3. Checkpoint — Ensure backend compiles and all existing tests pass

- [-] 4. Replace `PerformanceMonitor.ts` mock data
  - [-] 4.1 Replace `collectMetrics()` random data block with `performanceApi.getStats()` call
    - On success: map response to `PerformanceMetrics` and push to `this.metrics`
    - On failure: log error, skip push (retain last known metrics)
    - Preserve `generateInitialRecommendations()` unchanged
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [待完成]* 4.2 Write property test for PerformanceMonitor metrics storage
    - **Property 1: PerformanceMonitor stores API-returned values**
    - **Validates: Requirements 1.1, 1.4**

- [待完成] 5. Replace `IncrementalLogCollector.ts` mock data
  - [待完成] 5.1 Replace `fetchIncrementalData()` random event generation with `eventApi.getRecentEvents()` call
    - Filter returned events to only those with timestamp after `checkpoint.lastTimestamp`
    - On failure: throw error so `executeCollectionTask` increments `errorCount` and retries
    - _Requirements: 2.1, 2.2, 2.3_
  - [待完成]* 5.2 Write property test for IncrementalLogCollector checkpoint advancement
    - **Property 2: IncrementalLogCollector checkpoint advances with real data**
    - **Validates: Requirements 2.1, 2.2**

- [待完成] 6. Replace `DatabasePool.ts` mock data
  - [待完成] 6.1 Replace `healthCheck()` mock ping with `performanceApi.getHealth()` call
    - Map `UNHEALTHY` status to `healthy: false`, others to `healthy: true`
    - _Requirements: 3.1, 3.4_
  - [待完成] 6.2 Replace `getStats()` mock data with `performanceApi.getStats()` call
    - Map backend stats fields to `DatabaseStats` interface
    - _Requirements: 3.2_
  - [待完成]* 6.3 Write property test for DatabasePool health reflection
    - **Property 3: DatabasePool health reflects backend status**
    - **Validates: Requirements 3.1, 3.4**

- [待完成] 7. Checkpoint — Ensure all frontend service tests pass

- [待完成] 8. Replace `realtime/index.tsx` mock security events
  - [待完成] 8.1 Replace `generateMockEvents()` initial load with `eventApi.getRecentEvents({ limit: 20 })` call
    - Map `UnifiedSecurityEventDTO` to frontend `SecurityEvent` using the field mapping table in design.md
    - On failure: show `message.error()` and set empty events list
    - _Requirements: 4.1, 4.3, 4.4_
  - [待完成] 8.2 Replace interval mock event generation with `eventApi.getRecentEvents()` polling call
    - On failure: log error, retain current events, do NOT generate random events
    - _Requirements: 4.2, 4.4_
  - [待完成] 8.3 Wire "处理" button to call `eventApi.updateEventStatus(id, 'INVESTIGATING')`
    - _Requirements: 4.5_
  - [待完成]* 8.4 Write property test for SecurityEvent mapping
    - **Property 4: SecurityEvent mapping preserves all required fields**
    - **Validates: Requirements 4.3**

- [待完成] 9. Replace `system/index.tsx` mock users and audit logs
  - [待完成] 9.1 Replace `generateMockUsers()` with `api.user.getUsers()` call on component mount
    - On failure: show `message.error()`, set empty users list
    - _Requirements: 5.1, 5.6_
  - [待完成] 9.2 Replace `generateMockAuditLogs()` with `api.log.getLogs()` call on component mount
    - On failure: show `message.error()`, set empty logs list
    - _Requirements: 5.2, 5.6_
  - [待完成] 9.3 Replace local-state-only user create/update/delete with real API calls
    - Create: `api.user.createUser()` → on success update local state
    - Update: `api.user.updateUser()` → on success update local state
    - Delete: `api.user.deleteUser()` → on success update local state
    - On any failure: show `message.error()`, do NOT update local state
    - _Requirements: 5.3, 5.4, 5.5, 5.6_
  - [待完成]* 9.4 Write property test for user CRUD API routing
    - **Property 5: User CRUD operations call the correct API endpoints**
    - **Validates: Requirements 5.3, 5.4, 5.5**

- [待完成] 10. Replace `batch-operations/index.tsx` mock operation history
  - [待完成] 10.1 Replace `fetchOperationHistory()` mock data with `batchApi.getHistory()` call
    - On failure: show `message.error()`, set empty history list
    - _Requirements: 7.2_
  - [待完成] 10.2 Call `fetchOperationHistory()` after each batch operation completes (import, delete, cleanup, mark-anomaly)
    - _Requirements: 7.3_
  - [待完成]* 10.3 Write property test for batch history refresh
    - **Property 6: Batch operation history refreshes after every operation**
    - **Validates: Requirements 7.3**

- [待完成] 11. Checkpoint — Ensure all page-level tests pass

- [待完成] 12. Replace `ModelMetrics.tsx` mock data
  - [待完成] 12.1 Replace `generateMockMetricsData()` with `modelService.getModelMetrics(model.id)` call
    - On success: set `metricsData` from API response
    - On empty training history: set `metricsData.trainingHistory = []` and show empty state
    - On failure: show error state in modal ("加载失败，请重试")
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [待完成]* 12.2 Write unit tests for ModelMetrics error and empty states
    - Test: API failure shows error state
    - Test: empty training history shows empty state message
    - _Requirements: 8.3, 8.4_

- [待完成] 13. Replace `RealTimeLogChart.tsx` mock data
  - [待完成] 13.1 Replace `generateMockData()` initial data with `eventApi.getTimeSeriesStatistics()` call
    - Pass `startTime` = now minus 1 hour, `endTime` = now
    - Map response `{timestamp, count}` to `{time: Date.parse(timestamp), value: count, type: 'normal'}`
    - On empty response: set `chartData = []` and show empty state (do NOT generate mock data)
    - On failure: set error state, clear refresh interval, show retry button
    - _Requirements: 9.1, 9.5_
  - [待完成] 13.2 Replace `loadChartData()` mock data generation with real API call
    - On interval tick: call `eventApi.getTimeSeriesStatistics()` for the last 5 minutes
    - Append new points to existing chart data, keep last 100 points
    - On failure: show `<Alert>` error, clear interval, do NOT generate mock data
    - _Requirements: 9.2, 9.4_
  - [待完成]* 13.3 Write property test for time-series data mapping
    - **Property 7: RealTimeLogChart time-series mapping produces valid chart points**
    - **Validates: Requirements 9.3**

- [待完成] 14. Final checkpoint — Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use fast-check (frontend) and jqwik (backend)
- Task 1 is marked complete: `performanceApi` (with `getStats`/`getHealth`) and its export in the unified `api` object are already implemented in `api.ts`; `batchApi.getHistory()` is tracked under task 2.4
- Low-priority items (LogCollectorService fallback, SecurityLogParser, WMI components, ModelUpload) are intentionally NOT in this task list per Requirements 10.1–10.5
