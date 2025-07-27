package com.security.ailogsystem.dto;

import com.security.ailogsystem.model.Alert;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertDTO {
    private String id;
    private LocalDateTime timestamp;
    private String source;
    private String type;
    private String level;
    private String description;
    private Alert.AlertStatus status;
    private String assignee;
    private String resolution;
    private Double aiConfidence;
    private String logEntryId;
} 