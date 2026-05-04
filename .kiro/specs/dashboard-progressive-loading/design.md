# Design Document: Dashboard Progressive Loading

## Overview

将 Dashboard 从"全量加载后渲染"模式改造为"渐进式加载"模式。核心思路是移除 `EnhancedDashboard` 中的全屏 `loading` 状态守卫，让页面骨架在首次渲染时立即呈现，各 Block（KpiRow、ChartsRow、EventSummary）各自管理自己的加载状态，数据就绪后独立替换骨架屏。

## Architecture

当前架构（阻塞式）：
```
EnhancedDashboard
  └── loading=true → 全屏 Spinner（阻塞所有渲染）
  └── loading=false → 渲染所有子组件
```

目标架构（渐进式）：
```
EnhancedDashboard（立即渲染，无全屏阻塞）
  ├── DashboardTopBar（立即渲染）
  ├── KpiRow（Skeleton → 真实数据，独立加载）
  ├── ChartsRow（Skeleton → 真实数据，依赖 events）
  └── EventSummary（Skeleton → 真实数据，独立加载）
```

数据流变化：
- 移除 `EnhancedDashboard` 中的 `loading` 状态守卫（`if (loading) return <全屏Spinner>`）
- `loadInitialData` 完成后设置 `events`，`eventLoading` 由 `true` 变 `false`
- `useKpiData` 内部的 `loading` 状态驱动 `KpiRow` 的 Skeleton 显示
- `eventLoading` 驱动 `ChartsRow` 和 `EventSummary` 的 Skeleton 显示

## Components and Interfaces

### EnhancedDashboard（修改）

移除全屏 loading 守卫，改为直接渲染页面结构：

```typescript
// 删除这段代码：
if (loading) {
  return <全屏Spinner />;
}

// 改为：直接渲染，各子组件自行处理 loading 状态
return (
  <div>
    <DashboardTopBar ... />
    <div style={{ padding: '32px', ... }}>
      <OverviewPage
        eventLoading={eventLoading}  // 传递给子组件
        ...
      />
    </div>
  </div>
);
```

全屏错误页面同样移除，改为在 `OverviewPage` 内部的 `Alert` 处理（已有实现）。

### KpiRow（修改）

当前 `KpiRow` 已有 `Skeleton` 逻辑，但依赖外部传入的 `loading` prop。改造后：
- 完全依赖 `useKpiData` 返回的 `kpiLoading` 状态
- 移除外部 `loading` prop 依赖（或保留为可选，默认 false）
- Skeleton 高度固定为 120px，与真实卡片高度一致

```typescript
// KpiRow 内部
const { data: kpiData, loading: kpiLoading } = useKpiData(isPaused, 30000);

// 每个 Col 内：
{kpiLoading ? (
  <Skeleton active paragraph={{ rows: 2 }} style={{ height: 120 }} />
) : (
  <SystemHealthCard ... />
)}
```

### ChartsRow（修改）

添加 `loading` prop，在加载中显示 Skeleton：

```typescript
interface ChartsRowProps {
  events: SecurityEvent[];
  isPaused: boolean;
  threatData: ThreatDataItem[];
  loading?: boolean;  // 新增
}

// 内部：当 loading=true 时，用 Skeleton 替代图表内容
{loading ? (
  <Skeleton active paragraph={{ rows: 4 }} style={{ height: ROW_HEIGHT }} />
) : (
  <RealTimeLogChart ... />
)}
```

### EventSummary（修改）

添加 `loading` prop，在加载中显示 Skeleton：

```typescript
interface EventSummaryProps {
  stats: { ... };
  events?: SecurityEvent[];
  loading?: boolean;  // 新增
  onRetry?: () => void;  // 新增，用于失败重试
}

// 内部：当 loading=true 时显示 Skeleton
{loading ? (
  <Skeleton active paragraph={{ rows: 3 }} />
) : (
  <Row gutter={[12, 0]}>...</Row>
)}
```

### OverviewPage（修改）

接收并向下传递 `eventLoading` 和 `loadInitialData`（已有）：

```typescript
interface OverviewPageProps {
  // 已有字段...
  eventLoading: boolean;  // 已有，确保传递给 ChartsRow 和 EventSummary
}
```

## Data Models

无新增数据模型。主要变化是状态管理：

| 状态 | 位置 | 用途 |
|------|------|------|
| `eventLoading` | EnhancedDashboard | 驱动 ChartsRow 和 EventSummary 的 Skeleton |
| `kpiLoading` | useKpiData hook | 驱动 KpiRow 的 Skeleton |
| `loading`（移除全屏守卫） | EnhancedDashboard | 不再用于全屏阻塞，仅内部使用 |

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property-Based Testing Overview

Property-based testing (PBT) validates software correctness by testing universal properties across many generated inputs. Each property is a formal specification that should hold for all valid inputs.

使用 Vitest + `@testing-library/react` 进行测试（项目已有 `vitest.config.ts`）。

---

Property 1: 初始渲染无全屏阻塞

*For any* API 响应延迟状态（pending/resolved/rejected），EnhancedDashboard 在挂载后的首次渲染中，DOM 中不应存在全屏 Spinner 元素，而应存在页面骨架结构（DashboardTopBar 和各 Block 的容器）。

**Validates: Requirements 1.1, 1.2**

---

Property 2: Block 独立加载互不影响

*For any* 一个 Block 的数据加载状态变化（pending → resolved），其他 Block 的 Skeleton/内容状态不应发生变化。即：KPI 数据就绪时，ChartsRow 和 EventSummary 仍保持其原有状态；事件数据就绪时，KpiRow 仍保持其原有状态。

**Validates: Requirements 1.3, 2.3, 3.3**

---

## Error Handling

- 全屏错误页面（`if (!loading && fetchError) return <Result ...>`）移除
- 错误处理下沉到各 Block 内部：
  - `OverviewPage` 已有 `fetchError` 的 `Alert` 处理，保留
  - `EventSummary` 新增 `onRetry` prop，失败时在列表区域内显示重试按钮
  - `KpiRow` 的 KPI 数据失败时静默保留上次数据（`useKpiData` 已有此逻辑）

## Testing Strategy

### 单元测试（Vitest + @testing-library/react）

针对具体示例和边界条件：

- 示例测试 1：所有 API 失败时，不渲染全屏错误页面，各 Block 内部有错误提示（Requirements 1.4）
- 示例测试 2：事件 API 失败时，EventSummary 内有重试按钮，KpiRow 正常显示（Requirements 4.3）
- 示例测试 3：KpiRow 渲染时有 4 个 Skeleton 卡片占位（Requirements 5.3）

### 属性测试（Vitest + fast-check）

每个属性测试运行最少 100 次迭代：

- **Feature: dashboard-progressive-loading, Property 1**: 初始渲染无全屏阻塞
  - 生成器：随机 API 延迟时间（0-5000ms）
  - 断言：挂载后立即检查 DOM，不存在全屏 Spinner

- **Feature: dashboard-progressive-loading, Property 2**: Block 独立加载互不影响
  - 生成器：随机选择一个 Block 的数据先就绪
  - 断言：该 Block 从 Skeleton 变为内容，其他 Block 状态不变
