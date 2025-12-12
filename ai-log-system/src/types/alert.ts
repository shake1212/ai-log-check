// src/types/alert.ts
export interface SecurityAlert {
  id: number;
  alertId: string;
  source: string;
  alertType: string;
  alertLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  handled: boolean;
  status: 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'FALSE_POSITIVE';
  createdTime: string;
  updatedTime?: string;
  aiConfidence?: number;
  assignee?: string;
  resolution?: string;
  logEntryId?: number;
}

export interface AlertResponse {
  content: SecurityAlert[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface AlertSearchParams {
  keyword?: string;
  alertLevel?: string;
  handled?: boolean;
  status?: string;
  page?: number;
  size?: number;
}

export interface AlertStatistics {
  totalAlerts: number;
  unhandledAlerts: number;
  alertsByLevel: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
}