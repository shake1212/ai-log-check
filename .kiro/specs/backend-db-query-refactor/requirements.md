# Requirements Document

## 引言

`#/log-collector` 页面中包含一个"告警列表"Tab，与 `#/alerts` 页面的告警管理功能重叠。本次任务目标：

- 删除 `log-collector` 页面中的"告警列表"Tab 及相关代码
- 保留顶部状态卡片中的"活跃告警"统计数字，并将其改为跳转到 `#/alerts` 页面的入口

## 术语表

- **LogCollectorPage**: 前端日志采集页面，路由为 `#/log-collector`，文件位于 `ai-log-system/src/pages/log-collector/index.tsx`
- **AlertsPage**: 前端告警管理页面，路由为 `#/alerts`
- **AlertInfo**: `LogCollectorService` 中定义的告警类型，用于 log-collector 页面的告警列表
- **活跃告警卡片**: 页面顶部状态概览区域中显示未解决告警数量的统计卡片

## 需求

### 需求1: 删除告警列表 Tab

**User Story:** 作为前端用户，我希望 `#/log-collector` 页面不再包含告警列表，避免与 `#/alerts` 页面功能重叠，减少混淆。

#### 验收标准

1. THE LogCollectorPage SHALL remove the "告警列表" card rendered by `renderAlerts()`
2. THE LogCollectorPage SHALL remove the `alerts` state variable and `loading.alerts` loading flag
3. THE LogCollectorPage SHALL remove the `loadAlerts()` function
4. THE LogCollectorPage SHALL remove `handleAcknowledgeAlert()` and `handleResolveAlert()` functions
5. WHEN the refresh button is clicked, THE LogCollectorPage SHALL no longer call `loadAlerts()`
6. WHEN the component initializes, THE LogCollectorPage SHALL no longer call `loadAlerts()` in `useEffect`
7. THE LogCollectorPage SHALL remove unused imports that are only referenced by the deleted alert code

### 需求2: 保留活跃告警统计并添加跳转

**User Story:** 作为前端用户，我希望在 `#/log-collector` 页面仍能看到当前活跃告警数量，并能一键跳转到 `#/alerts` 页面进行处理。

#### 验收标准

1. THE LogCollectorPage SHALL retain the "活跃告警" statistic card in the top status overview area
2. WHEN the "活跃告警" card is displayed, THE LogCollectorPage SHALL show a static value of 0 or omit the dynamic count since alert data is no longer loaded
3. WHEN a user clicks the "活跃告警" card, THE LogCollectorPage SHALL navigate to the `#/alerts` page
4. THE LogCollectorPage SHALL display a visual hint (e.g., a link or button label) indicating the card is clickable and leads to the alerts page
