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
  PageResponse 
} from '@/types';

// API基础配置
const API_BASE_URL = '/api';

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

// 日志相关API
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
};

// 预警相关API
export const alertApi = {
  // 获取预警列表
  getAlerts: (params?: AlertQuery): Promise<ApiResponse<PageResponse<Alert>>> =>
    request(`${API_BASE_URL}/alerts`, {
      params,
    }),

  // 获取预警详情
  getAlertById: (id: string): Promise<ApiResponse<Alert>> =>
    request(`${API_BASE_URL}/alerts/${id}`),

  // 更新预警状态
  updateAlertStatus: (id: string, status: string): Promise<ApiResponse<Alert>> =>
    request(`${API_BASE_URL}/alerts/${id}/status`, {
      method: 'PUT',
      data: { status },
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

  // 获取预警统计
  getAlertStatistics: (params?: { startTime?: string; endTime?: string }): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/alerts/statistics`, {
      params,
    }),
};

// AI模型相关API
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

// 系统相关API
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

// 用户相关API
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

// 事件查询和统计API
export const eventApi = {
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

  // 高级事件查询
  advancedSearch: (params: any): Promise<ApiResponse<any>> =>
    request(`${API_BASE_URL}/events/search/advanced`, {
      params
    }),

  // 获取实时统计
  getRealTimeStats: (): Promise<ApiResponse<Record<string, number>>> =>
    request(`${API_BASE_URL}/events/statistics/realtime`),

  // 获取事件分布统计
  getDistributionStats: (dimension: string, startTime?: string, endTime?: string): Promise<ApiResponse<Record<string, number>>> =>
    request(`${API_BASE_URL}/events/statistics/distribution`, {
      params: { dimension, startTime, endTime }
    }),
};

// 批量操作API
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

// 统一导出
export const api = {
  auth: authApi,
  log: logApi,
  alert: alertApi,
  model: modelApi,
  system: systemApi,
  user: userApi,
  event: eventApi,
  batch: batchApi,
};