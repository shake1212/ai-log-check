/**
 * MySQL数据库连接池管理器
 * 提供数据库连接池的创建、管理和监控
 */

import { 
  DatabaseConfig, 
  PoolConfig, 
  DatabaseStats, 
  HealthCheckResult,
  createHealthCheck,
  createStatsCollector
} from '../config/database';

export interface QueryResult<T = any> {
  rows: T[];
  fields: any[];
  affectedRows: number;
  insertId: number;
  changedRows: number;
  message: string;
}

export interface Transaction {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
}

export interface Connection {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  release(): void;
  beginTransaction(): Promise<Transaction>;
  ping(): Promise<boolean>;
}

export interface PoolEvents {
  connection: (connection: Connection) => void;
  acquire: (connection: Connection) => void;
  release: (connection: Connection) => void;
  error: (error: Error, connection: Connection) => void;
  enqueue: () => void;
  dequeue: () => void;
}

export class DatabasePool {
  private config: DatabaseConfig;
  private poolConfig: PoolConfig;
  private pool: any = null;
  private statsCollector = createStatsCollector();
  private healthCheck = createHealthCheck;
  private isInitialized = false;
  private eventListeners: Partial<PoolEvents> = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;

  constructor(config: DatabaseConfig, poolConfig: PoolConfig) {
    this.config = config;
    this.poolConfig = poolConfig;
  }

  /**
   * 初始化连接池
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const health = await this.healthCheck();
      if (!health.healthy) {
        throw new Error(health.message);
      }
      this.pool = { initializedAt: new Date().toISOString() };
      
      this.isInitialized = true;
      this.reconnectAttempts = 0;
      
      // 更新统计信息
      this.statsCollector.updateStats({
        lastConnected: new Date().toISOString()
      });

      console.log('数据库连接池初始化成功');
      
      // 触发连接事件
      this.emit('connection', this.createBackendConnection());
      
    } catch (error) {
      console.error('数据库连接池初始化失败:', error);
      throw error;
    }
  }

  /**
   * 调用后端数据库网关
   */
  private async callDatabaseApi<T = any>(path: string, method: string = 'GET', body?: any): Promise<T> {
    const response = await fetch(`/api/database/${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
      throw new Error(`数据库接口调用失败: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * 创建后端代理连接
   */
  private createBackendConnection(): Connection {
    return {
      query: async <T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> => {
        const start = Date.now();
        const raw = await this.callDatabaseApi<any>('query', 'POST', { sql, params: params || [] });
        const result: QueryResult<T> = {
          rows: (raw.rows || []) as T[],
          fields: raw.fields || [],
          affectedRows: raw.affectedRows || 0,
          insertId: raw.insertId || 0,
          changedRows: raw.changedRows || 0,
          message: raw.message || 'Query OK'
        };

        // 更新统计信息
        this.statsCollector.incrementQueryCount();
        this.statsCollector.updateAverageQueryTime(Date.now() - start);

        return result;
      },

      release: () => {
        this.emit('release', this.createBackendConnection());
      },

      beginTransaction: async (): Promise<Transaction> => {
        return this.createBackendTransaction();
      },

      ping: async (): Promise<boolean> => {
        try {
          const result = await this.callDatabaseApi<any>('test-connection');
          return !!result.connected;
        } catch {
          return false;
        }
      }
    };
  }

  /**
   * 创建后端代理事务
   */
  private createBackendTransaction(): Transaction {
    let isActive = false;
    const queuedQueries: Array<{ sql: string; params?: any[] }> = [];

    return {
      begin: async (): Promise<void> => {
        isActive = true;
        await new Promise(resolve => setTimeout(resolve, 10));
      },

      commit: async (): Promise<void> => {
        if (!isActive) {
          throw new Error('事务未开始');
        }
        await this.callDatabaseApi('transaction', 'POST', { queries: queuedQueries });
        isActive = false;
      },

      rollback: async (): Promise<void> => {
        if (!isActive) {
          throw new Error('事务未开始');
        }
        isActive = false;
        queuedQueries.length = 0;
      },

      query: async <T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> => {
        if (!isActive) {
          throw new Error('事务未开始');
        }
        
        queuedQueries.push({ sql, params });
        return {
          rows: [] as T[],
          fields: [],
          affectedRows: 0,
          insertId: 0,
          changedRows: 0,
          message: 'QUEUED'
        };
      }
    };
  }

  /**
   * 获取连接
   */
  async getConnection(): Promise<Connection> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const connection = this.createBackendConnection();
      
      // 更新统计信息
      this.statsCollector.updateConnectionStats(
        this.poolConfig.max,
        this.poolConfig.min,
        0
      );

      // 触发获取连接事件
      this.emit('acquire', connection);
      
      return connection;
    } catch (error) {
      this.statsCollector.incrementConnectionErrors();
      throw error;
    }
  }

  /**
   * 执行查询
   */
  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const connection = await this.getConnection();
    
    try {
      const result = await connection.query<T>(sql, params);
      return result;
    } finally {
      connection.release();
    }
  }

  /**
   * 执行事务
   */
  async transaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T> {
    const connection = await this.getConnection();
    const transaction = await connection.beginTransaction();
    
    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 批量执行查询
   */
  async batchQuery(queries: Array<{ sql: string; params?: any[] }>): Promise<QueryResult[]> {
    return this.transaction(async (transaction) => {
      const results: QueryResult[] = [];
      
      for (const query of queries) {
        const result = await transaction.query(query.sql, query.params);
        results.push(result);
      }
      
      return results;
    });
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      const connection = await this.getConnection();
      const pingResult = await connection.ping();
      connection.release();
      
      const latency = Date.now() - startTime;
      
      return {
        healthy: pingResult,
        message: pingResult ? '数据库连接正常' : '数据库连接失败',
        latency,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        message: `健康检查失败: ${error instanceof Error ? error.message : '未知错误'}`,
        latency: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): DatabaseStats {
    return this.statsCollector.getStats();
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.statsCollector.resetStats();
  }

  /**
   * 添加事件监听器
   */
  on<K extends keyof PoolEvents>(event: K, listener: PoolEvents[K]): void {
    this.eventListeners[event] = listener;
  }

  /**
   * 移除事件监听器
   */
  off<K extends keyof PoolEvents>(event: K): void {
    delete this.eventListeners[event];
  }

  /**
   * 触发事件
   */
  private emit<K extends keyof PoolEvents>(event: K, ...args: Parameters<PoolEvents[K]>): void {
    const listener = this.eventListeners[event];
    if (listener) {
      (listener as any)(...args);
    }
  }

  /**
   * 重新连接
   */
  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error('达到最大重连次数');
    }

    this.reconnectAttempts++;
    
    try {
      await this.close();
      await this.initialize();
      console.log(`数据库重连成功 (尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    } catch (error) {
      console.error(`数据库重连失败 (尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts}):`, error);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.reconnect(), this.reconnectInterval);
      } else {
        throw error;
      }
    }
  }

  /**
   * 关闭连接池
   */
  async close(): Promise<void> {
    if (this.pool) {
      this.pool = null;
      this.isInitialized = false;
      console.log('数据库连接池已关闭');
    }
  }

  /**
   * 检查连接池状态
   */
  isHealthy(): boolean {
    return this.isInitialized && this.reconnectAttempts < this.maxReconnectAttempts;
  }

  /**
   * 获取配置信息
   */
  getConfig(): { database: DatabaseConfig; pool: PoolConfig } {
    return {
      database: { ...this.config },
      pool: { ...this.poolConfig }
    };
  }

  /**
   * 更新配置
   */
  updateConfig(databaseConfig?: Partial<DatabaseConfig>, poolConfig?: Partial<PoolConfig>): void {
    if (databaseConfig) {
      this.config = { ...this.config, ...databaseConfig };
    }
    if (poolConfig) {
      this.poolConfig = { ...this.poolConfig, ...poolConfig };
    }
  }

  /**
   * 清理资源
   */
  async destroy(): Promise<void> {
    await this.close();
    this.eventListeners = {};
    this.statsCollector.resetStats();
  }
}

// 创建全局数据库连接池实例
let globalPool: DatabasePool | null = null;

export const createDatabasePool = (config: DatabaseConfig, poolConfig: PoolConfig): DatabasePool => {
  return new DatabasePool(config, poolConfig);
};

export const getDatabasePool = (): DatabasePool => {
  if (!globalPool) {
    throw new Error('数据库连接池未初始化');
  }
  return globalPool;
};

export const initializeDatabasePool = async (config: DatabaseConfig, poolConfig: PoolConfig): Promise<DatabasePool> => {
  if (globalPool) {
    await globalPool.destroy();
  }
  
  globalPool = createDatabasePool(config, poolConfig);
  await globalPool.initialize();
  
  return globalPool;
};

export default DatabasePool;
