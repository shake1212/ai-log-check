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
    private Long logEntryId;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
    private Boolean handled;

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
                .logEntryId(alert.getLogEntry() != null ? alert.getLogEntry().getId() : null)
                .createdTime(alert.getCreatedTime())
                .updatedTime(alert.getUpdatedTime())
                .handled(alert.getHandled())
                .build();
    }
}