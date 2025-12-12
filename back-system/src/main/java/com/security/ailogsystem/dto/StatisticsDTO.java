// src/main/java/com/security/ailogsystem/dto/StatisticsDTO.java
package com.security.ailogsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StatisticsDTO {
    private Map<String, Long> threatLevels;
    private List<Object[]> eventCounts;
    private List<Object[]> dailyCounts;
    private List<Object[]> bruteForceAttempts;
    private Long totalLogs;
    private Long securityEvents;
    private Long highRiskCount;
    private String systemHealth; // healthy, warning, critical
    private Long anomalyCount;
    private Long activeUsers;
    private Integer responseTime;
    private Integer throughput;
    private Long totalAlerts;
    private Long unhandledAlerts;
}