import { SecurityLog, SecurityAlert, Statistics, ThreatIntel, SecurityAnalysis } from '@/types';

export type SecurityEventLevel = SecurityAlert['alertLevel'];
export type SecurityEventStatus = 'NEW' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  level: SecurityEventLevel;
  source?: string;
  type?: string;
  message: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  confidence?: number;
  status: SecurityEventStatus;
  tags?: string[];
}

export interface DashboardStatistics extends Statistics {
  systemHealth?: 'healthy' | 'warning' | 'critical';
  anomalyCount?: number;
  highRiskCount?: number;
  activeUsers?: number;
  responseTime?: number;
  throughput?: number;
}

export interface ThreatIntelItem {
  id: string;
  type: 'malware' | 'phishing' | 'vulnerability' | 'botnet' | 'zero-day';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  description: string;
  affectedSystems: string[];
  detectionDate: string;
  iocCount: number;
  confidence: number;
  status: 'active' | 'inactive' | 'mitigated';
  relatedThreats: string[];
}

export interface SecurityAnalysisItem {
  id: string;
  category: 'anomaly_detection' | 'threat_hunting' | 'risk_assessment' | 'compliance';
  name: string;
  description: string;
  riskScore: number;
  findings: string[];
  recommendations: string[];
  lastRun: string;
  nextRun: string;
  status: 'completed' | 'running' | 'failed' | 'pending';
}

export interface SystemMetrics {
  systemHealth: number;
  uptime: number;
  storageUsed: number;
  storageTotal: number;
  throughput: {
    normal: number;
    abnormal: number;
    peak: number;
  };
  latency: number;
  systemVersion: string;
  lastUpdate: string;
  currentConnections?: number;
  activeSessions?: number;
}

export interface TrafficStats {
  normalTraffic: number;
  anomalyTraffic: number;
  peakTraffic: number;
  avgLatency: number;
  currentTraffic: number;
}

export interface RealTimeStats {
  totalEvents?: number;
  activeAlerts?: number;
  systemHealth?: number;
  [key: string]: any;
}

export interface DashboardProps {
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  connected: boolean;
  reconnect: () => void;
  unreadCount: number;
}

export interface CardProps {
  refreshInterval?: number;
  autoRefresh?: boolean;
  isPaused?: boolean;
  compact?: boolean;
}

export const LEVEL_COLORS = {
  CRITICAL: '#ff4d4f',
  HIGH: '#fa8c16',
  MEDIUM: '#faad14',
  LOW: '#52c41a',
  ALL: '#1890ff'
} as const;

export const LEVEL_GRADIENTS = {
  CRITICAL: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
  HIGH: 'linear-gradient(135deg, #fa8c16 0%, #d48806 100%)',
  MEDIUM: 'linear-gradient(135deg, #faad14 0%, #d4a106 100%)',
  LOW: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
  HEALTHY: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
  WARNING: 'linear-gradient(135deg, #faad14 0%, #d4a106 100%)',
  CRITICAL_GRADIENT: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)'
} as const;

export const EVENT_LEVELS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

// 格式化工具函数
export const formatNumber = (num: number, decimals: number = 0): string => {
  if (isNaN(num) || !isFinite(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(decimals);
};

export const formatPercentage = (num: number, decimals: number = 1): string => {
  return num.toFixed(decimals) + '%';
};

export const formatStorage = (gb: number, totalGb?: number): string => {
  if (gb >= 1000) {
    return (gb / 1000).toFixed(1) + 'TB' + (totalGb ? `/${totalGb / 1000}TB` : '');
  }
  return gb.toFixed(1) + 'GB' + (totalGb ? `/${totalGb}GB` : '');
};

export const formatTime = (ms: number): string => {
  if (ms < 1000) {
    return ms.toFixed(0) + 'ms';
  }
  return (ms / 1000).toFixed(2) + 's';
};