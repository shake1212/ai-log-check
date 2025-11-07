// service/impl/ThreatDetectionServiceImpl.java
package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.entity.SecurityLog;
import com.security.ailogsystem.entity.SecurityAlert;
import com.security.ailogsystem.repository.SecurityAlertRepository;
import com.security.ailogsystem.service.AlertService;
import com.security.ailogsystem.service.ThreatDetectionService;
import com.security.ailogsystem.service.WebSocketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class ThreatDetectionServiceImpl implements ThreatDetectionService {

    private static final Logger logger = LoggerFactory.getLogger(ThreatDetectionServiceImpl.class);

    @Autowired
    private SecurityAlertRepository alertRepository;

    @Autowired
    private AlertService alertService;

    @Autowired
    private WebSocketService webSocketService;

    @Value("${security.detection.brute-force.threshold:5}")
    private int bruteForceThreshold;

    @Value("${security.detection.brute-force.window-minutes:10}")
    private int bruteForceWindowMinutes;

    // 关键安全事件ID
    private static final Set<Integer> CRITICAL_EVENTS = Set.of(4625, 4720, 4728, 4732, 4733, 4738);

    // 特权账户名称
    private static final Set<String> PRIVILEGED_ACCOUNTS = Set.of(
            "administrator", "admin", "system", "root"
    );

    // 威胁等级权重映射
    private static final Map<String, Integer> THREAT_LEVEL_WEIGHTS = Map.of(
            "LOW", 1,
            "MEDIUM", 2,
            "HIGH", 3,
            "CRITICAL", 4
    );

    // 暴力破解检测
    private final Map<String, List<LocalDateTime>> failedLogins = new ConcurrentHashMap<>();
    private final Map<String, Object> detectionRules = new ConcurrentHashMap<>();

    // 威胁统计
    private final Map<String, Long> threatStatistics = new ConcurrentHashMap<>();

    public ThreatDetectionServiceImpl() {
        // 初始化默认规则
        initializeDefaultRules();
        initializeThreatStatistics();
    }

    @Override
    public void analyzeThreat(SecurityLog log) {
        String threatLevel = "LOW";
        List<String> detectedThreats = new ArrayList<>();

        // 基于规则的基础检测
        if (isCriticalEvent(log)) {
            threatLevel = getHigherThreatLevel(threatLevel, "HIGH");
            detectedThreats.add("CRITICAL_EVENT");
        }

        // 暴力破解检测
        if (detectBruteForceAttack(log)) {
            threatLevel = getHigherThreatLevel(threatLevel, "CRITICAL");
            detectedThreats.add("BRUTE_FORCE_ATTACK");
        }

        // 异常时间登录检测
        if (detectUnusualLogin(log)) {
            threatLevel = getHigherThreatLevel(threatLevel, "MEDIUM");
            detectedThreats.add("UNUSUAL_TIME_LOGIN");
        }

        // 特权账户操作检测
        if (detectPrivilegedOperation(log)) {
            threatLevel = getHigherThreatLevel(threatLevel, "HIGH");
            detectedThreats.add("PRIVILEGED_OPERATION");
        }

        // 可疑IP检测
        if (detectSuspiciousIp(log)) {
            threatLevel = getHigherThreatLevel(threatLevel, "MEDIUM");
            detectedThreats.add("SUSPICIOUS_IP");
        }

        log.setThreatLevel(threatLevel);

        // 创建警报
        if (!detectedThreats.isEmpty() && !threatLevel.equals("LOW")) {
            createSecurityAlerts(log, detectedThreats, threatLevel);
        }

        // 更新统计
        updateThreatStatistics(threatLevel);
    }

    @Override
    public List<SecurityAlert> analyzeThreats(List<SecurityLog> logs) {
        List<SecurityAlert> alerts = new ArrayList<>();

        for (SecurityLog log : logs) {
            analyzeThreat(log);
        }

        // 获取最近创建的警报
        try {
            List<SecurityAlert> recentAlerts = alertRepository.findTop10ByOrderByCreatedTimeDesc();
            alerts.addAll(recentAlerts);
        } catch (Exception e) {
            logger.error("获取最近警报失败", e);
        }

        return alerts.stream().distinct().collect(Collectors.toList());
    }

    @Override
    public boolean detectBruteForceAttack(SecurityLog log) {
        if (log.getEventId() == 4625 && log.getIpAddress() != null) { // 登录失败
            String ip = log.getIpAddress();
            LocalDateTime now = LocalDateTime.now();

            // 清理过期记录
            cleanupExpiredRecords();

            // 记录失败登录
            failedLogins.computeIfAbsent(ip, k -> new ArrayList<>()).add(now);

            // 检查阈值
            List<LocalDateTime> attempts = failedLogins.get(ip);
            LocalDateTime thresholdTime = now.minusMinutes(bruteForceWindowMinutes);

            long recentAttempts = attempts.stream()
                    .filter(time -> time.isAfter(thresholdTime))
                    .count();

            return recentAttempts >= bruteForceThreshold;
        }
        return false;
    }

    @Override
    public boolean detectUnusualLogin(SecurityLog log) {
        if (log.getEventId() == 4624) { // 登录成功
            int hour = log.getEventTime().getHour();
            // 凌晨0点到6点或非工作时间视为异常时间
            return hour >= 0 && hour <= 6 || (hour >= 22 && hour <= 23);
        }
        return false;
    }

    @Override
    public boolean detectPrivilegedOperation(SecurityLog log) {
        if (log.getUserName() != null) {
            String userName = log.getUserName().toLowerCase();
            return PRIVILEGED_ACCOUNTS.stream()
                    .anyMatch(privileged -> userName.contains(privileged));
        }
        return false;
    }

    @Override
    public Map<String, Object> getThreatStatistics() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("threatLevels", new HashMap<>(threatStatistics));
        stats.put("bruteForceDetections", failedLogins.size());
        stats.put("activeRules", detectionRules.size());

        // 添加最近24小时统计
        LocalDateTime last24Hours = LocalDateTime.now().minusHours(24);
        Long recentAlerts = alertRepository.countByCreatedTimeAfter(last24Hours);
        stats.put("recentAlerts", recentAlerts);

        return stats;
    }

    @Override
    public void updateDetectionRules(Map<String, Object> rules) {
        detectionRules.putAll(rules);
        logger.info("更新威胁检测规则，当前规则数量: {}", detectionRules.size());
    }

    /**
     * 检测可疑IP地址
     */
    private boolean detectSuspiciousIp(SecurityLog log) {
        if (log.getIpAddress() == null) {
            return false;
        }

        String ip = log.getIpAddress();

        // 检查内网IP（这里只是示例，实际应该更复杂）
        if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
            return false; // 内网IP不视为可疑
        }

        // 检查已知的可疑IP模式（这里只是示例）
        @SuppressWarnings("unchecked")
        List<String> suspiciousIpPatterns = (List<String>) detectionRules.getOrDefault(
                "suspiciousIpPatterns", Collections.emptyList());

        return suspiciousIpPatterns.stream().anyMatch(ip::contains);
    }

    /**
     * 检测关键安全事件
     */
    private boolean isCriticalEvent(SecurityLog log) {
        return CRITICAL_EVENTS.contains(log.getEventId());
    }

    /**
     * 清理过期记录
     */
    private void cleanupExpiredRecords() {
        LocalDateTime thresholdTime = LocalDateTime.now().minusMinutes(bruteForceWindowMinutes);

        failedLogins.entrySet().removeIf(entry -> {
            entry.getValue().removeIf(time -> time.isBefore(thresholdTime));
            return entry.getValue().isEmpty();
        });
    }

    /**
     * 创建安全警报
     */
    private void createSecurityAlerts(SecurityLog log, List<String> threatTypes, String threatLevel) {
        for (String threatType : threatTypes) {
            String description = generateAlertDescription(log, threatType);
            SecurityAlert.AlertLevel level = determineAlertLevel(threatLevel);

            SecurityAlert alert = new SecurityAlert(level, threatType, description);
            alert.setSecurityLog(log);

            alertService.createAlert(alert);

            logger.warn("创建安全警报: {} - {}", threatType, description);
        }
    }

    /**
     * 生成警报描述
     */
    private String generateAlertDescription(SecurityLog log, String threatType) {
        switch (threatType) {
            case "BRUTE_FORCE_ATTACK":
                return String.format("检测到暴力破解攻击来自IP: %s", log.getIpAddress());
            case "UNUSUAL_TIME_LOGIN":
                return String.format("检测到异常时间登录: %s", log.getUserName());
            case "PRIVILEGED_OPERATION":
                return String.format("检测到特权账户操作: %s", log.getUserName());
            case "CRITICAL_EVENT":
                return String.format("检测到关键安全事件: %d", log.getEventId());
            case "SUSPICIOUS_IP":
                return String.format("检测到可疑IP访问: %s", log.getIpAddress());
            default:
                return String.format("检测到安全威胁: %s", threatType);
        }
    }

    /**
     * 确定警报等级
     */
    private SecurityAlert.AlertLevel determineAlertLevel(String threatLevel) {
        return switch (threatLevel) {
            case "CRITICAL" -> SecurityAlert.AlertLevel.CRITICAL;
            case "HIGH" -> SecurityAlert.AlertLevel.HIGH;
            case "MEDIUM" -> SecurityAlert.AlertLevel.MEDIUM;
            default -> SecurityAlert.AlertLevel.LOW;
        };
    }

    /**
     * 比较威胁等级，返回更高的等级
     */
    private String getHigherThreatLevel(String currentLevel, String newLevel) {
        Integer currentWeight = THREAT_LEVEL_WEIGHTS.getOrDefault(currentLevel, 0);
        Integer newWeight = THREAT_LEVEL_WEIGHTS.getOrDefault(newLevel, 0);

        return newWeight > currentWeight ? newLevel : currentLevel;
    }

    /**
     * 更新威胁统计
     */
    private void updateThreatStatistics(String threatLevel) {
        threatStatistics.merge(threatLevel, 1L, Long::sum);
    }

    /**
     * 初始化默认规则
     */
    private void initializeDefaultRules() {
        detectionRules.put("bruteForceThreshold", bruteForceThreshold);
        detectionRules.put("bruteForceWindowMinutes", bruteForceWindowMinutes);
        detectionRules.put("suspiciousIpPatterns", Arrays.asList(
                "unknown", "test", "guest"
        ));
        detectionRules.put("unusualTimeStart", 0);
        detectionRules.put("unusualTimeEnd", 6);
    }

    /**
     * 初始化威胁统计
     */
    private void initializeThreatStatistics() {
        threatStatistics.put("LOW", 0L);
        threatStatistics.put("MEDIUM", 0L);
        threatStatistics.put("HIGH", 0L);
        threatStatistics.put("CRITICAL", 0L);
    }
}