package com.security.ailogsystem.service;

import com.security.ailogsystem.model.UnifiedSecurityEvent;
import com.security.ailogsystem.repository.UnifiedEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdvancedAnomalyDetector {

    private final UnifiedEventRepository eventRepository;

    // 关键词模式
    private static final Map<String, Pattern> THREAT_PATTERNS = Map.of(
            "AUTH_FAILURE", Pattern.compile("(failed|denied|invalid|rejected|unauthorized)", Pattern.CASE_INSENSITIVE),
            "PRIVILEGE_ESCALATION", Pattern.compile("(admin|root|sudo|privilege|elevation)", Pattern.CASE_INSENSITIVE),
            "MALWARE", Pattern.compile("(malware|virus|trojan|backdoor|ransomware|miner)", Pattern.CASE_INSENSITIVE),
            "NETWORK_ATTACK", Pattern.compile("(port scan|brute force|ddos|exploit|injection)", Pattern.CASE_INSENSITIVE),
            "SUSPICIOUS_PROCESS", Pattern.compile("(coinminer|bitcoin|eth|monero|mining)", Pattern.CASE_INSENSITIVE)
    );

    // 可疑端口
    private static final Set<Integer> SUSPICIOUS_PORTS = Set.of(23, 4444, 5555, 6666, 6667, 1337, 31337);

    // 缓存减少数据库查询
    private final Map<String, CacheItem> frequencyCache = new ConcurrentHashMap<>();
    private final Map<String, Long> statisticalCache = new ConcurrentHashMap<>();
    private LocalDateTime lastStatisticalUpdate = LocalDateTime.now().minusHours(1);

    // 需要频率检测的事件类型
    private static final Set<String> FREQUENCY_CHECK_EVENTS = Set.of(
            "LOGIN_FAILURE", "AUTH_FAILURE", "SECURITY_EVENT", "SUSPICIOUS_PROCESS"
    );

    public void detectAnomalies(UnifiedSecurityEvent event) {
        AnomalyDetectionResult result = new AnomalyDetectionResult();

        try {
            // 1. 关键词检测（无数据库查询）
            result.addScore(detectByKeywords(event), "关键词匹配");

            // 2. 优化的频率异常检测
            result.addScore(detectFrequencyAnomalyOptimized(event), "频率异常");

            // 3. 行为模式检测（无数据库查询）
            result.addScore(detectBehaviorPattern(event), "行为模式异常");

            // 4. 网络异常检测（无数据库查询）
            result.addScore(detectNetworkAnomaly(event), "网络异常");

            // 5. 优化的统计异常检测
            result.addScore(detectStatisticalAnomalyOptimized(event), "统计异常");

            // 应用检测结果
            if (result.getFinalScore() > 0.6) {
                event.setIsAnomaly(true);
                event.setAnomalyScore(result.getFinalScore());
                event.setAnomalyReason(String.join("; ", result.getReasons()));
                event.setDetectionAlgorithm("MULTI_LAYER");

                // 设置威胁等级
                if (result.getFinalScore() > 0.9) {
                    event.setThreatLevel("CRITICAL");
                } else if (result.getFinalScore() > 0.7) {
                    event.setThreatLevel("HIGH");
                } else {
                    event.setThreatLevel("MEDIUM");
                }
            }
        } catch (Exception e) {
            log.warn("异常检测过程中发生错误: {}", e.getMessage());
            // 不中断处理，继续保存事件
        }
    }

    private double detectByKeywords(UnifiedSecurityEvent event) {
        String message = (event.getNormalizedMessage() != null ?
                event.getNormalizedMessage() : event.getRawMessage()).toLowerCase();

        double maxScore = 0.0;
        for (Map.Entry<String, Pattern> entry : THREAT_PATTERNS.entrySet()) {
            if (entry.getValue().matcher(message).find()) {
                maxScore = Math.max(maxScore, 0.7);

                // 特定类型的关键词有更高权重
                if (entry.getKey().equals("MALWARE") || entry.getKey().equals("NETWORK_ATTACK")) {
                    maxScore = 0.9;
                }
            }
        }

        return maxScore;
    }

    /**
     * 优化的频率异常检测 - 减少数据库查询
     */
    private double detectFrequencyAnomalyOptimized(UnifiedSecurityEvent event) {
        // 只对特定事件类型进行频率检测
        if (!shouldCheckFrequency(event)) {
            return 0.0;
        }

        LocalDateTime fiveMinutesAgo = LocalDateTime.now().minusMinutes(5);
        LocalDateTime now = LocalDateTime.now();

        try {
            // 检测同一IP的登录失败频率
            if (event.getEventType().equals("LOGIN_FAILURE") && event.getSourceIp() != null) {
                String cacheKey = "LOGIN_FAILURE_" + event.getSourceIp();
                long recentFailures = getCachedCount(cacheKey, "LOGIN_FAILURE", event.getSourceIp(), fiveMinutesAgo, now);

                if (recentFailures > 10) return 0.9;
                if (recentFailures > 5) return 0.7;
            }

            // 检测同一用户的异常事件频率
            if (event.getUserId() != null) {
                String cacheKey = "USER_ANOMALY_" + event.getUserId();
                long userAnomalies = getCachedCount(cacheKey, null, event.getUserId(), fiveMinutesAgo, now, true);

                if (userAnomalies > 5) return 0.8;
            }

        } catch (Exception e) {
            log.warn("频率检测查询失败: {}", e.getMessage());
            // 查询失败不影响整体检测
        }

        return 0.0;
    }

    /**
     * 判断是否需要频率检测
     */
    private boolean shouldCheckFrequency(UnifiedSecurityEvent event) {
        return FREQUENCY_CHECK_EVENTS.contains(event.getEventType()) &&
                (event.getSourceIp() != null || event.getUserId() != null);
    }

    /**
     * 获取缓存的计数，避免重复查询
     */
    private long getCachedCount(String cacheKey, String eventType, String identifier,
                                LocalDateTime start, LocalDateTime end) {
        return getCachedCount(cacheKey, eventType, identifier, start, end, false);
    }

    private long getCachedCount(String cacheKey, String eventType, String identifier,
                                LocalDateTime start, LocalDateTime end, boolean isAnomaly) {
        // 检查缓存
        CacheItem cached = frequencyCache.get(cacheKey);
        if (cached != null && cached.isValid()) {
            return cached.getCount();
        }

        // 执行查询
        long count;
        if (isAnomaly) {
            count = eventRepository.countByIsAnomalyTrueAndUserIdAndTimestampBetween(identifier, start, end);
        } else {
            count = eventRepository.countByEventTypeAndSourceIpAndTimestampBetween(eventType, identifier, start, end);
        }

        // 更新缓存
        frequencyCache.put(cacheKey, new CacheItem(count, LocalDateTime.now()));
        return count;
    }

    private double detectBehaviorPattern(UnifiedSecurityEvent event) {
        // 检测异常时间活动（非工作时间）
        int hour = event.getTimestamp().getHour();
        if ((hour < 6 || hour > 22) &&
                (event.getEventType().contains("LOGIN") || event.getEventType().contains("PROCESS"))) {
            return 0.6;
        }

        // 检测系统关键文件访问
        if (event.getProcessName() != null &&
                (event.getProcessName().contains("explorer") || event.getProcessName().contains("bash")) &&
                event.getEventType().contains("FILE_ACCESS")) {
            return 0.5;
        }

        return 0.0;
    }

    private double detectNetworkAnomaly(UnifiedSecurityEvent event) {
        // 检测可疑端口连接
        if (event.getDestinationPort() != null && SUSPICIOUS_PORTS.contains(event.getDestinationPort())) {
            return 0.8;
        }

        // 检测外部到内部的异常连接
        if (event.getSourceIp() != null && event.getDestinationIp() != null &&
                isExternalIp(event.getSourceIp()) && isInternalIp(event.getDestinationIp()) &&
                !event.getEventType().contains("AUTHORIZED")) {
            return 0.7;
        }

        return 0.0;
    }

    /**
     * 优化的统计异常检测 - 减少查询频率
     */
    private double detectStatisticalAnomalyOptimized(UnifiedSecurityEvent event) {
        // 每小时更新一次统计缓存
        if (lastStatisticalUpdate.isBefore(LocalDateTime.now().minusHours(1))) {
            updateStatisticalCache();
            lastStatisticalUpdate = LocalDateTime.now();
        }

        String eventType = event.getEventType();
        Long currentCount = statisticalCache.get("CURRENT_" + eventType);
        Long historicalAvg = statisticalCache.get("HISTORICAL_" + eventType);

        // 如果当前频率显著高于历史平均
        if (historicalAvg != null && historicalAvg > 0 &&
                currentCount != null && currentCount > historicalAvg * 3) {
            return 0.6;
        }

        return 0.0;
    }

    /**
     * 更新统计缓存
     */
    private void updateStatisticalCache() {
        try {
            LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
            LocalDateTime oneWeekAgo = LocalDateTime.now().minusDays(7);
            LocalDateTime now = LocalDateTime.now();

            // 更新常见事件类型的统计
            for (String eventType : FREQUENCY_CHECK_EVENTS) {
                long currentCount = eventRepository.countByEventTypeAndTimestampBetween(eventType, oneHourAgo, now);
                long historicalCount = eventRepository.countByEventTypeAndTimestampBetween(eventType, oneWeekAgo, now);
                long historicalAvg = historicalCount / (7 * 24); // 每周平均每小时

                statisticalCache.put("CURRENT_" + eventType, currentCount);
                statisticalCache.put("HISTORICAL_" + eventType, historicalAvg);
            }
        } catch (Exception e) {
            log.warn("更新统计缓存失败: {}", e.getMessage());
        }
    }

    private boolean isExternalIp(String ip) {
        // 简单的内网IP检测
        return ip != null &&
                !ip.startsWith("192.168.") &&
                !ip.startsWith("10.") &&
                !ip.startsWith("172.16.") &&
                !ip.startsWith("127.0.0.1");
    }

    private boolean isInternalIp(String ip) {
        return ip != null &&
                (ip.startsWith("192.168.") ||
                        ip.startsWith("10.") ||
                        ip.startsWith("172.16.") ||
                        ip.startsWith("127.0.0.1"));
    }

    // 缓存项类
    private static class CacheItem {
        private final long count;
        private final LocalDateTime timestamp;

        public CacheItem(long count, LocalDateTime timestamp) {
            this.count = count;
            this.timestamp = timestamp;
        }

        public long getCount() {
            return count;
        }

        public boolean isValid() {
            // 缓存有效期为1分钟
            return timestamp.isAfter(LocalDateTime.now().minusMinutes(1));
        }
    }

    // 内部结果类
    private static class AnomalyDetectionResult {
        private double totalScore = 0.0;
        private int detectionCount = 0;
        private List<String> reasons = new ArrayList<>();

        public void addScore(double score, String reason) {
            if (score > 0) {
                totalScore += score;
                detectionCount++;
                reasons.add(reason + "(" + String.format("%.2f", score) + ")");
            }
        }

        public double getFinalScore() {
            return detectionCount > 0 ? totalScore / detectionCount : 0.0;
        }

        public List<String> getReasons() {
            return reasons;
        }
    }

    /**
     * 清理过期缓存（可选，定期调用）
     */
    public void cleanupExpiredCache() {
        frequencyCache.entrySet().removeIf(entry -> !entry.getValue().isValid());
        log.debug("清理过期缓存完成，当前缓存大小: {}", frequencyCache.size());
    }
}