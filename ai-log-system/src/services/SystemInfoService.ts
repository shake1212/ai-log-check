// services/SystemInfoService.ts
/**
 * 系统信息采集服务
 * 提供跨平台系统信息采集功能，支持Windows、Linux、macOS
 */
import { message } from 'antd';

// 基础响应类型
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

// 系统信息连接
export interface SystemInfoConnection {
  id: string;
  name: string;
  host: string;
  type: 'local' | 'remote_ssh' | 'remote_agent';
  platform: string;
  description?: string;
  createdTime?: string;
}

// 连接状态
export interface SystemInfoConnectionStatus {
  connected: boolean;
  lastConnected?: string;
  responseTime?: number;
  errorMessage?: string;
  environmentOk?: boolean;
}

// 系统信息查询
export interface SystemInfoQuery {
  id: string;
  name: string;
  infoType: string;
  description?: string;
  enabled: boolean;
  interval: number;
  lastRun?: string;
  resultCount?: number;
}

// 查询执行请求
export interface QueryExecutionRequest {
  connectionId: string;
  parameters?: Record<string, any>;
}

// 查询结果
export interface SystemInfoQueryResult {
  id: number;
  queryId: string;
  timestamp: string;
  data: any[];
  recordCount: number;
  executionTime: number;
  error?: string;
}

// 统计信息
export interface SystemInfoStatistics {
  totalConnections: number;
  totalDataSources: number;
  activeQueries: number;
  totalDataPoints: number;
  systemStatus: 'normal' | 'warning' | 'error';
  lastUpdate: string;
}

// 性能指标 - 与Python脚本数据结构一致
export interface SystemPerformanceMetrics {
  cpuPercent?: number;
  memoryPercent?: number;
  memoryUsed?: number;
  memoryAvailable?: number;
  activeConnections?: number;
  queryQueueLength?: number;
  totalDataPoints?: number;
  timestamp?: number;
}

// 健康检查结果
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  message?: string;
  pythonEnvironment?: boolean;
  dataCollection?: boolean;
  timestamp?: number;
  version?: string;
  error?: string;
}

// 实时系统信息 - 修复类型定义
export interface RealTimeSystemInfo {
  hostname: string;
  platform: string;
  platform_version?: string;
  architecture: string;
  processor: string;
  memoryTotal?: number;
  memoryAvailable?: number;
  users: number;
  current_user?: string;
  boot_time?: number;
  boot_time_str?: string;
  timestamp?: number;
}

// 实时CPU信息 - 修复类型定义
export interface RealTimeCpuInfo {
  usage: number;
  cores: number;
  physical_cores?: number;
  frequency: number;
  max_frequency?: number;
  user_time?: number;
  system_time?: number;
  idle_time?: number;
  usage_per_core?: number[];
  load_average: number[];
  temperature?: number;
  timestamp?: number;
}

// 实时内存信息 - 修复类型定义
export interface RealTimeMemoryInfo {
  usage: number;
  used: number;
  available: number;
  total: number;
  free?: number;
  swap_used?: number;
  swap_total?: number;
  swap_free?: number;
  swap_percent?: number;
  timestamp?: number;
}

// 实时磁盘信息 - 修复类型定义
export interface RealTimeDiskInfo {
  usage: number;
  used: number;
  available: number;
  total: number;
  read_bytes?: number;
  write_bytes?: number;
  read_count?: number;
  write_count?: number;
  partitions?: Array<{
    device: string;
    mountpoint: string;
    total: number;
    used: number;
    free: number;
    percent: number;
  }>;
  timestamp?: number;
}

// 进程信息 - 修复类型定义
export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: string;
  memory_rss?: number;
  user?: string;
}

export interface RealTimeProcessInfo {
  total: number;
  running: number;
  sleeping: number;
  processes: ProcessInfo[];
  timestamp?: number;
}

class SystemInfoApiService {
  // 修复：根据控制层的 @RequestMapping("/system-info") 修改基础URL
  private baseUrl = '/api/system-info';

  // ==================== 数据转换方法 ====================

  // 转换系统信息数据 - 修复嵌套数据结构
  private transformSystemInfo(data: any): RealTimeSystemInfo {
    console.log('原始系统数据:', data); // 调试日志
    
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

  // 转换CPU信息数据 - 修复嵌套数据结构
  private transformCpuInfo(data: any): RealTimeCpuInfo {
    console.log('原始CPU数据:', data); // 调试日志
    
    // 提取实际的CPU数据
    const cpuData = data.data || data;
    
    const result: RealTimeCpuInfo = {
      usage: cpuData.usage || cpuData.cpu_percent || 0,
      cores: cpuData.cores || 1,
      frequency: cpuData.frequency || 0,
      load_average: cpuData.load_average || [0, 0, 0],
    };

    // 只设置存在的属性
    if (cpuData.physical_cores !== undefined) result.physical_cores = cpuData.physical_cores;
    if (cpuData.max_frequency !== undefined) result.max_frequency = cpuData.max_frequency;
    if (cpuData.user_time !== undefined) result.user_time = cpuData.user_time;
    if (cpuData.system_time !== undefined) result.system_time = cpuData.system_time;
    if (cpuData.idle_time !== undefined) result.idle_time = cpuData.idle_time;
    if (cpuData.usage_per_core !== undefined) result.usage_per_core = cpuData.usage_per_core;
    if (cpuData.temperature !== undefined) result.temperature = cpuData.temperature;
    if (cpuData.timestamp !== undefined) result.timestamp = cpuData.timestamp;

    return result;
  }

  // 转换内存信息数据 - 修复嵌套数据结构
  private transformMemoryInfo(data: any): RealTimeMemoryInfo {
    console.log('原始内存数据:', data); // 调试日志
    
    // 提取实际的内存数据
    const memoryData = data.data || data;
    
    const result: RealTimeMemoryInfo = {
      usage: memoryData.usage || memoryData.memory_percent || 0,
      used: memoryData.used || memoryData.memory_used || 0,
      available: memoryData.available || memoryData.memory_available || 0,
      total: memoryData.total || 0,
    };

    // 只设置存在的属性
    if (memoryData.free !== undefined) result.free = memoryData.free;
    if (memoryData.swap_used !== undefined) result.swap_used = memoryData.swap_used;
    if (memoryData.swap_total !== undefined) result.swap_total = memoryData.swap_total;
    if (memoryData.swap_free !== undefined) result.swap_free = memoryData.swap_free;
    if (memoryData.swap_percent !== undefined) result.swap_percent = memoryData.swap_percent;
    if (memoryData.timestamp !== undefined) result.timestamp = memoryData.timestamp;

    return result;
  }

  // 转换磁盘信息数据 - 修复嵌套数据结构
  private transformDiskInfo(data: any): RealTimeDiskInfo {
    console.log('原始磁盘数据:', data); // 调试日志
    
    // 提取实际的磁盘数据
    const diskData = data.data || data;
    
    const result: RealTimeDiskInfo = {
      usage: diskData.usage || 0,
      used: diskData.used || 0,
      available: diskData.available || diskData.free || 0,
      total: diskData.total || 0,
      partitions: diskData.partitions || [],
    };

    // 只设置存在的属性
    if (diskData.read_bytes !== undefined) result.read_bytes = diskData.read_bytes;
    if (diskData.write_bytes !== undefined) result.write_bytes = diskData.write_bytes;
    if (diskData.read_count !== undefined) result.read_count = diskData.read_count;
    if (diskData.write_count !== undefined) result.write_count = diskData.write_count;
    if (diskData.timestamp !== undefined) result.timestamp = diskData.timestamp;

    return result;
  }

  // 转换进程信息数据 - 修复嵌套数据结构
  private transformProcessInfo(data: any): RealTimeProcessInfo {
    console.log('原始进程数据:', data); // 调试日志
    
    // 提取实际的进程数据
    const processData = data.data || data;
    
    const processes = Array.isArray(processData.processes) 
      ? processData.processes.map((proc: any) => {
          const process: ProcessInfo = {
            pid: proc.pid || 0,
            name: proc.name || 'Unknown',
            cpu: proc.cpu || 0,
            memory: proc.memory || 0,
            status: proc.status || 'unknown',
          };

          // 只设置存在的属性
          if (proc.memory_rss !== undefined) process.memory_rss = proc.memory_rss;
          if (proc.user !== undefined) process.user = proc.user;

          return process;
        })
      : [];

    const result: RealTimeProcessInfo = {
      total: processData.total || 0,
      running: processData.running || 0,
      sleeping: processData.sleeping || 0,
      processes: processes,
    };

    // 只设置存在的属性
    if (processData.timestamp !== undefined) result.timestamp = processData.timestamp;

    return result;
  }

  // ==================== 连接管理接口 ====================

  // 创建连接
  async createConnection(connectionData: Partial<SystemInfoConnection>): Promise<SystemInfoConnection> {
    const response = await fetch(`${this.baseUrl}/connections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(connectionData),
    });

    if (!response.ok) {
      throw new Error(`创建连接失败: ${response.statusText}`);
    }

    return await response.json();
  }

  // 获取所有连接
  async getAllConnections(): Promise<SystemInfoConnection[]> {
    const response = await fetch(`${this.baseUrl}/connections`);

    if (!response.ok) {
      throw new Error(`获取连接列表失败: ${response.statusText}`);
    }

    return await response.json();
  }

  // 删除连接
  async deleteConnection(connectionId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/connections/${connectionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`删除连接失败: ${response.statusText}`);
    }

    return response.status === 204;
  }

  // 测试连接
  async testConnection(connectionId: string): Promise<SystemInfoConnectionStatus> {
    const response = await fetch(`${this.baseUrl}/connections/${connectionId}/test`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`测试连接失败: ${response.statusText}`);
    }

    return await response.json();
  }

  // ==================== 查询管理接口 ====================

  // 创建查询
  async createQuery(queryData: Partial<SystemInfoQuery>): Promise<SystemInfoQuery> {
    const response = await fetch(`${this.baseUrl}/queries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryData),
    });

    if (!response.ok) {
      throw new Error(`创建查询失败: ${response.statusText}`);
    }

    return await response.json();
  }

  // 获取所有查询
  async getAllQueries(): Promise<SystemInfoQuery[]> {
    const response = await fetch(`${this.baseUrl}/queries`);

    if (!response.ok) {
      throw new Error(`获取查询列表失败: ${response.statusText}`);
    }

    return await response.json();
  }

  // 更新查询
  async updateQuery(queryId: string, updates: Partial<SystemInfoQuery>): Promise<SystemInfoQuery> {
    const response = await fetch(`${this.baseUrl}/queries/${queryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`更新查询失败: ${response.statusText}`);
    }

    return await response.json();
  }

  // 删除查询
  async deleteQuery(queryId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/queries/${queryId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`删除查询失败: ${response.statusText}`);
    }

    return response.status === 204;
  }

  // 执行查询
  async executeQuery(queryId: string, connectionId: string): Promise<SystemInfoQueryResult> {
    const executionRequest: QueryExecutionRequest = { connectionId };

    const response = await fetch(`${this.baseUrl}/queries/${queryId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(executionRequest),
    });

    if (!response.ok) {
      throw new Error(`执行查询失败: ${response.statusText}`);
    }

    return await response.json();
  }

  // ==================== 查询结果接口 ====================

  // 获取查询结果
  async getQueryResults(queryId?: string): Promise<SystemInfoQueryResult[]> {
    const url = queryId 
      ? `${this.baseUrl}/query-results?queryId=${queryId}`
      : `${this.baseUrl}/query-results`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`获取查询结果失败: ${response.statusText}`);
    }

    return await response.json();
  }

  // ==================== 统计信息接口 ====================

  // 获取统计信息
  async getStatistics(): Promise<SystemInfoStatistics> {
    try {
      const response = await fetch(`${this.baseUrl}/statistics`);
      if (!response.ok) {
        throw new Error(`获取统计信息失败: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('获取统计信息失败:', error);
      // 返回默认统计信息
      return {
        totalConnections: 0,
        totalDataSources: 0,
        activeQueries: 0,
        totalDataPoints: 0,
        systemStatus: 'normal',
        lastUpdate: new Date().toISOString()
      };
    }
  }

  // 获取性能指标 - 使用新的数据结构
  async getPerformanceMetrics(): Promise<SystemPerformanceMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/performance-metrics`);
      if (!response.ok) {
        throw new Error(`获取性能指标失败: ${response.statusText}`);
      }
      const data = await response.json();
      return {
        cpuPercent: data.cpu_percent,
        memoryPercent: data.memory_percent,
        memoryUsed: data.memory_used,
        memoryAvailable: data.memory_available,
        activeConnections: data.activeConnections,
        queryQueueLength: data.queryQueueLength,
        totalDataPoints: data.totalDataPoints,
        timestamp: data.timestamp
      };
    } catch (error) {
      console.error('获取性能指标失败:', error);
      // 返回默认数据
      return {
        cpuPercent: 0,
        memoryPercent: 0,
        memoryUsed: 0,
        memoryAvailable: 0,
        activeConnections: 0,
        timestamp: Date.now()
      };
    }
  }

  // ==================== 信息类型管理接口 ====================

  // 获取支持的信息类型
  async getAvailableInfoTypes(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/info-types`);

    if (!response.ok) {
      throw new Error(`获取信息类型列表失败: ${response.statusText}`);
    }

    return await response.json();
  }

  // 获取信息类型属性
  async getInfoTypeProperties(infoType: string): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/info-types/${infoType}/properties`);

    if (!response.ok) {
      throw new Error(`获取信息类型属性失败: ${response.statusText}`);
    }

    return await response.json();
  }

  // ==================== 实时系统信息接口 ====================

  // 获取实时系统信息 - 修复路径为 /real-time/system
  async getRealTimeSystemInfo(): Promise<RealTimeSystemInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/real-time/system`);
      if (!response.ok) {
        throw new Error(`获取实时系统信息失败: ${response.statusText}`);
      }
      const data = await response.json();
      return this.transformSystemInfo(data);
    } catch (error) {
      console.error('获取系统信息失败:', error);
      // 返回默认数据
      return {
        hostname: 'localhost',
        platform: 'Unknown',
        architecture: 'Unknown',
        processor: 'Unknown',
        users: 1,
      };
    }
  }

  // 获取实时CPU信息 - 修复路径为 /real-time/cpu
  async getRealTimeCpuInfo(): Promise<RealTimeCpuInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/real-time/cpu`);
      if (!response.ok) {
        throw new Error(`获取实时CPU信息失败: ${response.statusText}`);
      }
      const data = await response.json();
      return this.transformCpuInfo(data);
    } catch (error) {
      console.error('获取CPU信息失败:', error);
      // 返回默认数据
      return {
        usage: 0,
        cores: 1,
        frequency: 0,
        load_average: [0, 0, 0],
      };
    }
  }

  // 获取实时内存信息 - 修复路径为 /real-time/memory
  async getRealTimeMemoryInfo(): Promise<RealTimeMemoryInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/real-time/memory`);
      if (!response.ok) {
        throw new Error(`获取实时内存信息失败: ${response.statusText}`);
      }
      const data = await response.json();
      return this.transformMemoryInfo(data);
    } catch (error) {
      console.error('获取内存信息失败:', error);
      // 返回默认数据
      return {
        usage: 0,
        used: 0,
        available: 0,
        total: 0,
      };
    }
  }

  // 获取实时磁盘信息 - 修复路径为 /real-time/disk
  async getRealTimeDiskInfo(): Promise<RealTimeDiskInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/real-time/disk`);
      if (!response.ok) {
        throw new Error(`获取实时磁盘信息失败: ${response.statusText}`);
      }
      const data = await response.json();
      return this.transformDiskInfo(data);
    } catch (error) {
      console.error('获取磁盘信息失败:', error);
      // 返回默认数据
      return {
        usage: 0,
        used: 0,
        available: 0,
        total: 0,
        partitions: [],
      };
    }
  }

  // 获取实时进程信息 - 修复路径为 /real-time/processes
  async getRealTimeProcessInfo(): Promise<RealTimeProcessInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/real-time/processes`);
      if (!response.ok) {
        throw new Error(`获取实时进程信息失败: ${response.statusText}`);
      }
      const data = await response.json();
      return this.transformProcessInfo(data);
    } catch (error) {
      console.error('获取进程信息失败:', error);
      // 返回默认数据
      return {
        total: 0,
        running: 0,
        sleeping: 0,
        processes: [],
      };
    }
  }

  // ==================== 健康检查接口 ====================

  // 健康检查 - 修复路径为 /health
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`健康检查失败: ${response.statusText}`);
      }
      const data = await response.json();
      return {
        status: data.status || 'unhealthy',
        message: data.message,
        pythonEnvironment: data.pythonEnvironment,
        dataCollection: data.dataCollection,
        timestamp: data.timestamp,
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

  // 获取实时性能数据 - 修复路径为 /real-time/performance
  async getRealTimePerformance(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/real-time/performance`);

    if (!response.ok) {
      throw new Error(`获取实时性能数据失败: ${response.statusText}`);
    }

    return await response.json();
  }

  // 获取实时网络数据 - 修复路径为 /real-time/network
  async getRealTimeNetwork(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/real-time/network`);

    if (!response.ok) {
      throw new Error(`获取实时网络数据失败: ${response.statusText}`);
    }

    return await response.json();
  }

  // 获取实时系统状态 - 修复路径为 /real-time/status
  async getRealTimeStatus(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/real-time/status`);

    if (!response.ok) {
      throw new Error(`获取实时系统状态失败: ${response.statusText}`);
    }

    return await response.json();
  }

  // 获取批量实时数据 - 修复路径为 /real-time/batch-data
  async getBatchRealTimeData(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/real-time/batch-data`);

    if (!response.ok) {
      throw new Error(`获取批量实时数据失败: ${response.statusText}`);
    }

    return await response.json();
  }

  // 获取活跃连接数 - 修复路径为 /real-time/connections/count
  async getActiveConnections(): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/real-time/connections/count`);
      if (!response.ok) {
        throw new Error(`获取活跃连接数失败: ${response.statusText}`);
      }
      const data = await response.json();
      return data.activeConnections || 0;
    } catch (error) {
      console.error('获取活跃连接数失败:', error);
      return 0;
    }
  }

  // 测试Python环境 - 修改为使用连接测试接口
  async testPythonEnvironment(): Promise<boolean> {
    try {
      // 使用本地连接测试Python环境
      const status = await this.testConnection('local-1');
      return status.connected || false;
    } catch (error) {
      console.error('测试Python环境失败:', error);
      return false;
    }
  }

  // 收集特定信息 - 修改为使用执行查询接口
  async collectSpecificInfo(infoType: string): Promise<any> {
    try {
      // 使用本地连接执行查询
      const result = await this.executeQuery('1', 'local-1');
      return result.data;
    } catch (error) {
      console.error(`收集${infoType}信息失败:`, error);
      throw error;
    }
  }

  // ==================== 新增接口方法 ====================

  // 获取数据采集接口
  async collectSystemInfoData(hostname: string, ipAddress: string, dataType: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/collect?hostname=${hostname}&ipAddress=${ipAddress}&dataType=${dataType}`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error(`采集系统信息数据失败: ${response.statusText}`);
      }
      return await response.json();
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
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`获取系统信息数据分页失败: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('获取系统信息数据分页失败:', error);
      throw error;
    }
  }

  // 获取支持的数据类型
  async getDataTypes(): Promise<Map<string, string>> {
    try {
      const response = await fetch(`${this.baseUrl}/data-types`);
      if (!response.ok) {
        throw new Error(`获取数据类型失败: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('获取数据类型失败:', error);
      return new Map();
    }
  }
}

// 创建服务实例
export const systemInfoApiService = new SystemInfoApiService();

// 导出服务实例
export default systemInfoApiService;