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

        Map<String, Object> statusItem = new HashMap<>();
        statusItem.put("id", "default");
        statusItem.put("name", "安全日志采集器");

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

        return ResponseEntity.ok(new Object[]{statusItem});
    }

    /**
     * 启动采集器
     */
    @PostMapping("/start/{collectorId}")
    @Operation(summary = "启动采集器")
    public ResponseEntity<Map<String, Object>> startCollector(@PathVariable String collectorId) {
        log.info("启动采集器: {}", collectorId);

        // 从配置中读取采集间隔，而非硬编码
        int intervalMinutes = 5; // 默认5分钟
        var configOpt = configService.getConfigById(collectorId);
        if (configOpt.isPresent()) {
            int intervalSeconds = configOpt.get().getInterval();
            intervalMinutes = Math.max(1, intervalSeconds / 60);
        }

        boolean success = securityLogCollectorService.startScheduledCollection(intervalMinutes);

        Map<String, Object> response = new HashMap<>();
        response.put("success", success);
        response.put("message", success ? "采集器已启动" : "启动失败");
        response.put("collectorId", collectorId);
        response.put("intervalMinutes", intervalMinutes);

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

        if (!configService.existsById(configId)) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "配置不存在");
            error.put("message", "配置ID: " + configId + " 不存在");
            return ResponseEntity.status(404).body(error);
        }

        try {
            Integer interval = configData.get("interval") != null
                ? ((Number) configData.get("interval")).intValue()
                : 300;

            Boolean enabled = configData.get("enabled") != null
                ? (Boolean) configData.get("enabled")
                : false;

            // 验证间隔范围（最小3分钟=180秒，最大60分钟=3600秒）
            if (interval < 180 || interval > 3600) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "验证失败");
                error.put("message", "采集间隔必须在180到3600秒之间（3~60分钟）");
                return ResponseEntity.status(400).body(error);
            }

            com.security.ailogsystem.entity.LogCollectorConfig config =
                configService.getConfigById(configId).orElseThrow(() ->
                    new IllegalArgumentException("配置ID: " + configId + " 不存在"));

            config.setName((String) configData.getOrDefault("name", config.getName()));
            config.setEnabled(enabled);
            config.setInterval(interval);

            if (configData.get("dataSources") instanceof List) {
                @SuppressWarnings("unchecked")
                List<String> dataSources = (List<String>) configData.get("dataSources");
                config.setDataSources(dataSources);
            }

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
            } else {
                // alertThresholds 缺失时保留原值，不覆盖
                log.debug("alertThresholds 未提供，保留原值");
            }

            if (configData.get("retentionDays") != null) {
                config.setRetentionDays(((Number) configData.get("retentionDays")).intValue());
            }

            // 规则引擎配置
            if (configData.get("enableRuleEngine") != null) {
                config.setEnableRuleEngine((Boolean) configData.get("enableRuleEngine"));
            }
            if (configData.get("ruleEngineTimeout") != null) {
                config.setRuleEngineTimeout(((Number) configData.get("ruleEngineTimeout")).intValue());
            }

            com.security.ailogsystem.entity.LogCollectorConfig savedConfig = configService.saveConfig(config);

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

        // 规则引擎配置（之前缺失，导致前端 Switch 无法回显）
        map.put("enableRuleEngine", config.getEnableRuleEngine() != null ? config.getEnableRuleEngine() : true);
        map.put("ruleEngineTimeout", config.getRuleEngineTimeout() != null ? config.getRuleEngineTimeout() : 10);

        if (config.getCreatedAt() != null) {
            map.put("createdAt", config.getCreatedAt().toString());
        }
        if (config.getUpdatedAt() != null) {
            map.put("updatedAt", config.getUpdatedAt().toString());
        }

        return map;
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
            List<com.security.ailogsystem.entity.SecurityAlert> alerts =
                alertService.getLogCollectorAlerts(status, severity);

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

    private Map<String, Object> transformAlertToResponse(com.security.ailogsystem.entity.SecurityAlert alert) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", String.valueOf(alert.getId()));
        response.put("timestamp", alert.getCreatedTime());

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

        String alertType = alert.getAlertType() != null ? alert.getAlertType().toLowerCase() : "";
        String category = "collector";
        if (alertType.contains("cpu")) category = "cpu";
        else if (alertType.contains("memory") || alertType.contains("mem")) category = "memory";
        else if (alertType.contains("disk")) category = "disk";
        else if (alertType.contains("network") || alertType.contains("net")) category = "network";
        response.put("category", category);

        response.put("title", alert.getAlertType());
        response.put("message", alert.getDescription());
        response.put("value", alert.getMetricValue());
        response.put("threshold", alert.getThreshold());

        // handled 字段语义：null 或 false=未处理, true=已解决
        // 注意：SecurityAlert 实体默认 handled=false，无法区分"未处理"和"已确认"
        // 因此 acknowledged 暂不使用三态，仅用 resolved 区分已解决/未解决
        Boolean handled = alert.getHandled();
        boolean resolved = Boolean.TRUE.equals(handled);
        response.put("acknowledged", resolved); // 兼容前端：已解决=已确认
        response.put("resolved", resolved);
        response.put("handled", resolved);
        response.put("status", resolved ? "RESOLVED" : "PENDING");
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
            Map<String, Object> response = new HashMap<>();
            java.util.List<com.security.ailogsystem.entity.LogCollectorConfig> configs = configService.getAllConfigs();
            boolean configOk = configs != null && !configs.isEmpty();
            boolean schedulerOk = securityLogCollectorService.isScheduledCollectionRunning();

            boolean connected = configOk;
            StringBuilder msg = new StringBuilder();
            if (configOk) {
                msg.append("配置服务正常");
            } else {
                msg.append("配置服务异常：无可用配置");
            }
            msg.append("；");
            if (schedulerOk) {
                msg.append("采集调度运行中");
            } else {
                msg.append("采集调度未启动");
            }

            response.put("connected", connected);
            response.put("message", msg.toString());
            response.put("schedulerRunning", schedulerOk);
            response.put("configCount", configs != null ? configs.size() : 0);
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
