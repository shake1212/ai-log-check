// AutoAlertScheduler.java
package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.request.AlertRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AutoAlertScheduler {

    private final AlertService alertService;
    private final SystemInfoService systemInfoService;
    private final EventAlertBridgeService eventAlertBridgeService;

    /**
     * 定时检查系统性能并生成告警（每5分钟）
     */
    @Scheduled(fixedRate = 300000) // 5分钟
    public void checkSystemPerformance() {
        log.info("开始定时系统性能检查...");

        try {
            Map<String, Object> performanceData = systemInfoService.collectPerformanceDataQuick();

            // 检查CPU使用率
            Object cpuPercentObj = performanceData.get("cpu_percent");
            if (cpuPercentObj instanceof Number) {
                double cpuPercent = ((Number) cpuPercentObj).doubleValue();
                if (cpuPercent > 90) {
                    createPerformanceAlert("CPU_USAGE_HIGH", "CRITICAL",
                            String.format("CPU使用率过高: %.1f%%", cpuPercent), 0.95);
                } else if (cpuPercent > 80) {
                    createPerformanceAlert("CPU_USAGE_HIGH", "HIGH",
                            String.format("CPU使用率较高: %.1f%%", cpuPercent), 0.85);
                }
            }

            // 检查内存使用率
            Object memoryPercentObj = performanceData.get("memory_percent");
            if (memoryPercentObj instanceof Number) {
                double memoryPercent = ((Number) memoryPercentObj).doubleValue();
                if (memoryPercent > 95) {
                    createPerformanceAlert("MEMORY_USAGE_HIGH", "CRITICAL",
                            String.format("内存使用率过高: %.1f%%", memoryPercent), 0.96);
                } else if (memoryPercent > 90) {
                    createPerformanceAlert("MEMORY_USAGE_HIGH", "HIGH",
                            String.format("内存使用率较高: %.1f%%", memoryPercent), 0.88);
                }
            }

            log.info("系统性能检查完成");

        } catch (Exception e) {
            log.error("系统性能检查失败", e);
        }
    }

    /**
     * 定时检查进程异常（每10分钟）
     */
    @Scheduled(fixedRate = 600000) // 10分钟
    public void checkSuspiciousProcesses() {
        log.info("开始定时进程检查...");

        try {
            Map<String, Object> processInfo = systemInfoService.collectQuickProcessInfo(50);

            if (processInfo.containsKey("processes") && processInfo.get("processes") instanceof java.util.List) {
                @SuppressWarnings("unchecked")
                java.util.List<Map<String, Object>> processes =
                        (java.util.List<Map<String, Object>>) processInfo.get("processes");

                for (Map<String, Object> process : processes) {
                    String processName = (String) process.getOrDefault("name", "");
                    Object cpuObj = process.get("cpu");
                    Object memoryObj = process.get("memory");

                    // 检查异常进程
                    if (isSuspiciousProcess(processName)) {
                        createSuspiciousProcessAlert(process);
                    }

                    // 检查高资源占用进程
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

    /**
     * 定时获取网络异常告警（每15分钟）
     */
    @Scheduled(fixedRate = 900000) // 15分钟
    public void checkNetworkAnomalies() {
        log.info("开始定时网络检查...");

        try {
            Map<String, Object> networkStats = systemInfoService.collectNetworkStats();

            // 检查网络异常（这里可以根据具体业务逻辑扩展）
            Object bytesRecvRate = networkStats.get("bytes_recv_rate");
            Object bytesSentRate = networkStats.get("bytes_sent_rate");

            if (bytesRecvRate instanceof Number && bytesSentRate instanceof Number) {
                double recvRate = ((Number) bytesRecvRate).doubleValue();
                double sentRate = ((Number) bytesSentRate).doubleValue();

                // 检测异常流量
                if (recvRate > 1000000 || sentRate > 1000000) { // 1MB/s
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

    private void createPerformanceAlert(String alertType, String level, String description, double confidence) {
        try {
            AlertRequest request = AlertRequest.builder()
                    .alertId(generateAlertId(alertType))
                    .source("SYSTEM_MONITOR")
                    .alertType(alertType)
                    .alertLevel(level)
                    .description(description)
                    .aiConfidence(BigDecimal.valueOf(confidence))
                    .build();

            alertService.createAlert(request);
            log.info("创建性能告警: {}", description);

        } catch (Exception e) {
            log.error("创建性能告警失败", e);
        }
    }

    private void createSuspiciousProcessAlert(Map<String, Object> process) {
        String processName = (String) process.getOrDefault("name", "Unknown");
        Object pid = process.get("pid");

        String description = String.format("检测到可疑进程: %s (PID: %s)", processName, pid);

        AlertRequest request = AlertRequest.builder()
                .alertId(generateAlertId("SUSPICIOUS_PROCESS"))
                .source("PROCESS_MONITOR")
                .alertType("SUSPICIOUS_PROCESS")
                .alertLevel("HIGH")
                .description(description)
                .aiConfidence(BigDecimal.valueOf(0.80))
                .build();

        alertService.createAlert(request);
        log.info("创建可疑进程告警: {}", processName);
    }

    private void createHighResourceProcessAlert(Map<String, Object> process, double cpu, double memory) {
        String processName = (String) process.getOrDefault("name", "Unknown");
        Object pid = process.get("pid");

        String description = String.format("进程资源占用过高: %s (PID: %s, CPU: %.1f%%, 内存: %.1f%%)",
                processName, pid, cpu, memory);

        AlertRequest request = AlertRequest.builder()
                .alertId(generateAlertId("HIGH_RESOURCE_PROCESS"))
                .source("PROCESS_MONITOR")
                .alertType("HIGH_RESOURCE_PROCESS")
                .alertLevel("MEDIUM")
                .description(description)
                .aiConfidence(BigDecimal.valueOf(0.85))
                .build();

        alertService.createAlert(request);
    }

    private void createNetworkAlert(String alertType, String level, String description, double confidence) {
        AlertRequest request = AlertRequest.builder()
                .alertId(generateAlertId(alertType))
                .source("NETWORK_MONITOR")
                .alertType(alertType)
                .alertLevel(level)
                .description(description)
                .aiConfidence(BigDecimal.valueOf(confidence))
                .build();

        alertService.createAlert(request);
    }

    private boolean isSuspiciousProcess(String processName) {
        String lowerName = processName.toLowerCase();

        // 可疑进程关键词
        String[] suspiciousKeywords = {
                "miner", "bitcoin", "crypto", "backdoor", "trojan",
                "malware", "virus", "keylogger", "spyware", "exploit"
        };

        for (String keyword : suspiciousKeywords) {
            if (lowerName.contains(keyword)) {
                return true;
            }
        }

        return false;
    }

    private String generateAlertId(String alertType) {
        return "AUTO_" + alertType + "_" + System.currentTimeMillis();
    }
}