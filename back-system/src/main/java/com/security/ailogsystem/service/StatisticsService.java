// src/main/java/com/security/ailogsystem/service/StatisticsService.java
package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.StatisticsDTO;

import java.util.List;
import java.util.Map;

public interface StatisticsService {

    StatisticsDTO getComprehensiveStatistics();
    StatisticsDTO getRealTimeStatistics();
    Map<String, Object> getLevelStatistics();
    Map<String, Object> getSourceStatistics();
    Map<String, Object> getAnomalyStatistics();
    List<Map<String, Object>> getTopIps(Integer limit);
    List<Map<String, Object>> getUserActivityStats(Integer limit);
}