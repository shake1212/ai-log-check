// 方式1：重新导出主组件
export { default } from './EnhancedDashboard';

export type { 
  SecurityEvent, 
  DashboardStatistics, 
  ThreatIntelItem, 
  SecurityAnalysisItem,
  SystemMetrics,
  TrafficStats,
  RealTimeStats,
  DashboardProps,
  CardProps
} from './types/dashboard';