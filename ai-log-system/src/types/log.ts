// src/types/log.ts
export interface SecurityLog {
  id: number;
  eventId: number;
  eventTime: string;
  computerName: string;
  sourceName: string;
  userSid?: string;
  userName?: string;
  ipAddress?: string;
  logonType?: number;
  resultCode?: number;
  rawMessage: string;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdTime: string;
}

export interface SecurityAlert {
  id: number;
  alertLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alertType: string;
  description: string;
  eventData?: string;
  handled: boolean;
  createdTime: string;
  securityLog?: SecurityLog;
  eventId?: number; // 添加 eventId 字段
  source?: string; // 添加 source 字段
}

/**
 * 推送消息 type 字段。
 * - 规范类型：与 normalizeMessageType 输出及后端主要 JSON 一致。
 * - 遗留别名：仅表示「原始可能值」，便于类型收窄；运行时应经归一化后再分支。
 */
export interface WebSocketMessage {
  type:
    | 'LOGS_BATCH'
    | 'LOG_SINGLE'
    | 'ALERT_SECURITY'
    | 'STATS_UPDATE'
    | 'NOTIFY_SYSTEM'
    | 'HEARTBEAT'
    | 'CUSTOM'
    | 'TEST_MESSAGE'
    | 'SYSTEM_INFO'
    | 'SYSTEM_ERROR'
    /* 遗留别名（与规范类型并存，便于兼容旧客户端/文档） */
    | 'SYSTEM_NOTIFICATION'
    | 'SECURITY_ALERT'
    | 'STATISTICS'
    | 'STATISTICS_UPDATE'
    | 'NEW_LOGS'
    | 'SINGLE_LOG'
    | 'PING'
    | 'PONG';
  data?: any;
  legacyType?: string;
  count?: number;
  logs?: SecurityLog[];
  level?: string;
  alertType?: string;
  description?: string;
  timestamp?: number;
}

export interface Statistics {
  eventCounts: [number, number][];
  dailyCounts: [string, number][];
  bruteForceAttempts: [string, number][];
  totalAlerts: number;
  unhandledAlerts: number;
  threatLevels?: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  totalLogs?: number;
  securityEvents?: number;
  recentAlerts?: number;
  bruteForceAlerts?: number;
}

export interface WebSocketStats {
  onlineUsers?: number;
  connectionCount?: number;
  activeSessions?: number;
}