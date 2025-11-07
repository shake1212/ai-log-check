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
}

export interface WebSocketMessage {
  type: 'NEW_LOGS' | 'SECURITY_ALERT' | 'STATISTICS' | 'SYSTEM_NOTIFICATION';
  data?: any;
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