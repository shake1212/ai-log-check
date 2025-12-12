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
        // 临时实现 - 实际应从数据库查询
        Map<String, Long> threatLevels = new HashMap<>();
        threatLevels.put("LOW", 1250L);
        threatLevels.put("MEDIUM", 320L);
        threatLevels.put("HIGH", 45L);
        threatLevels.put("CRITICAL", 12L);
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
        // 模拟活跃用户数
        return 85L;
    }

    private Integer calculateResponseTime(Long highRiskCount) {
        // 模拟响应时间，高风险越多，响应越慢
        return Math.max(40, 200 - Math.min(160, highRiskCount.intValue() * 5));
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

        // 模拟数据
        Map<String, Object> result = new HashMap<>();
        Map<String, Long> sourceStats = new HashMap<>();

        sourceStats.put("Windows Security", 1250L);
        sourceStats.put("Firewall", 850L);
        sourceStats.put("IDS/IPS", 320L);
        sourceStats.put("Application Logs", 450L);

        result.put("sources", sourceStats);
        result.put("totalSources", sourceStats.size());

        return result;
    }

    @Override
    public Map<String, Object> getAnomalyStatistics() {
        log.info("获取异常统计");

        // 模拟数据
        Map<String, Object> result = new HashMap<>();
        result.put("totalAnomalies", 87L);
        result.put("loginAnomalies", 45L);
        result.put("networkAnomalies", 22L);
        result.put("fileAnomalies", 15L);
        result.put("otherAnomalies", 5L);
        result.put("detectionRate", 98.5);

        return result;
    }

    @Override
    public List<Map<String, Object>> getTopIps(Integer limit) {
        log.info("获取Top IPs");

        List<Map<String, Object>> topIps = new ArrayList<>();

        // 模拟数据
        topIps.add(Map.of("ip", "192.168.1.100", "count", 1250L, "threatLevel", "HIGH"));
        topIps.add(Map.of("ip", "10.0.0.5", "count", 850L, "threatLevel", "MEDIUM"));
        topIps.add(Map.of("ip", "172.16.0.10", "count", 620L, "threatLevel", "LOW"));
        topIps.add(Map.of("ip", "203.0.113.25", "count", 450L, "threatLevel", "CRITICAL"));
        topIps.add(Map.of("ip", "198.51.100.33", "count", 380L, "threatLevel", "HIGH"));

        return topIps.subList(0, Math.min(limit, topIps.size()));
    }

    @Override
    public List<Map<String, Object>> getUserActivityStats(Integer limit) {
        log.info("获取用户活动统计");

        List<Map<String, Object>> userStats = new ArrayList<>();

        // 模拟数据
        userStats.add(Map.of(
                "username", "admin",
                "loginCount", 45L,
                "lastLogin", LocalDateTime.now().minusHours(2),
                "ipAddress", "192.168.1.100"
        ));

        userStats.add(Map.of(
                "username", "user1",
                "loginCount", 28L,
                "lastLogin", LocalDateTime.now().minusHours(5),
                "ipAddress", "10.0.0.5"
        ));

        userStats.add(Map.of(
                "username", "operator",
                "loginCount", 15L,
                "lastLogin", LocalDateTime.now().minusDays(1),
                "ipAddress", "172.16.0.10"
        ));

        return userStats.subList(0, Math.min(limit, userStats.size()));
    }
}