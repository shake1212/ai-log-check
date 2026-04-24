# Requirements Document

## Introduction

The AI Log System frontend (`ai-log-system`) currently contains widespread mock/simulated data across multiple services and pages. This mock data was used during development but now prevents the system from reflecting real operational state. The goal is to replace all mock data with real API calls to the existing Spring Boot backend (`back-system`), ensuring the system accurately reflects live data. Where backend APIs do not yet exist, new endpoints must be added.

## Glossary

- **Mock_Data**: Hardcoded or randomly generated data used as a placeholder during development, marked with `// TODO: REMOVE MOCK DATA` comments.
- **Frontend**: The React/UMI application in `ai-log-system/src`.
- **Backend**: The Spring Boot application in `back-system/src/main/java/com/security/ailogsystem`.
- **API_Client**: The `api.ts` service file that wraps all HTTP calls to the backend.
- **PerformanceMonitor**: The `PerformanceMonitor.ts` frontend service that collects and exposes performance metrics.
- **IncrementalLogCollector**: The `IncrementalLogCollector.ts` frontend service that manages incremental log collection tasks.
- **DatabasePool**: The `DatabasePool.ts` frontend service that simulates a database connection pool.
- **RealTimeMonitor**: The `realtime/index.tsx` page that displays live security events.
- **SystemPage**: The `system/index.tsx` page that manages users and audit logs.
- **WhitelistPage**: The `whitelist/index.tsx` page that manages whitelist entries.
- **BatchOperationsPage**: The `batch-operations/index.tsx` page that manages batch log operations.
- **ModelMetrics**: The `ModelMetrics.tsx` component that displays AI model performance metrics.
- **RealTimeLogChart**: The `RealTimeLogChart.tsx` component that renders a live log traffic chart.

---

## Requirements

### Requirement 1: Replace PerformanceMonitor Mock Data

**User Story:** As a system operator, I want the performance monitor to display real system metrics, so that I can accurately assess system health and respond to actual performance issues.

#### Acceptance Criteria

1. WHEN the PerformanceMonitor collects metrics, THE PerformanceMonitor SHALL call the backend `/api/performance/stats` endpoint instead of generating random values.
2. WHEN the backend performance endpoint is unavailable, THE PerformanceMonitor SHALL log the error and retain the last known metrics rather than generating random fallback data.
3. THE PerformanceMonitor SHALL preserve the `generateInitialRecommendations()` method as it provides static default recommendations that do not require live data.
4. WHEN performance metrics are successfully retrieved, THE PerformanceMonitor SHALL update its internal metrics store with the real values.

---

### Requirement 2: Replace IncrementalLogCollector Mock Data

**User Story:** As a system operator, I want the incremental log collector to fetch real log data from the backend, so that collection statistics and checkpoints reflect actual system activity.

#### Acceptance Criteria

1. WHEN a collection task executes, THE IncrementalLogCollector SHALL call the backend `/api/events/recent` endpoint to fetch real incremental log data instead of generating random events.
2. WHEN the backend returns log data, THE IncrementalLogCollector SHALL use the real event timestamps and IDs to update checkpoints.
3. IF the backend call fails during collection, THEN THE IncrementalLogCollector SHALL record the error in the task's error count and retry according to the configured `maxRetries`.
4. THE IncrementalLogCollector SHALL preserve its checkpoint management, deduplication, and scheduling logic unchanged.

---

### Requirement 3: Replace DatabasePool Mock Data

**User Story:** As a developer, I want the DatabasePool service to reflect real database connectivity status, so that health checks and statistics are meaningful.

#### Acceptance Criteria

1. WHEN `DatabasePool.healthCheck()` is called, THE DatabasePool SHALL call the backend `/api/performance/health` endpoint to determine real connectivity status.
2. WHEN `DatabasePool.getStats()` is called, THE DatabasePool SHALL call the backend `/api/performance/stats` endpoint to retrieve real pool statistics.
3. WHEN `DatabasePool.query()` is called, THE DatabasePool SHALL proxy the query to the backend REST API rather than returning empty mock results.
4. IF the backend health endpoint returns an unhealthy status, THEN THE DatabasePool SHALL reflect `healthy: false` in its `HealthCheckResult`.

---

### Requirement 4: Replace RealTimeMonitor Mock Security Events

**User Story:** As a security analyst, I want the real-time monitor page to display actual security events from the backend, so that I can respond to genuine threats.

#### Acceptance Criteria

1. WHEN the RealTimeMonitor page loads, THE RealTimeMonitor SHALL call `GET /api/events/recent` to fetch the initial list of security events.
2. WHEN the real-time update interval fires and the monitor is playing, THE RealTimeMonitor SHALL call `GET /api/events/recent` to refresh the event list rather than generating random mock events.
3. WHEN the backend returns events, THE RealTimeMonitor SHALL map the backend `UnifiedSecurityEvent` fields to the frontend `SecurityEvent` interface.
4. IF the backend call fails, THEN THE RealTimeMonitor SHALL display an error notification and retain the previously loaded events.
5. WHEN the user clicks "处理" (handle) on an event, THE RealTimeMonitor SHALL call `PUT /api/events/{id}/status` to update the event status on the backend.

---

### Requirement 5: Replace SystemPage Mock Users and Audit Logs

**User Story:** As a system administrator, I want the system management page to show real users and audit logs from the backend, so that user management actions are persisted.

#### Acceptance Criteria

1. WHEN the SystemPage loads, THE SystemPage SHALL call `GET /api/users` to fetch the real user list instead of using hardcoded mock users.
2. WHEN the SystemPage loads, THE SystemPage SHALL call `GET /api/logs` with appropriate filters to fetch real audit log entries instead of generating random mock logs.
3. WHEN a user is created via the form, THE SystemPage SHALL call `POST /api/users` to persist the new user.
4. WHEN a user is updated via the form, THE SystemPage SHALL call `PUT /api/users/{id}` to persist the changes.
5. WHEN a user is deleted, THE SystemPage SHALL call `DELETE /api/users/{id}` to remove the user from the backend.
6. IF any user management API call fails, THEN THE SystemPage SHALL display an error message and not update the local state.

---

### Requirement 7: Replace BatchOperationsPage Mock History

**User Story:** As a system operator, I want the batch operations page to display real operation history from the backend, so that I can audit past batch actions.

#### Acceptance Criteria

1. WHEN the BatchOperationsPage loads, THE BatchOperationsPage SHALL call `GET /api/logs/batch/stats` to fetch real batch statistics.
2. WHEN the BatchOperationsPage loads, THE BatchOperationsPage SHALL call a backend endpoint to fetch real operation history instead of using hardcoded mock history records.
3. WHEN a batch import, delete, cleanup, or mark-anomaly operation completes, THE BatchOperationsPage SHALL refresh the operation history from the backend.
4. IF the backend operation history endpoint does not exist, THEN THE Backend SHALL expose `GET /api/logs/batch/history` returning a list of past batch operation records.

---

### Requirement 8: Replace ModelMetrics Mock Data

**User Story:** As a data scientist, I want the model metrics component to display real training history and performance data, so that I can accurately evaluate model quality.

#### Acceptance Criteria

1. WHEN the ModelMetrics modal opens for a model, THE ModelMetrics SHALL call `GET /api/models/{id}/metrics` to fetch real metrics data instead of generating random confusion matrix, ROC curve, and training history data.
2. WHEN the backend returns metrics, THE ModelMetrics SHALL render the real confusion matrix, ROC curve, feature importance, and training history charts.
3. IF the backend metrics endpoint returns no training history, THEN THE ModelMetrics SHALL display an empty state message rather than generating mock training curves.
4. IF the backend metrics call fails, THEN THE ModelMetrics SHALL display an error state in the modal.

---

### Requirement 9: Replace RealTimeLogChart Mock Data

**User Story:** As a security analyst, I want the real-time log chart to display actual log traffic data, so that the chart reflects genuine system activity patterns.

#### Acceptance Criteria

1. WHEN the RealTimeLogChart initializes, THE RealTimeLogChart SHALL call `GET /api/events/statistics/timeseries` to fetch historical time-series data for the initial chart render instead of generating random data points.
2. WHEN the refresh interval fires and the chart is not paused, THE RealTimeLogChart SHALL call the backend time-series endpoint to fetch new data points.
3. WHEN the backend returns time-series data, THE RealTimeLogChart SHALL map the response to the `{time, value, type}` chart data format.
4. IF the backend call fails, THEN THE RealTimeLogChart SHALL display an error alert and stop the refresh interval until the user manually retries.
5. WHEN the backend returns an empty dataset, THE RealTimeLogChart SHALL display an empty state rather than generating mock data.

---

### Requirement 10: Preserve Low-Priority Fallback Behaviors

**User Story:** As a developer, I want certain fallback and default behaviors to remain in place, so that the system degrades gracefully when optional features are unavailable.

#### Acceptance Criteria

1. THE LogCollectorService SHALL retain its existing fallback behavior when the backend API is unavailable, as it is an intentional degradation mechanism.
2. THE SecurityLogParser SHALL retain its default parsing mode as it does not depend on live data.
3. THE PerformanceMonitor SHALL retain the `generateInitialRecommendations()` method as a source of static default optimization suggestions.
4. WHERE WMI components (WMITestConnection, WMIEnvironment, WMIDataFlow) simulate WMI operations, THE WMI_Components SHALL retain their simulation behavior as WMI is a platform-specific optional feature.
5. WHERE ModelUpload simulates the upload flow, THE ModelUpload SHALL retain its simulation until a real model upload backend endpoint is confirmed available.
