// EventAlertBridgeService.java
package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.request.AlertRequest;
import com.security.ailogsystem.dto.response.AlertResponse;
import com.security.ailogsystem.model.Alert;
import com.security.ailogsystem.service.AlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventAlertBridgeService {

    private final AlertService alertService;

    /**
     * 将Python收集的安全事件转换为告警
     */
    public AlertResponse convertSecurityEventToAlert(Map<String, Object> securityEvent) {
        try {
            String eventType = (String) securityEvent.get("eventType");
            String severity = (String) securityEvent.getOrDefault("severity", "INFO");

            // 映射严重级别到告警级别
            String alertLevel = mapSeverityToAlertLevel(severity);

            // 只将中高风险的自动转为告警
            if (shouldCreateAlert(alertLevel, eventType)) {
                AlertRequest request = AlertRequest.builder()
                        .alertId(generateAlertId(eventType))
                        .source("SECURITY_COLLECTOR")
                        .alertType(eventType)
                        .alertLevel(alertLevel)
                        .description(generateAlertDescription(securityEvent))
                        .aiConfidence(calculateConfidence(securityEvent))
                        .build();

                log.info("自动创建告警: 类型={}, 级别={}", eventType, alertLevel);
                return alertService.createAlert(request);
            }

            return null;
        } catch (Exception e) {
            log.error("转换安全事件为告警失败", e);
            return null;
        }
    }

    /**
     * 批量处理Python收集的安全事件
     */
    public int batchProcessSecurityEvents(java.util.List<Map<String, Object>> securityEvents) {
        int alertCount = 0;

        for (Map<String, Object> event : securityEvents) {
            try {
                AlertResponse alert = convertSecurityEventToAlert(event);
                if (alert != null) {
                    alertCount++;
                }
            } catch (Exception e) {
                log.warn("处理单个安全事件失败", e);
            }
        }

        log.info("批量处理安全事件完成，创建了 {} 个告警", alertCount);
        return alertCount;
    }

    private String mapSeverityToAlertLevel(String severity) {
        return switch (severity.toUpperCase()) {
            case "CRITICAL" -> "CRITICAL";
            case "HIGH", "ERROR" -> "HIGH";
            case "MEDIUM", "WARN", "WARNING" -> "MEDIUM";
            case "LOW", "INFO" -> "LOW";
            default -> "MEDIUM";
        };
    }

    private boolean shouldCreateAlert(String alertLevel, String eventType) {
        // 配置哪些事件类型需要自动创建告警
        return switch (alertLevel) {
            case "CRITICAL", "HIGH" -> true;
            case "MEDIUM" -> isImportantEventType(eventType);
            default -> false;
        };
    }

    private boolean isImportantEventType(String eventType) {
        // 重要的安全事件类型
        return eventType.contains("SUSPICIOUS") ||
                eventType.contains("FAILED") ||
                eventType.contains("ATTACK") ||
                eventType.contains("UNAUTHORIZED") ||
                eventType.contains("EXPLOIT");
    }

    private String generateAlertId(String eventType) {
        return "SEC_" + eventType + "_" + System.currentTimeMillis();
    }

    private String generateAlertDescription(Map<String, Object> event) {
        String normalizedMessage = (String) event.getOrDefault("normalizedMessage", "");
        String rawMessage = (String) event.getOrDefault("rawMessage", "");
        String eventType = (String) event.get("eventType");

        if (!normalizedMessage.isEmpty()) {
            return normalizedMessage;
        } else if (!rawMessage.isEmpty()) {
            return String.format("%s: %s", eventType, rawMessage.substring(0, Math.min(rawMessage.length(), 200)));
        } else {
            return String.format("检测到 %s 类型的安全事件", eventType);
        }
    }

    private java.math.BigDecimal calculateConfidence(Map<String, Object> event) {
        // 根据事件数据计算置信度
        Double anomalyScore = (Double) event.getOrDefault("anomalyScore", 0.0);
        String severity = (String) event.getOrDefault("severity", "INFO");

        double baseConfidence = switch (severity.toUpperCase()) {
            case "CRITICAL" -> 0.95;
            case "HIGH" -> 0.85;
            case "MEDIUM" -> 0.75;
            case "LOW" -> 0.60;
            default -> 0.50;
        };

        // 结合异常分数
        if (anomalyScore != null && anomalyScore > 0) {
            baseConfidence = baseConfidence * (1 + anomalyScore);
        }

        return java.math.BigDecimal.valueOf(Math.min(baseConfidence, 0.99));
    }
}