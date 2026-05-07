/**
 * 系统信息采集服务 - 适配真实后端控制器
 */
import { message } from 'antd';
import request from '@/utils/request';

// 接口定义
export interface RealTimeSystemInfo {
  hostname: string;
  platform: string;
  architecture: string;
  processor: string;
  users: number;
  platform_version?: string;
  current_user?: string;
  boot_time?: number;
  boot_time_str?: string;
  timestamp?: number;
}

export interface RealTimeCpuInfo {
  usage: number;
  cores: number;
  frequency: number;
  load_average: number[];
  usage_per_core?: number[];
  timestamp?: number;
}

export interface RealTimeMemoryInfo {
  usage: number;
  used: number;
  available: number;
  total: number;
  free?: number;
  swap_used?: number;
  swap_total?: number;
  swap_percent?: number;
  timestamp?: number;
}

export interface RealTimeDiskInfo {
  usage: number;
  used: number;
  available: number;
  total: number;
  partitions: Array<{device: string; mountpoint: string; fstype: string; total: number; used: number; free: number; percent: number}>;
  read_bytes?: number;
  write_bytes?: number;
  timestamp?: number;
}

export interface RealTimeProcessInfo {
  total: number;
  running: number;
  sleeping: number;
  processes: Array<{
    pid: number;
    name: string;
    cpu: number;
    memory: number;
    status: string;
    user?: string;
  }>;
  timestamp?: number;
}

export interface SystemInfoConnection {
  id: string;
  name: string;
  host: string;
  type: string;
  platform: string;
  description?: string;
  createdTime?: string;
}

export interface SystemInfoConnectionStatus {
  connected: boolean;
  lastConnected?: string;
  responseTime?: number;
  errorMessage?: string;
  environmentOk?: boolean;
}

export interface SystemInfoQuery {
  id: string;
  name: string;
  infoType: string;
  description?: string;
  enabled: boolean;
  interval: number;
  lastRun?: string;
  resultCount?: number;
  createdTime?: string;
}

export interface SystemInfoQueryResult {
  id: number;
  queryId: string;
  timestamp: string;
  data: any[];
  recordCount: number;
  executionTime: number;
  error?: string;
}

export interface SystemInfoStatistics {
  totalConnections: number;
  totalDataSources: number;
  activeQueries: number;
  totalDataPoints: number;
  systemStatus: string;
  lastUpdate: string;
}

export interface SystemPerformanceMetrics {
  cpuPercent: number;
  memoryPercent: number;
  memoryUsed: number;
  memoryAvailable: number;
  activeConnections?: number;
  queryQueueLength?: number;
  totalDataPoints?: number;
  timestamp?: number;
}

export interface HealthCheckResult {
  status: string;
  message?: string;
  pythonEnvironment?: boolean | string;
  dataCollection?: string;
  timestamp?: number;
  version?: string;
  error?: string;
}

// 主服务类
class SystemInfoApiService {
  private baseUrl = '/api/system-info';
  private defaultTimeout = 8000;  // 从15秒降到8秒
  private realtimeTimeout = 5000; // 实时接口专用5秒超时

  // ==================== 数据转换方法 ====================
  
  private transformSystemInfo(data: any): RealTimeSystemInfo {
    // 提取实际的系统数据
    const systemData = data.data || data;
    
    const result: RealTimeSystemInfo = {
      hostname: systemData.hostname || 'localhost',
      platform: systemData.platform || 'Unknown',
      architecture: systemData.architecture || 'Unknown',
      processor: systemData.processor || 'Unknown',
      users: systemData.users || 1,
    };

    // 只设置存在的属性
    if (systemData.platform_version !== undefined) {
      result.platform_version = systemData.platform_version;
    }
    if (systemData.current_user !== undefined) {
      result.current_user = systemData.current_user;
    }
    if (systemData.boot_time !== undefined) {
      result.boot_time = systemData.boot_time;
    }
    if (systemData.boot_time_str !== undefined) {
      result.boot_time_str = systemData.boot_time_str;
    }
    if (systemData.timestamp !== undefined) {
      result.timestamp = systemData.timestamp;
    }

    return result;
  }

  private transformCpuInfo(data: any): RealTimeCpuInfo {
    const cpuData = data.data || data;
    
    // load_average 和 usage_per_core 可能是空格分隔的字符串
    const parseArray = (val: any): number[] => {
      if (Array.isArray(val)) return val.map(Number);
      if (typeof val === 'string') return val.trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
      return [];
    };

    const result: RealTimeCpuInfo = {
      usage: cpuData.usage || cpuData.cpu_percent || 0,
      cores: cpuData.cores || cpuData.physical_cores || 1,
      frequency: cpuData.frequency || cpuData.max_frequency || 0,
      load_average: parseArray(cpuData.load_average),
    };

    if (cpuData.timestamp !== undefined) {
      result.timestamp = cpuData.timestamp;
    }
    if (cpuData.usage_per_core !== undefined) {
      result.usage_per_core = parseArray(cpuData.usage_per_core);
    }

    return result;
  }

  private transformMemoryInfo(data: any): RealTimeMemoryInfo {
    const memoryData = data.data || data;
    
    const result: RealTimeMemoryInfo = {
      usage: memoryData.usage || memoryData.usage_percent || 0,
      used: memoryData.used || 0,
      available: memoryData.available || 0,
      total: memoryData.total || 0,
    };

    if (memoryData.free !== undefined) {
      result.free = memoryData.free;
    }
    if (memoryData.swap_used !== undefined) {
      result.swap_used = memoryData.swap_used;
    }
    if (memoryData.timestamp !== undefined) {
      result.timestamp = memoryData.timestamp;
    }

    return result;
  }

  private transformDiskInfo(data: any): RealTimeDiskInfo {
    const diskData = data.data || data;
    
    // partitions 可能是空格字符串或空格分隔的字符串
    const parsePartitions = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && val.trim()) {
        try { return JSON.parse(val); } catch { return []; }
      }
      return [];
    };

    const result: RealTimeDiskInfo = {
      usage: diskData.usage || diskData.usage_percent || 0,
      used: diskData.used || 0,
      available: diskData.available || 0,
      total: diskData.total || 0,
      partitions: parsePartitions(diskData.partitions),
    };

    if (diskData.read_bytes !== undefined) {
      result.read_bytes = diskData.read_bytes;
    }
    if (diskData.write_bytes !== undefined) {
      result.write_bytes = diskData.write_bytes;
    }
    if (diskData.timestamp !== undefined) {
      result.timestamp = diskData.timestamp;
    }

    return result;
  }

  private transformProcessInfo(data: any): RealTimeProcessInfo {
    const processData = data.data || data;
    
    // processes 可能是空格字符串
    const parseProcesses = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && val.trim()) {
        try { return JSON.parse(val); } catch { return []; }
      }
      return [];
    };

    const total = processData.total || processData.total_count || 0;
    const running = processData.running || 0;
    const sleeping = processData.sleeping || (total > running ? total - running : 0);

    const result: RealTimeProcessInfo = {
      total,
      running,
      sleeping,
      processes: parseProcesses(processData.processes),
    };

    if (processData.timestamp !== undefined) {
      result.timestamp = processData.timestamp;
    }

    return result;
  }

  // ==================== 连接管理接口 ====================

  // 创建连接
  async createConnection(connectionData: Partial<SystemInfoConnection>): Promise<SystemInfoConnection> {
    try {
      const result = await request.post(`${this.baseUrl}/connections`, connectionData, {
        timeout: this.defaultTimeout
      });

      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.message || '创建连接失败');
    } catch (error) {
      console.error('创建连接失败:', error);
      throw error;
    }
  }

  // 获取所有连接
  async getAllConnections(): Promise<SystemInfoConnection[]> {
    try {
      const result = await request.get(`${this.baseUrl}/connections`, {
        timeout: this.defaultTimeout
      });
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('获取连接列表失败:', error);
      return [];
    }
  }

  // 测试连接
  async testConnection(connectionId: string): Promise<SystemInfoConnectionStatus> {
    try {
      const result = await request.post(`${this.baseUrl}/connections/${connectionId}/test`, {}, {
        timeout: this.defaultTimeout
      });

      if (result.success && result.data) {
        return {
          connected: result.data.connected || false,
          lastConnected: new Date().toISOString(),
          responseTime: result.data.responseTime || 0,
          errorMessage: result.data.errorMessage,
          environmentOk: result.data.pythonEnvironment === 'available'
        };
      }
      throw new Error(result.message || '测试连接失败');
    } catch (error) {
      console.error('测试连接失败:', error);
      return {
        connected: false,
        errorMessage: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  // 删除连接
  async deleteConnection(connectionId: string): Promise<boolean> {
    try {
      const result = await request.delete(`${this.baseUrl}/connections/${connectionId}`, {
        timeout: this.defaultTimeout
      });
      return result.success || false;
    } catch (error) {
      console.error('删除连接失败:', error);
      return false;
    }
  }

  // ==================== 查询管理接口 ====================

  // 创建查询
  async createQuery(queryData: Partial<SystemInfoQuery>): Promise<SystemInfoQuery> {
    try {
      const result = await request.post(`${this.baseUrl}/queries`, queryData, {
        timeout: this.defaultTimeout
      });

      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.message || '创建查询失败');
    } catch (error) {
      console.error('创建查询失败:', error);
      throw error;
    }
  }

  // 获取所有查询
  async getAllQueries(): Promise<SystemInfoQuery[]> {
    try {
      const result = await request.get(`${this.baseUrl}/queries`, {
        timeout: this.defaultTimeout
      });
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    } catch (error) {
      console.error('获取查询列表失败:', error);
      return [];
    }
  }

  // 执行查询
  async executeQuery(queryId: string, connectionId: string): Promise<SystemInfoQueryResult> {
    try {
      const executionRequest = { connectionId };

      const result = await request.post(`${this.baseUrl}/queries/${queryId}/execute`, executionRequest, {
        timeout: this.defaultTimeout
      });

      if (result.success && result.data) {
        return {
          id: Date.now(),
          queryId: result.data.queryId || queryId,
          timestamp: result.data.timestamp || new Date().toISOString(),
          data: result.data.data || [],
          recordCount: result.data.recordCount || 0,
          executionTime: result.data.executionTime || 0,
          error: result.data.error
        };
      }
      throw new Error(result.message || '执行查询失败');
    } catch (error) {
      console.error('执行查询失败:', error);
      return {
        id: Date.now(),
        queryId,
        timestamp: new Date().toISOString(),
        data: [],
        recordCount: 0,
        executionTime: 0,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  // 删除查询
  async deleteQuery(queryId: string): Promise<boolean> {
    try {
      const result = await request.delete(`${this.baseUrl}/queries/${queryId}`, {
        timeout: this.defaultTimeout
      });
      return result.success || false;
    } catch (error) {
      console.error('删除查询失败:', error);
      return false;
    }
  }

  // ==================== 查询结果接口 ====================

  // 获取查询结果
  async getQueryResults(queryId?: string): Promise<SystemInfoQueryResult[]> {
    try {
      const url = queryId 
        ? `${this.baseUrl}/query-results?queryId=${queryId}`
        : `${this.baseUrl}/query-results`;

      const result = await request.get(url, {
        timeout: this.defaultTimeout
      });
      if (result.success && result.data) {
        return result.data.map((item: any, index: number) => ({
          id: index + 1,
          queryId: item.queryId || 'unknown',
          timestamp: item.timestamp || new Date().toISOString(),
          data: item.data || [],
          recordCount: item.recordCount || 0,
          executionTime: item.executionTime || 0,
          error: item.error
        }));
      }
      return [];
    } catch (error) {
      console.error('获取查询结果失败:', error);
      return [];
    }
  }

  // ==================== 统计信息接口 ====================

  // 获取统计信息
  async getStatistics(): Promise<SystemInfoStatistics> {
    try {
      const result = await request.get(`${this.baseUrl}/statistics`, {
        timeout: this.defaultTimeout
      });
      if (result.success && result.data) {
        return result.data;
      }
      
      // 如果后端没有返回，使用默认值
      return {
        totalConnections: 1,
        totalDataSources: 6,
        activeQueries: 0,
        totalDataPoints: 1000,
        systemStatus: 'normal',
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('获取统计信息失败:', error);
      return {
        totalConnections: 1,
        totalDataSources: 0,
        activeQueries: 0,
        totalDataPoints: 0,
        systemStatus: 'error',
        lastUpdate: new Date().toISOString()
      };
    }
  }

  // 获取性能指标
  async getPerformanceMetrics(): Promise<SystemPerformanceMetrics> {
    try {
      const result = await request.get(`${this.baseUrl}/performance-metrics`, {
        timeout: this.defaultTimeout
      });
      if (result.success && result.data) {
        return {
          cpuPercent: result.data.cpu_percent || result.data.cpuPercent || 0,
          memoryPercent: result.data.memory_percent || result.data.memoryPercent || 0,
          memoryUsed: result.data.memory_used || result.data.memoryUsed || 0,
          memoryAvailable: result.data.memory_available || result.data.memoryAvailable || 0,
          activeConnections: result.data.activeConnections || 1,
          queryQueueLength: result.data.queryQueueLength || 0,
          totalDataPoints: result.data.totalDataPoints || 0,
          timestamp: result.data.timestamp || Date.now()
        };
      }
      
      // 如果没有数据，返回默认值
      return {
        cpuPercent: 0,
        memoryPercent: 0,
        memoryUsed: 0,
        memoryAvailable: 0,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('获取性能指标失败:', error);
      return {
        cpuPercent: 0,
        memoryPercent: 0,
        memoryUsed: 0,
        memoryAvailable: 0,
        timestamp: Date.now()
      };
    }
  }

  // ==================== 信息类型管理接口 ====================

  // 获取支持的信息类型
  async getAvailableInfoTypes(): Promise<string[]> {
    try {
      const result = await request.get(`${this.baseUrl}/info-types`, {
        timeout: this.defaultTimeout
      });
      if (result.success && result.data) {
        return result.data;
      }
      // 如果后端没有，返回默认的信息类型
      return ['performance', 'cpu_info', 'memory_info', 'disk_info', 'process_info', 'system_basic', 'network'];
    } catch (error) {
      console.error('获取信息类型列表失败:', error);
      return ['performance', 'cpu_info', 'memory_info', 'disk_info', 'process_info'];
    }
  }

  // 获取信息类型属性
  async getInfoTypeProperties(infoType: string): Promise<string[]> {
    try {
      const result = await request.get(`${this.baseUrl}/info-types/${infoType}/properties`, {
        timeout: this.defaultTimeout
      });
      if (result.success && result.data) {
        return result.data;
      }
      // 默认属性列表
      return ['name', 'value', 'timestamp'];
    } catch (error) {
      console.error('获取信息类型属性失败:', error);
      return ['name', 'value', 'timestamp'];
    }
  }

  // ==================== 实时系统信息接口 ====================

  // 获取实时系统信息
  async getRealTimeSystemInfo(): Promise<RealTimeSystemInfo> {
    try {
      const result = await request.get(`${this.baseUrl}/real-time/system`, {
        timeout: this.realtimeTimeout
      });
      if (result.success) return this.transformSystemInfo(result.data || result);
      throw new Error(result.message);
    } catch (error) {
      return { hostname: 'localhost', platform: 'Unknown', architecture: 'Unknown', processor: 'Unknown', users: 1 };
    }
  }

  // 获取实时CPU信息
  async getRealTimeCpuInfo(): Promise<RealTimeCpuInfo> {
    try {
      const result = await request.get(`${this.baseUrl}/real-time/cpu`, {
        timeout: this.realtimeTimeout
      });
      if (result.success) return this.transformCpuInfo(result.data || result);
      throw new Error(result.message);
    } catch (error) {
      return { usage: 0, cores: 1, frequency: 0, load_average: [0, 0, 0] };
    }
  }

  // 获取实时内存信息
  async getRealTimeMemoryInfo(): Promise<RealTimeMemoryInfo> {
    try {
      const result = await request.get(`${this.baseUrl}/real-time/memory`, {
        timeout: this.realtimeTimeout
      });
      if (result.success) return this.transformMemoryInfo(result.data || result);
      throw new Error(result.message);
    } catch (error) {
      return { usage: 0, used: 0, available: 0, total: 0 };
    }
  }

  // 获取实时磁盘信息
  async getRealTimeDiskInfo(): Promise<RealTimeDiskInfo> {
    try {
      const result = await request.get(`${this.baseUrl}/real-time/disk`, {
        timeout: this.realtimeTimeout
      });
      if (result.success) return this.transformDiskInfo(result.data || result);
      throw new Error(result.message);
    } catch (error) {
      return { usage: 0, used: 0, available: 0, total: 0, partitions: [] };
    }
  }

  // 获取实时进程信息
  async getRealTimeProcessInfo(): Promise<RealTimeProcessInfo> {
    try {
      const result = await request.get(`${this.baseUrl}/real-time/processes`, {
        timeout: this.realtimeTimeout
      });
      if (result.success) return this.transformProcessInfo(result.data || result);
      throw new Error(result.message);
    } catch (error) {
      return { total: 0, running: 0, sleeping: 0, processes: [] };
    }
  }

  // ==================== 健康检查接口 ====================

  // 健康检查
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const data = await request.get(`${this.baseUrl}/health`, {
        timeout: this.defaultTimeout,
        validateStatus: (status) => status < 600 // Accept all status codes < 600
      });
      
      if (data.success && data.data) {
        return {
          status: data.data.status || 'unhealthy',
          message: data.data.message,
          pythonEnvironment: data.data.pythonEnvironment,
          dataCollection: data.data.dataCollection,
          timestamp: data.data.timestamp || Date.now(),
          version: data.data.version,
          error: data.data.error
        };
      }
      
      // Handle direct response format
      return {
        status: data.status || 'unhealthy',
        message: data.message,
        pythonEnvironment: data.pythonEnvironment,
        dataCollection: data.dataCollection,
        timestamp: data.timestamp || String(Date.now()),
        version: data.version,
        error: data.error
      };
    } catch (error) {
      console.error('健康检查失败:', error);
      return {
        status: 'unhealthy',
        message: '健康检查请求失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  // ==================== 增强实时接口 ====================

  // 获取实时性能数据
  async getRealTimePerformance(): Promise<any> {
    try {
      const result = await request.get(`${this.baseUrl}/real-time/performance`, {
        timeout: this.defaultTimeout
      });
      
      if (result.success) {
        return result.data || result;
      }
      throw new Error(result.message || '获取性能数据失败');
    } catch (error) {
      console.error('获取性能数据失败:', error);
      // 尝试从collect接口获取性能数据
      try {
        return await this.collectSpecificInfo('performance');
      } catch (e) {
        // 忽略fallback错误
      }
      return null;
    }
  }

  // 获取实时网络数据
  async getRealTimeNetwork(): Promise<any> {
    try {
      const result = await request.get(`${this.baseUrl}/real-time/network`, {
        timeout: this.defaultTimeout
      });
      
      if (result.success) {
        return result.data || result;
      }
      throw new Error(result.message || '获取网络数据失败');
    } catch (error) {
      console.error('获取网络数据失败:', error);
      return null;
    }
  }

  // 获取实时系统状态
  async getRealTimeStatus(): Promise<any> {
    try {
      const result = await request.get(`${this.baseUrl}/real-time/status`, {
        timeout: this.defaultTimeout
      });
      
      if (result.success) {
        return result.data || result;
      }
      throw new Error(result.message || '获取系统状态失败');
    } catch (error) {
      console.error('获取系统状态失败:', error);
      return null;
    }
  }

  // 获取批量实时数据
  async getBatchRealTimeData(): Promise<any> {
    try {
      const result = await request.get(`${this.baseUrl}/real-time/batch-data`, {
        timeout: 60000
      });
      
      if (result.success && result.data) {
        const raw = result.data;
        // 后端返回键名为 cpu_info/memory_info/disk_info/process_info/system_basic
        // 前端页面期望 cpu/memory/disk/processes/system，且每项数据在 .data 子字段中
        return {
          cpu:       raw.cpu_info      ? this.transformCpuInfo(raw.cpu_info)         : null,
          memory:    raw.memory_info   ? this.transformMemoryInfo(raw.memory_info)   : null,
          disk:      raw.disk_info     ? this.transformDiskInfo(raw.disk_info)       : null,
          processes: raw.process_info  ? this.transformProcessInfo(raw.process_info) : null,
          system:    raw.system_basic  ? this.transformSystemInfo(raw.system_basic)  : null,
        };
      }
      throw new Error(result.message || '获取批量数据失败');
    } catch (error) {
      console.error('获取批量数据失败:', error);
      return null;
    }
  }

  // 获取活跃连接数
  async getActiveConnections(): Promise<number> {
    try {
      const connections = await this.getAllConnections();
      return connections.length;
    } catch (error) {
      console.error('获取活跃连接数失败:', error);
      return 0;
    }
  }

  // 测试Python环境
  async testPythonEnvironment(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'healthy' && 
             (health.pythonEnvironment === 'available' || health.pythonEnvironment === true);
    } catch (error) {
      console.error('测试Python环境失败:', error);
      return false;
    }
  }

  // 收集特定信息
  async collectSpecificInfo(infoType: string): Promise<any> {
    try {
      // 修改：使用POST请求，因为后端接口是POST
      const result = await request.post(`${this.baseUrl}/collect?type=${infoType}`, {}, {
        timeout: this.defaultTimeout
      });
      
      if (result.success) {
        return result.data || result;
      }
      throw new Error(result.message || '收集信息失败');
    } catch (error) {
      console.error(`收集${infoType}信息失败:`, error);
      throw error;
    }
  }

  // ==================== 新增接口方法 ====================

  // 获取数据采集接口
  async collectSystemInfoData(hostname: string, ipAddress: string, dataType: string): Promise<any> {
    try {
      const result = await request.post(
        `${this.baseUrl}/collect?hostname=${hostname}&ipAddress=${ipAddress}&type=${dataType}`,
        {},
        {
          timeout: this.defaultTimeout
        }
      );
      
      if (result.success) {
        return result.data || result;
      }
      throw new Error(result.message || '采集数据失败');
    } catch (error) {
      console.error('采集系统信息数据失败:', error);
      throw error;
    }
  }

  // 获取数据分页接口
  async getSystemInfoDataPage(hostname?: string, page: number = 0, size: number = 10): Promise<any> {
    try {
      let url = `${this.baseUrl}/data/page?page=${page}&size=${size}`;
      if (hostname) {
        url += `&hostname=${hostname}`;
      }
      
      const result = await request.get(url, {
        timeout: this.defaultTimeout
      });
      if (result.success) {
        return result.data || result;
      }
      throw new Error(result.message || '获取数据分页失败');
    } catch (error) {
      console.error('获取系统信息数据分页失败:', error);
      throw error;
    }
  }

  // 获取支持的数据类型
  async getDataTypes(): Promise<Map<string, string>> {
    try {
      const infoTypes = await this.getAvailableInfoTypes();
      const typeMap = new Map<string, string>();
      
      infoTypes.forEach(type => {
        const displayName = this.getDataTypeDisplayName(type);
        typeMap.set(type, displayName);
      });
      
      return typeMap;
    } catch (error) {
      console.error('获取数据类型失败:', error);
      return new Map();
    }
  }

  // 辅助方法：获取数据类型显示名称
  private getDataTypeDisplayName(type: string): string {
    const typeMap: Record<string, string> = {
      'performance': '性能数据',
      'cpu_info': 'CPU信息',
      'memory_info': '内存信息',
      'disk_info': '磁盘信息',
      'process_info': '进程信息',
      'system_basic': '系统信息',
      'network': '网络信息'
    };
    
    return typeMap[type] || type;
  }

  // 获取采集间隔
  async getCollectionIntervals(): Promise<Map<string, number>> {
    try {
      const result = await request.get(`${this.baseUrl}/collection-intervals`, {
        timeout: this.defaultTimeout
      });
      if (result.success && result.data) {
        const intervalMap = new Map<string, number>();
        Object.entries(result.data).forEach(([key, value]) => {
          intervalMap.set(key, Number(value));
        });
        return intervalMap;
      }
      
      // 默认采集间隔
      const defaultIntervals = new Map<string, number>([
        ['performance', 2000],
        ['processes', 5000],
        ['system', 10000],
        ['disk', 15000],
        ['network', 3000]
      ]);
      
      return defaultIntervals;
    } catch (error) {
      console.error('获取采集间隔失败:', error);
      return new Map();
    }
  }

  // 获取所有数据
  async collectAllInfo(): Promise<any> {
    try {
      const result = await request.post(`${this.baseUrl}/collect/all`, {}, {
        timeout: this.defaultTimeout
      });
      
      if (result.success) {
        return result.data || result;
      }
      throw new Error(result.message || '采集所有信息失败');
    } catch (error) {
      console.error('采集所有信息失败:', error);
      throw error;
    }
  }
}

// 创建服务实例
export const systemInfoApiService = new SystemInfoApiService();

// 导出服务实例
export default systemInfoApiService;
