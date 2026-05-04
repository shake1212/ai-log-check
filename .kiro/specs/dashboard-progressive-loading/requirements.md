# Requirements Document

## Introduction

Dashboard 页面（`/dashboard#/dashboard`）当前在所有 API 数据加载完成之前显示全屏 Spinner，导致用户感知到较长的白屏等待时间。本功能将 Dashboard 改造为渐进式加载模式：页面骨架立即渲染，各区块数据独立加载并在就绪后逐步填充，消除全屏阻塞等待。

## Glossary

- **Dashboard**: 安全监控仪表盘主页面，路径 `/dashboard#/dashboard`
- **EnhancedDashboard**: Dashboard 的顶层 React 组件
- **KpiRow**: 展示系统健康、日志总量、安全事件、未处理告警四个 KPI 卡片的行组件
- **ChartsRow**: 展示实时日志流量折线图和威胁等级分布饼图的行组件
- **EventSummary**: 展示安全事件摘要列表的组件
- **Skeleton**: Ant Design 骨架屏占位组件，在数据加载期间显示
- **Progressive_Loading**: 渐进式加载模式，页面结构立即渲染，各区块数据独立异步填充
- **Block**: Dashboard 中的独立可加载区块，包括 KpiRow、ChartsRow、EventSummary
- **Initial_Render**: 组件首次挂载到 DOM 后的第一次渲染

## Requirements

### Requirement 1: 消除全屏加载阻塞

**User Story:** 作为用户，我希望访问 Dashboard 时立即看到页面结构，而不是等待所有数据加载完成后才显示内容，以便减少感知等待时间。

#### Acceptance Criteria

1. WHEN 用户导航到 Dashboard 页面，THE EnhancedDashboard SHALL 在 Initial_Render 时立即渲染页面骨架结构，不显示全屏 Spinner
2. WHEN 数据尚未加载完成，THE EnhancedDashboard SHALL 在各 Block 内部显示 Skeleton 占位，而非全屏遮挡
3. WHEN 某个 Block 的数据加载完成，THE EnhancedDashboard SHALL 将该 Block 的 Skeleton 替换为真实内容，其他 Block 不受影响
4. IF 所有 API 请求均失败，THEN THE EnhancedDashboard SHALL 在各 Block 内部显示错误提示，而非全屏错误页面

### Requirement 2: KPI 区块独立加载

**User Story:** 作为用户，我希望 KPI 卡片区域能独立加载，数据就绪后立即显示，不依赖其他区块的加载状态。

#### Acceptance Criteria

1. WHEN KpiRow 挂载，THE KpiRow SHALL 立即显示 Skeleton 占位，同时发起 KPI 数据请求
2. WHEN KPI 数据请求完成，THE KpiRow SHALL 将 Skeleton 替换为真实 KPI 卡片数据
3. WHILE KPI 数据加载中，THE KpiRow SHALL 保持 Skeleton 显示，不影响 ChartsRow 和 EventSummary 的渲染

### Requirement 3: 图表区块独立加载

**User Story:** 作为用户，我希望图表区域能独立加载，不因事件列表数据未就绪而延迟显示。

#### Acceptance Criteria

1. WHEN ChartsRow 挂载，THE ChartsRow SHALL 立即渲染图表容器骨架
2. WHEN 事件数据就绪，THE ChartsRow SHALL 渲染实时日志流量图和威胁分布图
3. WHILE 事件数据加载中，THE ChartsRow SHALL 在图表区域显示 Skeleton，不阻塞 KpiRow 和 EventSummary

### Requirement 4: 事件列表区块独立加载

**User Story:** 作为用户，我希望安全事件列表能独立加载，在数据就绪后填充，不阻塞页面其他部分。

#### Acceptance Criteria

1. WHEN EventSummary 挂载，THE EventSummary SHALL 立即渲染列表骨架
2. WHEN 事件数据加载完成，THE EventSummary SHALL 将骨架替换为真实事件列表
3. IF 事件数据加载失败，THEN THE EventSummary SHALL 在列表区域内显示重试按钮，不影响 KpiRow 和 ChartsRow

### Requirement 5: 加载状态的视觉一致性

**User Story:** 作为用户，我希望加载过程中的视觉反馈与页面整体风格一致，骨架屏尺寸与真实内容匹配。

#### Acceptance Criteria

1. THE Skeleton SHALL 与对应 Block 的真实内容尺寸保持一致，避免加载完成后发生布局跳动（Layout Shift）
2. WHEN 数据从 Skeleton 切换到真实内容，THE EnhancedDashboard SHALL 使用渐入动画（fade-in）过渡，过渡时长不超过 300ms
3. THE KpiRow Skeleton SHALL 显示 4 个等宽卡片占位，与真实 KPI 卡片布局一致
