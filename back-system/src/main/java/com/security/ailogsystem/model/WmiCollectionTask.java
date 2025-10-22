package com.security.ailogsystem.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * WMI采集任务实体
 * 
 * @author AI Log System
 * @version 1.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "wmi_collection_tasks")
public class WmiCollectionTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String taskId;

    @Column(nullable = false)
    private String targetHost;

    @Column(nullable = false)
    private String wmiClass;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private TaskStatus status;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private TaskPriority priority;

    @Column(name = "collection_interval")
    private Integer collectionInterval; // 采集间隔（秒）

    @Column(name = "max_retry_count")
    private Integer maxRetryCount;

    @Column(name = "current_retry_count")
    private Integer currentRetryCount;

    @Column(name = "last_collection_time")
    private LocalDateTime lastCollectionTime;

    @Column(name = "next_collection_time")
    private LocalDateTime nextCollectionTime;

    @Column(name = "last_success_time")
    private LocalDateTime lastSuccessTime;

    @Column(name = "last_error_time")
    private LocalDateTime lastErrorTime;

    @Column(name = "last_error_message", columnDefinition = "TEXT")
    private String lastErrorMessage;

    @Column(name = "total_collections")
    private Long totalCollections;

    @Column(name = "successful_collections")
    private Long successfulCollections;

    @Column(name = "failed_collections")
    private Long failedCollections;

    @Column(name = "success_rate")
    private Double successRate;

    @Column(name = "is_enabled")
    private Boolean isEnabled;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ElementCollection
    @CollectionTable(name = "wmi_task_parameters", joinColumns = @JoinColumn(name = "task_id"))
    @MapKeyColumn(name = "parameter_name")
    @Column(name = "parameter_value")
    private Map<String, String> parameters;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isEnabled == null) {
            isEnabled = true;
        }
        if (maxRetryCount == null) {
            maxRetryCount = 3;
        }
        if (currentRetryCount == null) {
            currentRetryCount = 0;
        }
        if (totalCollections == null) {
            totalCollections = 0L;
        }
        if (successfulCollections == null) {
            successfulCollections = 0L;
        }
        if (failedCollections == null) {
            failedCollections = 0L;
        }
        if (successRate == null) {
            successRate = 0.0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        if (totalCollections > 0) {
            successRate = (double) successfulCollections / totalCollections;
        }
    }

    public enum TaskStatus {
        PENDING,        // 待执行
        RUNNING,        // 执行中
        SUCCESS,        // 成功
        FAILED,         // 失败
        RETRYING,       // 重试中
        DISABLED,       // 已禁用
        CANCELLED       // 已取消
    }

    public enum TaskPriority {
        LOW,            // 低优先级
        NORMAL,         // 普通优先级
        HIGH,           // 高优先级
        CRITICAL        // 关键优先级
    }
}
