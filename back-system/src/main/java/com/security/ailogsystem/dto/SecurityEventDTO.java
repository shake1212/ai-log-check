package com.security.ailogsystem.dto;

import com.security.ailogsystem.model.SecurityEvent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

/**
 * 安全事件DTO类
 * 用于数据传输和API交互
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SecurityEventDTO {

    private Long id;

    @NotNull(message = "事件时间不能为空")
    private LocalDateTime timestamp;

    @NotBlank(message = "事件来源不能为空")
    private String source;

    private Integer eventId;

    private SecurityEvent.EventType eventType;

    @NotNull(message = "日志级别不能为空")
    private SecurityEvent.LogLevel level;

    @NotBlank(message = "事件消息不能为空")
    private String message;

    private String rawData;

    private String hostIp;

    private String hostName;

    private Integer processId;

    private Integer threadId;

    private String userId;

    private String sessionId;

    @Builder.Default
    private Boolean isAnomaly = false;

    private Double anomalyScore;

    private String anomalyReason;

    private SecurityEvent.EventCategory category;

    private SecurityEvent.ThreatLevel threatLevel;

    @Builder.Default
    private SecurityEvent.EventStatus status = SecurityEvent.EventStatus.NEW;

    private String assignedTo;

    private String resolutionNotes;

    private LocalDateTime resolvedAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // 用于查询的条件字段
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String keyword;
    private Integer page;
    private Integer size;
    private String sortBy;
    private String sortDirection;

    /**
     * 从实体类转换为DTO
     */
    public static SecurityEventDTO fromEntity(SecurityEvent entity) {
        return SecurityEventDTO.builder()
                .id(entity.getId())
                .timestamp(entity.getTimestamp())
                .source(entity.getSource())
                .eventId(entity.getEventId())
                .eventType(entity.getEventType())
                .level(entity.getLevel())
                .message(entity.getMessage())
                .rawData(entity.getRawData())
                .hostIp(entity.getHostIp())
                .hostName(entity.getHostName())
                .processId(entity.getProcessId())
                .threadId(entity.getThreadId())
                .userId(entity.getUserId())
                .sessionId(entity.getSessionId())
                .isAnomaly(entity.getIsAnomaly())
                .anomalyScore(entity.getAnomalyScore())
                .anomalyReason(entity.getAnomalyReason())
                .category(entity.getCategory())
                .threatLevel(entity.getThreatLevel())
                .status(entity.getStatus())
                .assignedTo(entity.getAssignedTo())
                .resolutionNotes(entity.getResolutionNotes())
                .resolvedAt(entity.getResolvedAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    /**
     * 从DTO转换为实体类
     */
    public SecurityEvent toEntity() {
        return SecurityEvent.builder()
                .id(this.id)
                .timestamp(this.timestamp)
                .source(this.source)
                .eventId(this.eventId)
                .eventType(this.eventType)
                .level(this.level)
                .message(this.message)
                .rawData(this.rawData)
                .hostIp(this.hostIp)
                .hostName(this.hostName)
                .processId(this.processId)
                .threadId(this.threadId)
                .userId(this.userId)
                .sessionId(this.sessionId)
                .isAnomaly(this.isAnomaly)
                .anomalyScore(this.anomalyScore)
                .anomalyReason(this.anomalyReason)
                .category(this.category)
                .threatLevel(this.threatLevel)
                .status(this.status)
                .assignedTo(this.assignedTo)
                .resolutionNotes(this.resolutionNotes)
                .resolvedAt(this.resolvedAt)
                .build();
    }
}
