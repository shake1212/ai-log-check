package com.security.ailogsystem.dto;

import com.security.ailogsystem.model.UnifiedSecurityEvent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnifiedSecurityEventDTO {

    private Long id;

    @NotNull(message = "事件时间不能为空")
    private LocalDateTime timestamp;

    @NotBlank(message = "来源系统不能为空")
    private String sourceSystem;

    @NotBlank(message = "事件类型不能为空")
    private String eventType;

    @NotBlank(message = "事件分类不能为空")
    private String category;

    @NotBlank(message = "严重级别不能为空")
    private String severity;

    private String rawMessage;
    private String normalizedMessage;
    private String hostIp;
    private String hostName;
    private String userId;
    private String userName;
    private String sessionId;
    private Integer processId;
    private String processName;
    private Integer threadId;
    private String sourceIp;
    private Integer sourcePort;
    private String destinationIp;
    private Integer destinationPort;
    private String protocol;
    private Integer eventCode;
    private String eventSubType;

    // 修改为直接使用 Map
    private Map<String, Object> eventData;

    @Builder.Default
    private Boolean isAnomaly = false;

    private Double anomalyScore;
    private String anomalyReason;
    private String detectionAlgorithm;

    @Builder.Default
    private String threatLevel = "LOW";

    @Builder.Default
    private String status = "NEW";

    private String assignedTo;
    private String resolutionNotes;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 修改为直接使用 Map
    private Map<String, Double> features;

    private String rawData;

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
    public static UnifiedSecurityEventDTO fromEntity(UnifiedSecurityEvent entity) {
        return UnifiedSecurityEventDTO.builder()
                .id(entity.getId())
                .timestamp(entity.getTimestamp())
                .sourceSystem(entity.getSourceSystem())
                .eventType(entity.getEventType())
                .category(entity.getCategory())
                .severity(entity.getSeverity())
                .rawMessage(entity.getRawMessage())
                .normalizedMessage(entity.getNormalizedMessage())
                .hostIp(entity.getHostIp())
                .hostName(entity.getHostName())
                .userId(entity.getUserId())
                .userName(entity.getUserName())
                .sessionId(entity.getSessionId())
                .processId(entity.getProcessId())
                .processName(entity.getProcessName())
                .threadId(entity.getThreadId())
                .sourceIp(entity.getSourceIp())
                .sourcePort(entity.getSourcePort())
                .destinationIp(entity.getDestinationIp())
                .destinationPort(entity.getDestinationPort())
                .protocol(entity.getProtocol())
                .eventCode(entity.getEventCode())
                .eventSubType(entity.getEventSubType())
                .eventData(entity.getEventData())
                .isAnomaly(entity.getIsAnomaly())
                .anomalyScore(entity.getAnomalyScore())
                .anomalyReason(entity.getAnomalyReason())
                .detectionAlgorithm(entity.getDetectionAlgorithm())
                .threatLevel(entity.getThreatLevel())
                .status(entity.getStatus())
                .assignedTo(entity.getAssignedTo())
                .resolutionNotes(entity.getResolutionNotes())
                .resolvedAt(entity.getResolvedAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .features(entity.getFeatures())
                .rawData(entity.getRawData())
                .build();
    }

    /**
     * 从DTO转换为实体类
     */
    public UnifiedSecurityEvent toEntity() {
        UnifiedSecurityEvent entity = UnifiedSecurityEvent.builder()
                .id(this.id)
                .timestamp(this.timestamp)
                .sourceSystem(this.sourceSystem)
                .eventType(this.eventType)
                .category(this.category)
                .severity(this.severity)
                .rawMessage(this.rawMessage)
                .normalizedMessage(this.normalizedMessage)
                .hostIp(this.hostIp)
                .hostName(this.hostName)
                .userId(this.userId)
                .userName(this.userName)
                .sessionId(this.sessionId)
                .processId(this.processId)
                .processName(this.processName)
                .threadId(this.threadId)
                .sourceIp(this.sourceIp)
                .sourcePort(this.sourcePort)
                .destinationIp(this.destinationIp)
                .destinationPort(this.destinationPort)
                .protocol(this.protocol)
                .eventCode(this.eventCode)
                .eventSubType(this.eventSubType)
                .isAnomaly(this.isAnomaly)
                .anomalyScore(this.anomalyScore)
                .anomalyReason(this.anomalyReason)
                .detectionAlgorithm(this.detectionAlgorithm)
                .threatLevel(this.threatLevel)
                .status(this.status)
                .assignedTo(this.assignedTo)
                .resolutionNotes(this.resolutionNotes)
                .resolvedAt(this.resolvedAt)
                .rawData(this.rawData)
                .build();

        // 设置 Map 数据
        entity.setEventData(this.eventData);
        entity.setFeatures(this.features);

        return entity;
    }
}