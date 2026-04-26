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

  /** 获取认证头 */
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /** 带超时的 fetch 请求 */
  private async fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(id);
    }
  }

  /** 通用请求封装，非 2xx 时抛出异常 */
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const headers = this.getAuthHeaders();
    const response = await this.fetchWithTimeout(url, {
      ...options,
      headers: { ...headers, ...(options?.headers as Record<string, string> || {}) },
    });
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('未授权，请重新登录');
    }
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`请求失败 (${response.status}): ${text || response.statusText}`);
    }
    return response.json();
  }

  // 获取采集器配置
  async getConfigs(): Promise<LogCollectorConfig[]> {
    return this.request<LogCollectorConfig[]>(`${this.baseUrl}/configs`);
  }

  // 获取采集器状态
  async getStatus(): Promise<LogCollectorStatus[]> {
    return this.request<LogCollectorStatus[]>(`${this.baseUrl}/status`);
  }

  // 启动采集器
  async startCollector(collectorId: string): Promise<boolean> {
    await this.request(`${this.baseUrl}/start/${collectorId}`, { method: 'POST' });
    return true;
  }

  // 停止采集器
  async stopCollector(collectorId: string): Promise<boolean> {
    await this.request(`${this.baseUrl}/stop/${collectorId}`, { method: 'POST' });
    return true;
  }

  // 获取告警信息
  async getAlerts(): Promise<AlertInfo[]> {
    return this.request<AlertInfo[]>(`${this.baseUrl}/alerts`);
  }

  // 确认告警
  async acknowledgeAlert(alertId: string): Promise<boolean> {
    await this.request(`${this.baseUrl}/alerts/${alertId}/acknowledge`, { method: 'POST' });
    return true;
  }

  // 解决告警
  async resolveAlert(alertId: string): Promise<boolean> {
    await this.request(`${this.baseUrl}/alerts/${alertId}/resolve`, { method: 'POST' });
    return true;
  }

  // 更新配置
  async updateConfig(config: LogCollectorConfig): Promise<boolean> {
    await this.request(`${this.baseUrl}/configs/${config.id}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
    return true;
  }

  // 测试采集器连接
  async testConnection(): Promise<{ connected: boolean; message: string }> {
    return this.request<{ connected: boolean; message: string }>(`${this.baseUrl}/test`);
  }
}

export const logCollectorService = new LogCollectorService();
