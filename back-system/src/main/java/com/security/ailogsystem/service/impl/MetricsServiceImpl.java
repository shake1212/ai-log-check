package com.security.ailogsystem.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.security.ailogsystem.dto.RuleMatchResult;
import com.security.ailogsystem.dto.ThreatLevel;
import com.security.ailogsystem.dto.request.AlertRequest;
import com.security.ailogsystem.entity.SystemMetrics;
import com.security.ailogsystem.model.UnifiedSecurityEvent;
import com.security.ailogsystem.repository.MetricsRepository;
import com.security.ailogsystem.repository.UnifiedEventRepository;
import com.security.ailogsystem.service.AlertService;
import com.security.ailogsystem.service.MetricsService;
import com.security.ailogsystem.service.RuleEngineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Implementation of MetricsService for managing system metrics from log collectors.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MetricsServiceImpl implements MetricsService {

    private final MetricsRepository metricsRepository;
    private final ObjectMapper objectMapper;
    private final RuleEngineService ruleEngineService;
    private final AlertService alertService;
    private final UnifiedEventRepository unifiedEventRepository;

    @Override
    @Transactional
    public SystemMetrics storeMetrics(Map<String, Object> collectorData) {
        if (collectorData == null || collectorData.isEmpty()) {
            throw new IllegalArgumentException("Collector data cannot be null or empty");
        }

        try {
            SystemMetrics metrics = new SystemMetrics();
            
            // Set timestamp - use provided timestamp or current time
            LocalDateTime timestamp = extractTimestamp(collectorData);
            metrics.setTimestamp(timestamp);
            
            // Extract hostname and IP
            metrics.setHostname(extractString(collectorData, "hostname"));
            metrics.setIpAddress(extractString(collectorData, "ip_address"));
            
            // Extract CPU metrics
            extractCpuMetrics(collectorData, metrics);
            
            // Extract memory metrics
            extractMemoryMetrics(collectorData, metrics);
            
            // Extract disk metrics
            extractDiskMetrics(collectorData, metrics);
            
            // Extract network metrics
            extractNetworkMetrics(collectorData, metrics);
            
            // Extract process metrics
            extractProcessMetrics(collectorData, metrics);
            
            // Extract system metrics
            extractSystemMetrics(collectorData, metrics);
            
            // Store raw data as JSON for flexibility
            try {
                metrics.setRawData(objectMapper.writeValueAsString(collectorData));
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize raw data to JSON", e);
                metrics.setRawData("{}");
            }
            
            // Save to database
            SystemMetrics savedMetrics = metricsRepository.save(metrics);
            log.info("Stored metrics: id={}, timestamp={}, hostname={}", 
                    savedMetrics.getId(), savedMetrics.getTimestamp(), savedMetrics.getHostname());

            // 将性能指标转为安全事件并走规则引擎
            runRuleEngineOnMetrics(savedMetrics, collectorData);

            return savedMetrics;
            
        } catch (Exception e) {
            log.error("Failed to store metrics", e);
            throw new RuntimeException("Failed to store metrics: " + e.getMessage(), e);
        }
    }

    @Override
    public Optional<SystemMetrics> getRealtimeMetrics() {
        try {
            Optional<SystemMetrics> metrics = metricsRepository.findFirstByOrderByTimestampDesc();
            if (metrics.isPresent()) {
                log.debug("Retrieved realtime metrics: id={}, timestamp={}", 
                        metrics.get().getId(), metrics.get().getTimestamp());
            } else {
                log.debug("No realtime metrics found in database");
            }
            return metrics;
        } catch (Exception e) {
            log.error("Failed to retrieve realtime metrics", e);
            throw new RuntimeException("Failed to retrieve realtime metrics: " + e.getMessage(), e);
        }
    }

    @Override
    public List<SystemMetrics> getHistoricalMetrics(LocalDateTime start, LocalDateTime end) {
        try {
            List<SystemMetrics> metrics;
            
            if (start != null && end != null) {
                metrics = metricsRepository.findByTimestampBetweenOrderByTimestampAsc(start, end);
                log.debug("Retrieved {} historical metrics between {} and {}", 
                        metrics.size(), start, end);
            } else if (start != null) {
                metrics = metricsRepository.findByTimestampAfterOrderByTimestampAsc(start);
                log.debug("Retrieved {} historical metrics after {}", metrics.size(), start);
            } else if (end != null) {
                metrics = metricsRepository.findByTimestampBeforeOrderByTimestampAsc(end);
                log.debug("Retrieved {} historical metrics before {}", metrics.size(), end);
            } else {
                // Default to last 24 hours if no parameters provided
                LocalDateTime defaultStart = LocalDateTime.now().minusHours(24);
                metrics = metricsRepository.findByTimestampAfterOrderByTimestampAsc(defaultStart);
                log.debug("Retrieved {} historical metrics for last 24 hours", metrics.size());
            }
            
            return metrics;
        } catch (Exception e) {
            log.error("Failed to retrieve historical metrics", e);
            throw new RuntimeException("Failed to retrieve historical metrics: " + e.getMessage(), e);
        }
    }

    @Override
    public List<SystemMetrics> getHistoricalMetrics(int hours) {
        if (hours <= 0) {
            throw new IllegalArgumentException("Hours must be positive");
        }
        
        LocalDateTime start = LocalDateTime.now().minusHours(hours);
        return getHistoricalMetrics(start, null);
    }

    @Override
    public Map<String, Object> transformToRealtimeResponse(SystemMetrics metrics) {
        if (metrics == null) {
            return createEmptyRealtimeResponse();
        }
        
        Map<String, Object> response = new HashMap<>();
        
        response.put("timestamp", metrics.getTimestamp());
        response.put("cpuUsage", metrics.getCpuUsage());
        response.put("memoryUsage", metrics.getMemoryUsage());
        response.put("memoryUsed", metrics.getMemoryUsed());
        response.put("memoryTotal", metrics.getMemoryTotal());
        response.put("diskUsage", metrics.getDiskUsage());
        response.put("diskUsed", metrics.getDiskUsed());
        response.put("diskTotal", metrics.getDiskTotal());
        response.put("networkIn", metrics.getNetworkReceived());
        response.put("networkOut", metrics.getNetworkSent());
        response.put("processCount", metrics.getTotalProcesses());
        
        // Extract top processes from raw data if available
        List<Map<String, Object>> topProcesses = extractTopProcesses(metrics.getRawData());
        response.put("topProcesses", topProcesses);
        
        return response;
    }

    @Override
    public List<Map<String, Object>> transformToHistoricalResponse(List<SystemMetrics> metricsList) {
        if (metricsList == null || metricsList.isEmpty()) {
            return Collections.emptyList();
        }
        
        return metricsList.stream()
                .map(this::transformToHistoricalItem)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public int cleanupOldMetrics(int retentionDays) {
        if (retentionDays <= 0) {
            throw new IllegalArgumentException("Retention days must be positive");
        }
        
        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusDays(retentionDays);
            int deletedCount = metricsRepository.deleteOldMetrics(cutoffDate);
            log.info("Cleaned up {} old metrics records (older than {})", deletedCount, cutoffDate);
            return deletedCount;
        } catch (Exception e) {
            log.error("Failed to cleanup old metrics", e);
            throw new RuntimeException("Failed to cleanup old metrics: " + e.getMessage(), e);
        }
    }

    // ========== Private Helper Methods ==========

    private LocalDateTime extractTimestamp(Map<String, Object> data) {
        Object timestampObj = data.get("timestamp");
        if (timestampObj instanceof String) {
            try {
                return LocalDateTime.parse((String) timestampObj);
            } catch (Exception e) {
                log.warn("Failed to parse timestamp, using current time", e);
            }
        }
        return LocalDateTime.now();
    }

    private String extractString(Map<String, Object> data, String key) {
        Object value = data.get(key);
        return value != null ? value.toString() : null;
    }

    private Double extractDouble(Map<String, Object> data, String key) {
        Object value = data.get(key);
        if (value == null) return null;
        
        try {
            if (value instanceof Number) {
                return ((Number) value).doubleValue();
            }
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            log.warn("Failed to parse double value for key: {}", key);
            return null;
        }
    }

    private Long extractLong(Map<String, Object> data, String key) {
        Object value = data.get(key);
        if (value == null) return null;
        
        try {
            if (value instanceof Number) {
                return ((Number) value).longValue();
            }
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            log.warn("Failed to parse long value for key: {}", key);
            return null;
        }
    }

    private Integer extractInteger(Map<String, Object> data, String key) {
        Object value = data.get(key);
        if (value == null) return null;
        
        try {
            if (value instanceof Number) {
                return ((Number) value).intValue();
            }
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            log.warn("Failed to parse integer value for key: {}", key);
            return null;
        }
    }

    private void extractCpuMetrics(Map<String, Object> data, SystemMetrics metrics) {
        // Try different possible key names for CPU metrics
        metrics.setCpuUsage(extractDouble(data, "cpu_usage"));
        if (metrics.getCpuUsage() == null) {
            metrics.setCpuUsage(extractDouble(data, "cpuUsage"));
        }
        
        metrics.setCpuCores(extractInteger(data, "cpu_cores"));
        if (metrics.getCpuCores() == null) {
            metrics.setCpuCores(extractInteger(data, "cpuCores"));
        }
        
        metrics.setCpuFrequency(extractDouble(data, "cpu_frequency"));
        if (metrics.getCpuFrequency() == null) {
            metrics.setCpuFrequency(extractDouble(data, "cpuFrequency"));
        }
    }

    private void extractMemoryMetrics(Map<String, Object> data, SystemMetrics metrics) {
        metrics.setMemoryUsage(extractDouble(data, "memory_usage"));
        if (metrics.getMemoryUsage() == null) {
            metrics.setMemoryUsage(extractDouble(data, "memoryUsage"));
        }
        
        metrics.setMemoryUsed(extractLong(data, "memory_used"));
        if (metrics.getMemoryUsed() == null) {
            metrics.setMemoryUsed(extractLong(data, "memoryUsed"));
        }
        
        metrics.setMemoryTotal(extractLong(data, "memory_total"));
        if (metrics.getMemoryTotal() == null) {
            metrics.setMemoryTotal(extractLong(data, "memoryTotal"));
        }
        
        metrics.setMemoryAvailable(extractLong(data, "memory_available"));
        if (metrics.getMemoryAvailable() == null) {
            metrics.setMemoryAvailable(extractLong(data, "memoryAvailable"));
        }
    }

    private void extractDiskMetrics(Map<String, Object> data, SystemMetrics metrics) {
        metrics.setDiskUsage(extractDouble(data, "disk_usage"));
        if (metrics.getDiskUsage() == null) {
            metrics.setDiskUsage(extractDouble(data, "diskUsage"));
        }
        
        metrics.setDiskUsed(extractLong(data, "disk_used"));
        if (metrics.getDiskUsed() == null) {
            metrics.setDiskUsed(extractLong(data, "diskUsed"));
        }
        
        metrics.setDiskTotal(extractLong(data, "disk_total"));
        if (metrics.getDiskTotal() == null) {
            metrics.setDiskTotal(extractLong(data, "diskTotal"));
        }
    }

    private void extractNetworkMetrics(Map<String, Object> data, SystemMetrics metrics) {
        metrics.setNetworkSent(extractLong(data, "network_sent"));
        if (metrics.getNetworkSent() == null) {
            metrics.setNetworkSent(extractLong(data, "networkSent"));
        }
        
        metrics.setNetworkReceived(extractLong(data, "network_received"));
        if (metrics.getNetworkReceived() == null) {
            metrics.setNetworkReceived(extractLong(data, "networkReceived"));
        }
        
        metrics.setNetworkSentRate(extractDouble(data, "network_sent_rate"));
        if (metrics.getNetworkSentRate() == null) {
            metrics.setNetworkSentRate(extractDouble(data, "networkSentRate"));
        }
        
        metrics.setNetworkReceivedRate(extractDouble(data, "network_received_rate"));
        if (metrics.getNetworkReceivedRate() == null) {
            metrics.setNetworkReceivedRate(extractDouble(data, "networkReceivedRate"));
        }
    }

    private void extractProcessMetrics(Map<String, Object> data, SystemMetrics metrics) {
        metrics.setTotalProcesses(extractInteger(data, "total_processes"));
        if (metrics.getTotalProcesses() == null) {
            metrics.setTotalProcesses(extractInteger(data, "totalProcesses"));
        }
        if (metrics.getTotalProcesses() == null) {
            metrics.setTotalProcesses(extractInteger(data, "process_count"));
        }
        
        metrics.setRunningProcesses(extractInteger(data, "running_processes"));
        if (metrics.getRunningProcesses() == null) {
            metrics.setRunningProcesses(extractInteger(data, "runningProcesses"));
        }
    }

    private void extractSystemMetrics(Map<String, Object> data, SystemMetrics metrics) {
        metrics.setSystemLoad(extractDouble(data, "system_load"));
        if (metrics.getSystemLoad() == null) {
            metrics.setSystemLoad(extractDouble(data, "systemLoad"));
        }
        
        metrics.setUptime(extractLong(data, "uptime"));
    }

    private Map<String, Object> createEmptyRealtimeResponse() {
        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", null);
        response.put("cpuUsage", null);
        response.put("memoryUsage", null);
        response.put("memoryUsed", null);
        response.put("memoryTotal", null);
        response.put("diskUsage", null);
        response.put("diskUsed", null);
        response.put("diskTotal", null);
        response.put("networkIn", null);
        response.put("networkOut", null);
        response.put("processCount", null);
        response.put("topProcesses", Collections.emptyList());
        return response;
    }

    private Map<String, Object> transformToHistoricalItem(SystemMetrics metrics) {
        Map<String, Object> item = new HashMap<>();
        item.put("timestamp", metrics.getTimestamp());
        item.put("cpuUsage", metrics.getCpuUsage());
        item.put("memoryUsage", metrics.getMemoryUsage());
        item.put("diskUsage", metrics.getDiskUsage());
        return item;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractTopProcesses(String rawData) {
        if (rawData == null || rawData.isEmpty()) {
            return Collections.emptyList();
        }
        
        try {
            Map<String, Object> data = objectMapper.readValue(rawData, Map.class);
            Object topProcessesObj = data.get("top_processes");
            
            if (topProcessesObj == null) {
                topProcessesObj = data.get("topProcesses");
            }
            
            if (topProcessesObj instanceof List) {
                return (List<Map<String, Object>>) topProcessesObj;
            }
        } catch (Exception e) {
            log.warn("Failed to extract top processes from raw data", e);
        }
        
        return Collections.emptyList();
    }

    // ========== 规则引擎集成 ==========

    /**
     * 将性能指标转为 UnifiedSecurityEvent，走规则引擎匹配，命中时创建告警
     */
    private void runRuleEngineOnMetrics(SystemMetrics metrics, Map<String, Object> rawData) {
        try {
            UnifiedSecurityEvent event = buildPerformanceEvent(metrics, rawData);
            UnifiedSecurityEvent savedEvent = unifiedEventRepository.save(event);

            RuleMatchResult ruleMatch = ruleEngineService.matchRules(savedEvent);
            if (!ruleMatch.getHasMatch()) {
                return;
            }

            Double threatScore = ruleEngineService.calculateThreatScore(savedEvent, ruleMatch);
            ThreatLevel threatLevel = ruleEngineService.determineThreatLevel(threatScore);

            savedEvent.setThreatLevel(threatLevel.name());
            unifiedEventRepository.save(savedEvent);

            log.info("性能指标规则匹配命中: metricsId={}, 匹配规则数={}, 威胁等级={}",
                    metrics.getId(), ruleMatch.getMatchedRules().size(), threatLevel);

            for (RuleMatchResult.MatchedRule matched : ruleMatch.getMatchedRules()) {
                try {
                    AlertRequest alertRequest = AlertRequest.builder()
                            .alertId("PERF_RULE_" + matched.getRuleId() + "_M_" + metrics.getId())
                            .source("METRICS_RULE_ENGINE")
                            .alertType(matched.getThreatType() != null ? matched.getThreatType() : matched.getRuleName())
                            .alertLevel(matched.getSeverity() != null ? matched.getSeverity() : threatLevel.name())
                            .description(String.format("性能指标规则[%s]命中: CPU=%.1f%%, 内存=%.1f%%, 磁盘=%.1f%%",
                                    matched.getRuleName(),
                                    metrics.getCpuUsage() != null ? metrics.getCpuUsage() : 0.0,
                                    metrics.getMemoryUsage() != null ? metrics.getMemoryUsage() : 0.0,
                                    metrics.getDiskUsage() != null ? metrics.getDiskUsage() : 0.0))
                            .aiConfidence(BigDecimal.valueOf(matched.getConfidence() != null ? matched.getConfidence() : 0.9))
                            .metricValue(metrics.getCpuUsage())   // 以 CPU 为代表指标值
                            .build();

                    alertService.createAlert(alertRequest);
                } catch (Exception e) {
                    log.warn("创建性能规则告警失败: 规则={}, 原因={}", matched.getRuleName(), e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("性能指标规则引擎匹配失败: metricsId={}, 原因={}", metrics.getId(), e.getMessage());
        }
    }

    /**
     * 将 SystemMetrics 转换为 UnifiedSecurityEvent，供规则引擎匹配
     */
    private UnifiedSecurityEvent buildPerformanceEvent(SystemMetrics metrics, Map<String, Object> rawData) {
        // 根据指标值确定严重程度
        String severity = "INFO";
        if (metrics.getCpuUsage() != null && metrics.getCpuUsage() > 90) severity = "CRITICAL";
        else if (metrics.getCpuUsage() != null && metrics.getCpuUsage() > 80) severity = "WARN";
        else if (metrics.getMemoryUsage() != null && metrics.getMemoryUsage() > 95) severity = "CRITICAL";
        else if (metrics.getMemoryUsage() != null && metrics.getMemoryUsage() > 90) severity = "WARN";
        else if (metrics.getDiskUsage() != null && metrics.getDiskUsage() > 95) severity = "CRITICAL";
        else if (metrics.getDiskUsage() != null && metrics.getDiskUsage() > 85) severity = "WARN";

        String message = String.format("系统性能指标: CPU=%.1f%%, 内存=%.1f%%, 磁盘=%.1f%%",
                metrics.getCpuUsage() != null ? metrics.getCpuUsage() : 0.0,
                metrics.getMemoryUsage() != null ? metrics.getMemoryUsage() : 0.0,
                metrics.getDiskUsage() != null ? metrics.getDiskUsage() : 0.0);

        UnifiedSecurityEvent event = UnifiedSecurityEvent.builder()
                .timestamp(metrics.getTimestamp() != null ? metrics.getTimestamp() : LocalDateTime.now())
                .sourceSystem("PYTHON_COLLECTOR")
                .eventType("SYSTEM_PERFORMANCE")
                .category("PERFORMANCE")
                .severity(severity)
                .normalizedMessage(message)
                .hostName(metrics.getHostname())
                .isAnomaly(false)
                .build();

        // 把原始指标放入 eventData
        Map<String, Object> eventData = new HashMap<>();
        eventData.put("cpuUsage", metrics.getCpuUsage());
        eventData.put("memoryUsage", metrics.getMemoryUsage());
        eventData.put("diskUsage", metrics.getDiskUsage());
        eventData.put("networkSent", metrics.getNetworkSent());
        eventData.put("networkReceived", metrics.getNetworkReceived());
        eventData.put("totalProcesses", metrics.getTotalProcesses());
        eventData.put("metricsId", metrics.getId());
        event.setEventData(eventData);

        return event;
    }
}
