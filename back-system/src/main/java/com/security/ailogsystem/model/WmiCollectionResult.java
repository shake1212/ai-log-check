package com.security.ailogsystem.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * WMI采集结果实体
 * 
 * @author AI Log System
 * @version 1.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "wmi_collection_results")
public class WmiCollectionResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String resultId;

    @Column(nullable = false)
    private String taskId;

    @Column(nullable = false)
    private String targetHost;

    @Column(nullable = false)
    private String wmiClass;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private CollectionStatus status;

    @Column(name = "collection_time", nullable = false)
    private LocalDateTime collectionTime;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "retry_count")
    private Integer retryCount;

    @Column(name = "records_collected")
    private Integer recordsCollected;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "error_code")
    private String errorCode;

    @Column(name = "raw_data", columnDefinition = "LONGTEXT")
    private String rawData;

    @Column(name = "processed_data", columnDefinition = "LONGTEXT")
    private String processedData;

    @Column(name = "is_anomaly")
    private Boolean isAnomaly;

    @Column(name = "anomaly_score")
    private Double anomalyScore;

    @Column(name = "anomaly_reason", columnDefinition = "TEXT")
    private String anomalyReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ElementCollection
    @CollectionTable(name = "wmi_result_metrics", joinColumns = @JoinColumn(name = "result_id"))
    @MapKeyColumn(name = "metric_name")
    @Column(name = "metric_value")
    private Map<String, Double> metrics;

    @ElementCollection
    @CollectionTable(name = "wmi_result_properties", joinColumns = @JoinColumn(name = "result_id"))
    @MapKeyColumn(name = "property_name")
    @Column(name = "property_value", columnDefinition = "TEXT")
    private Map<String, String> properties;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (retryCount == null) {
            retryCount = 0;
        }
        if (recordsCollected == null) {
            recordsCollected = 0;
        }
        if (isAnomaly == null) {
            isAnomaly = false;
        }
    }

    public enum CollectionStatus {
        SUCCESS,        // 成功
        FAILED,         // 失败
        PARTIAL,        // 部分成功
        TIMEOUT,        // 超时
        AUTHENTICATION_ERROR,  // 认证错误
        CONNECTION_ERROR,      // 连接错误
        PERMISSION_ERROR,      // 权限错误
        DATA_ERROR,            // 数据错误
        UNKNOWN_ERROR          // 未知错误
    }
}
