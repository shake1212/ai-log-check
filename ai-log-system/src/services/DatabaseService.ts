/**
 * 数据库服务管理器
 * 提供统一的数据库操作接口
 */

import { DatabasePool, Connection, QueryResult, Transaction } from './DatabasePool';
import { DatabaseConfig, PoolConfig, getConfig } from '../config/database';
import MigrationManager from '../database/migrations';

export interface DatabaseServiceConfig {
  autoMigrate: boolean;
  healthCheckInterval: number;
  reconnectOnError: boolean;
  maxReconnectAttempts: number;
  queryTimeout: number;
}

export interface DatabaseStatus {
  connected: boolean;
  version: string;
  uptime: number;
  totalQueries: number;
  activeConnections: number;
  lastHealthCheck: string;
  errorCount: number;
}

export class DatabaseService {
  private pool: DatabasePool;
  private migrationManager: MigrationManager;
  private config: DatabaseServiceConfig;
  private status: DatabaseStatus;
  private startTime: number;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<DatabaseServiceConfig>) {
    this.config = {
      autoMigrate: true,
      healthCheckInterval: 30000, // 30秒
      reconnectOnError: true,
      maxReconnectAttempts: 3,
      queryTimeout: 30000,
      ...config
    };

    this.startTime = Date.now();
    this.status = {
      connected: false,
      version: '0.0.0',
      uptime: 0,
      totalQueries: 0,
      activeConnections: 0,
      lastHealthCheck: new Date().toISOString(),
      errorCount: 0
    };

    // 初始化数据库连接池
    const dbConfig = getConfig();
    this.pool = new DatabasePool(dbConfig.database, dbConfig.pool);
    this.migrationManager = new MigrationManager(this.pool);
  }

  /**
   * 初始化数据库服务
   */
  async initialize(): Promise<void> {
    try {
      console.log('初始化数据库服务...');

      // 初始化连接池
      await this.pool.initialize();

      // 初始化迁移管理器
      await this.migrationManager.initialize();

      // 执行自动迁移
      if (this.config.autoMigrate) {
        await this.migrationManager.migrate();
      }

      // 更新状态
      this.status.connected = true;
      this.status.version = this.migrationManager.getCurrentVersion();

      // 启动健康检查
      this.startHealthCheck();

      console.log(`数据库服务初始化完成，版本: ${this.status.version}`);
    } catch (error) {
      console.error('数据库服务初始化失败:', error);
      this.status.errorCount++;
      throw error;
    }
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      try {
        const healthResult = await this.pool.healthCheck();
        this.status.lastHealthCheck = new Date().toISOString();
        
        if (!healthResult.healthy) {
          console.warn('数据库健康检查失败:', healthResult.message);
          this.status.errorCount++;
          
          if (this.config.reconnectOnError) {
            await this.reconnect();
          }
        }
      } catch (error) {
        console.error('健康检查异常:', error);
        this.status.errorCount++;
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * 重新连接数据库
   */
  private async reconnect(): Promise<void> {
    try {
      console.log('尝试重新连接数据库...');
      await this.pool.reconnect();
      this.status.connected = true;
      this.status.errorCount = 0;
      console.log('数据库重连成功');
    } catch (error) {
      console.error('数据库重连失败:', error);
      this.status.connected = false;
      this.status.errorCount++;
    }
  }

  /**
   * 执行查询
   */
  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    try {
      const result = await this.pool.query<T>(sql, params);
      this.status.totalQueries++;
      return result;
    } catch (error) {
      this.status.errorCount++;
      console.error('数据库查询失败:', error);
      throw error;
    }
  }

  /**
   * 获取连接
   */
  async getConnection(): Promise<Connection> {
    try {
      const connection = await this.pool.getConnection();
      this.status.activeConnections++;
      return connection;
    } catch (error) {
      this.status.errorCount++;
      throw error;
    }
  }

  /**
   * 执行事务
   */
  async transaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T> {
    try {
      const result = await this.pool.transaction(callback);
      this.status.totalQueries++;
      return result;
    } catch (error) {
      this.status.errorCount++;
      console.error('数据库事务失败:', error);
      throw error;
    }
  }

  /**
   * 批量执行查询
   */
  async batchQuery(queries: Array<{ sql: string; params?: any[] }>): Promise<QueryResult[]> {
    try {
      const results = await this.pool.batchQuery(queries);
      this.status.totalQueries += queries.length;
      return results;
    } catch (error) {
      this.status.errorCount++;
      console.error('批量查询失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据库状态
   */
  getStatus(): DatabaseStatus {
    this.status.uptime = Date.now() - this.startTime;
    return { ...this.status };
  }

  /**
   * 获取连接池统计信息
   */
  getPoolStats() {
    return this.pool.getStats();
  }

  /**
   * 获取迁移状态
   */
  async getMigrationStatus() {
    return await this.migrationManager.getStatus();
  }

  /**
   * 执行迁移
   */
  async migrate(version?: string): Promise<void> {
    try {
      if (version) {
        await this.migrationManager.migrateTo(version);
      } else {
        await this.migrationManager.migrate();
      }
      
      this.status.version = this.migrationManager.getCurrentVersion();
      console.log(`数据库迁移完成，当前版本: ${this.status.version}`);
    } catch (error) {
      console.error('数据库迁移失败:', error);
      throw error;
    }
  }

  /**
   * 回滚迁移
   */
  async rollback(version: string): Promise<void> {
    try {
      await this.migrationManager.rollbackTo(version);
      this.status.version = this.migrationManager.getCurrentVersion();
      console.log(`数据库回滚完成，当前版本: ${this.status.version}`);
    } catch (error) {
      console.error('数据库回滚失败:', error);
      throw error;
    }
  }

  /**
   * 验证数据库完整性
   */
  async validate(): Promise<boolean> {
    try {
      const isValid = await this.migrationManager.validate();
      if (!isValid) {
        console.warn('数据库完整性验证失败');
      }
      return isValid;
    } catch (error) {
      console.error('数据库验证失败:', error);
      return false;
    }
  }

  /**
   * 重置数据库
   */
  async reset(): Promise<void> {
    try {
      await this.migrationManager.reset();
      this.status.version = '0.0.0';
      console.log('数据库重置完成');
    } catch (error) {
      console.error('数据库重置失败:', error);
      throw error;
    }
  }

  /**
   * 关闭数据库服务
   */
  async close(): Promise<void> {
    try {
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = null;
      }

      await this.pool.close();
      this.status.connected = false;
      console.log('数据库服务已关闭');
    } catch (error) {
      console.error('关闭数据库服务失败:', error);
      throw error;
    }
  }

  /**
   * 检查数据库连接
   */
  async isHealthy(): Promise<boolean> {
    try {
      const healthResult = await this.pool.healthCheck();
      return healthResult.healthy;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取数据库配置
   */
  getConfig() {
    return this.pool.getConfig();
  }

  /**
   * 更新数据库配置
   */
  updateConfig(databaseConfig?: Partial<DatabaseConfig>, poolConfig?: Partial<PoolConfig>): void {
    this.pool.updateConfig(databaseConfig, poolConfig);
  }
}

// 创建全局数据库服务实例
let globalDatabaseService: DatabaseService | null = null;

export const createDatabaseService = (config?: Partial<DatabaseServiceConfig>): DatabaseService => {
  return new DatabaseService(config);
};

export const getDatabaseService = (): DatabaseService => {
  if (!globalDatabaseService) {
    throw new Error('数据库服务未初始化');
  }
  return globalDatabaseService;
};

export const initializeDatabaseService = async (config?: Partial<DatabaseServiceConfig>): Promise<DatabaseService> => {
  if (globalDatabaseService) {
    await globalDatabaseService.close();
  }
  
  globalDatabaseService = createDatabaseService(config);
  await globalDatabaseService.initialize();
  
  return globalDatabaseService;
};

export default DatabaseService;
