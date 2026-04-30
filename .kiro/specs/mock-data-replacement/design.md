# Design Document: Mock Data Replacement

## 概述

This feature replaces all mock/randomly-generated data in the `ai-log-system` frontend with real API calls to the Spring Boot backend (`back-system`). The work is organized by priority: high-priority items affect core business correctness, medium-priority items affect user experience, and low-priority items are preserved as intentional fallbacks.

The backend already exposes most required endpoints. One new backend endpoint is needed:
- `GET /api/logs/batch/history` — batch operation history

---

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/UMI)                      │
│                                                             │
│  Pages/Components          Services                         │
│  ─────────────────         ────────────────────────────     │
│  realtime/index.tsx   ──►  api.ts (eventApi)                │
│  system/index.tsx     ──►  api.ts (userApi, logApi)         │
│  batch-operations/    ──►  api.ts (batchApi)                │
│  ModelMetrics.tsx     ──►  api.ts (modelApi)                │
│  RealTimeLogChart.tsx ──►  api.ts (eventApi)                │
│  PerformanceMonitor   ──►  api.ts (performanceApi) [NEW]    │
│  IncrementalLogCollector ► api.ts (eventApi)                │
│  DatabasePool         ──►  api.ts (performanceApi) [NEW]    │
└─────────────────────────────────────────────────────────────┘
                              │ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Spring Boot)                       │
│                                                             │
│  Existing Endpoints                                         │
│  GET  /api/events/recent                                    │
│  PUT  /api/events/{id}/status                               │
│  GET  /api/events/statistics/timeseries                     │
│  GET  /api/users                                            │
│  POST /api/users                                            │
│  PUT  /api/users/{id}                                       │
│  DELETE /api/users/{id}                                     │
│  GET  /api/logs                                             │
│  GET  /api/logs/batch/stats                                 │
│  GET  /api/performance/stats                                │
│  GET  /api/performance/health                               │
│  GET  /api/models/{id}/metrics                              │
│                                                             │
│  New Endpoints                                              │
│  GET  /api/logs/batch/history                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 组件和接口

### 1. New `performanceApi` in `api.ts`

```typescript
export const performanceApi = {
  getStats: (): Promise<ApiResponse<PerformanceStats>> =>
    request('/api/performance/stats'),
  getHealth: (): Promise<ApiResponse<HealthStatus>> =>
    request('/api/performance/health'),
};

export interface PerformanceStats {
  totalCollectedEvents: number;
  totalProcessedEvents: number;
  errorCount: number;
  eventsPerMinute: number;
  errorRate: number;
  uptimeMinutes: number;
}

export interface HealthStatus {
  status: 'HEALTHY' | 'WARNING' | 'UNHEALTHY';
  message: string;
}
```

### 3. New `batchHistoryApi` addition to `batchApi` in `api.ts`

```typescript
// Added to existing batchApi
getHistory: (): Promise<ApiResponse<BatchOperationRecord[]>> =>
  request('/api/logs/batch/history'),
```

### 4. `PerformanceMonitor.ts` — `collectMetrics()` replacement

Replace the random data block with:
```typescript
private async collectMetrics(): Promise<void> {
  try {
    const response = await performanceApi.getStats();
    if (response.data) {
      const metrics = mapStatsToMetrics(response.data);
      this.metrics.push(metrics);
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory);
      }
    }
  } catch (error) {
    console.error('性能指标采集失败:', error);
    // Retain last known metrics — do NOT push random data
  }
}
```

### 5. `IncrementalLogCollector.ts` — `fetchIncrementalData()` replacement

Replace the random event generation with:
```typescript
private async fetchIncrementalData(task: CollectionTask, checkpoint: LogCheckpoint): Promise<any[]> {
  const response = await eventApi.getRecentEvents({ limit: task.config.batchSize });
  return (response.data || []).filter(
    (e: any) => new Date(e.timestamp).getTime() > new Date(checkpoint.lastTimestamp).getTime()
  );
}
```

### 6. `DatabasePool.ts` — `healthCheck()` and `getStats()` replacement

```typescript
async healthCheck(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const response = await performanceApi.getHealth();
    return {
      healthy: response.data?.status !== 'UNHEALTHY',
      message: response.data?.message ?? '状态未知',
      latency: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return { healthy: false, message: '后端不可达', latency: Date.now() - start, timestamp: new Date().toISOString() };
  }
}
```

### 7. Backend: New `WhitelistController.java`

A new Spring Boot REST controller at `/api/whitelist` backed by a `whitelist` database table. Supports full CRUD with pagination and filtering by type, category, status, and riskLevel.

### 8. Backend: `BatchLogController.java` — add `/history` endpoint

Add `GET /api/logs/batch/history` returning a list of `BatchOperationRecord` objects persisted in a new `batch_operation_history` table (or derived from existing log data).

---

## 数据模型

### Frontend `SecurityEvent` ↔ Backend `UnifiedSecurityEventDTO` Mapping

| Frontend Field | Backend Field | Notes |
|---|---|---|
| `id` | `id.toString()` | Convert Long → string |
| `timestamp` | `timestamp` | ISO string |
| `level` | `severity` | Map: CRITICAL/HIGH/MEDIUM/LOW/INFO |
| `source` | `sourceSystem` | Direct |
| `type` | `eventType` | Direct |
| `message` | `normalizedMessage ?? rawMessage` | Prefer normalized |
| `ipAddress` | `sourceIp ?? hostIp` | Prefer sourceIp |
| `userId` | `userId` | Direct |
| `confidence` | `anomalyScore * 100` | Convert 0-1 → 0-100 |
| `status` | `status` | Direct (NEW/INVESTIGATING/RESOLVED/FALSE_POSITIVE) |
| `tags` | `[]` | Default empty; populate from threatLevel if present |

### Backend `BatchOperationRecord` Entity

```java
@Entity
@Table(name = "batch_operation_history")
public class BatchOperationRecord {
    @Id @GeneratedValue Long id;
    String operation;
    LocalDateTime timestamp;
    int totalCount;
    int successCount;
    int errorCount;
    String status;    // success, error, processing
    long duration;    // ms
}
```

---

## 正确性属性

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: PerformanceMonitor stores API-returned values

*For any* successful response from `/api/performance/stats`, the PerformanceMonitor's most recent metrics entry should contain the exact values returned by the API (not random values).
**Validates: Requirements 1.1, 1.4**

### Property 2: IncrementalLogCollector checkpoint advances with real data

*For any* set of events returned by the backend with timestamps after the current checkpoint, after a collection cycle the checkpoint's `lastTimestamp` should equal the maximum timestamp among the returned events.
**Validates: Requirements 2.1, 2.2**

### Property 3: DatabasePool health reflects backend status

*For any* response from `/api/performance/health`, the `DatabasePool.healthCheck()` result's `healthy` field should be `false` if and only if the backend status is `UNHEALTHY`.
**Validates: Requirements 3.1, 3.4**

### Property 4: SecurityEvent mapping preserves all required fields

*For any* valid `UnifiedSecurityEventDTO` returned by the backend, the mapped frontend `SecurityEvent` object should have non-null values for `id`, `timestamp`, `level`, `source`, `type`, `message`, and `status`.
**Validates: Requirements 4.3**

### Property 5: User CRUD operations call the correct API endpoints

*For any* user object, creating it should call `POST /api/users`, updating it should call `PUT /api/users/{id}`, and deleting it should call `DELETE /api/users/{id}`.
**Validates: Requirements 5.3, 5.4, 5.5**

### Property 7: Batch operation history refreshes after every operation

*For any* completed batch operation (import, delete, cleanup, mark-anomaly), the operation history fetch should be triggered exactly once after the operation completes.
**Validates: Requirements 7.3**

### Property 8: RealTimeLogChart time-series mapping produces valid chart points

*For any* time-series response from the backend containing `{timestamp, count}` entries, the mapped chart data should contain `{time: number, value: number, type: string}` entries where `time` is a valid Unix timestamp in milliseconds and `value` equals `count`.
**Validates: Requirements 9.3**

---

## 错误处理

| Scenario | Behavior |
|---|---|
| Backend API unavailable on page load | Show Ant Design `message.error()` notification; display empty table/list with retry button |
| Backend API unavailable during polling | Log error to console; retain last loaded data; do NOT generate mock data |
| PerformanceMonitor fetch fails | Log error; skip metrics push; keep last known metrics |
| IncrementalLogCollector fetch fails | Increment `task.errorCount`; retry up to `maxRetries` with `retryDelay` |
| User CRUD API fails | Show `message.error()`; do NOT update local React state |
| Whitelist CRUD API fails | Show `message.error()`; do NOT update local React state |
| ModelMetrics fetch fails | Show error state inside modal; display "加载失败" message |
| RealTimeLogChart fetch fails | Show `<Alert>` error; clear refresh interval; show retry button |

---

## 测试策略

### Dual Testing Approach

Both unit tests and property-based tests are used:
- **Unit tests** verify specific examples, edge cases, and error conditions (e.g., empty responses, network failures).
- **Property-based tests** verify universal properties across many generated inputs (e.g., mapping correctness for any valid DTO).

### Property-Based Testing Library

**Frontend**: [fast-check](https://github.com/dubzzz/fast-check) (TypeScript/JavaScript PBT library).
**Backend**: [jqwik](https://jqwik.net/) (already present in the project — `.jqwik-database` file exists).

Each property test runs a minimum of **100 iterations**.

### Test File Locations

| Component | Test File |
|---|---|
| `PerformanceMonitor.ts` | `src/services/PerformanceMonitor.test.ts` |
| `IncrementalLogCollector.ts` | `src/services/IncrementalLogCollector.test.ts` |
| `DatabasePool.ts` | `src/services/DatabasePool.test.ts` |
| `realtime/index.tsx` | `src/pages/realtime/index.test.tsx` |
| `system/index.tsx` | `src/pages/system/index.test.tsx` |
| `batch-operations/index.tsx` | `src/pages/batch-operations/index.test.tsx` |
| `ModelMetrics.tsx` | `src/pages/models/components/ModelMetrics.test.tsx` |
| `RealTimeLogChart.tsx` | `src/components/EnhancedDashboard/charts/RealTimeLogChart.test.tsx` |
| Backend `WhitelistController` | `src/test/java/.../controller/WhitelistControllerTest.java` |

### Property Test Annotation Format

Each property test must include a comment:
```
// Feature: mock-data-replacement, Property N: <property_text>
// Validates: Requirements X.Y
```
