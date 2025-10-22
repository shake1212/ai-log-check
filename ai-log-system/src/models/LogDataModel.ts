/**
 * 日志数据模型和存储结构
 * 定义统一的日志数据模型和存储接口
 */

export interface LogDataModel {
  id: string;
  timestamp: string;
  eventId: number;
  eventType: EventType;
  source: LogSource;
  category: string;
  severity: SeverityLevel;
  message: string;
  details: LogDetails;
  metadata: LogMetadata;
  tags: string[];
  rawData: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export type EventType = 
  | 'authentication' 
  | 'authorization' 
  | 'system' 
  | 'network' 
  | 'file' 
  | 'process' 
  | 'database' 
  | 'application' 
  | 'security' 
  | 'audit' 
  | 'error' 
  | 'warning' 
  | 'info' 
  | 'debug';

export type LogSource = 
  | 'wmi' 
  | 'windows_event' 
  | 'syslog' 
  | 'application' 
  | 'database' 
  | 'network_device' 
  | 'security_scanner' 
  | 'custom';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface LogDetails {
  // 用户信息
  user?: {
    id?: string;
    name?: string;
    domain?: string;
    sessionId?: string;
  };
  
  // 系统信息
  system?: {
    computerName?: string;
    processId?: number;
    threadId?: number;
    processName?: string;
    moduleName?: string;
  };
  
  // 网络信息
  network?: {
    sourceIp?: string;
    sourcePort?: number;
    destinationIp?: string;
    destinationPort?: number;
    protocol?: string;
    macAddress?: string;
  };
  
  // 文件信息
  file?: {
    path?: string;
    name?: string;
    size?: number;
    hash?: string;
    permissions?: string;
  };
  
  // 数据库信息
  database?: {
    server?: string;
    database?: string;
    table?: string;
    query?: string;
    affectedRows?: number;
  };
  
  // 自定义字段
  custom?: Record<string, any>;
}

export interface LogMetadata {
  // 采集信息
  collection?: {
    collectorId?: string;
    sourceId?: string;
    collectionTime?: string;
    batchId?: string;
  };
  
  // 处理信息
  processing?: {
    parserVersion?: string;
    processingTime?: number;
    confidence?: number;
    errors?: string[];
  };
  
  // 存储信息
  storage?: {
    storageId?: string;
    partition?: string;
    index?: string;
    compression?: boolean;
  };
  
  // 分析信息
  analysis?: {
    riskScore?: number;
    threatLevel?: string;
    anomalyScore?: number;
    correlationId?: string;
    relatedEvents?: string[];
  };
}

export interface LogQuery {
  id?: string;
  eventTypes?: EventType[];
  sources?: LogSource[];
  severity?: SeverityLevel[];
  timeRange?: {
    start: string;
    end: string;
  };
  keywords?: string[];
  tags?: string[];
  userId?: string;
  computerName?: string;
  ipAddress?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LogAggregation {
  groupBy: string[];
  aggregations: {
    count?: boolean;
    sum?: string[];
    avg?: string[];
    min?: string[];
    max?: string[];
    distinct?: string[];
  };
  filters?: LogQuery;
  timeRange?: {
    start: string;
    end: string;
  };
}

export interface LogStatistics {
  totalLogs: number;
  logsByType: Record<EventType, number>;
  logsBySource: Record<LogSource, number>;
  logsBySeverity: Record<SeverityLevel, number>;
  logsByHour: Record<string, number>;
  topUsers: Array<{ user: string; count: number }>;
  topComputers: Array<{ computer: string; count: number }>;
  topEvents: Array<{ eventId: number; count: number }>;
  averageProcessingTime: number;
  errorRate: number;
  lastUpdate: string;
}

export interface LogStorageConfig {
  type: 'memory' | 'file' | 'database' | 'elasticsearch' | 'mongodb';
  connectionString?: string;
  maxSize?: number;
  compression?: boolean;
  encryption?: boolean;
  retention?: {
    days?: number;
    size?: number;
    policy?: 'delete' | 'archive' | 'compress';
  };
  indexing?: {
    enabled: boolean;
    fields: string[];
    analyzer?: string;
  };
  sharding?: {
    enabled: boolean;
    strategy: 'time' | 'hash' | 'range';
    shards: number;
  };
}

export abstract class LogStorage {
  protected config: LogStorageConfig;
  
  constructor(config: LogStorageConfig) {
    this.config = config;
  }
  
  // 存储操作
  abstract store(log: LogDataModel): Promise<boolean>;
  abstract storeBatch(logs: LogDataModel[]): Promise<number>;
  
  // 查询操作
  abstract query(query: LogQuery): Promise<LogDataModel[]>;
  abstract getById(id: string): Promise<LogDataModel | null>;
  
  // 聚合操作
  abstract aggregate(aggregation: LogAggregation): Promise<any>;
  abstract getStatistics(timeRange?: { start: string; end: string }): Promise<LogStatistics>;
  
  // 管理操作
  abstract delete(query: LogQuery): Promise<number>;
  abstract update(id: string, updates: Partial<LogDataModel>): Promise<boolean>;
  abstract cleanup(retentionDays?: number): Promise<number>;
  
  // 维护操作
  abstract optimize(): Promise<void>;
  abstract backup(path: string): Promise<boolean>;
  abstract restore(path: string): Promise<boolean>;
}

export class MemoryLogStorage extends LogStorage {
  private logs: Map<string, LogDataModel> = new Map();
  private indexes: Map<string, Set<string>> = new Map();
  
  constructor(config: LogStorageConfig) {
    super(config);
    this.initializeIndexes();
  }
  
  async store(log: LogDataModel): Promise<boolean> {
    try {
      this.logs.set(log.id, log);
      this.updateIndexes(log);
      return true;
    } catch (error) {
      console.error('存储日志失败:', error);
      return false;
    }
  }
  
  async storeBatch(logs: LogDataModel[]): Promise<number> {
    let storedCount = 0;
    for (const log of logs) {
      if (await this.store(log)) {
        storedCount++;
      }
    }
    return storedCount;
  }
  
  async query(query: LogQuery): Promise<LogDataModel[]> {
    let results = Array.from(this.logs.values());
    
    // 应用过滤条件
    if (query.eventTypes && query.eventTypes.length > 0) {
      results = results.filter(log => query.eventTypes!.includes(log.eventType));
    }
    
    if (query.sources && query.sources.length > 0) {
      results = results.filter(log => query.sources!.includes(log.source));
    }
    
    if (query.severity && query.severity.length > 0) {
      results = results.filter(log => query.severity!.includes(log.severity));
    }
    
    if (query.timeRange) {
      const startTime = new Date(query.timeRange.start).getTime();
      const endTime = new Date(query.timeRange.end).getTime();
      results = results.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return logTime >= startTime && logTime <= endTime;
      });
    }
    
    if (query.keywords && query.keywords.length > 0) {
      results = results.filter(log => 
        query.keywords!.some(keyword => 
          log.message.toLowerCase().includes(keyword.toLowerCase())
        )
      );
    }
    
    if (query.tags && query.tags.length > 0) {
      results = results.filter(log => 
        query.tags!.some(tag => log.tags.includes(tag))
      );
    }
    
    if (query.userId) {
      results = results.filter(log => log.details.user?.id === query.userId);
    }
    
    if (query.computerName) {
      results = results.filter(log => log.details.system?.computerName === query.computerName);
    }
    
    if (query.ipAddress) {
      results = results.filter(log => 
        log.details.network?.sourceIp === query.ipAddress ||
        log.details.network?.destinationIp === query.ipAddress
      );
    }
    
    // 排序
    if (query.sortBy) {
      results.sort((a, b) => {
        const aValue = this.getNestedValue(a, query.sortBy!);
        const bValue = this.getNestedValue(b, query.sortBy!);
        const order = query.sortOrder === 'desc' ? -1 : 1;
        return aValue > bValue ? order : aValue < bValue ? -order : 0;
      });
    }
    
    // 分页
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    return results.slice(offset, offset + limit);
  }
  
  async getById(id: string): Promise<LogDataModel | null> {
    return this.logs.get(id) || null;
  }
  
  async aggregate(aggregation: LogAggregation): Promise<any> {
    // 简化的聚合实现
    const results: any = {};
    
    for (const groupField of aggregation.groupBy) {
      const groups = new Map<string, LogDataModel[]>();
      
      for (const log of this.logs.values()) {
        const groupValue = this.getNestedValue(log, groupField);
        if (!groups.has(groupValue)) {
          groups.set(groupValue, []);
        }
        groups.get(groupValue)!.push(log);
      }
      
      results[groupField] = Array.from(groups.entries()).map(([key, logs]) => ({
        key,
        count: logs.length,
        logs: aggregation.aggregations.count ? logs : undefined
      }));
    }
    
    return results;
  }
  
  async getStatistics(timeRange?: { start: string; end: string }): Promise<LogStatistics> {
    let logs = Array.from(this.logs.values());
    
    if (timeRange) {
      const startTime = new Date(timeRange.start).getTime();
      const endTime = new Date(timeRange.end).getTime();
      logs = logs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return logTime >= startTime && logTime <= endTime;
      });
    }
    
    const stats: LogStatistics = {
      totalLogs: logs.length,
      logsByType: {} as Record<EventType, number>,
      logsBySource: {} as Record<LogSource, number>,
      logsBySeverity: {} as Record<SeverityLevel, number>,
      logsByHour: {},
      topUsers: [],
      topComputers: [],
      topEvents: [],
      averageProcessingTime: 0,
      errorRate: 0,
      lastUpdate: new Date().toISOString()
    };
    
    // 统计各种分类
    logs.forEach(log => {
      stats.logsByType[log.eventType] = (stats.logsByType[log.eventType] || 0) + 1;
      stats.logsBySource[log.source] = (stats.logsBySource[log.source] || 0) + 1;
      stats.logsBySeverity[log.severity] = (stats.logsBySeverity[log.severity] || 0) + 1;
      
      // 按小时统计
      const hour = new Date(log.timestamp).toISOString().substring(0, 13);
      stats.logsByHour[hour] = (stats.logsByHour[hour] || 0) + 1;
    });
    
    // 计算处理时间
    const processingTimes = logs
      .map(log => log.metadata.processing?.processingTime || 0)
      .filter(time => time > 0);
    
    if (processingTimes.length > 0) {
      stats.averageProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
    }
    
    // 计算错误率
    const errorCount = logs.filter(log => log.severity === 'critical' || log.severity === 'high').length;
    stats.errorRate = logs.length > 0 ? errorCount / logs.length : 0;
    
    return stats;
  }
  
  async delete(query: LogQuery): Promise<number> {
    const logsToDelete = await this.query(query);
    let deletedCount = 0;
    
    for (const log of logsToDelete) {
      if (this.logs.delete(log.id)) {
        this.removeFromIndexes(log);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
  
  async update(id: string, updates: Partial<LogDataModel>): Promise<boolean> {
    const existingLog = this.logs.get(id);
    if (!existingLog) {
      return false;
    }
    
    const updatedLog = {
      ...existingLog,
      ...updates,
      id: existingLog.id, // 保持ID不变
      updatedAt: new Date().toISOString()
    };
    
    this.logs.set(id, updatedLog);
    this.updateIndexes(updatedLog);
    return true;
  }
  
  async cleanup(retentionDays?: number): Promise<number> {
    if (!retentionDays) {
      return 0;
    }
    
    const cutoffTime = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [id, log] of this.logs.entries()) {
      if (new Date(log.timestamp) < cutoffTime) {
        this.logs.delete(id);
        this.removeFromIndexes(log);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }
  
  async optimize(): Promise<void> {
    // 内存存储的优化：重建索引
    this.indexes.clear();
    this.initializeIndexes();
    
    for (const log of this.logs.values()) {
      this.updateIndexes(log);
    }
  }
  
  async backup(path: string): Promise<boolean> {
    try {
      const data = Array.from(this.logs.values());
      // 在实际应用中，这里应该写入文件或发送到远程存储
      console.log(`备份数据到: ${path}, 记录数: ${data.length}`);
      return true;
    } catch (error) {
      console.error('备份失败:', error);
      return false;
    }
  }
  
  async restore(path: string): Promise<boolean> {
    try {
      // 在实际应用中，这里应该从文件或远程存储读取数据
      console.log(`从 ${path} 恢复数据`);
      return true;
    } catch (error) {
      console.error('恢复失败:', error);
      return false;
    }
  }
  
  private initializeIndexes(): void {
    this.indexes.set('eventType', new Set());
    this.indexes.set('source', new Set());
    this.indexes.set('severity', new Set());
    this.indexes.set('timestamp', new Set());
  }
  
  private updateIndexes(log: LogDataModel): void {
    this.indexes.get('eventType')?.add(log.eventType);
    this.indexes.get('source')?.add(log.source);
    this.indexes.get('severity')?.add(log.severity);
    this.indexes.get('timestamp')?.add(log.timestamp);
  }
  
  private removeFromIndexes(log: LogDataModel): void {
    // 简化实现：不删除索引值，因为其他日志可能还在使用
  }
  
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// 日志数据模型工厂
export class LogDataModelFactory {
  static createLogDataModel(data: Partial<LogDataModel>): LogDataModel {
    const now = new Date().toISOString();
    
    return {
      id: data.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: data.timestamp || now,
      eventId: data.eventId || 0,
      eventType: data.eventType || 'info',
      source: data.source || 'custom',
      category: data.category || 'general',
      severity: data.severity || 'medium',
      message: data.message || '',
      details: data.details || {},
      metadata: data.metadata || {},
      tags: data.tags || [],
      rawData: data.rawData || '',
      version: data.version || '1.0.0',
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };
  }
  
  static createFromSecurityEvent(event: any): LogDataModel {
    return this.createLogDataModel({
      timestamp: event.timestamp,
      eventId: event.eventId,
      eventType: this.mapEventType(event.eventType),
      source: this.mapSource(event.source),
      severity: event.severity,
      message: event.message,
      details: {
        user: event.userId ? { id: event.userId, name: event.userName } : undefined,
        system: event.computerName ? { computerName: event.computerName, processId: event.processId } : undefined,
        network: event.ipAddress ? { sourceIp: event.ipAddress, sourcePort: event.port } : undefined,
        custom: event.details
      },
      metadata: {
        processing: {
          parserVersion: '1.0.0',
          confidence: 1.0
        }
      },
      tags: this.generateTags(event),
      rawData: event.rawData
    });
  }
  
  private static mapEventType(eventType: string): EventType {
    const mapping: Record<string, EventType> = {
      'success': 'authentication',
      'failure': 'authentication',
      'info': 'info',
      'warning': 'warning',
      'error': 'error'
    };
    return mapping[eventType] || 'info';
  }
  
  private static mapSource(source: string): LogSource {
    const mapping: Record<string, LogSource> = {
      'wmi': 'wmi',
      'windows': 'windows_event',
      'syslog': 'syslog',
      'application': 'application',
      'database': 'database'
    };
    return mapping[source] || 'custom';
  }
  
  private static generateTags(event: any): string[] {
    const tags: string[] = [];
    
    if (event.eventId) {
      tags.push(`event_${event.eventId}`);
    }
    
    if (event.source) {
      tags.push(`source_${event.source}`);
    }
    
    if (event.severity) {
      tags.push(`severity_${event.severity}`);
    }
    
    return tags;
  }
}

// 创建默认存储实例
export const defaultLogStorage = new MemoryLogStorage({
  type: 'memory',
  maxSize: 100000,
  compression: false,
  encryption: false,
  retention: {
    days: 30,
    policy: 'delete'
  },
  indexing: {
    enabled: true,
    fields: ['eventType', 'source', 'severity', 'timestamp']
  }
});
