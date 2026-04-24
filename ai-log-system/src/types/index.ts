// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 认证相关类型
export interface LoginForm {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresIn: number;
}

export interface AuthState {
  user?: User;
  token?: string;
  isAuthenticated: boolean;
}

// 日志相关类型
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  source: string;
  message: string;
  details?: Record<string, any>;
  tags?: string[];
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LogQuery {
  page?: number;
  size?: number;
  startTime?: string;
  endTime?: string;
  level?: string;
  source?: string;
  keyword?: string;
}

// 预警相关类型（与后端 AlertResponse 对齐）
export interface Alert {
  id: number;
  alertId: string;
  source: string;
  alertType: string;
  alertLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  status: 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'FALSE_POSITIVE';
  assignee?: string;
  resolution?: string;
  aiConfidence?: number;
  logEntryId?: number;
  unifiedEventId?: number;
  handled: boolean;
  createdTime: string;
  updatedTime?: string;
}

export interface AlertQuery {
  page?: number;
  size?: number;
  status?: string;
  alertLevel?: string;
  startTime?: string;
  endTime?: string;
}

// AI模型相关类型
export interface AiModel {
  id: string;
  name: string;
  type: 'ISOLATION_FOREST' | 'LSTM' | 'TRANSFORMER';
  status: 'TRAINING' | 'READY' | 'ERROR' | 'DEPRECATED';
  version: string;
  description?: string;
  filePath?: string;
  parameters?: Record<string, any>;
  accuracy?: number;
  precisionScore?: number;
  recallScore?: number;
  f1Score?: number;
  trainingDataSize?: number;
  trainingDuration?: number;
  lastTrainedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelTrainingRecord {
  id: string;
  modelId: string;
  trainingDataPath: string;
  trainingConfig?: Record<string, any>;
  startTime: string;
  endTime?: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  metrics?: Record<string, any>;
  createdAt: string;
}

// 系统配置类型
export interface SystemConfig {
  id: string;
  configKey: string;
  configValue: string;
  configType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  description?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// 菜单项类型
export interface MenuItem {
  key: string;
  icon?: React.ReactNode;
  label: string;
  path?: string;
  access?: string;
  hideInMenu?: boolean;
  children?: MenuItem[];
}

// 权限类型
export type Permission = 'admin' | 'operator' | 'viewer';

// 主题类型
export interface ThemeConfig {
  primaryColor: string;
  borderRadius: number;
  colorBgContainer: string;
  colorText: string;
  colorTextSecondary: string;
  colorBorder: string;
}

// 组件Props类型
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

// 表格列类型
export interface TableColumn<T = any> {
  title: string;
  dataIndex: string;
  key: string;
  width?: number;
  fixed?: 'left' | 'right';
  sorter?: boolean | ((a: T, b: T) => number);
  filters?: Array<{ text: string; value: any }>;
  onFilter?: (value: any, record: T) => boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

// 表单类型
export interface FormItem {
  name: string;
  label: string;
  type: 'input' | 'password' | 'select' | 'textarea' | 'date' | 'number';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  rules?: any[];
}

// 统计数据类型
export interface StatisticsData {
  totalLogs: number;
  totalAlerts: number;
  criticalAlerts: number;
  activeModels: number;
  systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  lastUpdateTime: string;
}

// 图表数据类型
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface TimeSeriesData {
  time: string;
  value: number;
  category?: string;
}

// 错误类型
export interface ErrorInfo {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
}

// 通知类型
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

// Windows安全日志相关类型
export interface SecurityLog {
  id: number;
  eventId: number;
  eventTime: string;
  computerName: string;
  sourceName: string;
  userSid?: string;
  userName?: string;
  ipAddress?: string;
  logonType?: number;
  resultCode?: number;
  rawMessage: string;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdTime: string;
}
export interface SecurityAlert {
  id: number;
  alertLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alertType: string;
  description: string;
  eventData?: string;
  handled: boolean;
  createdTime: string;
  securityLog?: SecurityLog;
}
export interface Statistics {
  eventCounts: [number, number][];
  dailyCounts: [string, number][];
  bruteForceAttempts: [string, number][];
  totalAlerts: number;
  unhandledAlerts: number;
  threatLevels?: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  totalLogs?: number;
  securityEvents?: number;
  recentAlerts?: number;
  bruteForceAlerts?: number;
}

/** 与 `types/log.ts` 中 WebSocketMessage 一致；遗留别名单独标注。 */
export interface WebSocketMessage {
  type:
    | 'LOGS_BATCH'
    | 'LOG_SINGLE'
    | 'ALERT_SECURITY'
    | 'STATS_UPDATE'
    | 'NOTIFY_SYSTEM'
    | 'HEARTBEAT'
    | 'CUSTOM'
    | 'TEST_MESSAGE'
    | 'SYSTEM_INFO'
    | 'SYSTEM_ERROR'
    | 'SYSTEM_NOTIFICATION'
    | 'SECURITY_ALERT'
    | 'STATISTICS'
    | 'STATISTICS_UPDATE'
    | 'NEW_LOGS'
    | 'SINGLE_LOG'
    | 'PING'
    | 'PONG';
  data?: any;
  legacyType?: string;
  count?: number;
  logs?: SecurityLog[];
  level?: string;
  alertType?: string;
  description?: string;
  timestamp?: number;
}

export interface SecurityAnalysisItem {
  id: string;
  category: 'anomaly_detection' | 'threat_hunting' | 'risk_assessment' | 'compliance';
  name: string;
  description: string;
  riskScore: number;
  findings: string[];
  recommendations: string[];
  lastRun: string;
  nextRun: string;
  status: 'completed' | 'running' | 'failed' | 'pending';
}

export interface ThreatIntelItem {
  id: string;
  type: 'malware' | 'phishing' | 'vulnerability' | 'botnet' | 'zero-day';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  description: string;
  affectedSystems: string[];
  detectionDate: string;
  iocCount: number;
  confidence: number;
  status: 'active' | 'inactive' | 'mitigated';
  relatedThreats: string[];
}