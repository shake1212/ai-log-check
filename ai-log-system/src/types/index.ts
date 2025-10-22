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

// 预警相关类型
export interface Alert {
  id: string;
  logEntryId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'RESOLVED' | 'IGNORED';
  title: string;
  description?: string;
  detectedAt: string;
  resolvedAt?: string;
  modelId?: string;
  confidence?: number;
  falsePositive?: boolean;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertQuery {
  page?: number;
  size?: number;
  status?: string;
  severity?: string;
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
