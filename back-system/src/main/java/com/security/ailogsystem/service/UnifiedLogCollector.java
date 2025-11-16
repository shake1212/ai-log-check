package com.security.ailogsystem.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.security.ailogsystem.model.UnifiedSecurityEvent;
import com.security.ailogsystem.repository.UnifiedEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@Component
@RequiredArgsConstructor
public class UnifiedLogCollector {

    private final UnifiedEventRepository eventRepository;
    private final AdvancedAnomalyDetector anomalyDetector;
    private final ObjectMapper objectMapper;

    /**
     * 应用性能监控定时任务
     */
    @Scheduled(fixedRate = 300000) // 每5分钟执行一次
    public void collectApplicationMetrics() {
        log.info("开始收集应用性能指标...");

        try {
            collectApplicationEvents();
            log.info("应用性能指标收集完成");
        } catch (Exception e) {
            log.error("收集应用性能指标失败", e);
            saveErrorEvent("APPLICATION_METRICS", e.getMessage());
        }
    }

    /**
     * 手动触发收集（兼容现有接口）
     */
    public void collectAllLogs() {
        log.info("手动触发应用性能收集...");
        collectApplicationMetrics();
    }

    /**
     * 收集应用性能事件
     */
    public void collectApplicationEvents() {
        try {
            log.debug("开始收集应用性能事件...");

            List<UnifiedSecurityEvent> securityEvents = new ArrayList<>();

            // JVM内存监控
            Runtime runtime = Runtime.getRuntime();
            long maxMemory = runtime.maxMemory() / (1024 * 1024);
            long totalMemory = runtime.totalMemory() / (1024 * 1024);
            long freeMemory = runtime.freeMemory() / (1024 * 1024);
            long usedMemory = totalMemory - freeMemory;
            double memoryUsage = (double) usedMemory / totalMemory;

            UnifiedSecurityEvent memoryEvent = UnifiedSecurityEvent.builder()
                    .timestamp(LocalDateTime.now())
                    .sourceSystem("APPLICATION")
                    .eventType("MEMORY_USAGE")
                    .category("PERFORMANCE")
                    .severity(memoryUsage > 0.8 ? "WARN" : "INFO")
                    .normalizedMessage(String.format("JVM内存使用: %dMB/%dMB (%.1f%%)",
                            usedMemory, totalMemory, memoryUsage * 100))
                    .build();

            // 设置 eventData
            Map<String, Object> eventData = Map.of(
                    "maxMemory", maxMemory,
                    "totalMemory", totalMemory,
                    "usedMemory", usedMemory,
                    "freeMemory", freeMemory,
                    "usagePercentage", memoryUsage
            );
            memoryEvent.setEventData(eventData);

            // 调用异常检测
            anomalyDetector.detectAnomalies(memoryEvent);

            securityEvents.add(memoryEvent);

            // 保存事件
            eventRepository.saveAll(securityEvents);
            log.info("成功收集 {} 个应用性能事件", securityEvents.size());

        } catch (Exception e) {
            log.error("收集应用性能事件失败", e);
            saveErrorEvent("APPLICATION_COLLECTOR", e.getMessage());
        }
    }

    private void saveErrorEvent(String collector, String error) {
        UnifiedSecurityEvent errorEvent = UnifiedSecurityEvent.builder()
                .timestamp(LocalDateTime.now())
                .sourceSystem("COLLECTOR")
                .eventType("COLLECTOR_ERROR")
                .category("SYSTEM")
                .severity("ERROR")
                .normalizedMessage(String.format("收集器 %s 错误: %s", collector, error))
                .isAnomaly(false)
                .build();
        eventRepository.save(errorEvent);
    }

    private String readProcessOutput(Process process) {
        try {
            return String.join("\n", readProcessOutputLines(process));
        } catch (Exception e) {
            log.error("读取进程输出失败", e);
            return null;
        }
    }

    private List<String> readProcessOutputLines(Process process) {
        List<String> lines = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                lines.add(line);
            }
        } catch (Exception e) {
            log.error("读取进程输出行失败", e);
        }
        return lines;
    }

    private LocalDateTime parseWindowsEventTime(String timeStr) {
        try {
            if (timeStr.startsWith("/Date(") && timeStr.endsWith(")/")) {
                // 提取毫秒数：/Date(1762513464541)/
                String millisStr = timeStr.substring(6, timeStr.length() - 3);
                long millis = Long.parseLong(millisStr);
                return Instant.ofEpochMilli(millis)
                        .atZone(ZoneId.systemDefault())
                        .toLocalDateTime();
            } else {
                // 尝试其他格式
                return LocalDateTime.parse(timeStr, DateTimeFormatter.ISO_DATE_TIME);
            }
        } catch (Exception e) {
            log.warn("解析时间格式失败: {}, 使用当前时间", timeStr);
            return LocalDateTime.now();
        }
    }
}