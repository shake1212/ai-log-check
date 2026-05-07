// AlertResponse.java
package com.security.ailogsystem.dto.response;

import com.security.ailogsystem.model.Alert;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertResponse {
    private Long id;
    private String alertId;
    private LocalDateTime timestamp;
    private String source;
    private String alertType;
    private String alertLevel;
    private String description;
    private Alert.AlertStatus status;
    private String assignee;
    private String resolution;
    private BigDecimal aiConfidence;
    private Long unifiedEventId;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
    private Boolean handled;
    // 新增：指标值和阈值
    private Double metricValue;
    private Double threshold;

    public static AlertResponse fromEntity(Alert alert) {
        return AlertResponse.builder()
                .id(alert.getId())
                .alertId(alert.getAlertId())
                .timestamp(alert.getTimestamp())
                .source(alert.getSource())
                .alertType(alert.getAlertType())
                .alertLevel(alert.getAlertLevel())
                .description(alert.getDescription())
                .status(alert.getStatus())
                .assignee(alert.getAssignee())
                .resolution(alert.getResolution())
                .aiConfidence(alert.getAiConfidence())
                .unifiedEventId(alert.getUnifiedEventId())
                .createdTime(alert.getCreatedTime())
                .updatedTime(alert.getUpdatedTime())
                .handled(alert.getHandled())
                .metricValue(alert.getMetricValue())
                .threshold(alert.getThreshold())
                .build();
    }
}