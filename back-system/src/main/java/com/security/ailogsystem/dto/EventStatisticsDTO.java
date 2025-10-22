package com.security.ailogsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 事件统计DTO
 * 用于返回各种事件统计信息
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventStatisticsDTO {
    
    /**
     * 基础统计信息
     */
    private BasicStatistics basic;
    
    /**
     * 时间范围统计
     */
    private TimeRangeStatistics timeRange;
    
    /**
     * 来源统计
     */
    private Map<String, Long> sourceStatistics;
    
    /**
     * 级别统计
     */
    private Map<String, Long> levelStatistics;
    
    /**
     * 异常统计
     */
    private AnomalyStatistics anomaly;
    
    /**
     * 趋势数据
     */
    private List<TrendData> trends;
    
    /**
     * 热点IP统计
     */
    private List<IpStatistics> topIps;
    
    /**
     * 用户活动统计
     */
    private List<UserActivityStatistics> userActivity;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BasicStatistics {
        private Long totalEvents;
        private Long totalAlerts;
        private Long anomalyEvents;
        private Long normalEvents;
        private Double anomalyRate;
        private LocalDateTime firstEventTime;
        private LocalDateTime lastEventTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimeRangeStatistics {
        private Long todayEvents;
        private Long yesterdayEvents;
        private Long thisWeekEvents;
        private Long lastWeekEvents;
        private Long thisMonthEvents;
        private Long lastMonthEvents;
        private Long last24HoursEvents;
        private Long last7DaysEvents;
        private Long last30DaysEvents;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnomalyStatistics {
        private Long totalAnomalies;
        private Long pendingAlerts;
        private Long resolvedAlerts;
        private Long falsePositiveAlerts;
        private Double averageConfidence;
        private Map<String, Long> anomalyByType;
        private Map<String, Long> anomalyByLevel;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrendData {
        private LocalDateTime timestamp;
        private Long eventCount;
        private Long anomalyCount;
        private Double anomalyRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IpStatistics {
        private String ipAddress;
        private Long eventCount;
        private Long anomalyCount;
        private Double anomalyRate;
        private String lastActivity;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserActivityStatistics {
        private String userId;
        private Long eventCount;
        private Long anomalyCount;
        private Double anomalyRate;
        private String lastActivity;
        private List<String> topActions;
    }
}
