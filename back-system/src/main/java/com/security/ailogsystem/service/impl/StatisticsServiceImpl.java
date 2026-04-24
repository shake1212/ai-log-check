// src/main/java/com/security/ailogsystem/service/impl/StatisticsServiceImpl.java
package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.dto.StatisticsDTO;
import com.security.ailogsystem.repository.SecurityLogRepository;
import com.security.ailogsystem.repository.SecurityAlertRepository;
import com.security.ailogsystem.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class StatisticsServiceImpl implements StatisticsService {

    private final SecurityLogRepository logRepository;
    private final SecurityAlertRepository alertRepository;

    @Override
    public StatisticsDTO getComprehensiveStatistics() {
        log.info("获取综合统计信息");

        LocalDateTime last24Hours = LocalDateTime.now().minusHours(24);
        LocalDateTime last7Days = LocalDateTime.now().minusDays(7);

        // 获取基础数据
        List<Object[]> eventCounts = logRepository.countEventsByType(last24Hours);
        List<Object[]> dailyCounts = logRepository.getDailyLogCounts(last7Days);
        List<Object[]> bruteForceAttempts = logRepository.findBruteForceAttempts(last24Hours, 5L);

        // 获取威胁等级统计（需要先在Repository中添加该方法）
        Map<String, Long> threatLevels = getThreatLevels(last24Hours);

        // 计算总日志数
        Long totalLogs = logRepository.count();

        // 计算安全事件数（高风险以上）
        Long securityEvents = threatLevels.getOrDefault("HIGH", 0L) +
                threatLevels.getOrDefault("CRITICAL", 0L);

        // 计算高风险数
        Long highRiskCount = threatLevels.getOrDefault("CRITICAL", 0L);

        // 系统健康度
        String systemHealth = calculateSystemHealth(threatLevels, securityEvents);

        // 异常数量（近似值）
        Long anomalyCount = securityEvents;

        // 活跃用户数（模拟）
        Long activeUsers = calculateActiveUsers();

        // 响应时间（模拟）
        Integer responseTime = calculateResponseTime(highRiskCount);

        // 吞吐量（模拟）
        Integer throughput = calculateThroughput(totalLogs, dailyCounts);

        // 警报统计
        Long totalAlerts = alertRepository.count();
        Long unhandledAlerts = (long) alertRepository.findByHandledFalseOrderByCreatedTimeDesc().size();

        return new StatisticsDTO(
                threatLevels,
                eventCounts,
                dailyCounts,
                bruteForceAttempts,
                totalLogs,
                securityEvents,
                highRiskCount,
                systemHealth,
                anomalyCount,
                activeUsers,
                responseTime,
                throughput,
                totalAlerts,
                unhandledAlerts
        );
    }

    private Map<String, Long> getThreatLevels(LocalDateTime since) {
        Map<String, Long> threatLevels = new HashMap<>();
        threatLevels.put("LOW", Optional.ofNullable(logRepository.countByThreatLevelAndEventTimeAfter("LOW", since)).orElse(0L));
        threatLevels.put("MEDIUM", Optional.ofNullable(logRepository.countByThreatLevelAndEventTimeAfter("MEDIUM", since)).orElse(0L));
        threatLevels.put("HIGH", Optional.ofNullable(logRepository.countByThreatLevelAndEventTimeAfter("HIGH", since)).orElse(0L));
        threatLevels.put("CRITICAL", Optional.ofNullable(logRepository.countByThreatLevelAndEventTimeAfter("CRITICAL", since)).orElse(0L));
        return threatLevels;
    }

    private String calculateSystemHealth(Map<String, Long> threatLevels, Long securityEvents) {
        if (securityEvents == 0) return "healthy";

        double criticalRatio = threatLevels.getOrDefault("CRITICAL", 0L).doubleValue() / securityEvents;
        double highRatio = threatLevels.getOrDefault("HIGH", 0L).doubleValue() / securityEvents;

        if (criticalRatio > 0.3 || highRatio > 0.5) {
            return "critical";
        } else if (criticalRatio > 0.1 || highRatio > 0.2) {
            return "warning";
        } else {
            return "healthy";
        }
    }

    private Long calculateActiveUsers() {
        LocalDateTime since = LocalDateTime.now().minusHours(24);
        List<Object[]> topIps = logRepository.getTopIpAddresses(since);
        return (long) topIps.size();
    }

    private Integer calculateResponseTime(Long highRiskCount) {
        // 高风险越多，响应压力越大
        return Math.max(30, 180 - Math.min(140, highRiskCount.intValue() * 4));
    }

    private Integer calculateThroughput(Long totalLogs, List<Object[]> dailyCounts) {
        if (totalLogs == 0 || dailyCounts == null || dailyCounts.isEmpty()) {
            return 100;
        }
        // 模拟吞吐量
        return Math.max(1, Math.round(totalLogs / Math.max(dailyCounts.size(), 1)));
    }

    @Override
    public StatisticsDTO getRealTimeStatistics() {
        log.info("获取实时统计");
        return getComprehensiveStatistics();
    }

    @Override
    public Map<String, Object> getLevelStatistics() {
        log.info("获取级别统计");

        LocalDateTime last24Hours = LocalDateTime.now().minusHours(24);
        Map<String, Long> threatLevels = getThreatLevels(last24Hours);

        Map<String, Object> result = new HashMap<>();
        result.put("threatLevels", threatLevels);
        result.put("total", threatLevels.values().stream().mapToLong(Long::longValue).sum());
        result.put("timestamp", LocalDateTime.now());

        return result;
    }

    @Override
    public Map<String, Object> getSourceStatistics() {
        log.info("获取来源统计");

        Map<String, Object> result = new HashMap<>();
        Map<String, Long> sourceStats = new HashMap<>();
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<Object[]> eventCounts = logRepository.countEventsByType(since);
        for (Object[] row : eventCounts) {
            sourceStats.put("EVENT_" + row[0], ((Number) row[1]).longValue());
        }

        result.put("sources", sourceStats);
        result.put("totalSources", sourceStats.size());

        return result;
    }

    @Override
    public Map<String, Object> getAnomalyStatistics() {
        log.info("获取异常统计");

        LocalDateTime since = LocalDateTime.now().minusDays(7);
        long loginAnomalies = Optional.ofNullable(logRepository.countByEventIdAndEventTimeBetween(4625, since, LocalDateTime.now())).orElse(0L);
        long high = Optional.ofNullable(logRepository.countByThreatLevelAndEventTimeAfter("HIGH", since)).orElse(0L);
        long critical = Optional.ofNullable(logRepository.countByThreatLevelAndEventTimeAfter("CRITICAL", since)).orElse(0L);
        long networkAnomalies = high + critical;
        long fileAnomalies = Optional.ofNullable(logRepository.countByEventIdAndEventTimeBetween(4663, since, LocalDateTime.now())).orElse(0L);
        long total = loginAnomalies + networkAnomalies + fileAnomalies;

        Map<String, Object> result = new HashMap<>();
        result.put("totalAnomalies", total);
        result.put("loginAnomalies", loginAnomalies);
        result.put("networkAnomalies", networkAnomalies);
        result.put("fileAnomalies", fileAnomalies);
        result.put("otherAnomalies", 0L);
        result.put("detectionRate", 100.0);

        return result;
    }

    @Override
    public List<Map<String, Object>> getTopIps(Integer limit) {
        log.info("获取Top IPs");
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<Object[]> rows = logRepository.getTopIpAddresses(since);
        List<Map<String, Object>> topIps = new ArrayList<>();
        for (Object[] row : rows.subList(0, Math.min(limit, rows.size()))) {
            Map<String, Object> item = new HashMap<>();
            item.put("ip", row[0]);
            item.put("count", ((Number) row[1]).longValue());
            item.put("threatLevel", "UNKNOWN");
            topIps.add(item);
        }
        return topIps;
    }

    @Override
    public List<Map<String, Object>> getUserActivityStats(Integer limit) {
        log.info("获取用户活动统计");
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<Object[]> topIps = logRepository.getTopIpAddresses(since);
        List<Map<String, Object>> userStats = new ArrayList<>();
        int max = Math.min(limit, topIps.size());
        for (int i = 0; i < max; i++) {
            Object[] row = topIps.get(i);
            userStats.add(Map.of(
                    "username", "user-" + (i + 1),
                    "loginCount", ((Number) row[1]).longValue(),
                    "lastLogin", LocalDateTime.now().minusHours(i + 1),
                    "ipAddress", String.valueOf(row[0])
            ));
        }
        return userStats;
    }
}