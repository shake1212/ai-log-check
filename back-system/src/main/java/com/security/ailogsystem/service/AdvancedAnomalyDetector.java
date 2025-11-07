package com.security.ailogsystem.service;

import com.security.ailogsystem.model.UnifiedSecurityEvent;
import com.security.ailogsystem.repository.UnifiedEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
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

    public void detectAnomalies(UnifiedSecurityEvent event) {
        AnomalyDetectionResult result = new AnomalyDetectionResult();

        // 1. 关键词检测
        result.addScore(detectByKeywords(event), "关键词匹配");

        // 2. 频率异常检测
        result.addScore(detectFrequencyAnomaly(event), "频率异常");

        // 3. 行为模式检测
        result.addScore(detectBehaviorPattern(event), "行为模式异常");

        // 4. 网络异常检测
        result.addScore(detectNetworkAnomaly(event), "网络异常");

        // 5. 统计异常检测
        result.addScore(detectStatisticalAnomaly(event), "统计异常");

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

    private double detectFrequencyAnomaly(UnifiedSecurityEvent event) {
        LocalDateTime fiveMinutesAgo = LocalDateTime.now().minusMinutes(5);
        LocalDateTime now = LocalDateTime.now();

        // 检测同一IP的登录失败频率
        if (event.getEventType().equals("LOGIN_FAILURE") && event.getSourceIp() != null) {
            long recentFailures = eventRepository.countByEventTypeAndSourceIpAndTimestampBetween(
                    "LOGIN_FAILURE", event.getSourceIp(), fiveMinutesAgo, now);

            if (recentFailures > 10) return 0.9; // 5分钟内10次以上失败
            if (recentFailures > 5) return 0.7;  // 5分钟内5-10次失败
        }

        // 检测同一用户的异常事件频率
        if (event.getUserId() != null && event.getIsAnomaly()) {
            long userAnomalies = eventRepository.countByIsAnomalyTrueAndUserIdAndTimestampBetween(
                    event.getUserId(), fiveMinutesAgo, now);

            if (userAnomalies > 5) return 0.8;
        }

        return 0.0;
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

    private double detectStatisticalAnomaly(UnifiedSecurityEvent event) {
        // 基于历史基线的统计异常检测
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        LocalDateTime oneWeekAgo = LocalDateTime.now().minusDays(7);
        LocalDateTime now = LocalDateTime.now();

        // 计算当前事件类型的平均频率
        long currentCount = eventRepository.countByEventTypeAndTimestampBetween(
                event.getEventType(), oneHourAgo, now);

        long historicalAvg = eventRepository.countByEventTypeAndTimestampBetween(
                event.getEventType(), oneWeekAgo, now) / (7 * 24);

        // 如果当前频率显著高于历史平均
        if (historicalAvg > 0 && currentCount > historicalAvg * 3) {
            return 0.6;
        }

        return 0.0;
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
}