package com.security.ailogsystem.model;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.*;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "unified_security_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnifiedSecurityEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 标准时间字段
    @Column(nullable = false)
    private LocalDateTime timestamp;

    // 事件来源系统
    @Column(nullable = false)
    private String sourceSystem; // WINDOWS, LINUX, NETWORK, APPLICATION

    // 事件类型
    @Column(nullable = false)
    private String eventType; // LOGIN_SUCCESS, LOGIN_FAILURE, PROCESS_CREATION, NETWORK_CONNECTION

    // 事件分类
    @Column(nullable = false)
    private String category; // AUTHENTICATION, SYSTEM, NETWORK, PROCESS, APPLICATION

    // 严重级别
    @Column(nullable = false)
    private String severity; // INFO, WARN, ERROR, CRITICAL

    // 原始消息
    @Column(columnDefinition = "TEXT")
    private String rawMessage;

    // 标准化消息
    @Column(columnDefinition = "TEXT")
    private String normalizedMessage;

    // 主机信息
    private String hostIp;
    private String hostName;

    // 用户信息
    private String userId;
    private String userName;
    private String sessionId;

    // 进程信息
    private Integer processId;
    private String processName;
    private Integer threadId;

    // 网络信息
    private String sourceIp;
    private Integer sourcePort;
    private String destinationIp;
    private Integer destinationPort;
    private String protocol;

    // 事件特定字段
    private Integer eventCode;
    private String eventSubType;

    // 修复：将 Map 转换为 JSON 字符串存储
    @Column(columnDefinition = "TEXT")
    private String eventDataJson;

    // 异常检测相关
    @Builder.Default
    private Boolean isAnomaly = false;

    private Double anomalyScore;

    @Column(columnDefinition = "TEXT")
    private String anomalyReason;

    private String detectionAlgorithm; // KEYWORD, FREQUENCY, STATISTICAL, ML

    // 威胁等级
    @Builder.Default
    private String threatLevel = "LOW"; // LOW, MEDIUM, HIGH, CRITICAL

    // 处理状态
    @Builder.Default
    private String status = "NEW"; // NEW, IN_PROGRESS, RESOLVED, FALSE_POSITIVE

    private String assignedTo;

    @Column(columnDefinition = "TEXT")
    private String resolutionNotes;

    private LocalDateTime resolvedAt;

    // 元数据
    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // 特征向量（用于机器学习）- 存储为 JSON 字符串
    @Column(columnDefinition = "TEXT")
    private String featuresJson;

    // 原始数据备份
    @Column(columnDefinition = "TEXT")
    private String rawData;

    @Column(name = "level")
    private String level;
    // 辅助方法：获取 eventData Map
    @Transient
    public Map<String, Object> getEventData() {
        if (eventDataJson == null || eventDataJson.trim().isEmpty()) {
            return new HashMap<>();
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(eventDataJson, new TypeReference<Map<String, Object>>() {});
        } catch (IOException e) {
            return new HashMap<>();
        }
    }

    // 辅助方法：设置 eventData Map
    @Transient
    public void setEventData(Map<String, Object> eventData) {
        if (eventData == null) {
            this.eventDataJson = null;
            return;
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            this.eventDataJson = mapper.writeValueAsString(eventData);
        } catch (IOException e) {
            this.eventDataJson = "{}";
        }
    }

    // 辅助方法：获取 features Map
    @Transient
    public Map<String, Double> getFeatures() {
        if (featuresJson == null || featuresJson.trim().isEmpty()) {
            return new HashMap<>();
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(featuresJson, new TypeReference<Map<String, Double>>() {});
        } catch (IOException e) {
            return new HashMap<>();
        }
    }

    // 辅助方法：设置 features Map
    @Transient
    public void setFeatures(Map<String, Double> features) {
        if (features == null) {
            this.featuresJson = null;
            return;
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            this.featuresJson = mapper.writeValueAsString(features);
        } catch (IOException e) {
            this.featuresJson = "{}";
        }
    }
}