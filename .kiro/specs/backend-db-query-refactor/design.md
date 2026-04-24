# Design Document

## Overview

从 `ai-log-system/src/pages/log-collector/index.tsx` 中删除"告警列表"功能模块，将"活跃告警"统计卡片改为跳转到 `#/alerts` 页面的入口。这是一次纯前端的代码清理，不涉及后端改动。

## Architecture

变更范围仅限单个文件：`ai-log-system/src/pages/log-collector/index.tsx`

```
LogCollectorPage
├── 状态管理        ← 删除 alerts state 和 loading.alerts
├── useEffect       ← 删除 loadAlerts() 调用和依赖
├── 刷新按钮        ← 删除 loadAlerts() 调用
├── renderStatusCards()  ← 修改"活跃告警"卡片，添加跳转
├── renderAlerts()  ← 整体删除
├── handleAcknowledgeAlert()  ← 删除
├── handleResolveAlert()      ← 删除
└── loadAlerts()    ← 删除
```

导航使用 Umi 4 内置的 `history` 对象（`import { history } from 'umi'`）实现跳转。

## Components and Interfaces

### 删除的代码

| 代码块 | 位置 | 说明 |
|--------|------|------|
| `alerts` state | `useState<AlertInfo[]>([])` | 告警数据状态 |
| `loading.alerts` | `loading` 对象中的 `alerts` 字段 | 告警加载状态 |
| `loadAlerts()` | callback 函数 | 从 API 加载告警 |
| `handleAcknowledgeAlert()` | callback 函数 | 确认告警操作 |
| `handleResolveAlert()` | callback 函数 | 解决告警操作 |
| `renderAlerts()` | render 函数 | 渲染告警列表卡片 |
| `{renderAlerts()}` | JSX 调用 | 页面中的渲染调用 |
| `loadAlerts()` in `useEffect` | 初始化和定时刷新 | 两处调用均删除 |
| `loadAlerts()` in 刷新按钮 | onClick handler | 删除该调用 |

### 删除的 imports

以下 import 在删除告警代码后将不再被引用，需一并移除：

- `AlertInfo` — 来自 `LogCollectorService`，仅用于告警列表类型
- `getAlertCategory` — 来自 `enumLabels`，仅用于告警列表渲染
- `getAlertTypeLabel` — 来自 `enumLabels`，仅用于告警列表渲染（需确认是否有其他引用）

> 注意：`WarningOutlined` 图标仍被"活跃告警"卡片使用，保留。

### 修改的代码

**`renderStatusCards()` 中的"活跃告警"卡片**

修改前：
```tsx
<Col span={6}>
  <Card>
    <Statistic
      title="活跃告警"
      value={alerts.filter(a => !a.resolved).length}
      valueStyle={{ color: '#cf1322' }}
      prefix={<WarningOutlined />}
    />
  </Card>
</Col>
```

修改后：
```tsx
<Col span={6}>
  <Card
    hoverable
    style={{ cursor: 'pointer' }}
    onClick={() => history.push('/alerts')}
  >
    <Statistic
      title="活跃告警"
      value="查看详情"
      valueStyle={{ color: '#cf1322', fontSize: 16 }}
      prefix={<WarningOutlined />}
      suffix={<LinkOutlined style={{ fontSize: 12, marginLeft: 4 }} />}
    />
  </Card>
</Col>
```

需新增 import：
- `import { history } from 'umi';`
- `LinkOutlined` 加入 `@ant-design/icons` 的 import 列表

## Data Models

无数据模型变更。删除后 `loading` 对象类型简化为：

```ts
{
  configs: boolean;
  status: boolean;
  realtime: boolean;
  historical: boolean;
  // alerts 字段删除
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do.*

根据 prework 分析，本次变更的所有验收标准均为具体示例（example），无通用属性（property）。

Property 1: 活跃告警卡片保留且可点击
*For any* render of LogCollectorPage, the "活跃告警" statistic card should be present in the DOM and have an onClick handler that navigates to `/alerts`
**Validates: Requirements 2.1, 2.3**

Property 2: 告警相关代码不存在
*For any* render of LogCollectorPage, no alert list table, no `loadAlerts` call in refresh handler, and no `handleAcknowledgeAlert`/`handleResolveAlert` functions should be present
**Validates: Requirements 1.1, 1.4, 1.5**

## Error Handling

无新增错误处理逻辑。删除告警加载后，`useEffect` 的 `Promise.allSettled` 调用减少一个并发项，不影响其他加载流程。

## Testing Strategy

本次变更为纯删除 + 小改动，测试策略以单元测试为主：

- 渲染 `LogCollectorPage`，断言"告警列表"Card 不存在
- 渲染 `LogCollectorPage`，断言"活跃告警"Statistic 卡片存在
- 模拟点击"活跃告警"卡片，断言 `history.push('/alerts')` 被调用
- 断言刷新按钮的 onClick 不包含 `loadAlerts` 调用

使用 Vitest + React Testing Library（项目已有 `vitest.config.ts`）。
