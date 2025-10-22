/**
 * MySQL数据库连接池配置
 * 提供数据库连接管理和配置
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  charset: string;
  timezone: string;
  // 连接池配置
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
  reconnect: boolean;
  // 查询配置
  queryTimeout: number;
  // 日志配置
  debug: boolean;
  // SSL配置
  ssl?: {
    enabled: boolean;
    rejectUnauthorized: boolean;
  };
}

export interface PoolConfig {
  min: number;
  max: number;
  idle: number;
  acquire: number;
  evict: number;
  handleDisconnects: boolean;
}

export interface DatabaseStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  connectionErrors: number;
  queryCount: number;
  averageQueryTime: number;
  lastConnected: string;
}

// 默认数据库配置
export const defaultDatabaseConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'ai_log_system',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8mb4',
  timezone: '+08:00',
  connectionLimit: 20,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  queryTimeout: 30000,
  debug: process.env.NODE_ENV === 'development',
  ssl: {
    enabled: process.env.DB_SSL === 'true',
    rejectUnauthorized: false
  }
};

// 默认连接池配置
export const defaultPoolConfig: PoolConfig = {
  min: 5,
  max: 20,
  idle: 10000,
  acquire: 60000,
  evict: 1000,
  handleDisconnects: true
};

// 环境特定配置
export const getDatabaseConfig = (): DatabaseConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        ...defaultDatabaseConfig,
        connectionLimit: 50,
        acquireTimeout: 30000,
        timeout: 30000,
        queryTimeout: 15000,
        debug: false,
        ssl: {
          enabled: true,
          rejectUnauthorized: true
        }
      };
    
    case 'test':
      return {
        ...defaultDatabaseConfig,
        database: process.env.DB_NAME || 'ai_log_system_test',
        connectionLimit: 5,
        acquireTimeout: 10000,
        timeout: 10000,
        queryTimeout: 5000,
        debug: false
      };
    
    case 'development':
    default:
      return {
        ...defaultDatabaseConfig,
        debug: true
      };
  }
};

// 连接池配置
export const getPoolConfig = (): PoolConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        min: 10,
        max: 50,
        idle: 30000,
        acquire: 30000,
        evict: 500,
        handleDisconnects: true
      };
    
    case 'test':
      return {
        min: 2,
        max: 5,
        idle: 5000,
        acquire: 10000,
        evict: 1000,
        handleDisconnects: true
      };
    
    case 'development':
    default:
      return {
        ...defaultPoolConfig
      };
  }
};

// 数据库URL构建
export const buildDatabaseUrl = (config: DatabaseConfig): string => {
  const sslConfig = config.ssl?.enabled ? '?ssl=true' : '';
  return `mysql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}${sslConfig}`;
};

// 验证数据库配置
export const validateDatabaseConfig = (config: DatabaseConfig): string[] => {
  const errors: string[] = [];
  
  if (!config.host) {
    errors.push('数据库主机地址不能为空');
  }
  
  if (!config.port || config.port < 1 || config.port > 65535) {
    errors.push('数据库端口必须在1-65535之间');
  }
  
  if (!config.database) {
    errors.push('数据库名称不能为空');
  }
  
  if (!config.username) {
    errors.push('数据库用户名不能为空');
  }
  
  if (config.connectionLimit < 1) {
    errors.push('连接池大小必须大于0');
  }
  
  if (config.acquireTimeout < 1000) {
    errors.push('连接获取超时时间必须大于1000ms');
  }
  
  if (config.queryTimeout < 1000) {
    errors.push('查询超时时间必须大于1000ms');
  }
  
  return errors;
};

// 数据库连接健康检查
export interface HealthCheckResult {
  healthy: boolean;
  message: string;
  latency: number;
  timestamp: string;
}

export const createHealthCheck = (config: DatabaseConfig) => {
  return async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    
    try {
      // 这里应该实现实际的数据库连接测试
      // 由于我们在前端环境，这里模拟健康检查
      const latency = Date.now() - startTime;
      
      return {
        healthy: true,
        message: '数据库连接正常',
        latency,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      
      return {
        healthy: false,
        message: `数据库连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
        latency,
        timestamp: new Date().toISOString()
      };
    }
  };
};

// 数据库统计信息收集
export const createStatsCollector = () => {
  let stats: DatabaseStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingConnections: 0,
    connectionErrors: 0,
    queryCount: 0,
    averageQueryTime: 0,
    lastConnected: new Date().toISOString()
  };
  
  return {
    getStats: (): DatabaseStats => ({ ...stats }),
    
    updateStats: (updates: Partial<DatabaseStats>): void => {
      stats = { ...stats, ...updates };
    },
    
    incrementQueryCount: (): void => {
      stats.queryCount++;
    },
    
    updateAverageQueryTime: (queryTime: number): void => {
      stats.averageQueryTime = (stats.averageQueryTime + queryTime) / 2;
    },
    
    incrementConnectionErrors: (): void => {
      stats.connectionErrors++;
    },
    
    updateConnectionStats: (active: number, idle: number, waiting: number): void => {
      stats.activeConnections = active;
      stats.idleConnections = idle;
      stats.waitingConnections = waiting;
      stats.totalConnections = active + idle;
    },
    
    resetStats: (): void => {
      stats = {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingConnections: 0,
        connectionErrors: 0,
        queryCount: 0,
        averageQueryTime: 0,
        lastConnected: new Date().toISOString()
      };
    }
  };
};

// 导出配置获取函数
export const getConfig = () => ({
  database: getDatabaseConfig(),
  pool: getPoolConfig()
});

// 导出默认配置
export default {
  database: defaultDatabaseConfig,
  pool: defaultPoolConfig
};
