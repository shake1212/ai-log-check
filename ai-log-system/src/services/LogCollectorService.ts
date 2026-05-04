/**
 * 日志采集服务
 * 提供日志采集相关的API接口
 */

import request from '@/utils/request';

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

class LogCollectorService {
  private baseUrl = '/api/log-collector';
  private timeout = 10000; // 10秒超时

  // 获取采集器配置
  async getConfigs(): Promise<LogCollectorConfig[]> {
    return request.get(`${this.baseUrl}/configs`, { timeout: this.timeout });
  }

  // 获取采集器状态
  async getStatus(): Promise<LogCollectorStatus[]> {
    return request.get(`${this.baseUrl}/status`, { timeout: this.timeout });
  }

  // 启动采集器
  async startCollector(collectorId: string): Promise<boolean> {
    await request.post(`${this.baseUrl}/start/${collectorId}`, {}, { timeout: this.timeout });
    return true;
  }

  // 停止采集器
  async stopCollector(collectorId: string): Promise<boolean> {
    await request.post(`${this.baseUrl}/stop/${collectorId}`, {}, { timeout: this.timeout });
    return true;
  }

  // 获取告警信息
  async getAlerts(): Promise<AlertInfo[]> {
    return request.get(`${this.baseUrl}/alerts`, { timeout: this.timeout });
  }

  // 确认告警
  async acknowledgeAlert(alertId: string): Promise<boolean> {
    await request.post(`${this.baseUrl}/alerts/${alertId}/acknowledge`, {}, { timeout: this.timeout });
    return true;
  }

  // 解决告警
  async resolveAlert(alertId: string): Promise<boolean> {
    await request.post(`${this.baseUrl}/alerts/${alertId}/resolve`, {}, { timeout: this.timeout });
    return true;
  }

  // 更新配置
  async updateConfig(config: LogCollectorConfig): Promise<boolean> {
    await request.put(`${this.baseUrl}/configs/${config.id}`, config, { timeout: this.timeout });
    return true;
  }

  // 测试采集器连接
  async testConnection(): Promise<{ connected: boolean; message: string }> {
    return request.get(`${this.baseUrl}/test`, { timeout: this.timeout });
  }
}

export const logCollectorService = new LogCollectorService();
