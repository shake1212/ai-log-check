package com.security.ailogsystem.controller;

import com.security.ailogsystem.dto.ScriptRunResponse;
import com.security.ailogsystem.service.LogCollectorConfigService;
import com.security.ailogsystem.service.SecurityLogCollectorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 安全日志采集控制器
 * 提供安全日志采集相关的REST API
 */
@Slf4j
@RestController
@RequestMapping("/log-collector")
@RequiredArgsConstructor
@Tag(name = "安全日志采集", description = "安全日志采集管理接口")
public class SecurityLogCollectorController {

    private final SecurityLogCollectorService securityLogCollectorService;
    private final LogCollectorConfigService configService;
    private final com.security.ailogsystem.service.MetricsService metricsService;
    private final com.security.ailogsystem.service.AlertService alertService;

    /**
     * 手动触发安全日志采集
     */
    @PostMapping("/collect")
    @Operation(summary = "手动触发安全日志采集")
    public ResponseEntity<ScriptRunResponse> collectSecurityLogs() {
        log.info("收到手动采集请求");
        ScriptRunResponse response = securityLogCollectorService.collectSecurityLogs();
        return ResponseEntity.ok(response);
    }

    /**
     * 获取采集器状态
     */
    @GetMapping("/status")
    @Operation(summary = "获取采集器状态")
    public ResponseEntity<Object> getStatus() {
        Map<String, Object> collectorStatus = securityLogCollectorService.getCollectorStatus();
        
        // 构建符合前端期望的状态对象
        Map<String, Object> statusItem = new HashMap<>();
        statusItem.put("id", "default");
        statusItem.put("name", "安全日志采集器");
        
        // 根据enabled状态设置status字段
        boolean enabled = (boolean) collectorStatus.getOrDefault("enabled", false);
        String lastStatus = collectorStatus.get("lastCollectionStatus") != null 
                ? collectorStatus.get("lastCollectionStatus").toString() 
                : "SUCCESS";
        
        if (!enabled) {
            statusItem.put("status", "stopped");
        } else if ("FAILED".equals(lastStatus)) {
            statusItem.put("status", "error");
        } else {
            statusItem.put("status", "running");
        }
        
        statusItem.put("lastRunTime", collectorStatus.get("lastCollectionTime"));
        statusItem.put("nextRunTime", collectorStatus.get("nextCollectionTime"));
        statusItem.put("totalRuns", collectorStatus.get("totalCollections"));
        statusItem.put("successRuns", collectorStatus.get("successfulCollections"));
        statusItem.put("errorRuns", collectorStatus.get("failedCollections"));
        statusItem.put("lastError", null);
        
        // 返回数组格式
        return ResponseEntity.ok(new Object[]{statusItem});
    }

    /**
     * 启动采集器
     */
    @PostMapping("/start/{collectorId}")
    @Operation(summary = "启动采集器")
    public ResponseEntity<Map<String, Object>> startCollector(@PathVariable String collectorId) {
        log.info("启动采集器: {}", collectorId);
        
        // 默认5分钟间隔
        boolean success = securityLogCollectorService.startScheduledCollection(5);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", success);
        response.put("message", success ? "采集器已启动" : "启动失败");
        response.put("collectorId", collectorId);
        
        return ResponseEntity.ok(response);
    }

    /**
     * 停止采集器
     */
    @PostMapping("/stop/{collectorId}")
    @Operation(summary = "停止采集器")
    public ResponseEntity<Map<String, Object>> stopCollector(@PathVariable String collectorId) {
        log.info("停止采集器: {}", collectorId);
        
        boolean success = securityLogCollectorService.stopScheduledCollection();
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", success);
        response.put("message", success ? "采集器已停止" : "停止失败");
        response.put("collectorId", collectorId);
        
        return ResponseEntity.ok(response);
    }

    /**
     * 配置定时采集
     */
    @PostMapping("/schedule")
    @Operation(summary = "配置定时采集")
    public ResponseEntity<Map<String, Object>> configureSchedule(
            @RequestParam(defaultValue = "5") int intervalMinutes) {
        log.info("配置定时采集，间隔: {} 分钟", intervalMinutes);
        
        boolean success = securityLogCollectorService.startScheduledCollection(intervalMinutes);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", success);
        response.put("message", success ? "定时采集已配置" : "配置失败");
        response.put("intervalMinutes", intervalMinutes);
        
        return ResponseEntity.ok(response);
    }

    /**
     * 获取采集器配置
     */
    @GetMapping("/config")
    @Operation(summary = "获取采集器配置")
    public ResponseEntity<Map<String, Object>> getConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("enabled", securityLogCollectorService.isScheduledCollectionRunning());
        config.put("status", securityLogCollectorService.getCollectorStatus());
        
        return ResponseEntity.ok(config);
    }

    /**
     * 获取采集器配置列表（兼容前端API）
     */
    @GetMapping("/configs")
    @Operation(summary = "获取采集器配置列表")
    public ResponseEntity<List<Map<String, Object>>> getConfigs() {
        log.info("获取配置列表");
        
        List<Map<String, Object>> configs = configService.getAllConfigs().stream()
            .map(this::convertToMap)
            .toList();
        
        return ResponseEntity.ok(configs);
    }

    /**
     * 获取单个配置（兼容前端API）
     */
    @GetMapping("/configs/{configId}")
    @Operation(summary = "获取单个配置")
    public ResponseEntity<Map<String, Object>> getConfig(@PathVariable String configId) {
        log.info("获取配置: {}", configId);
        
        return configService.getConfigById(configId)
            .map(config -> ResponseEntity.ok(convertToMap(config)))
            .orElseGet(() -> {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "配置不存在");
                error.put("message", "配置ID: " + configId + " 不存在");
                return ResponseEntity.status(404).body(error);
            });
    }

    /**
     * 更新配置（兼容前端API）
     */
    @PutMapping("/configs/{configId}")
    @Operation(summary = "更新配置")
    public ResponseEntity<Map<String, Object>> updateConfig(
            @PathVariable String configId,
            @RequestBody Map<String, Object> configData) {
        log.info("更新配置: {}, 数据: {}", configId, configData);
        
        // 检查配置是否存在
        if (!configService.existsById(configId)) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "配置不存在");
            error.put("message", "配置ID: " + configId + " 不存在");
            return ResponseEntity.status(404).body(error);
        }
        
        try {
            // 提取配置参数
            Integer interval = configData.get("interval") != null 
                ? ((Number) configData.get("interval")).intValue() 
                : 300;
            
            Boolean enabled = configData.get("enabled") != null 
                ? (Boolean) configData.get("enabled") 
                : false;
            
            // 验证间隔范围
            if (interval < 1 || interval > 3600) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "验证失败");
                error.put("message", "采集间隔必须在1到3600秒之间");
                return ResponseEntity.status(400).body(error);
            }
            
            // 获取现有配置
            com.security.ailogsystem.entity.LogCollectorConfig config = 
                configService.getConfigById(configId).orElseThrow();
            
            // 更新配置
            config.setName((String) configData.getOrDefault("name", config.getName()));
            config.setEnabled(enabled);
            config.setInterval(interval);
            
            // 更新数据源
            if (configData.get("dataSources") instanceof List) {
                @SuppressWarnings("unchecked")
                List<String> dataSources = (List<String>) configData.get("dataSources");
                config.setDataSources(dataSources);
            }
            
            // 更新告警阈值
            if (configData.get("alertThresholds") instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> thresholds = (Map<String, Object>) configData.get("alertThresholds");
                
                if (thresholds.get("cpuUsage") != null) {
                    config.setCpuThreshold(((Number) thresholds.get("cpuUsage")).intValue());
                }
                if (thresholds.get("memoryUsage") != null) {
                    config.setMemoryThreshold(((Number) thresholds.get("memoryUsage")).intValue());
                }
                if (thresholds.get("diskUsage") != null) {
                    config.setDiskThreshold(((Number) thresholds.get("diskUsage")).intValue());
                }
                if (thresholds.get("errorRate") != null) {
                    config.setErrorRateThreshold(((Number) thresholds.get("errorRate")).intValue());
                }
            }
            
            // 更新保留天数
            if (configData.get("retentionDays") != null) {
                config.setRetentionDays(((Number) configData.get("retentionDays")).intValue());
            }
            
            // 保存到数据库
            com.security.ailogsystem.entity.LogCollectorConfig savedConfig = configService.saveConfig(config);
            
            // 应用配置：更新采集间隔
            int intervalMinutes = interval / 60;
            if (intervalMinutes < 1) {
                intervalMinutes = 1;
            }
            
            if (enabled) {
                securityLogCollectorService.startScheduledCollection(intervalMinutes);
                log.info("已启动定时采集，间隔: {} 分钟", intervalMinutes);
            } else {
                securityLogCollectorService.stopScheduledCollection();
                log.info("已停止定时采集");
            }
            
            log.info("配置更新成功并已保存到数据库");
            return ResponseEntity.ok(convertToMap(savedConfig));
            
        } catch (Exception e) {
            log.error("更新配置失败", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "更新失败");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    /**
     * 将实体转换为Map（用于API响应）
     */
    private Map<String, Object> convertToMap(com.security.ailogsystem.entity.LogCollectorConfig config) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", config.getId());
        map.put("name", config.getName());
        map.put("enabled", config.getEnabled());
        map.put("interval", config.getInterval());
        map.put("dataSources", config.getDataSources());
        
        Map<String, Object> thresholds = new HashMap<>();
        thresholds.put("cpuUsage", config.getCpuThreshold());
        thresholds.put("memoryUsage", config.getMemoryThreshold());
        thresholds.put("diskUsage", config.getDiskThreshold());
        thresholds.put("errorRate", config.getErrorRateThreshold());
        map.put("alertThresholds", thresholds);
        
        map.put("retentionDays", config.getRetentionDays());
        
        if (config.getCreatedAt() != null) {
            map.put("createdAt", config.getCreatedAt().toString());
        }
        if (config.getUpdatedAt() != null) {
            map.put("updatedAt", config.getUpdatedAt().toString());
        }
        
        return map;
    }

    /**
     * 获取实时指标（兼容前端API）
     */
    @GetMapping("/metrics/realtime")
    @Operation(summary = "获取实时系统指标")
    public ResponseEntity<Map<String, Object>> getRealtimeMetrics() {
        try {
            Optional<com.security.ailogsystem.entity.SystemMetrics> metrics = 
                metricsService.getRealtimeMetrics();
            
            if (metrics.isPresent()) {
                Map<String, Object> response = 
                    metricsService.transformToRealtimeResponse(metrics.get());
                log.debug("Retrieved realtime metrics successfully");
                return ResponseEntity.ok(response);
            } else {
                // Return empty structure if no data available
                log.debug("No realtime metrics available, returning empty structure");
                Map<String, Object> emptyMetrics = createEmptyMetricsResponse();
                return ResponseEntity.ok(emptyMetrics);
            }
        } catch (Exception e) {
            log.error("Failed to get realtime metrics", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to retrieve realtime metrics");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    /**
     * Create empty metrics response structure
     */
    private Map<String, Object> createEmptyMetricsResponse() {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("timestamp", null);
        metrics.put("cpuUsage", null);
        metrics.put("memoryUsage", null);
        metrics.put("memoryUsed", null);
        metrics.put("memoryTotal", null);
        metrics.put("diskUsage", null);
        metrics.put("diskUsed", null);
        metrics.put("diskTotal", null);
        metrics.put("networkIn", null);
        metrics.put("networkOut", null);
        metrics.put("processCount", null);
        metrics.put("topProcesses", new java.util.ArrayList<>());
        return metrics;
    }

    /**
     * 获取历史指标（兼容前端API）
     */
    @GetMapping("/metrics/historical")
    @Operation(summary = "获取历史系统指标")
    public ResponseEntity<List<Map<String, Object>>> getHistoricalMetrics(
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end) {
        try {
            java.time.LocalDateTime startTime = parseDateTime(start);
            java.time.LocalDateTime endTime = parseDateTime(end);
            
            // Validate time range
            if (startTime != null && endTime != null && startTime.isAfter(endTime)) {
                log.warn("Invalid time range: start {} is after end {}", startTime, endTime);
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Invalid time range");
                error.put("message", "Start time must be before end time");
                return ResponseEntity.badRequest().body(java.util.Collections.singletonList(error));
            }
            
            // Default to last 24 hours if no parameters provided
            if (startTime == null && endTime == null) {
                startTime = java.time.LocalDateTime.now().minusHours(24);
                endTime = java.time.LocalDateTime.now();
                log.debug("No time range specified, defaulting to last 24 hours");
            }
            
            List<com.security.ailogsystem.entity.SystemMetrics> metrics = 
                metricsService.getHistoricalMetrics(startTime, endTime);
            
            List<Map<String, Object>> response = 
                metricsService.transformToHistoricalResponse(metrics);
            
            log.debug("Retrieved {} historical metrics from {} to {}", 
                    response.size(), startTime, endTime);
            
            return ResponseEntity.ok(response);
        } catch (java.time.format.DateTimeParseException e) {
            log.error("Failed to parse date time parameters", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Invalid date format");
            error.put("message", "Date parameters must be in ISO-8601 format (e.g., 2026-03-30T18:00:00)");
            return ResponseEntity.badRequest().body(java.util.Collections.singletonList(error));
        } catch (Exception e) {
            log.error("Failed to get historical metrics", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to retrieve historical metrics");
            error.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(java.util.Collections.singletonList(error));
        }
    }
    
    /**
     * Parse date time string to LocalDateTime
     */
    private java.time.LocalDateTime parseDateTime(String dateTimeStr) {
        if (dateTimeStr == null || dateTimeStr.trim().isEmpty()) {
            return null;
        }
        
        try {
            return java.time.LocalDateTime.parse(dateTimeStr);
        } catch (java.time.format.DateTimeParseException e) {
            log.warn("Failed to parse date time: {}", dateTimeStr);
            throw e;
        }
    }

    /**
     * 获取告警信息（兼容前端API）
     */
    @GetMapping("/alerts")
    @Operation(summary = "获取告警信息")
    public ResponseEntity<List<Map<String, Object>>> getAlerts(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity) {
        try {
            // Use AlertService to query alerts
            List<com.security.ailogsystem.entity.SecurityAlert> alerts = 
                alertService.getLogCollectorAlerts(status, severity);
            
            // Transform to API response format
            List<Map<String, Object>> response = alerts.stream()
                .map(this::transformAlertToResponse)
                .collect(java.util.stream.Collectors.toList());
            
            log.debug("Retrieved {} alerts with filters: status={}, severity={}", 
                    response.size(), status, severity);
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid parameter: {}", e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Invalid parameter");
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(java.util.Collections.singletonList(error));
        } catch (Exception e) {
            log.error("Failed to get alerts", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to retrieve alerts");
            error.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(java.util.Collections.singletonList(error));
        }
    }
    
    /**
     * Transform SecurityAlert entity to API response format
     */
    private Map<String, Object> transformAlertToResponse(com.security.ailogsystem.entity.SecurityAlert alert) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", String.valueOf(alert.getId()));
        response.put("timestamp", alert.getCreatedTime());

        // 映射 alertLevel -> type（前端期望 warning/critical/info）
        String type = "info";
        if (alert.getAlertLevel() != null) {
            switch (alert.getAlertLevel()) {
                case CRITICAL: type = "critical"; break;
                case HIGH:
                case MEDIUM: type = "warning"; break;
                case LOW: type = "info"; break;
            }
        }
        response.put("type", type);
        response.put("alertLevel", alert.getAlertLevel() != null ? alert.getAlertLevel().toString() : null);

        // 从 alertType 推断 category（cpu/memory/disk/network/collector）
        String alertType = alert.getAlertType() != null ? alert.getAlertType().toLowerCase() : "";
        String category = "collector";
        if (alertType.contains("cpu")) category = "cpu";
        else if (alertType.contains("memory") || alertType.contains("mem")) category = "memory";
        else if (alertType.contains("disk")) category = "disk";
        else if (alertType.contains("network") || alertType.contains("net")) category = "network";
        response.put("category", category);

        // title 使用 alertType，message/description 使用 description
        response.put("title", alert.getAlertType());
        response.put("message", alert.getDescription());

        // value/threshold 来自实体字段
        response.put("value", alert.getMetricValue());
        response.put("threshold", alert.getThreshold());

        // handled -> acknowledged & resolved
        boolean handled = alert.getHandled() != null && alert.getHandled();
        response.put("acknowledged", handled);
        response.put("resolved", handled);
        response.put("handled", handled);
        response.put("status", handled ? "RESOLVED" : "PENDING");
        return response;
    }
    
    /**
     * 确认告警（兼容前端API）
     */
    @PostMapping("/alerts/{alertId}/acknowledge")
    @Operation(summary = "确认告警")
    public ResponseEntity<Map<String, Object>> acknowledgeAlert(@PathVariable String alertId) {
        log.info("确认告警: {}", alertId);
        
        try {
            Long id = Long.parseLong(alertId);
            boolean success = alertService.acknowledgeAlert(id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", success);
            response.put("message", success ? "告警已确认" : "确认失败");
            response.put("alertId", alertId);
            
            return ResponseEntity.ok(response);
        } catch (NumberFormatException e) {
            log.error("无效的告警ID: {}", alertId);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "无效的告警ID");
            error.put("message", "告警ID必须是数字");
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            log.error("确认告警失败", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "确认失败");
            error.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
    
    /**
     * 解决告警（兼容前端API）
     */
    @PostMapping("/alerts/{alertId}/resolve")
    @Operation(summary = "解决告警")
    public ResponseEntity<Map<String, Object>> resolveAlert(@PathVariable String alertId) {
        log.info("解决告警: {}", alertId);
        
        try {
            Long id = Long.parseLong(alertId);
            boolean success = alertService.resolveAlert(id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", success);
            response.put("message", success ? "告警已解决" : "解决失败");
            response.put("alertId", alertId);
            
            return ResponseEntity.ok(response);
        } catch (NumberFormatException e) {
            log.error("无效的告警ID: {}", alertId);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "无效的告警ID");
            error.put("message", "告警ID必须是数字");
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            log.error("解决告警失败", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "解决失败");
            error.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
    
    /**
     * 测试连接（兼容前端API）
     */
    @GetMapping("/test")
    @Operation(summary = "测试采集器连接")
    public ResponseEntity<Map<String, Object>> testConnection() {
        log.info("测试采集器连接");
        
        try {
            // 测试数据库连接和服务可用性
            boolean connected = configService.getAllConfigs() != null;
            
            Map<String, Object> response = new HashMap<>();
            response.put("connected", connected);
            response.put("message", connected ? "连接正常" : "连接失败");
            response.put("timestamp", java.time.LocalDateTime.now().toString());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("连接测试失败", e);
            Map<String, Object> error = new HashMap<>();
            error.put("connected", false);
            error.put("message", "连接失败: " + e.getMessage());
            return ResponseEntity.ok(error);
        }
    }
}
