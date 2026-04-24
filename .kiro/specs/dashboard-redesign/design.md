# Design Document: Dashboard Redesign

## Overview

重新设计 `/dashboard` 仪表盘页面，解决当前界面层级混乱、操作按钮过多、内容分散等问题。目标是让仪表盘真正做到"一屏掌握全局"：顶部紧凑导航栏 + KPI 卡片行 + 图表行 + 事件列表，所有核心信息在 1080p 屏幕上无需滚动即可看到。

## Architecture

重构采用"精简层级"策略，不引入新的外部依赖，在现有 Ant Design + React 技术栈内完成。

```
EnhancedDashboard (容器，保留数据逻辑)
├── DashboardTopBar (新)  ← 合并原 DashboardHeader + ControlBar
│   ├── 左：Logo + 标题 + 连接状态
│   └── 右：暂停/继续 | 通知 | 导出
├── KpiRow (新)           ← 4 个 KPI 卡片，固定高度 120px
│   ├── SystemHealthCard (改：骨架屏)
│   ├── TotalLogsCard (改：骨架屏)
│   ├── SecurityEventsCard (改：骨架屏 + CRITICAL 高亮)
│   └── ActiveUsersCard (改：骨架屏)
├── ChartsRow (新)        ← 左 60% 折线图 + 右 40% 饼图
│   ├── RealTimeLogChart (改：高度 220px)
│   └── ThreatDistributionChart (改：内嵌图例)
└── EventList (新)        ← 固定高度 300px，默认 CRITICAL+HIGH
```

**移除的组件/功能：**
- `DashboardHeader.tsx` → 内容迁移至 `DashboardTopBar`
- `ControlBar.tsx` → 内容迁移至 `DashboardTopBar`
- AnalysisPage、ThreatPage 及对应标签页（Tab）
- 底部信息栏（系统版本、数据延迟等）
- "前往告警处置"、"前往事件分析"、"重新连接"三个按钮

## Components and Interfaces

### DashboardTopBar

```tsx
interface DashboardTopBarProps {
  connected: boolean;
  reconnect: () => void;
  isPaused: boolean;
  setIsPaused: (v: boolean) => void;
  unreadCount: number;
  notificationPanelVisible: boolean;
  setNotificationPanelVisible: (v: boolean) => void;
}
```

布局：`display: flex; justify-content: space-between; height: 64px; padding: 0 24px`

左侧：RobotOutlined 图标 + "AI 智能安全监控" 标题 + 连接状态指示灯（绿/红点 + 文字，断开时显示"点击重连"链接）

右侧：3 个操作按钮（暂停/继续、通知+角标、导出下拉）

### KpiRow

```tsx
interface KpiRowProps {
  isPaused: boolean;
  eventStats: EventStats;  // critical/high/medium/low 计数
}
```

使用 `Row gutter={[16, 16]}` + 4 个 `Col span={6}`，每个 Col 内的卡片高度固定 `minHeight: 120px, maxHeight: 120px`。

各卡片新增 `loading` prop，loading 时渲染 `<Skeleton active paragraph={{ rows: 2 }} />`。

SecurityEventsCard 新增 `hasCritical` prop，为 true 时卡片 border 变为 `2px solid #ff4d4f`，数字颜色为红色。

### ChartsRow

```tsx
interface ChartsRowProps {
  events: SecurityEvent[];
  isPaused: boolean;
  threatData: ThreatDataItem[];
}
```

`Row gutter={[16, 0]}` + `Col span={14}` (实时日志) + `Col span={10}` (威胁分布)

RealTimeLogChart 固定 `height={220}`

ThreatDistributionChart 改为左饼图 + 右图例列表的内嵌布局，不再单独占行。

### EventList

```tsx
interface EventListProps {
  events: SecurityEvent[];
  loading: boolean;
}
```

默认 `filter: ['CRITICAL', 'HIGH']`，提供"显示全部"Toggle。

列表容器：`height: 300px; overflow-y: auto`

每行只渲染：色点 + 事件类型 + 消息（截断 60 字符）+ 时间 + 状态 Tag，点击整行跳转 `/events?id={event.id}`。

## Data Models

无新增数据模型，复用现有 `SecurityEvent`、`EventStats` 类型。

新增辅助类型：

```ts
interface EventStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  newEvents: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: 仪表盘始终渲染 4 个 KPI 卡片
*For any* 数据状态（加载中、已加载、错误），仪表盘概览页应始终渲染恰好 4 个 KPI 卡片（系统健康度、总日志数、安全事件数、活跃用户数）
**Validates: Requirements 2.1**

Property 2: CRITICAL 事件触发高亮
*For any* 包含至少 1 个 CRITICAL 级别事件的事件列表，SecurityEventsCard 应渲染带有红色高亮边框样式（border 包含 `#ff4d4f`）
**Validates: Requirements 2.2**

Property 3: 加载状态显示骨架屏
*For any* KPI 卡片，当 `loading=true` 时，渲染结果应包含 Skeleton 组件，不包含实际数值
**Validates: Requirements 2.4**

Property 4: 事件列表默认过滤高危事件
*For any* 包含 CRITICAL、HIGH、MEDIUM、LOW 各级别事件的列表，默认状态下 EventList 渲染的事件行应只包含 CRITICAL 和 HIGH 级别，不包含 MEDIUM 和 LOW 级别
**Validates: Requirements 5.4**

## Error Handling

- 单个 KPI 卡片 API 失败时，卡片显示"--"占位符，不影响其他卡片
- 全部 API 失败时，在 KpiRow 上方显示 Alert 提示，提供重试按钮
- WebSocket 断开时，DashboardTopBar 连接状态变红，显示"点击重连"链接，不弹出全局错误

## Testing Strategy

使用 **Vitest + @testing-library/react** 进行单元测试和属性测试。

属性测试使用 **fast-check** 库生成随机输入，每个属性测试运行最少 100 次。

**单元测试（具体示例）：**
- 渲染仪表盘后不包含"安全分析"和"威胁情报"标签页文本
- 渲染仪表盘后不包含"系统版本"、"数据延迟"底部信息栏文本
- ControlBar 不包含"前往告警处置"和"前往事件分析"按钮
- 空事件列表时图表区域显示"暂无数据"

**属性测试（Property-Based Tests）：**
- Property 1：KPI 卡片数量始终为 4（Feature: dashboard-redesign, Property 1）
- Property 2：CRITICAL 事件触发高亮（Feature: dashboard-redesign, Property 2）
- Property 3：loading 状态显示骨架屏（Feature: dashboard-redesign, Property 3）
- Property 4：事件列表默认过滤（Feature: dashboard-redesign, Property 4）
