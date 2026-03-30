/**
 * 日志采集服务
 * 提供日志采集相关的API接口
 */

export interface LogCollectorConfig {
  id: string;
  name: string;
  enabled: boolean;
  interval: number; // 采集间隔（秒）
  dataSources: string[]; // 数据源类型
  alertThresholds: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    errorRate: number;
  };
  retentionDays: number;
  enableRuleEngine?: boolean; // 是否启用规则引擎分析
  ruleEngineTimeout?: number; // 规则引擎超时时间（秒）
  lastRun?: string;
  nextRun?: string;
}

export interface LogCollectorStatus {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  lastRunTime?: string;
  nextRunTime?: string;
  totalRuns: number;
  successRuns: number;
  errorRuns: number;
  lastError?: string;
}

export interface SystemMetrics {
  timestamp: string;
  cpuUsage: number | null;
  memoryUsage: number | null;
  memoryUsed: number | null;
  memoryTotal: number | null;
  diskUsage: number | null;
  diskUsed: number | null;
  diskTotal: number | null;
  networkIn: number | null;
  networkOut: number | null;
  processCount: number | null;
  topProcesses: ProcessInfo[];
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  status: string;
  user?: string;
}

export interface AlertInfo {
  id: string;
  timestamp: string;
  type: 'warning' | 'critical' | 'info';
  category: 'cpu' | 'memory' | 'disk' | 'network' | 'collector';
  title: string;
  message: string;
  value: number;
  threshold: number;
  acknowledged: boolean;
  resolved: boolean;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  startTime: string;
  endTime: string;
  metrics: string[]; // 要导出的指标
}

class LogCollectorService {
  private baseUrl = '/api/log-collector';

  // 获取采集器配置
  async getConfigs(): Promise<LogCollectorConfig[]> {
    try {
      const response = await fetch(`${this.baseUrl}/configs`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get configs:', error);
      
      // ============ 临时模拟数据（后端不可用时的降级方案）- 开始 ============
      // TODO: 当后端API /api/log-collector/configs 可用时，移除此降级数据
      return [
        {
          id: 'default',
          name: '默认采集器',
          enabled: true,
          interval: 300,
          // 统一的数据源：包含Windows事件日志和系统性能指标
          dataSources: [
            'security',     // 安全日志
            'system',       // 系统日志
            'application',  // 应用日志
            'cpu',          // CPU信息
            'memory',       // 内存信息
            'disk',         // 磁盘信息
            'network',      // 网络信息
            'process'       // 进程信息
          ],
          alertThresholds: {
            cpuUsage: 80,
            memoryUsage: 90,
            diskUsage: 85,
            errorRate: 5
          },
          retentionDays: 7,
          enableRuleEngine: true,  // 默认启用规则引擎
          ruleEngineTimeout: 10,   // 默认超时10秒
          lastRun: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          nextRun: new Date(Date.now() + 295 * 1000).toISOString()
        }
      ];
      // ============ 临时模拟数据 - 结束 ============
    }
  }

  // 获取采集器状态
  async getStatus(): Promise<LogCollectorStatus[]> {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get status:', error);
      
      // ============ 临时模拟数据（后端不可用时的降级方案）- 开始 ============
      // TODO: 当后端API /api/log-collector/status 可用时，移除此降级数据
      return [
        {
          id: 'default',
          name: '默认采集器',
          status: 'running',
          lastRunTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          nextRunTime: new Date(Date.now() + 295 * 1000).toISOString(),
          totalRuns: 100,
          successRuns: 95,
          errorRuns: 5,
          lastError: '网络连接超时'
        }
      ];
      // ============ 临时模拟数据 - 结束 ============
    }
  }

  // 启动采集器
  async startCollector(collectorId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/start/${collectorId}`, {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to start collector:', error);
      return false;
    }
  }

  // 停止采集器
  async stopCollector(collectorId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/stop/${collectorId}`, {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to stop collector:', error);
      return false;
    }
  }

  // 获取实时指标
  async getRealtimeMetrics(): Promise<SystemMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/metrics/realtime`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get realtime metrics:', error);
      // 返回空数据结构，不再使用模拟数据
      return {
        timestamp: new Date().toISOString(),
        cpuUsage: 0,
        memoryUsage: 0,
        memoryUsed: 0,
        memoryTotal: 0,
        diskUsage: 0,
        diskUsed: 0,
        diskTotal: 0,
        networkIn: 0,
        networkOut: 0,
        processCount: 0,
        topProcesses: []
      };
    }
  }

  // 获取历史指标
  async getHistoricalMetrics(startTime: string, endTime: string): Promise<SystemMetrics[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/metrics/historical?start=${startTime}&end=${endTime}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get historical metrics:', error);
      // 返回空数组，不再使用模拟数据
      return [];
    }
  }

  // 获取告警信息
  async getAlerts(): Promise<AlertInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/alerts`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get alerts:', error);
      
      // ============ 临时模拟数据（后端不可用时的降级方案）- 开始 ============
      // TODO: 当后端API /api/log-collector/alerts 可用时，移除此降级数据
      return [
        {
          id: 'alert1',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          type: 'warning',
          category: 'cpu',
          title: 'CPU使用率过高',
          message: 'CPU使用率达到85%，超过阈值80%',
          value: 85,
          threshold: 80,
          acknowledged: false,
          resolved: false
        },
        {
          id: 'alert2',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          type: 'critical',
          category: 'memory',
          title: '内存使用率过高',
          message: '内存使用率达到95%，超过阈值90%',
          value: 95,
          threshold: 90,
          acknowledged: true,
          resolved: false
        }
      ];
      // ============ 临时模拟数据 - 结束 ============
    }
  }

  // 确认告警
  async acknowledgeAlert(alertId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      return false;
    }
  }

  // 解决告警
  async resolveAlert(alertId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/alerts/${alertId}/resolve`, {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      return false;
    }
  }

  // 导出数据
  async exportData(options: ExportOptions): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  // 更新配置
  async updateConfig(config: LogCollectorConfig): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/configs/${config.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to update config:', error);
      return false;
    }
  }

  // 测试采集器连接
  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/test`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to test connection:', error);
      return { connected: false, message: '连接测试失败' };
    }
  }
}

export const logCollectorService = new LogCollectorService();