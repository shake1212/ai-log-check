/**
 * 安全日志解析和转换模块
 * 处理Windows安全事件日志的解析、转换和标准化
 */

export interface SecurityEvent {
  id: string;
  timestamp: string;
  eventId: number;
  eventType: 'success' | 'failure' | 'info' | 'warning' | 'error';
  source: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  userId?: string;
  userName?: string;
  computerName?: string;
  processId?: number;
  threadId?: number;
  ipAddress?: string;
  port?: number;
  protocol?: string;
  rawData: string;
}

export interface LogParserConfig {
  enableRegexParsing: boolean;
  enableJsonParsing: boolean;
  enableXmlParsing: boolean;
  maxMessageLength: number;
  extractIpAddress: boolean;
  extractUserInfo: boolean;
  normalizeTimestamps: boolean;
  customPatterns: LogPattern[];
}

export interface LogPattern {
  id: string;
  name: string;
  pattern: string;
  type: 'regex' | 'json' | 'xml';
  fields: string[];
  enabled: boolean;
}

export interface ParsedLogData {
  originalData: string;
  parsedData: SecurityEvent;
  parsingErrors: string[];
  confidence: number;
  processingTime: number;
}

export class SecurityLogParser {
  private config: LogParserConfig;
  private patterns: Map<string, LogPattern> = new Map();
  private eventTypeMapping: Map<number, string> = new Map();
  private severityMapping: Map<string, string> = new Map();

  constructor(config?: Partial<LogParserConfig>) {
    this.config = {
      enableRegexParsing: true,
      enableJsonParsing: true,
      enableXmlParsing: true,
      maxMessageLength: 10000,
      extractIpAddress: true,
      extractUserInfo: true,
      normalizeTimestamps: true,
      customPatterns: [],
      ...config
    };

    this.initializeDefaultPatterns();
    this.initializeEventTypeMapping();
    this.initializeSeverityMapping();
  }

  /**
   * 解析安全日志数据
   */
  async parseLogData(rawData: string, source?: string): Promise<ParsedLogData> {
    const startTime = Date.now();
    const parsingErrors: string[] = [];
    let parsedData: SecurityEvent;

    try {
      // 尝试不同的解析方法
      if (this.config.enableJsonParsing && this.isJsonData(rawData)) {
        parsedData = await this.parseJsonLog(rawData);
      } else if (this.config.enableXmlParsing && this.isXmlData(rawData)) {
        parsedData = await this.parseXmlLog(rawData);
      } else if (this.config.enableRegexParsing) {
        parsedData = await this.parseRegexLog(rawData);
      } else {
        throw new Error('无法识别的日志格式');
      }

      // 后处理
      parsedData = await this.postProcessEvent(parsedData, source);
      
      const processingTime = Date.now() - startTime;
      const confidence = this.calculateConfidence(parsedData, parsingErrors);

      return {
        originalData: rawData,
        parsedData,
        parsingErrors,
        confidence,
        processingTime
      };

    } catch (error) {
      parsingErrors.push(error instanceof Error ? error.message : '解析失败');
      
      // 创建默认事件
      parsedData = this.createDefaultEvent(rawData, source);
      
      const processingTime = Date.now() - startTime;
      const confidence = 0;

      return {
        originalData: rawData,
        parsedData,
        parsingErrors,
        confidence,
        processingTime
      };
    }
  }

  /**
   * 批量解析日志数据
   */
  async parseBatchLogData(logDataArray: string[], source?: string): Promise<ParsedLogData[]> {
    const results: ParsedLogData[] = [];
    
    for (const logData of logDataArray) {
      try {
        const result = await this.parseLogData(logData, source);
        results.push(result);
      } catch (error) {
        console.error('批量解析日志失败:', error);
        results.push({
          originalData: logData,
          parsedData: this.createDefaultEvent(logData, source),
          parsingErrors: [error instanceof Error ? error.message : '解析失败'],
          confidence: 0,
          processingTime: 0
        });
      }
    }
    
    return results;
  }

  /**
   * 解析JSON格式日志
   */
  private async parseJsonLog(rawData: string): Promise<SecurityEvent> {
    try {
      const data = JSON.parse(rawData);
      
      return {
        id: data.id || this.generateEventId(),
        timestamp: this.normalizeTimestamp(data.timestamp || data.time || new Date().toISOString()),
        eventId: data.eventId || data.event_id || 0,
        eventType: this.mapEventType(data.eventType || data.event_type || 'info'),
        source: data.source || data.log_source || 'unknown',
        category: data.category || data.event_category || 'general',
        severity: this.mapSeverity(data.severity || data.level || 'medium'),
        message: this.truncateMessage(data.message || data.description || ''),
        details: data.details || data.extra || {},
        userId: data.userId || data.user_id,
        userName: data.userName || data.user_name || data.username,
        computerName: data.computerName || data.hostname || data.computer_name,
        processId: data.processId || data.process_id,
        threadId: data.threadId || data.thread_id,
        ipAddress: data.ipAddress || data.ip_address || data.client_ip,
        port: data.port || data.client_port,
        protocol: data.protocol || data.network_protocol,
        rawData
      };
    } catch (error) {
      throw new Error(`JSON解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析XML格式日志
   */
  private async parseXmlLog(rawData: string): Promise<SecurityEvent> {
    try {
      // 简化的XML解析（实际项目中应使用专业的XML解析库）
      const eventData = this.parseXmlToObject(rawData);
      
      return {
        id: eventData.id || this.generateEventId(),
        timestamp: this.normalizeTimestamp(eventData.timestamp || eventData.time || new Date().toISOString()),
        eventId: parseInt(eventData.eventId || eventData.event_id || '0'),
        eventType: this.mapEventType(eventData.eventType || eventData.event_type || 'info'),
        source: eventData.source || eventData.log_source || 'unknown',
        category: eventData.category || eventData.event_category || 'general',
        severity: this.mapSeverity(eventData.severity || eventData.level || 'medium'),
        message: this.truncateMessage(eventData.message || eventData.description || ''),
        details: eventData.details || eventData.extra || {},
        userId: eventData.userId || eventData.user_id,
        userName: eventData.userName || eventData.user_name || eventData.username,
        computerName: eventData.computerName || eventData.hostname || eventData.computer_name,
        processId: parseInt(eventData.processId || eventData.process_id || '0') || undefined,
        threadId: parseInt(eventData.threadId || eventData.thread_id || '0') || undefined,
        ipAddress: eventData.ipAddress || eventData.ip_address || eventData.client_ip,
        port: parseInt(eventData.port || eventData.client_port || '0') || undefined,
        protocol: eventData.protocol || eventData.network_protocol,
        rawData
      };
    } catch (error) {
      throw new Error(`XML解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析正则表达式格式日志
   */
  private async parseRegexLog(rawData: string): Promise<SecurityEvent> {
    // 尝试使用预定义模式
    for (const pattern of this.patterns.values()) {
      if (pattern.enabled && pattern.type === 'regex') {
        try {
          const regex = new RegExp(pattern.pattern, 'g');
          const match = regex.exec(rawData);
          
          if (match) {
            const eventData: any = {};
            pattern.fields.forEach((field, index) => {
              eventData[field] = match[index + 1] || '';
            });
            
            return this.createEventFromParsedData(eventData, rawData);
          }
        } catch (error) {
          console.warn(`正则表达式模式 ${pattern.name} 执行失败:`, error);
        }
      }
    }
    
    // 使用默认解析
    return this.parseDefaultLog(rawData);
  }

  /**
   * 默认日志解析
   */
  private parseDefaultLog(rawData: string): SecurityEvent {
    const lines = rawData.split('\n');
    const eventData: any = {};
    
    // 提取基本信息
    lines.forEach(line => {
      if (line.includes('Event ID:')) {
        eventData.eventId = parseInt(line.split('Event ID:')[1]?.trim() || '0');
      } else if (line.includes('Time:')) {
        eventData.timestamp = line.split('Time:')[1]?.trim() || new Date().toISOString();
      } else if (line.includes('Source:')) {
        eventData.source = line.split('Source:')[1]?.trim() || 'unknown';
      } else if (line.includes('Message:')) {
        eventData.message = line.split('Message:')[1]?.trim() || '';
      }
    });
    
    return this.createEventFromParsedData(eventData, rawData);
  }

  /**
   * 后处理事件数据
   */
  private async postProcessEvent(event: SecurityEvent, source?: string): Promise<SecurityEvent> {
    // 设置源信息
    if (source) {
      event.source = source;
    }
    
    // 提取IP地址
    if (this.config.extractIpAddress) {
      event.ipAddress = this.extractIpAddress(event.message) || event.ipAddress;
    }
    
    // 提取用户信息
    if (this.config.extractUserInfo) {
      const userInfo = this.extractUserInfo(event.message);
      if (userInfo.userName && !event.userName) {
        event.userName = userInfo.userName;
      }
      if (userInfo.userId && !event.userId) {
        event.userId = userInfo.userId;
      }
    }
    
    // 标准化时间戳
    if (this.config.normalizeTimestamps) {
      event.timestamp = this.normalizeTimestamp(event.timestamp);
    }
    
    return event;
  }

  /**
   * 从解析数据创建事件
   */
  private createEventFromParsedData(data: any, rawData: string): SecurityEvent {
    return {
      id: data.id || this.generateEventId(),
      timestamp: this.normalizeTimestamp(data.timestamp || data.time || new Date().toISOString()),
      eventId: parseInt(data.eventId || data.event_id || '0'),
      eventType: this.mapEventType(data.eventType || data.event_type || 'info'),
      source: data.source || data.log_source || 'unknown',
      category: data.category || data.event_category || 'general',
      severity: this.mapSeverity(data.severity || data.level || 'medium'),
      message: this.truncateMessage(data.message || data.description || ''),
      details: data.details || data.extra || {},
      userId: data.userId || data.user_id,
      userName: data.userName || data.user_name || data.username,
      computerName: data.computerName || data.hostname || data.computer_name,
      processId: parseInt(data.processId || data.process_id || '0') || undefined,
      threadId: parseInt(data.threadId || data.thread_id || '0') || undefined,
      ipAddress: data.ipAddress || data.ip_address || data.client_ip,
      port: parseInt(data.port || data.client_port || '0') || undefined,
      protocol: data.protocol || data.network_protocol,
      rawData
    };
  }

  /**
   * 创建默认事件
   */
  private createDefaultEvent(rawData: string, source?: string): SecurityEvent {
    return {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      eventId: 0,
      eventType: 'info',
      source: source || 'unknown',
      category: 'general',
      severity: 'medium',
      message: this.truncateMessage(rawData),
      details: {},
      rawData
    };
  }

  /**
   * 计算解析置信度
   */
  private calculateConfidence(event: SecurityEvent, errors: string[]): number {
    let confidence = 1.0;
    
    // 基于错误数量降低置信度
    confidence -= errors.length * 0.1;
    
    // 基于数据完整性调整置信度
    if (!event.eventId) confidence -= 0.2;
    if (!event.message) confidence -= 0.3;
    if (!event.timestamp) confidence -= 0.2;
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * 工具方法
   */
  private isJsonData(data: string): boolean {
    try {
      JSON.parse(data);
      return true;
    } catch {
      return false;
    }
  }

  private isXmlData(data: string): boolean {
    return data.trim().startsWith('<') && data.trim().endsWith('>');
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private normalizeTimestamp(timestamp: string): string {
    try {
      return new Date(timestamp).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private truncateMessage(message: string): string {
    return message.length > this.config.maxMessageLength 
      ? message.substring(0, this.config.maxMessageLength) + '...'
      : message;
  }

  private mapEventType(eventType: string): 'success' | 'failure' | 'info' | 'warning' | 'error' {
    const type = eventType.toLowerCase();
    if (type.includes('success') || type.includes('ok')) return 'success';
    if (type.includes('failure') || type.includes('fail')) return 'failure';
    if (type.includes('warning') || type.includes('warn')) return 'warning';
    if (type.includes('error') || type.includes('err')) return 'error';
    return 'info';
  }

  private mapSeverity(severity: string): 'low' | 'medium' | 'high' | 'critical' {
    const sev = severity.toLowerCase();
    if (sev.includes('critical') || sev.includes('fatal')) return 'critical';
    if (sev.includes('high') || sev.includes('severe')) return 'high';
    if (sev.includes('low') || sev.includes('minor')) return 'low';
    return 'medium';
  }

  private extractIpAddress(text: string): string | null {
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/;
    const match = text.match(ipRegex);
    return match ? match[0] : null;
  }

  private extractUserInfo(text: string): { userName?: string; userId?: string } {
    const userInfo: { userName?: string; userId?: string } = {};
    
    // 提取用户名
    const userRegex = /user[:\s]+([a-zA-Z0-9._-]+)/i;
    const userMatch = text.match(userRegex);
    if (userMatch) {
      userInfo.userName = userMatch[1];
    }
    
    // 提取用户ID
    const idRegex = /user[:\s]+id[:\s]+([a-zA-Z0-9._-]+)/i;
    const idMatch = text.match(idRegex);
    if (idMatch) {
      userInfo.userId = idMatch[1];
    }
    
    return userInfo;
  }

  private parseXmlToObject(xml: string): any {
    // 简化的XML解析实现
    const obj: any = {};
    const tagRegex = /<(\w+)>(.*?)<\/\1>/g;
    let match;
    
    while ((match = tagRegex.exec(xml)) !== null) {
      obj[match[1]] = match[2];
    }
    
    return obj;
  }

  /**
   * 初始化默认模式
   */
  private initializeDefaultPatterns(): void {
    const defaultPatterns: LogPattern[] = [
      {
        id: '1',
        name: 'Windows事件日志',
        pattern: /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(\w+)\s+(\d+)\s+(.+)/,
        type: 'regex',
        fields: ['timestamp', 'level', 'eventId', 'message'],
        enabled: true
      },
      {
        id: '2',
        name: 'Apache日志',
        pattern: /(\d+\.\d+\.\d+\.\d+)\s+-\s+-\s+\[([^\]]+)\]\s+"([^"]+)"\s+(\d+)\s+(\d+)/,
        type: 'regex',
        fields: ['ipAddress', 'timestamp', 'request', 'status', 'size'],
        enabled: true
      }
    ];

    defaultPatterns.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });
  }

  /**
   * 初始化事件类型映射
   */
  private initializeEventTypeMapping(): void {
    this.eventTypeMapping.set(4624, 'success'); // 登录成功
    this.eventTypeMapping.set(4625, 'failure'); // 登录失败
    this.eventTypeMapping.set(4634, 'info'); // 注销
    this.eventTypeMapping.set(4648, 'info'); // 使用显式凭据登录
    this.eventTypeMapping.set(4672, 'success'); // 特殊权限分配给新登录
  }

  /**
   * 初始化严重程度映射
   */
  private initializeSeverityMapping(): void {
    this.severityMapping.set('success', 'low');
    this.severityMapping.set('info', 'low');
    this.severityMapping.set('warning', 'medium');
    this.severityMapping.set('failure', 'high');
    this.severityMapping.set('error', 'high');
  }

  /**
   * 添加自定义模式
   */
  addCustomPattern(pattern: LogPattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LogParserConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取统计信息
   */
  getStats(): any {
    return {
      totalPatterns: this.patterns.size,
      enabledPatterns: Array.from(this.patterns.values()).filter(p => p.enabled).length,
      config: this.config
    };
  }
}

// 创建全局日志解析器实例
export const securityLogParser = new SecurityLogParser();
