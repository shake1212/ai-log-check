// src/services/api.ts
import request from '@/utils/request';
import type { 
  LoginForm, 
  LoginResponse, 
  LogEntry, 
  LogQuery, 
  Alert, 
  AlertQuery, 
  AiModel, 
  User,
  ApiResponse,
  PageResponse,
  SecurityLog,
  SecurityAlert,
  Statistics
} from '@/types';

// API基础配置
// Axios 全局 baseURL 已设置为 /api，这里留空避免重复前缀
const API_BASE_URL = '/api';
const EVENT_API_BASE_URL = '/api/events';

// 脚本相关接口类型定义
export interface ScriptDescriptor {
  key: string;
  name: string;
  description: string;
  cooldownSeconds: number;
  allowManualTrigger: boolean;
}

export interface ScriptExecutionRecord {
 executionId: string;
  scriptKey: string;
  scriptName?: string;
  status: string; // RUNNING, SUCCESS, FAILED, BUSY, COOLDOWN
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
  outputSnippet?: string; // 添加缺失的字段
  triggerType?: string;   // 添加缺失的字段
  message?: string;
  args?: string[];
}

export interface ScriptRunRequest {
  scriptKey: string;
  args?: string[];
}

export interface ScriptRunResponse {
 executionId: string;
  scriptKey: string;
  scriptName?: string;
  status: string; // RUNNING, SUCCESS, FAILED, BUSY, COOLDOWN
  message: string;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
  args?: string[];}

export interface ScheduledTaskStatus {
   taskName: string;
  exists: boolean;
  status?: string;
  nextRunTime?: string;
  lastRunTime?: string;
  lastRunResult?: string;
  trigger?: string;
  taskPath?: string;
  error?: string;
}

// 认证相关API
export const authApi = {
  // 用户登录
  login: (data: LoginForm): Promise<ApiResponse<LoginResponse>> =>
    request(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      data,
    }),

  // 用户登出
  logout: (): Promise<ApiResponse<void>> =>
    request(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
    }),

  // 刷新token
  refreshToken: (): Promise<ApiResponse<LoginResponse>> =>
    request(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
    }),

  // 获取当前用户信息
  getCurrentUser: (): Promise<ApiResponse<User>> =>
    request(`${API_BASE_URL}/auth/me`),
};

// 日志相关API - 保持原有功能，添加Windows日志功能
export const logApi = {
  // 获取日志列表
  getLogs: (params?: LogQuery): Promise<ApiResponse<PageResponse<LogEntry>>> =>
    request(`${API_BASE_URL}/logs`, {
      params,
    }),

  // 获取日志详情
  getLogById: (id: string): Promise<ApiResponse<LogEntry>> =>
    request(`${API_BASE_URL}/logs/${id}`),

  // 创建日志
  createLog: (data: Partial<LogEntry>): Promise<ApiResponse<LogEntry>> =>
    request(`${API_BASE_URL}/logs`, {
      method: 'POST',
      data,
    }),

  // 批量导入日志
  batchImportLogs: (data: Partial<LogEntry>[]): Promise<ApiResponse<{ success: number; failed: number }>> =>
    request(`${API_BASE_URL}/logs/batch`, {
      method: 'POST',
      data,
    }),

  // 删除日志
  deleteLog: (id: string): Promise<ApiResponse<void>> =>
    request(`${API_BASE_URL}/logs/${id}`, {
      method: 'DELETE',
    }),

  // 导出日志
  exportLogs: (params?: LogQuery): Promise<Blob> =>
    request(`${API_BASE_URL}/logs/export`, {
      params,
      responseType: 'blob',
    }),

  // ========== Windows安全日志新增API ==========
  
  // 获取Windows安全日志
  getSecurityLogs: (params?: {
    page?: number;
    size?: number;
    eventId?: number;
    startTime?: string;
    endTime?: string;
  }): Promise<ApiResponse<PageResponse<SecurityLog>>> =>
    request(`${API_BASE_URL}/logs/security`, {
      params,
    }),

  // 获取最近的日志
  getRecentLogs: (limit: number = 100): Promise<ApiResponse<SecurityLog[]>> =>
    request(`${API_BASE_URL}/logs/recent`, {
      params: { limit },
    }),

  // 按时间范围查询日志
  getLogsByTimeRange: (start: string, end: string): Promise<ApiResponse<SecurityLog[]>> =>
    request(`${API_BASE_URL}/logs/by-time-range`, {
      params: { start, end },
    }),

  // 手动采集日志
  collectLogs: (): Promise<ApiResponse<{ success: boolean; collected: number; message: string }>> =>
    request(`${API_BASE_URL}/logs/collect`, {
      method: 'POST',
    }),

  // 搜索日志
  searchLogs: (params: {
    eventId?: number;
    ipAddress?: string;
    userName?: string;
    threatLevel?: string;
  }): Promise<ApiResponse<SecurityLog[]>> =>
    request(`${API_BASE_URL}/logs/search`, {
      params,
    }),

  // 获取统计信息
  getStatistics: (): Promise<ApiResponse<Statistics>> =>
    request(`${API_BASE_URL}/logs/statistics`),
};

// 预警相关API - 保持原有功能，添加安全警报功能
export const alertApi = {
  // 获取预警列表（对应 AlertController 的 /alerts）
  getAlerts: (params?: AlertQuery): Promise<ApiResponse<PageResponse<Alert>>> =>
    request(`${API_BASE_URL}/alerts`, {
      params,
    }),

  // 获取预警详情（对应 AlertController 的 /alerts/{id}）
  getAlertById: (id: string): Promise<ApiResponse<SecurityAlert>> =>
    request(`${API_BASE_URL}/alerts/${id}`),

  // 更新预警状态（对应 AlertController 的 /alerts/{id}/status）
  updateAlertStatus: (id: string, status: string, assignee?: string, resolution?: string): Promise<ApiResponse<void>> =>
    request(`${API_BASE_URL}/alerts/${id}/status`, {
      method: 'PUT',
      params: { status, assignee, resolution },
    }),

  // 标记为已处理（对应 AlertController 的 /alerts/{id}/handle）
  handleAlert: (id: string, handledBy?: string, resolution?: string): Promise<ApiResponse<void>> =>
    request(`${API_BASE_URL}/alerts/${id}/handle`, {
      method: 'PUT',
      params: { handledBy, resolution },
    }),

  // 批量处理预警
  batchUpdateAlerts: (ids: string[], status: string): Promise<ApiResponse<{ success: number; failed: number }>> =>
    request(`${API_BASE_URL}/alerts/batch`, {
      method: 'PUT',
      data: { ids, status },
    }),

  // 标记为误报
  markAsFalsePositive: (id: string): Promise<ApiResponse<Alert>> =>
    request(`${API_BASE_URL}/alerts/${id}/false-positive`, {
      method: 'PUT',
    }),

  // 获取预警统计（对应 AlertController 的 /alerts/statistics）
  getAlertStatistics: (params?: { startTime?: string; endTime?: string }): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/alerts/statistics`, {
      params,
    }),

  // 搜索告警（对应 AlertController 的 /alerts/search） - 这个必须存在！
  searchSecurityAlerts: (params: {
    keyword?: string;
    alertLevel?: string;
    handled?: boolean;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<ApiResponse<PageResponse<SecurityAlert>>> =>
    request(`${API_BASE_URL}/alerts/search`, {
      params,
    }),

  // 删除告警（对应 AlertController 的 /alerts/{id}） - 这个必须存在！
  deleteAlert: (id: string): Promise<ApiResponse<void>> =>
    request(`${API_BASE_URL}/alerts/${id}`, {
      method: 'DELETE',
    }),

  // ========== 安全警报新增API ==========

  // 获取未处理的安全警报
  getUnhandledAlerts: (): Promise<ApiResponse<SecurityAlert[]>> =>
    request(`${API_BASE_URL}/logs/alerts/unhandled`),

  // 标记安全警报为已处理（重命名，避免与上面的 handleAlert 冲突）
  handleSecurityAlert: (id: number): Promise<ApiResponse<void>> =>
    request(`${API_BASE_URL}/logs/alerts/${id}/handle`, {
      method: 'PUT',
    }),

  // 批量标记安全警报为已处理
  batchHandleAlerts: (alertIds: number[]): Promise<ApiResponse<{ handledCount: number }>> =>
    request(`${API_BASE_URL}/logs/alerts/batch/handle`, {
      method: 'PUT',
      data: { alertIds },
    }),

  // 获取安全警报详情
  getSecurityAlertById: (id: number): Promise<ApiResponse<SecurityAlert>> =>
    request(`${API_BASE_URL}/logs/alerts/${id}`),
};

// WebSocket相关API - 新增
export const websocketApi = {
  // 获取WebSocket连接状态
  getWebSocketStatus: (): Promise<ApiResponse<{
    connectionCount: number;
    onlineUserCount: number;
    status: string;
  }>> => request(`${API_BASE_URL}/websocket/status`),

  // 广播消息
  broadcastMessage: (data: {
    content: string;
    messageType: string;
  }): Promise<ApiResponse<{ status: string; message: string; targetCount: number }>> =>
    request(`${API_BASE_URL}/websocket/broadcast`, {
      method: 'POST',
      data,
    }),

  // 发送消息给指定用户
  sendMessageToUser: (data: {
    userId: string;
    content: string;
    messageType: string;
  }): Promise<ApiResponse<{ status: string; message: string; targetUser: string }>> =>
    request(`${API_BASE_URL}/websocket/send-to-user`, {
      method: 'POST',
      data,
    }),

  // 发送系统信息
  sendSystemInfo: (content: string): Promise<ApiResponse<{ status: string; message: string; targetCount: number }>> =>
    request(`${API_BASE_URL}/websocket/system-info`, {
      method: 'POST',
      data: { content },
    }),

  // 测试连接
  testConnection: (): Promise<ApiResponse<{ status: string; message: string; connectionCount: number }>> =>
    request(`${API_BASE_URL}/websocket/test-connection`, {
      method: 'POST',
    }),

  // 获取消息类型
  getMessageTypes: (): Promise<ApiResponse<{ messageTypes: Record<string, string>; totalCount: number }>> =>
    request(`${API_BASE_URL}/websocket/message-types`),
};

// AI模型相关API - 保持原有功能
export const modelApi = {
  // 获取模型列表
  getModels: (): Promise<ApiResponse<AiModel[]>> =>
    request(`${API_BASE_URL}/models`),

  // 获取模型详情
  getModelById: (id: string): Promise<ApiResponse<AiModel>> =>
    request(`${API_BASE_URL}/models/${id}`),

  // 创建模型
  createModel: (data: Partial<AiModel>): Promise<ApiResponse<AiModel>> =>
    request(`${API_BASE_URL}/models`, {
      method: 'POST',
      data,
    }),

  // 更新模型
  updateModel: (id: string, data: Partial<AiModel>): Promise<ApiResponse<AiModel>> =>
    request(`${API_BASE_URL}/models/${id}`, {
      method: 'PUT',
      data,
    }),

  // 删除模型
  deleteModel: (id: string): Promise<ApiResponse<void>> =>
    request(`${API_BASE_URL}/models/${id}`, {
      method: 'DELETE',
    }),

  // 训练模型
  trainModel: (id: string, data: { trainingData: string }): Promise<ApiResponse<{ taskId: string }>> =>
    request(`${API_BASE_URL}/models/${id}/train`, {
      method: 'POST',
      data,
    }),

  // 模型预测
  predict: (id: string, data: { input: any[] }): Promise<ApiResponse<{ predictions: number[] }>> =>
    request(`${API_BASE_URL}/models/${id}/predict`, {
      method: 'POST',
      data,
    }),

  // 获取训练记录
  getTrainingRecords: (modelId: string): Promise<ApiResponse<any[]>> =>
    request(`${API_BASE_URL}/models/${modelId}/training-records`),
};

// 系统相关API - 保持原有功能
export const systemApi = {
  // 获取系统状态
  getSystemStatus: (): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/system/status`),

  // 获取系统配置
  getSystemConfig: (): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/system/config`),

  // 更新系统配置
  updateSystemConfig: (data: any): Promise<ApiResponse<void>> =>
    request(`${API_BASE_URL}/system/config`, {
      method: 'PUT',
      data,
    }),

  // 获取系统统计
  getSystemStatistics: (): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/system/statistics`),
};

// 用户相关API - 保持原有功能
export const userApi = {
  // 获取用户列表
  getUsers: (params?: { page?: number; size?: number }): Promise<ApiResponse<PageResponse<User>>> =>
    request(`${API_BASE_URL}/users`, {
      params,
    }),

  // 创建用户
  createUser: (data: Partial<User>): Promise<ApiResponse<User>> =>
    request(`${API_BASE_URL}/users`, {
      method: 'POST',
      data,
    }),

  // 更新用户
  updateUser: (id: string, data: Partial<User>): Promise<ApiResponse<User>> =>
    request(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      data,
    }),

  // 删除用户
  deleteUser: (id: string): Promise<ApiResponse<void>> =>
    request(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
    }),

  // 修改密码
  changePassword: (data: { oldPassword: string; newPassword: string }): Promise<ApiResponse<void>> =>
    request(`${API_BASE_URL}/users/change-password`, {
      method: 'PUT',
      data,
    }),
};

// 事件查询和统计API - 保持原有功能
export const eventApi = {
  // 获取最近事件（统一事件）
  getRecentEvents: (params?: { limit?: number }): Promise<any> =>
    request(`${EVENT_API_BASE_URL}/recent`, {
      params,
    }),

  // 获取事件详情
  getEventById: (id: number): Promise<any> =>
    request(`${EVENT_API_BASE_URL}/${id}`),

  // 搜索事件
  searchEvents: (data: any): Promise<any> =>
    request(`${EVENT_API_BASE_URL}/search`, {
      method: 'POST',
      data,
    }),

  // 获取异常事件
  getAnomalyEvents: (params?: { page?: number; size?: number }): Promise<any> =>
    request(`${EVENT_API_BASE_URL}/anomalies`, {
      params,
    }),

  // 更新事件状态
  updateEventStatus: (
    id: number,
    params: { status: string; resolutionNotes?: string; assignedTo?: string }
  ): Promise<any> =>
    request(`${EVENT_API_BASE_URL}/${id}/status`, {
      method: 'PUT',
      params,
    }),

  // 删除事件
  deleteEvent: (id: number): Promise<any> =>
    request(`${EVENT_API_BASE_URL}/${id}`, {
      method: 'DELETE',
    }),

  // 获取统计信息
  getStatistics: (params: { startTime: string; endTime: string }): Promise<any> =>
    request(`${EVENT_API_BASE_URL}/statistics`, {
      params,
    }),

  // 获取时间序列统计
  getTimeSeriesStatistics: (params: { startTime: string; endTime: string }): Promise<any> =>
    request(`${EVENT_API_BASE_URL}/statistics/timeseries`, {
      params,
    }),

  // 手动触发日志收集
  triggerLogCollection: (): Promise<any> =>
    request(`${EVENT_API_BASE_URL}/collect`, {
      method: 'POST',
    }),

  // 清理旧数据
  cleanupOldEvents: (params?: { daysToKeep?: number }): Promise<any> =>
    request(`${EVENT_API_BASE_URL}/cleanup`, {
      method: 'POST',
      params,
    }),

  // 获取综合统计
  getComprehensiveStats: (): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/events/statistics/comprehensive`),

  // 获取时间范围统计
  getTimeRangeStats: (startTime: string, endTime: string): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/events/statistics/range`, {
      params: { startTime, endTime }
    }),

  // 获取趋势数据
  getTrends: (startTime?: string, endTime?: string, granularity = 'hour'): Promise<ApiResponse<any[]>> =>
    request(`${API_BASE_URL}/events/trends`, {
      params: { startTime, endTime, granularity }
    }),

  // 获取来源统计
  getSourceStats: (startTime?: string, endTime?: string): Promise<ApiResponse<Record<string, number>>> =>
    request(`${API_BASE_URL}/events/statistics/sources`, {
      params: { startTime, endTime }
    }),

  // 获取级别统计
  getLevelStats: (startTime?: string, endTime?: string): Promise<ApiResponse<Record<string, number>>> =>
    request(`${API_BASE_URL}/events/statistics/levels`, {
      params: { startTime, endTime }
    }),

  // 获取异常统计
  getAnomalyStats: (startTime?: string, endTime?: string): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/events/statistics/anomalies`, {
      params: { startTime, endTime }
    }),

  // 获取热点IP统计
  getTopIps: (limit = 10, startTime?: string, endTime?: string): Promise<ApiResponse<any[]>> =>
    request(`${API_BASE_URL}/events/statistics/top-ips`, {
      params: { limit, startTime, endTime }
    }),

  // 获取用户活动统计
  getUserActivityStats: (limit = 10, startTime?: string, endTime?: string): Promise<ApiResponse<any[]>> =>
    request(`${API_BASE_URL}/events/statistics/user-activity`, {
      params: { limit, startTime, endTime }
    }),

  // 高级事件查询（旧接口，兼容保留）
  advancedSearch: (params: any): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/events/search/advanced`, {
      params
    }),

  // 获取实时统计
  getRealTimeStats: (): Promise<ApiResponse<Record<string, number>>> =>
    request(`${API_BASE_URL}/analysis/real-time-stats`),

  // 获取事件分布统计
  getDistributionStats: (dimension: string, startTime?: string, endTime?: string): Promise<ApiResponse<Record<string, number>>> =>
    request(`${API_BASE_URL}/events/statistics/distribution`, {
      params: { dimension, startTime, endTime }
    }),
      // 新增：获取仪表板统计数据
  getDashboardStats: (): Promise<ApiResponse<{
    todayEvents: number;
    totalEvents: number;
    totalLogs: number;
    todayLogs: number;
    dailyCounts: [string, number][];
    levelCounts: Record<string, number>;
    severityCounts: Record<string, number>;
    threatLevelCounts: Record<string, number>;
    anomalyCount: number;
    avgDailyEvents: number;
    lastUpdate: string;
  }>> => request(`${EVENT_API_BASE_URL}/dashboard-stats`),

};

// 批量操作API - 保持原有功能
export const batchApi = {
  // 批量保存日志
  batchSave: (data: Partial<LogEntry>[]): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/logs/batch/save`, {
      method: 'POST',
      data
    }),

  // 异步批量保存日志
  batchSaveAsync: (data: Partial<LogEntry>[]): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/logs/batch/save/async`, {
      method: 'POST',
      data
    }),

  // 批量更新日志
  batchUpdate: (data: Partial<LogEntry>[]): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/logs/batch/update`, {
      method: 'PUT',
      data
    }),

  // 批量删除日志
  batchDelete: (ids: string[]): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/logs/batch/delete`, {
      method: 'DELETE',
      data: ids
    }),

  // 批量标记异常
  batchMarkAnomaly: (data: {
    ids: string[];
    isAnomaly: boolean;
    anomalyScore?: number;
    anomalyReason?: string;
  }): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/logs/batch/mark-anomaly`, {
      method: 'PUT',
      data
    }),

  // 高效分页查询
  efficientPageQuery: (params: any): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/logs/batch/query/efficient`, {
      params
    }),

  // 批量查询日志
  batchFindByIds: (ids: string[]): Promise<ApiResponse<LogEntry[]>> =>
    request(`${API_BASE_URL}/logs/batch/query/by-ids`, {
      method: 'POST',
      data: ids
    }),

  // 获取批量操作统计
  getBatchStats: (): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/logs/batch/stats`),

  // 清理过期日志
  cleanupExpiredLogs: (beforeDate: string): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/logs/batch/cleanup`, {
      method: 'DELETE',
      params: { beforeDate }
    }),

  // 批量导入日志
  batchImport: (formData: FormData): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/logs/batch/import`, {
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
};
// 安全分析和威胁情报相关API - 新增
export const analysisApi = {
  // 获取安全分析数据
  getSecurityAnalyses: (): Promise<ApiResponse<SecurityAnalysisItem[]>> =>
    request(`${API_BASE_URL}/analysis/security-analyses`),

  // 获取威胁情报数据
  getThreatIntelligence: (): Promise<ApiResponse<ThreatIntelItem[]>> =>
    request(`${API_BASE_URL}/analysis/threat-intelligence`),

  // 运行威胁分析
  runThreatAnalysis: (): Promise<ApiResponse<{ taskId: string; status: string }>> =>
    request(`${API_BASE_URL}/analysis/run-threat-analysis`, {
      method: 'POST',
    }),

  // 运行合规扫描
  runComplianceScan: (): Promise<ApiResponse<{ taskId: string; status: string }>> =>
    request(`${API_BASE_URL}/analysis/run-compliance-scan`, {
      method: 'POST',
    }),

  // 运行异常检测
  runAnomalyDetection: (): Promise<ApiResponse<{ taskId: string; status: string }>> =>
    request(`${API_BASE_URL}/analysis/run-anomaly-detection`, {
      method: 'POST',
    }),

  // 同步云端威胁情报
  syncCloudThreatIntel: (): Promise<ApiResponse<{ status: string; syncedCount: number }>> =>
    request(`${API_BASE_URL}/analysis/sync-cloud-threat-intel`, {
      method: 'POST',
    }),

  // 获取分析结果统计
  getAnalysisStats: (): Promise<ApiResponse<{
    totalAnalyses: number;
    completed: number;
    running: number;
    highRiskCount: number;
    avgRiskScore: number;
    lastRun: string;
  }>> => request(`${API_BASE_URL}/analysis/stats`),

  // 获取威胁情报统计
  getThreatIntelStats: (): Promise<ApiResponse<{
    totalThreats: number;
    activeThreats: number;
    malwareCount: number;
    phishingCount: number;
    criticalCount: number;
    lastUpdate: string;
  }>> => request(`${API_BASE_URL}/analysis/threat-stats`),
   // 新增：获取系统监控指标
  getSystemMetrics: (): Promise<ApiResponse<{
    eventsPerSecond: {
      normal: number; // 正常流量（条/秒）
      // 正常流量（条/秒）
      abnormal: number; // 异常流量（条/秒）
      // 异常流量（条/秒）
      peak: number; // 峰值流量（条/秒）
    };
    systemHealth: number;           // 系统健康度百分比
    uptime: number;                 // 正常运行时间百分比
    storageUsed: number;            // 存储使用量（TB）
    storageTotal: number;           // 总存储量（TB）
    throughput: {
      normal: number;               // 正常流量（条/秒）
      abnormal: number;             // 异常流量（条/秒）
      peak: number;                 // 峰值流量（条/秒）
    };
    latency: number;                // 数据延迟（ms）
    systemVersion: string;          // 系统版本
    lastUpdate: string;             // 最后更新时间
  }>> => request(`${API_BASE_URL}/analysis/system-metrics`),
  
  // 新增：获取流量统计数据
  getTrafficStats: (): Promise<ApiResponse<{
    normalTraffic: number;          // 正常流量
    anomalyTraffic: number;         // 异常流量
    peakTraffic: number;           // 峰值流量
    avgLatency: number;            // 平均延迟
    currentTraffic: number;        // 当前流量
  }>> => request(`${API_BASE_URL}/analysis/traffic-stats`),
};


// 还需要在types.ts中定义SecurityAnalysisItem和ThreatIntelItem接口
// 如果types.ts中没有，也可以在这里定义
interface SecurityAnalysisItem {
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

interface ThreatIntelItem {
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


// 脚本执行 API - 完善接口
export const scriptApi = {
   // 触发脚本执行
  runScript: (data: ScriptRunRequest): Promise<ApiResponse<ScriptRunResponse>> =>
    request(`${API_BASE_URL}/scripts/run`, {
      method: 'POST',
      data,
    }),

  // 获取可用脚本
  getAvailableScripts: (): Promise<ApiResponse<ScriptDescriptor[]>> =>
    request(`${API_BASE_URL}/scripts/available`),

  // 获取执行历史
  getHistory: (): Promise<ApiResponse<ScriptExecutionRecord[]>> =>
    request(`${API_BASE_URL}/scripts/history`),

  // 获取所有计划任务状态
  getScheduledTasks: (): Promise<ApiResponse<ScheduledTaskStatus[]>> =>
    request(`${API_BASE_URL}/scripts/scheduled-tasks`),

  // 获取单个计划任务状态
  getScheduledTask: (taskName: string): Promise<ApiResponse<ScheduledTaskStatus>> =>
    request(`${API_BASE_URL}/scripts/scheduled-tasks/${taskName}`),

  // 获取脚本执行状态（可选，如果后端支持）
  getScriptStatus: (executionId: string): Promise<ApiResponse<ScriptExecutionRecord>> =>
    request(`${API_BASE_URL}/scripts/status/${executionId}`),

  // 取消脚本执行（可选，如果后端支持）
  cancelScript: (executionId: string): Promise<ApiResponse<void>> =>
    request(`${API_BASE_URL}/scripts/cancel/${executionId}`, {
      method: 'POST',
    }),

  // 获取脚本日志（可选，如果后端支持）
  getScriptLogs: (executionId: string): Promise<ApiResponse<string>> =>
    request(`${API_BASE_URL}/scripts/logs/${executionId}`),
};

// 统一导出
export const api = {
  auth: authApi,
  log: logApi,
  alert: alertApi,
  websocket: websocketApi, // 新增WebSocket API
  model: modelApi,
  system: systemApi,
  user: userApi,
  event: eventApi,
  batch: batchApi,
  script: scriptApi,
   analysis: analysisApi, 
};

