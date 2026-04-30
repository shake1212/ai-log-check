# Implementation Plan: 删除 log-collector 告警列表 Tab

## 任务

- [完成] 1. 删除告警相关状态、函数和渲染代码
  - 删除 `alerts` state：`const [alerts, setAlerts] = useState<AlertInfo[]>([])`
  - 删除 `loading` 对象中的 `alerts: false` 字段
  - 删除 `loadAlerts()` callback 函数
  - 删除 `handleAcknowledgeAlert()` callback 函数
  - 删除 `handleResolveAlert()` callback 函数
  - 删除 `renderAlerts()` render 函数
  - 删除 JSX 中的 `{renderAlerts()}` 调用
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [完成] 2. 清理 useEffect 和刷新按钮中的 loadAlerts 调用
  - 从 `useEffect` 的 `initializeData` 中删除 `loadAlerts()` 调用
  - 从 `useEffect` 的 `setInterval` 回调中删除 `loadAlerts()` 调用
  - 从 `useEffect` 的依赖数组中删除 `loadAlerts`
  - 从刷新按钮的 `onClick` handler 中删除 `loadAlerts()` 调用
  - _Requirements: 1.5, 1.6_

- [完成] 3. 清理不再使用的 imports
  - 从 `LogCollectorService` import 中删除 `AlertInfo`
  - 从 `enumLabels` import 中删除 `getAlertCategory` 和 `getAlertTypeLabel`（确认无其他引用后删除）
  - _Requirements: 1.7_

- [完成] 4. 修改"活跃告警"卡片为跳转入口
  - 添加 `import { history } from 'umi'`
  - 在 `@ant-design/icons` import 中添加 `LinkOutlined`
  - 将"活跃告警"卡片的 `value` 改为静态文字"查看详情"
  - 为卡片添加 `hoverable`、`cursor: pointer` 样式和 `onClick={() => history.push('/alerts')}` 处理器
  - 在 `Statistic` 的 `suffix` 中添加 `LinkOutlined` 图标作为视觉提示
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [待完成]* 5. 编写单元测试验证变更
  - 断言渲染后"告警列表"Card 不存在于 DOM
  - 断言"活跃告警"Statistic 卡片仍存在
  - 模拟点击"活跃告警"卡片，断言 `history.push('/alerts')` 被调用
  - **Property 1: 活跃告警卡片保留且可点击**
  - **Property 2: 告警相关代码不存在**
  - **Validates: Requirements 1.1, 1.5, 2.1, 2.3**

- [完成] 6. Checkpoint — 确认所有改动正确
  - 确保页面无 TypeScript 编译错误
  - 确保刷新按钮不再调用 loadAlerts
  - 确保点击"活跃告警"卡片可跳转到 /alerts
  - 如有问题请告知
