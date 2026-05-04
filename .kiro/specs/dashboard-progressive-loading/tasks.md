# Implementation Plan: Dashboard Progressive Loading

## Overview

将 Dashboard 从全屏阻塞加载改造为渐进式加载，页面骨架立即渲染，各 Block 独立加载数据。

## Tasks

- [x] 1. 移除 EnhancedDashboard 全屏加载守卫
  - 删除 `if (loading) return <全屏Spinner>` 代码块
  - 删除 `if (!loading && fetchError) return <全屏Result>` 代码块
  - 保留 `loading` 和 `fetchError` 状态，但不再用于全屏阻塞
  - 确保组件直接渲染 `DashboardTopBar` 和 `OverviewPage`
  - _Requirements: 1.1, 1.2_

- [x] 2. 为 ChartsRow 添加 Skeleton 支持
  - [x] 2.1 在 `ChartsRow` 接口新增 `loading?: boolean` prop
    - 当 `loading=true` 时，用 `Skeleton` 替代折线图和饼图内容
    - Skeleton 高度固定为 `ROW_HEIGHT`（220px），与真实图表一致
    - _Requirements: 3.1, 3.2, 5.1_

  - [ ]* 2.2 为 ChartsRow 写属性测试（Property 2）
    - **Property 2: Block 独立加载互不影响**
    - **Validates: Requirements 1.3, 3.3**

- [x] 3. 为 EventSummary 添加 Skeleton 和错误重试支持
  - [x] 3.1 在 `EventSummary` 接口新增 `loading?: boolean` 和 `onRetry?: () => void` prop
    - 当 `loading=true` 时，用 `Skeleton` 替代统计卡片行
    - 当 `onRetry` 存在且数据为空时，显示重试按钮
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 3.2 为 EventSummary 写单元测试
    - 测试 loading=true 时显示 Skeleton
    - 测试 onRetry 存在时显示重试按钮
    - _Requirements: 4.3_

- [x] 4. 更新 OverviewPage 传递 loading 状态
  - 将 `eventLoading` 传递给 `ChartsRow` 的 `loading` prop
  - 将 `eventLoading` 和 `loadInitialData`（作为 `onRetry`）传递给 `EventSummary`
  - _Requirements: 1.3, 3.3, 4.1_

- [x] 5. Checkpoint — 确保所有测试通过，向用户确认页面加载行为是否符合预期

- [ ]* 6. 为 EnhancedDashboard 写属性测试（Property 1）
  - **Property 1: 初始渲染无全屏阻塞**
  - mock API 为 pending 状态，挂载后立即断言 DOM 中无全屏 Spinner
  - **Validates: Requirements 1.1, 1.2**

- [ ]* 7. 为 KpiRow 写单元测试
  - 测试挂载时有 4 个 Skeleton 卡片占位
  - _Requirements: 5.3_

## Notes

- 标有 `*` 的任务为可选测试任务，可跳过以加快 MVP 交付
- 任务 1 是核心改动，完成后用户即可感受到页面加载速度提升
- `KpiRow` 已有 Skeleton 逻辑，无需修改
