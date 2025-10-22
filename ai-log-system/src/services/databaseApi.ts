/**
 * 数据库管理API服务
 * 连接后端真实的数据库管理API
 */

import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 添加认证token（如果需要）
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// 数据库状态和监控相关API
export const databaseApi = {
  // 获取数据库状态概览
  getDatabaseStatus: () => api.get('/database/status'),

  // 获取连接池状态
  getPoolStatus: () => api.get('/database/pool/status'),

  // 获取性能指标
  getPerformanceMetrics: () => api.get('/database/performance'),

  // 健康检查
  healthCheck: () => api.get('/database/health'),

  // 获取慢查询统计
  getSlowQueries: () => api.get('/database/slow-queries'),

  // 获取表统计信息
  getTableStats: () => api.get('/database/tables'),

  // 获取连接池配置
  getPoolConfig: () => api.get('/database/pool/config'),

  // 测试数据库连接
  testConnection: () => api.get('/database/test-connection'),

  // 获取数据库版本信息
  getDatabaseVersion: () => api.get('/database/version'),

  // 获取系统概览
  getOverview: () => api.get('/database/overview'),
};

// 数据库配置管理相关API
export const databaseConfigApi = {
  // 获取当前配置
  getCurrentConfig: () => api.get('/database/config'),

  // 验证配置
  validateConfig: (config: any) => api.post('/database/config/validate', config),

  // 测试连接配置
  testConnectionConfig: (config: any) => api.post('/database/config/test-connection', config),

  // 获取推荐配置
  getRecommendedConfig: () => api.get('/database/config/recommendations'),

  // 获取配置建议
  getConfigRecommendations: () => api.get('/database/config/suggestions'),

  // 获取配置历史
  getConfigHistory: () => api.get('/database/config/history'),

  // 导出配置
  exportConfig: () => api.get('/database/config/export'),

  // 导入配置
  importConfig: (config: any) => api.post('/database/config/import', config),

  // 更新配置
  updateConfig: (config: any) => api.put('/database/config', config),

  // 重置配置
  resetConfig: () => api.post('/database/config/reset'),

  // 获取配置模板
  getConfigTemplate: () => api.get('/database/config/template'),
};

// 类型定义
export interface DatabaseStatus {
  connected: boolean;
  version: string;
  uptime: number;
  totalQueries: number;
  activeConnections: number;
  lastHealthCheck: string;
  errorCount: number;
}

export interface PoolStatus {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  connectionErrors: number;
  queryCount: number;
  averageQueryTime: number;
  lastConnected: string;
}

export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskIO: number;
  networkIO: number;
  errorRate: number;
  avgCollectionLatency: number;
  queueSize: number;
  processedLogs: number;
  droppedLogs: number;
  duplicateRate: number;
}

export interface DatabaseConfig {
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    charset: string;
    timezone: string;
    connectionLimit: number;
    acquireTimeout: number;
    timeout: number;
    reconnect: boolean;
    queryTimeout: number;
    debug: boolean;
  };
  pool: {
    min: number;
    max: number;
    idle: number;
    replication: number;
    evict: number;
    handleDisconnects: boolean;
  };
}

export interface TableStats {
  table: string;
  records: number;
  size: string;
  lastUpdate: string;
}

export interface SlowQuery {
  id: number;
  query: string;
  duration: number;
  timestamp: string;
}

export interface MigrationStatus {
  currentVersion: string;
  latestVersion: string;
  pendingCount: number;
  appliedMigrations: Array<{
    version: string;
    name: string;
    applied_at: string;
    checksum: string;
  }>;
}

// 导出所有API
export default {
  databaseApi,
  databaseConfigApi,
};
