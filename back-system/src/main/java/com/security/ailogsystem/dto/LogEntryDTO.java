package com.security.ailogsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogEntryDTO {
    private String id;
    private LocalDateTime timestamp;
    private String source;
    private String level;
    private String content;
    private String ipAddress;
    private String userId;
    private String action;
    private boolean isAnomaly;
    private Double anomalyScore;
    private String anomalyReason;
    private String rawData;
    private Map<String, Double> features;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
} 