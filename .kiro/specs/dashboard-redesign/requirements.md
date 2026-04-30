# Requirements Document

## 引言

当前 `/dashboard` 仪表盘界面存在信息层级混乱、操作按钮过多、内容分散在多个标签页等问题，导致用户无法快速获取安全态势全貌。本需求旨在重新设计仪表盘布局，使其真正发挥"一屏掌握全局"的作用，突出核心安全指标，简化操作区域，提升信息密度与可读性。

## 术语表

- **Dashboard（仪表盘）**: `/dashboard` 路由对应的主页面，承载安全监控核心信息
- **KPI 卡片**: 展示单一关键指标（系统健康度、日志总量、安全事件数、活跃用户数）的卡片组件
- **ControlBar（控制栏）**: 包含暂停/继续、通知、导出等操作按钮的工具栏
- **OverviewPage（概览页）**: 仪表盘主内容区，包含 KPI 卡片、图表和事件列表
- **SecurityEvent（安全事件）**: 系统检测到的安全威胁或异常日志记录

## 需求

### 需求1: 精简页面层级结构

**User Story:** 作为安全运维人员，我希望仪表盘页面层级清晰、内容一屏可见，以便快速掌握当前安全态势。

#### 验收标准

1. THE Dashboard SHALL 移除底部信息栏（系统版本、数据延迟、最后检查、系统状态），将连接状态信息保留在 DashboardHeader 中
2. THE Dashboard SHALL 将 DashboardHeader 与 ControlBar 合并为单一顶部导航栏，高度不超过 64px
3. WHEN 用户访问 `/dashboard` 时，THE Dashboard SHALL 在不滚动的情况下展示 KPI 卡片区域和至少一个图表
4. THE Dashboard SHALL 移除"安全分析"和"威胁情报"两个标签页，将其内容整合至概览页或独立页面入口

### 需求2: 突出核心 KPI 指标

**User Story:** 作为安全运维人员，我希望第一眼就能看到最重要的安全指标，以便快速判断系统状态。

#### 验收标准

1. THE Dashboard SHALL 在页面顶部以 4 列网格展示系统健康度、总日志数、安全事件数、活跃用户数四个 KPI 卡片
2. WHEN 安全事件中存在严重（CRITICAL）级别事件时，THE SecurityEventsCard SHALL 以红色高亮边框和醒目数字展示严重事件数量
3. THE KPI 卡片 SHALL 保持等高，高度固定为 120px，避免因数据长度不同导致卡片高度不一致
4. WHEN 数据加载中时，THE KPI 卡片 SHALL 显示骨架屏（Skeleton）而非整张卡片的 loading 旋转

### Requirement 3: 优化图表区域布局

**User Story:** 作为安全运维人员，我希望图表区域布局合理、信息密度适中，以便快速识别趋势和异常。

#### 验收标准

1. THE Dashboard SHALL 在 KPI 卡片下方以左右两列布局展示"实时日志流量"图表（左，占 60%）和"威胁等级分布"饼图（右，占 40%）
2. THE 实时日志流量图表 SHALL 高度固定为 220px，避免图表过高占据过多屏幕空间
3. THE 威胁等级分布图表 SHALL 在饼图旁边展示各等级数量的图例列表，不单独占一行
4. WHEN 事件数据为空时，THE 图表区域 SHALL 显示"暂无数据"占位符而非空白区域

### Requirement 4: 简化控制栏操作

**User Story:** 作为安全运维人员，我希望控制栏只保留最常用的操作，减少视觉干扰，以便专注于数据分析。

#### 验收标准

1. THE ControlBar SHALL 只保留以下操作：暂停/继续监控、系统通知（含未读角标）、数据导出下拉菜单
2. THE ControlBar SHALL 移除"前往告警处置"和"前往事件分析"两个跳转按钮，改为在 KPI 卡片上添加可点击跳转链接
3. THE ControlBar SHALL 移除"重新连接"按钮，将重连逻辑改为连接断开时自动触发，并在 Header 状态指示灯旁显示"点击重连"文字链接
4. WHEN ControlBar 中的操作按钮超过 3 个时，THE ControlBar SHALL 将次要操作收纳至"更多操作"下拉菜单

### Requirement 5: 优化安全事件列表

**User Story:** 作为安全运维人员，我希望安全事件列表简洁易读，以便快速识别需要处理的事件。

#### 验收标准

1. THE 安全事件列表 SHALL 固定高度为 300px，超出部分可滚动，避免列表过长推挤图表区域
2. THE 安全事件列表 SHALL 每行只展示：等级色点、事件类型、事件消息（截断至 60 字符）、时间、状态标签，移除"详情"按钮
3. WHEN 用户点击事件行时，THE Dashboard SHALL 跳转至 `/events` 页面并携带该事件 ID 作为查询参数
4. THE 安全事件列表 SHALL 默认只展示 CRITICAL 和 HIGH 级别事件，提供"显示全部"切换按钮

### Requirement 6: 响应式布局适配

**User Story:** 作为安全运维人员，我希望仪表盘在不同屏幕尺寸下都能正常显示，以便在不同设备上使用。

#### 验收标准

1. WHEN 屏幕宽度小于 1200px 时，THE Dashboard SHALL 将 KPI 卡片从 4 列变为 2 列布局
2. WHEN 屏幕宽度小于 768px 时，THE Dashboard SHALL 将图表区域从左右两列变为上下堆叠布局
3. THE Dashboard SHALL 在所有断点下保持 ControlBar 操作按钮可见且可点击，不发生溢出截断
