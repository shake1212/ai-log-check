package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.request.AlertRequest;
import com.security.ailogsystem.repository.AlertRepository;
import com.security.ailogsystem.repository.UnifiedEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "alert.auto.enabled", havingValue = "true", matchIfMissing = false)
public class AutoAlertScheduler {

    private final AlertService alertService;
    private final SystemInfoService systemInfoService;
    private final EventAlertBridgeService eventAlertBridgeService;
    private final AlertRepository alertRepository;
    private final UnifiedEventRepository eventRepository;

    private static final int ALERT_DEDUP_MINUTES = 30;

    @Scheduled(fixedRate = 300000)
    public void checkSystemPerformance() {
        log.info("开始定时系统性能检查...");

        try {
            Map<String, Object> performanceData = systemInfoService.collectPerformanceDataQuick();

            Object cpuPercentObj = performanceData.get("cpu_percent");
            if (cpuPercentObj instanceof Number) {
                double cpuPercent = ((Number) cpuPercentObj).doubleValue();
                if (cpuPercent > 90) {
                    createPerformanceAlertWithMetrics("CPU_USAGE_HIGH", "CRITICAL",
                            String.format("CPU使用率过高: %.1f%%", cpuPercent), 0.95, cpuPercent, 90.0);
                } else if (cpuPercent > 80) {
                    createPerformanceAlertWithMetrics("CPU_USAGE_HIGH", "HIGH",
                            String.format("CPU使用率较高: %.1f%%", cpuPercent), 0.85, cpuPercent, 80.0);
                }
            }

            Object memoryPercentObj = performanceData.get("memory_percent");
            if (memoryPercentObj instanceof Number) {
                double memoryPercent = ((Number) memoryPercentObj).doubleValue();
                if (memoryPercent > 95) {
                    createPerformanceAlertWithMetrics("MEMORY_USAGE_HIGH", "CRITICAL",
                            String.format("内存使用率过高: %.1f%%", memoryPercent), 0.96, memoryPercent, 95.0);
                } else if (memoryPercent > 90) {
                    createPerformanceAlertWithMetrics("MEMORY_USAGE_HIGH", "HIGH",
                            String.format("内存使用率较高: %.1f%%", memoryPercent), 0.88, memoryPercent, 90.0);
                }
            }

            log.info("系统性能检查完成");

        } catch (Exception e) {
            log.error("系统性能检查失败", e);
        }
    }

    @Scheduled(fixedRate = 600000)
    public void checkSuspiciousProcesses() {
        log.info("开始定时进程检查...");

        try {
            Map<String, Object> processInfo = systemInfoService.collectQuickProcessInfo(50);

            if (processInfo.containsKey("processes") && processInfo.get("processes") instanceof List) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> processes =
                        (List<Map<String, Object>>) processInfo.get("processes");

                for (Map<String, Object> process : processes) {
                    String processName = (String) process.getOrDefault("name", "");
                    Object cpuObj = process.get("cpu");
                    Object memoryObj = process.get("memory");

                    if (isSuspiciousProcess(processName)) {
                        createSuspiciousProcessAlert(process);
                    }

                    if (cpuObj instanceof Number && memoryObj instanceof Number) {
                        double cpu = ((Number) cpuObj).doubleValue();
                        double memory = ((Number) memoryObj).doubleValue();

                        if (cpu > 50 || memory > 30) {
                            createHighResourceProcessAlert(process, cpu, memory);
                        }
                    }
                }
            }

            log.info("进程检查完成");

        } catch (Exception e) {
            log.error("进程检查失败", e);
        }
    }

    @Scheduled(fixedRate = 900000)
    public void checkNetworkAnomalies() {
        log.info("开始定时网络检查...");

        try {
            Map<String, Object> networkStats = systemInfoService.collectNetworkStats();

            Object bytesRecvRate = networkStats.get("bytes_recv_rate");
            Object bytesSentRate = networkStats.get("bytes_sent_rate");

            if (bytesRecvRate instanceof Number && bytesSentRate instanceof Number) {
                double recvRate = ((Number) bytesRecvRate).doubleValue();
                double sentRate = ((Number) bytesSentRate).doubleValue();

                if (recvRate > 1000000 || sentRate > 1000000) {
                    createNetworkAlert("HIGH_NETWORK_TRAFFIC", "MEDIUM",
                            String.format("检测到高网络流量: 接收=%.2f B/s, 发送=%.2f B/s", recvRate, sentRate),
                            0.75);
                }
            }

            log.info("网络检查完成");

        } catch (Exception e) {
            log.error("网络检查失败", e);
        }
    }

    private boolean hasRecentUnhandledAlert(String alertType) {
        LocalDateTime since = LocalDateTime.now().minusMinutes(ALERT_DEDUP_MINUTES);
        return alertRepository.countRecentUnhandledByType(alertType, since) > 0;
    }

    private static final Map<String, List<String>> EVENT_TYPE_ALIASES = Map.of(
            "LOGIN_FAILURE", List.of("LOGIN_FAILURE", "AUTH_FAILURE"),
            "AUTH_FAILURE", List.of("AUTH_FAILURE", "LOGIN_FAILURE"),
            "LOGIN_SUCCESS", List.of("LOGIN_SUCCESS", "AUTH_SUCCESS"),
            "BRUTE_FORCE", List.of("BRUTE_FORCE", "BRUTE_FORCE_ATTACK"),
            "BRUTE_FORCE_ATTACK", List.of("BRUTE_FORCE_ATTACK", "BRUTE_FORCE")
    );

    private Long findRelatedEventId(String eventType) {
        LocalDateTime since = LocalDateTime.now().minusMinutes(ALERT_DEDUP_MINUTES);
        List<String> eventTypes = EVENT_TYPE_ALIASES.getOrDefault(eventType, List.of(eventType));
        for (String type : eventTypes) {
            List<Long> ids = eventRepository.findRecentIdByEventType(type, since);
            if (!ids.isEmpty()) return ids.get(0);
        }
        return null;
    }

    private void createPerformanceAlertWithMetrics(String alertType, String level, String description,
                                                    double confidence, Double metricValue, Double threshold) {
        try {
            if (hasRecentUnhandledAlert(alertType)) {
                log.debug("跳过重复告警: {} (30分钟内已有未处理的同类型告警)", alertType);
                return;
            }

            Long relatedEventId = findRelatedEventId(alertType);

            AlertRequest request = AlertRequest.builder()
                    .alertId(generateAlertId(alertType))
                    .source("SYSTEM_MONITOR")
                    .alertType(alertType)
                    .alertLevel(level)
                    .description(description)
                    .aiConfidence(BigDecimal.valueOf(confidence))
                    .metricValue(metricValue)
                    .threshold(threshold)
                    .unifiedEventId(relatedEventId)
                    .build();

            alertService.createAlert(request);
            log.info("创建性能告警: {} (关联事件: {})", description, relatedEventId);

        } catch (Exception e) {
            log.error("创建性能告警失败", e);
        }
    }

    private void createSuspiciousProcessAlert(Map<String, Object> process) {
        String processName = (String) process.getOrDefault("name", "Unknown");
        Object pid = process.get("pid");

        if (hasRecentUnhandledAlert("SUSPICIOUS_PROCESS")) return;

        String description = String.format("检测到可疑进程: %s (PID: %s)", processName, pid);
        Long relatedEventId = findRelatedEventId("SUSPICIOUS_PROCESS");

        AlertRequest request = AlertRequest.builder()
                .alertId(generateAlertId("SUSPICIOUS_PROCESS"))
                .source("PROCESS_MONITOR")
                .alertType("SUSPICIOUS_PROCESS")
                .alertLevel("HIGH")
                .description(description)
                .aiConfidence(BigDecimal.valueOf(0.80))
                .unifiedEventId(relatedEventId)
                .build();

        alertService.createAlert(request);
        log.info("创建可疑进程告警: {} (关联事件: {})", processName, relatedEventId);
    }

    private void createHighResourceProcessAlert(Map<String, Object> process, double cpu, double memory) {
        String processName = (String) process.getOrDefault("name", "Unknown");
        Object pid = process.get("pid");

        if (hasRecentUnhandledAlert("HIGH_RESOURCE_PROCESS")) return;

        String description = String.format("进程资源占用过高: %s (PID: %s, CPU: %.1f%%, 内存: %.1f%%)",
                processName, pid, cpu, memory);
        Long relatedEventId = findRelatedEventId("HIGH_RESOURCE_PROCESS");

        AlertRequest request = AlertRequest.builder()
                .alertId(generateAlertId("HIGH_RESOURCE_PROCESS"))
                .source("PROCESS_MONITOR")
                .alertType("HIGH_RESOURCE_PROCESS")
                .alertLevel("MEDIUM")
                .description(description)
                .aiConfidence(BigDecimal.valueOf(0.85))
                .unifiedEventId(relatedEventId)
                .build();

        alertService.createAlert(request);
    }

    private void createNetworkAlert(String alertType, String level, String description, double confidence) {
        if (hasRecentUnhandledAlert(alertType)) return;

        Long relatedEventId = findRelatedEventId(alertType);

        AlertRequest request = AlertRequest.builder()
                .alertId(generateAlertId(alertType))
                .source("NETWORK_MONITOR")
                .alertType(alertType)
                .alertLevel(level)
                .description(description)
                .aiConfidence(BigDecimal.valueOf(confidence))
                .unifiedEventId(relatedEventId)
                .build();

        alertService.createAlert(request);
    }

    private boolean isSuspiciousProcess(String processName) {
        String lowerName = processName.toLowerCase();
        String[] suspiciousKeywords = {
                "miner", "bitcoin", "crypto", "backdoor", "trojan",
                "malware", "virus", "keylogger", "spyware", "exploit"
        };
        for (String keyword : suspiciousKeywords) {
            if (lowerName.contains(keyword)) return true;
        }
        return false;
    }

    private String generateAlertId(String alertType) {
        return "AUTO_" + alertType + "_" + System.currentTimeMillis();
    }
}
