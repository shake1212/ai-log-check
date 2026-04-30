package com.security.ailogsystem.service;

import com.security.ailogsystem.model.UnifiedSecurityEvent;
import com.security.ailogsystem.repository.UnifiedEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdvancedAnomalyDetector {

    private final UnifiedEventRepository eventRepository;
    private final ThreatSignatureService threatSignatureService;
    private final AdaptiveThresholdManager thresholdManager;

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

    private static final Map<String, Integer> THREAT_LEVEL_PRIORITY = Map.of(
            "LOW", 0,
            "MEDIUM", 1,
            "HIGH", 2,
            "CRITICAL", 3
    );

    public void detectAnomalies(UnifiedSecurityEvent event) {
        Set<String> skipEventTypes = Set.of(
                "MEMORY_USAGE", "CPU_USAGE", "DISK_USAGE", "NETWORK_USAGE",
                "COLLECTOR_STATUS", "COLLECTOR_ERROR", "COLLECTOR_STOPPED",
                "APPLICATION_METRICS", "PERFORMANCE_METRIC",
                "SYSTEM_PERFORMANCE", "SYSTEM_CPU_INFO", "SYSTEM_MEMORY_INFO",
                "SYSTEM_DISK_INFO", "SYSTEM_PROCESS_INFO", "SYSTEM_NETWORK_INFO","SYSTEM_SYSTEM_BASIC"
        );
        if (skipEventTypes.contains(event.getEventType())) {
            log.debug("跳过非安全事件的异常检测: eventType={}, id={}",
                    event.getEventType(), event.getId());
            return;
        }
        AnomalyDetectionResult result = new AnomalyDetectionResult();

        try {
            // 0. 特征库匹配
            threatSignatureService.matchSignatures(event).ifPresent(match -> {
                result.addScore(match.score(), match.reason());
                applySignatureImpact(event, match);
            });

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
            
            // 6. 新增：时序异常检测
            double timeSeriesScore = detectTimeSeriesAnomaly(event);
            
            // 7. 新增：关联分析
            double correlationScore = detectCorrelation(event);
            
            // 8. 新的评分融合逻辑
            double finalScore = calculateWeightedScore(
                timeSeriesScore,           // 时序得分
                correlationScore,          // 关联得分
                result.getRuleScore(),     // 规则得分
                0.0,                       // ML得分（暂不实现）
                event
            );

            // 应用检测结果
            if (finalScore > 0.6) {
                event.setIsAnomaly(true);
                event.setAnomalyScore(finalScore);
                event.setAiAnomalyScore(finalScore);  // 设置AI分数
                event.setAnomalyReason(String.join("; ", result.getReasons()));
                event.setDetectionAlgorithm("MULTI_LAYER_V2");  // 标记新算法

                // 设置威胁等级
                if (finalScore > 0.9) {
                    event.setThreatLevel("CRITICAL");
                } else if (finalScore > 0.7) {
                    event.setThreatLevel("HIGH");
                } else {
                    event.setThreatLevel("MEDIUM");
                }
                
                log.debug("检测到异常: eventType={}, score={}, reasons={}", 
                    event.getEventType(), finalScore, event.getAnomalyReason());
            }
        } catch (Exception e) {
            log.warn("异常检测过程中发生错误: {}", e.getMessage());
            // 不中断处理，继续保存事件
        }
    }

    private void applySignatureImpact(UnifiedSecurityEvent event, ThreatSignatureService.SignatureMatch match) {
        if (match == null || match.signature() == null) {
            return;
        }

        var signature = match.signature();

        if (StringUtils.hasText(signature.getSeverity())) {
            String candidate = signature.getSeverity().toUpperCase(Locale.ROOT);
            String current = Optional.ofNullable(event.getThreatLevel()).orElse("LOW");
            event.setThreatLevel(maxThreatLevel(current, candidate));
        }

        if (StringUtils.hasText(signature.getThreatType()) && !StringUtils.hasText(event.getEventSubType())) {
            event.setEventSubType(signature.getThreatType());
        }
    }

    private String maxThreatLevel(String current, String candidate) {
        Integer currentScore = THREAT_LEVEL_PRIORITY.getOrDefault(current.toUpperCase(Locale.ROOT), 0);
        Integer candidateScore = THREAT_LEVEL_PRIORITY.getOrDefault(candidate.toUpperCase(Locale.ROOT), 0);
        return candidateScore > currentScore ? candidate.toUpperCase(Locale.ROOT) : current.toUpperCase(Locale.ROOT);
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
        private double ruleScore = 0.0;  // 规则得分

        public void addScore(double score, String reason) {
            if (score > 0) {
                totalScore += score;
                detectionCount++;
                reasons.add(reason + "(" + String.format("%.2f", score) + ")");
                ruleScore = Math.max(ruleScore, score);  // 保存最大规则得分
            }
        }

        public double getFinalScore() {
            return detectionCount > 0 ? totalScore / detectionCount : 0.0;
        }

        public List<String> getReasons() {
            return reasons;
        }
        
        public double getRuleScore() {
            return ruleScore;
        }
    }

    /**
     * 清理过期缓存（可选，定期调用）
     */
    public void cleanupExpiredCache() {
        frequencyCache.entrySet().removeIf(entry -> !entry.getValue().isValid());
        log.debug("清理过期缓存完成，当前缓存大小: {}", frequencyCache.size());
    }
    
    // ==================== 新增：时序异常检测 ====================
    
    // 时序数据缓存
    private final ConcurrentHashMap<String, Deque<Double>> timeSeriesCache = new ConcurrentHashMap<>();
    private final int timeSeriesWindow = 20;
    
    /**
     * 时序异常检测
     */
    private double detectTimeSeriesAnomaly(UnifiedSecurityEvent event) {
        String key = getTimeSeriesKey(event);
        double value = extractTimeSeriesValue(event);
        
        Deque<Double> series = timeSeriesCache.computeIfAbsent(
            key, k -> new ArrayDeque<>()
        );
        
        double score = 0.0;
        
        if (series.size() >= 5) {
            // 1. Z-score检测
            double mean = series.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            double std = Math.sqrt(series.stream()
                .mapToDouble(v -> Math.pow(v - mean, 2))
                .average().orElse(0.0));
            
            if (std > 0) {
                double zScore = Math.abs(value - mean) / std;
                if (zScore > 3.0) score = Math.max(score, 0.9);
                else if (zScore > 2.0) score = Math.max(score, 0.7);
                else if (zScore > 1.5) score = Math.max(score, 0.5);
            }
            
            // 2. 突增检测
            double recent = series.stream()
                .skip(Math.max(0, series.size() - 5))
                .mapToDouble(Double::doubleValue)
                .average().orElse(0.0);
            
            if (recent > 0 && value > recent * 2) {
                score = Math.max(score, 0.8);
            } else if (recent > 0 && value < recent * 0.5) {
                score = Math.max(score, 0.6);
            }
        }
        
        // 更新缓存
        series.addLast(value);
        if (series.size() > timeSeriesWindow) {
            series.removeFirst();
        }
        
        return score;
    }
    
    private String getTimeSeriesKey(UnifiedSecurityEvent event) {
        return event.getEventType();
    }
    
    private double extractTimeSeriesValue(UnifiedSecurityEvent event) {
        String message = event.getNormalizedMessage();
        if (message == null) message = event.getRawMessage();
        if (message == null) return 1.0;
        
        try {
            // 提取CPU值
            if (message.contains("CPU")) {
                Pattern pattern = Pattern.compile("CPU[=:]\\s*(\\d+\\.?\\d*)");
                java.util.regex.Matcher matcher = pattern.matcher(message);
                if (matcher.find()) {
                    return Double.parseDouble(matcher.group(1));
                }
            }
            
            // 提取内存值
            if (message.contains("内存") || message.contains("memory")) {
                Pattern pattern = Pattern.compile("(?:内存|memory)[=:]\\s*(\\d+\\.?\\d*)");
                java.util.regex.Matcher matcher = pattern.matcher(message);
                if (matcher.find()) {
                    return Double.parseDouble(matcher.group(1));
                }
            }
        } catch (Exception e) {
            // 忽略解析错误
        }
        
        return 1.0;
    }
    
    // ==================== 新增：关联分析 ====================
    
    /**
     * 关联分析
     */
    private double detectCorrelation(UnifiedSecurityEvent event) {
        double score = 0.0;
        
        try {
            LocalDateTime now = event.getTimestamp();
            LocalDateTime fiveMinutesAgo = now.minusMinutes(5);
            
            // 1. 同一IP关联
            if (event.getSourceIp() != null) {
                long ipAnomalyCount = eventRepository
                    .countBySourceIpAndIsAnomalyTrueAndTimestampBetween(
                        event.getSourceIp(), fiveMinutesAgo, now
                    );
                
                if (ipAnomalyCount >= 3) score = Math.max(score, 0.9);
                else if (ipAnomalyCount >= 2) score = Math.max(score, 0.7);
                else if (ipAnomalyCount >= 1) score = Math.max(score, 0.5);
            }
            
            // 2. 同一用户关联
            if (event.getUserId() != null) {
                long userAnomalyCount = eventRepository
                    .countByUserIdAndIsAnomalyTrueAndTimestampBetween(
                        event.getUserId(), fiveMinutesAgo, now
                    );
                
                if (userAnomalyCount >= 3) score = Math.max(score, 0.85);
                else if (userAnomalyCount >= 2) score = Math.max(score, 0.6);
            }
            
        } catch (Exception e) {
            log.debug("关联分析失败: {}", e.getMessage());
        }
        
        return score;
    }
    
    // ==================== 新增：加权评分融合 ====================
    
    /**
     * 计算加权评分
     */
    private double calculateWeightedScore(double timeSeriesScore, double correlationScore, 
                                          double ruleScore, double mlScore,
                                          UnifiedSecurityEvent event) {
        // 基础权重
        double wTimeSeries = 0.3;
        double wCorrelation = 0.2;
        double wRule = 0.4;
        double wML = 0.1;
        
        // 动态权重调整
        double adjustmentFactor = 1.0;
        
        // 1. 高危事件加权
        if ("CRITICAL".equals(event.getSeverity())) {
            adjustmentFactor += 0.4;
        } else if ("HIGH".equals(event.getSeverity())) {
            adjustmentFactor += 0.2;
        }
        
        // 2. 连续异常加权（通过关联分数判断）
        if (correlationScore > 0.7) {
            adjustmentFactor += 0.2;
        }
        
        // 限制调整范围
        adjustmentFactor = Math.max(0.5, Math.min(1.5, adjustmentFactor));
        
        // 应用动态权重
        wTimeSeries *= adjustmentFactor;
        wCorrelation *= adjustmentFactor;
        wRule *= adjustmentFactor;
        wML *= adjustmentFactor;
        
        // 归一化
        double total = wTimeSeries + wCorrelation + wRule + wML;
        
        // 计算最终得分
        return (wTimeSeries * timeSeriesScore + 
                wCorrelation * correlationScore + 
                wRule * ruleScore + 
                wML * mlScore) / total;
    }
}