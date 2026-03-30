package com.security.ailogsystem.dto;

/**
 * 威胁等级枚举
 */
public enum ThreatLevel {
    /**
     * 低危 (0-30分)
     */
    LOW,
    
    /**
     * 中危 (30-60分)
     */
    MEDIUM,
    
    /**
     * 高危 (60-85分)
     */
    HIGH,
    
    /**
     * 严重 (85-100分)
     */
    CRITICAL
}
