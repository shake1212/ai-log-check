# Implementation Plan: Dashboard Redesign

## Overview

将现有仪表盘从多标签页、多层级结构重构为单页概览布局，核心改动集中在 `EnhancedDashboard` 目录内，不影响其他页面。

## Tasks

- [x] 1. 新建 DashboardTopBar 组件，替换 DashboardHeader + ControlBar
  - 创建 `ai-log-system/src/components/EnhancedDashboard/DashboardTopBar.tsx`
  - 左侧：RobotOutlined 图标 + 标题 + 连接状态指示灯（断开时显示"点击重连"文字链接）
  - 右侧：暂停/继续按钮、通知按钮（含未读角标）、数据导出下拉菜单（复用 ControlBar 现有导出逻辑）
  - 整体高度 64px，`padding: 0 24px`，白色背景 + 底部阴影
  - _Requirements: 1.2, 4.1, 4.2, 4.3_

- [ ]* 1.1 为 DashboardTopBar 编写单元测试
  - 验证右侧只有 3 个操作区域（暂停/继续、通知、导出）
  - 验证不包含"前往告警处置"和"前往事件分析"文本
  - _Requirements: 4.1, 4.2_

- [x] 2. 新建 KpiRow 组件，统一 4 个 KPI 卡片布局
  - 创建 `ai-log-system/src/components/EnhancedDashboard/KpiRow.tsx`
  - 使用 `Row gutter={[16, 16]}` + 4 个 `Col xs={24} sm={12} lg={6}`
  - 每个卡片容器设置 `minHeight: 120px, maxHeight: 120px, overflow: hidden`
  - 为 SystemHealthCard、TotalLogsCard、SecurityEventsCard、ActiveUsersCard 各自新增 `loading` prop
  - loading=true 时渲染 `<Skeleton active paragraph={{ rows: 2 }} />` 替代卡片内容
  - SecurityEventsCard 新增 `hasCritical` prop，为 true 时 border 变为 `2px solid #ff4d4f`
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ]* 2.1 为 KpiRow 编写属性测试（Property 1：KPI 卡片数量始终为 4）
  - **Property 1: 仪表盘始终渲染 4 个 KPI 卡片**
  - **Validates: Requirements 2.1**
  - 使用 fast-check 生成随机 isPaused 和 eventStats，验证渲染结果始终包含 4 个卡片
  - _Requirements: 2.1_

- [ ]* 2.2 为 SecurityEventsCard 编写属性测试（Property 2：CRITICAL 高亮）
  - **Property 2: CRITICAL 事件触发高亮**
  - **Validates: Requirements 2.2**
  - 使用 fast-check 生成包含至少 1 个 CRITICAL 事件的列表，验证卡片 border 包含 `#ff4d4f`
  - _Requirements: 2.2_

- [ ]* 2.3 为 KPI 卡片编写属性测试（Property 3：loading 状态显示骨架屏）
  - **Property 3: 加载状态显示骨架屏**
  - **Validates: Requirements 2.4**
  - 使用 fast-check 随机选取 4 个卡片之一，传入 loading=true，验证渲染包含 Skeleton
  - _Requirements: 2.4_

- [x] 3. 新建 ChartsRow 组件，整合两个图表
  - 创建 `ai-log-system/src/components/EnhancedDashboard/ChartsRow.tsx`
  - 使用 `Row gutter={[16, 0]}` + `Col span={14}` (RealTimeLogChart) + `Col span={10}` (ThreatDistributionChart)
  - RealTimeLogChart 固定 `height={220}`
  - ThreatDistributionChart 改为左饼图 + 右图例列表内嵌布局（图例显示各等级名称和数量）
  - 当 events 为空数组时，两个图表区域均显示"暂无数据"占位符
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 3.1 为 ChartsRow 编写单元测试
  - 验证渲染结果同时包含实时日志图表和威胁分布图表
  - 验证 events=[] 时显示"暂无数据"文本（边界条件）
  - _Requirements: 3.1, 3.4_

- [x] 4. 新建 EventList 组件，替换 OverviewPage 中的事件列表
  - 创建 `ai-log-system/src/components/EnhancedDashboard/EventList.tsx`
  - 默认 filter 为 `['CRITICAL', 'HIGH']`，提供"显示全部"Toggle 按钮
  - 列表容器：`height: 300px; overflow-y: auto`
  - 每行只渲染：色点 + 事件类型 + 消息（截断至 60 字符）+ 时间 + 状态 Tag
  - 点击整行使用 `history.push('/events?id=' + event.id)` 跳转
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 4.1 为 EventList 编写属性测试（Property 4：默认过滤高危事件）
  - **Property 4: 事件列表默认过滤高危事件**
  - **Validates: Requirements 5.4**
  - 使用 fast-check 生成包含 CRITICAL/HIGH/MEDIUM/LOW 各级别事件的随机列表
  - 验证默认状态下渲染的事件行只包含 CRITICAL 和 HIGH 级别
  - _Requirements: 5.4_

- [x] 5. 重构 OverviewPage，组合新组件
  - 修改 `ai-log-system/src/components/EnhancedDashboard/pages/OverviewPage.tsx`
  - 移除原有的 KPI 卡片区域、图表区域、事件列表区域的内联代码
  - 替换为 `<KpiRow>` + `<ChartsRow>` + `<EventList>` 三个新组件
  - 保留顶部暂停提示 Alert 和 CRITICAL 告警 Alert
  - _Requirements: 1.3, 2.1, 3.1, 5.1_

- [x] 6. 重构 EnhancedDashboard，移除标签页和底部信息栏
  - 修改 `ai-log-system/src/components/EnhancedDashboard/EnhancedDashboard.tsx`
  - 移除 `activeTab` state 和 `renderTabContent` 逻辑
  - 移除 AnalysisPage、ThreatPage 的导入和渲染
  - 将 `DashboardHeader` + `ControlBar` 替换为 `DashboardTopBar`
  - 移除底部信息栏 div（系统版本、数据延迟、最后检查、系统状态）
  - 直接渲染 `<OverviewPage>` 不再通过标签页切换
  - _Requirements: 1.1, 1.2, 1.4_

- [ ]* 6.1 为 EnhancedDashboard 编写单元测试
  - 验证渲染结果不包含"安全分析"和"威胁情报"文本
  - 验证渲染结果不包含"系统版本"和"数据延迟"文本
  - _Requirements: 1.1, 1.4_

- [x] 7. Checkpoint - 确保所有测试通过
  - 运行 `pnpm vitest --run` 确保所有测试通过，如有问题请告知。

## Notes

- 标有 `*` 的子任务为可选测试任务，可跳过以加快 MVP 交付
- AnalysisPage.tsx 和 ThreatPage.tsx 文件暂时保留，不删除，以便后续作为独立页面使用
- DashboardHeader.tsx 和 ControlBar.tsx 文件暂时保留，待新组件稳定后再清理
