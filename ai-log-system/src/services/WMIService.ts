// services/WMIService.ts
/**
 * WMI服务连接和查询功能
 * 提供Windows Management Instrumentation的核心功能
 */

export interface WMIConnection {
  id: string;
  name: string;
  host: string;
  username: string;
  password: string;
  domain?: string;
  port?: number;
  timeout?: number;
}

export interface WMIQuery {
  id: string;
  name: string;
  namespace: string;
  query: string;
  description: string;
  enabled: boolean;
  interval: number;
  lastRun?: string;
  resultCount?: number;
}

export interface WMIQueryResult {
  id: number;
  queryId: string;
  timestamp: string;
  data: any[];
  recordCount: number;
  executionTime: number;
  error?: string;
}

export interface WMIConnectionStatus {
  connected: boolean;
  lastConnected?: string;
  responseTime?: number;
  errorMessage?: string;
}

export interface WmiStatistics {
  totalConnections: number;
  totalDataSources: number;
  activeQueries: number;
  totalDataPoints: number;
  systemStatus: 'normal' | 'warning' | 'error';
  lastUpdate: string;
}

export interface PerformanceMetrics {
  collectionRate: number;
  processingRate: number;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  totalDataPoints: number;
}

// API服务类 - 直接调用后端API
export class WmiApiService {
  private baseUrl = '/api/wmi';

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<WmiStatistics> {
    try {
      const response = await fetch(`${this.baseUrl}/statistics`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取性能指标
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/performance-metrics`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('获取性能指标失败:', error);
      throw error;
    }
  }

  /**
   * 测试连接
   */
  async testConnection(connectionId: string): Promise<WMIConnectionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/connections/${connectionId}/test`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('测试连接失败:', error);
      throw error;
    }
  }

  /**
   * 执行查询
   */
  async executeQuery(queryId: string, connectionId: string): Promise<WMIQueryResult> {
    try {
      const response = await fetch(`${this.baseUrl}/queries/${queryId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('执行查询失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有连接
   */
  async getAllConnections(): Promise<WMIConnection[]> {
    try {
      const response = await fetch(`${this.baseUrl}/connections`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('获取连接列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有查询
   */
  async getAllQueries(): Promise<WMIQuery[]> {
    try {
      const response = await fetch(`${this.baseUrl}/queries`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('获取查询列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取查询结果
   */
  async getQueryResults(queryId?: string): Promise<WMIQueryResult[]> {
    try {
      const url = queryId 
        ? `${this.baseUrl}/query-results?queryId=${queryId}`
        : `${this.baseUrl}/query-results`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('获取查询结果失败:', error);
      throw error;
    }
  }

  /**
   * 添加连接
   */
  async addConnection(connection: WMIConnection): Promise<WMIConnection> {
    try {
      const response = await fetch(`${this.baseUrl}/connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connection)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('添加连接失败:', error);
      throw error;
    }
  }

  /**
   * 添加查询
   */
  async addQuery(query: WMIQuery): Promise<WMIQuery> {
    try {
      const response = await fetch(`${this.baseUrl}/queries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('添加查询失败:', error);
      throw error;
    }
  }

  /**
   * 更新查询
   */
  async updateQuery(queryId: string, updates: Partial<WMIQuery>): Promise<WMIQuery> {
    try {
      const response = await fetch(`${this.baseUrl}/queries/${queryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('更新查询失败:', error);
      throw error;
    }
  }

  /**
   * 删除连接
   */
  async deleteConnection(connectionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/connections/${connectionId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.status === 204;
    } catch (error) {
      console.error('删除连接失败:', error);
      throw error;
    }
  }

  /**
   * 删除查询
   */
  async deleteQuery(queryId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/queries/${queryId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.status === 204;
    } catch (error) {
      console.error('删除查询失败:', error);
      throw error;
    }
  }

  /**
   * 批量执行查询
   */
  async executeBatchQueries(connectionId: string): Promise<WMIQueryResult[]> {
    try {
      const queries = await this.getAllQueries();
      const activeQueries = queries.filter(q => q.enabled);
      const results: WMIQueryResult[] = [];
      
      for (const query of activeQueries) {
        try {
          const result = await this.executeQuery(query.id, connectionId);
          results.push(result);
        } catch (error) {
          console.error(`查询 ${query.name} 执行失败:`, error);
          // 创建错误结果
          const errorResult: WMIQueryResult = {
            id: Date.now(),
            queryId: query.id,
            timestamp: new Date().toISOString(),
            data: [],
            recordCount: 0,
            executionTime: 0,
            error: error instanceof Error ? error.message : '查询执行失败'
          };
          results.push(errorResult);
        }
      }
      
      return results;
    } catch (error) {
      console.error('批量执行查询失败:', error);
      throw error;
    }
  }

  /**
   * 获取系统性能指标
   */
  async getSystemPerformanceMetrics(connectionId: string): Promise<any> {
    try {
      // 通过连接获取性能指标
      const connection = (await this.getAllConnections()).find(c => c.id === connectionId);
      if (!connection) {
        throw new Error('连接不存在');
      }
      
      // 调用性能指标接口
      return await this.getPerformanceMetrics();
    } catch (error) {
      console.error('获取系统性能指标失败:', error);
      throw error;
    }
  }

  /**
   * 获取连接状态
   */
  async getConnectionStatus(connectionId: string): Promise<WMIConnectionStatus | undefined> {
    try {
      // 通过测试连接来获取状态
      return await this.testConnection(connectionId);
    } catch (error) {
      console.error('获取连接状态失败:', error);
      return {
        connected: false,
        errorMessage: error instanceof Error ? error.message : '获取状态失败'
      };
    }
  }

  /**
   * 获取可用WMI类
   */
  async getAvailableWmiClasses(connectionId: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/wmi-classes?connectionId=${connectionId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('获取WMI类列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取WMI类属性
   */
  async getWmiClassProperties(connectionId: string, wmiClass: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/wmi-classes/${wmiClass}/properties?connectionId=${connectionId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('获取WMI类属性失败:', error);
      throw error;
    }
  }

  /**
   * 清理数据
   */
  async cleanup(): Promise<void> {
    try {
      // 这里可以调用后端的清理接口（如果后端提供了的话）
      console.log('清理数据操作');
    } catch (error) {
      console.error('清理数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取服务统计
   */
  async getServiceStats(): Promise<any> {
    try {
      const statistics = await this.getStatistics();
      const connections = await this.getAllConnections();
      const queries = await this.getAllQueries();
      
      return {
        totalConnections: connections.length,
        activeConnections: (await Promise.all(
          connections.map(async conn => {
            const status = await this.getConnectionStatus(conn.id);
            return status?.connected || false;
          })
        )).filter(Boolean).length,
        totalQueries: queries.length,
        activeQueries: queries.filter(q => q.enabled).length,
        totalResults: (await this.getQueryResults()).length,
        lastCleanup: new Date().toISOString()
      };
    } catch (error) {
      console.error('获取服务统计失败:', error);
      throw error;
    }
  }
}

// 创建全局API服务实例
export const wmiApiService = new WmiApiService();

// 兼容性包装器 - 保持原有接口
export class WMIService {
  private apiService = new WmiApiService();

  // 保持原有方法，但内部调用新的API服务
  async addConnection(connection: WMIConnection): Promise<boolean> {
    try {
      await this.apiService.addConnection(connection);
      return true;
    } catch (error) {
      console.error('添加WMI连接失败:', error);
      return false;
    }
  }

  async testConnection(connectionId: string): Promise<WMIConnectionStatus> {
    return this.apiService.testConnection(connectionId);
  }

  async executeQuery(queryId: string, connectionId: string): Promise<WMIQueryResult> {
    return this.apiService.executeQuery(queryId, connectionId);
  }

  getAllConnections(): Promise<WMIConnection[]> {
    return this.apiService.getAllConnections();
  }

  getAllQueries(): Promise<WMIQuery[]> {
    return this.apiService.getAllQueries();
  }

  getQueryResults(queryId?: string): Promise<WMIQueryResult[]> {
    return this.apiService.getQueryResults(queryId);
  }

  addQuery(query: WMIQuery): void {
    this.apiService.addQuery(query);
  }

  updateQuery(queryId: string, updates: Partial<WMIQuery>): Promise<boolean> {
    return this.apiService.updateQuery(queryId, updates).then(() => true).catch(() => false);
  }

  deleteQuery(queryId: string): Promise<boolean> {
    return this.apiService.deleteQuery(queryId);
  }

  deleteConnection(connectionId: string): Promise<boolean> {
    return this.apiService.deleteConnection(connectionId);
  }

  async executeBatchQueries(connectionId: string): Promise<WMIQueryResult[]> {
    return this.apiService.executeBatchQueries(connectionId);
  }

  async getSystemPerformanceMetrics(connectionId: string): Promise<any> {
    return this.apiService.getSystemPerformanceMetrics(connectionId);
  }

  async getConnectionStatus(connectionId: string): Promise<WMIConnectionStatus | undefined> {
    return this.apiService.getConnectionStatus(connectionId);
  }

  cleanup(): void {
    this.apiService.cleanup();
  }

  getServiceStats(): Promise<any> {
    return this.apiService.getServiceStats();
  }

  getStatistics(): Promise<WmiStatistics> {
    return this.apiService.getStatistics();
  }

  getPerformanceMetrics(): Promise<PerformanceMetrics> {
    return this.apiService.getPerformanceMetrics();
  }
}

// 导出兼容性实例
export const wmiService = new WMIService();