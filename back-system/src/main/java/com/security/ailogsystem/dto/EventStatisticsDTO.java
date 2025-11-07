
package com.security.ailogsystem.dto;

import lombok.Data;
import java.util.Map;

@Data
public class EventStatisticsDTO {
    private BasicStatisticsDTO basic;
    private TimeRangeStatisticsDTO timeRange;
    private Map<String, Long> sourceStatistics;
    private Map<String, Long> levelStatistics;
    private Map<String, Long> categoryStatistics;
    private AnomalyStatisticsDTO anomaly;

    @Data
    public static class BasicStatisticsDTO {
        private Long totalEvents;
        private Long totalAlerts;
        private Long anomalyEvents;
        private Long normalEvents;
        private Double anomalyRate;
    }

    @Data
    public static class TimeRangeStatisticsDTO {
        private Long todayEvents;
        private Long yesterdayEvents;
        private Long thisWeekEvents;
        private Long lastWeekEvents;
        private Long thisMonthEvents;
        private Long lastMonthEvents;
    }

    @Data
    public static class AnomalyStatisticsDTO {
        private Long totalAnomalies;
        private Long pendingAlerts;
        private Long resolvedAlerts;
        private Long falsePositiveAlerts;
        private Double averageConfidence;
    }
}