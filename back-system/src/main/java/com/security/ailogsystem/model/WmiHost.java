package com.security.ailogsystem.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * WMI主机配置实体
 * 
 * @author AI Log System
 * @version 1.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "wmi_hosts")
public class WmiHost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String hostId;

    @Column(nullable = false)
    private String hostname;

    @Column(nullable = false)
    private String ipAddress;

    @Column
    private Integer port;

    @Column
    private String domain;

    @Column
    private String username;

    @Column
    private String password; // 加密存储

    @Column(name = "connection_timeout")
    private Integer connectionTimeout;

    @Column(name = "read_timeout")
    private Integer readTimeout;

    @Column(name = "max_connections")
    private Integer maxConnections;

    @Column(name = "is_enabled")
    private Boolean isEnabled;

    @Column(name = "last_connection_time")
    private LocalDateTime lastConnectionTime;

    @Column(name = "last_success_time")
    private LocalDateTime lastSuccessTime;

    @Column(name = "last_error_time")
    private LocalDateTime lastErrorTime;

    @Column(name = "last_error_message", columnDefinition = "TEXT")
    private String lastErrorMessage;

    @Column(name = "connection_count")
    private Long connectionCount;

    @Column(name = "success_count")
    private Long successCount;

    @Column(name = "error_count")
    private Long errorCount;

    @Column(name = "success_rate")
    private Double successRate;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ElementCollection
    @CollectionTable(name = "wmi_host_properties", joinColumns = @JoinColumn(name = "host_id"))
    @MapKeyColumn(name = "property_name")
    @Column(name = "property_value", columnDefinition = "TEXT")
    private Map<String, String> properties;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isEnabled == null) {
            isEnabled = true;
        }
        if (port == null) {
            port = 135; // WMI默认端口
        }
        if (connectionTimeout == null) {
            connectionTimeout = 30000; // 30秒
        }
        if (readTimeout == null) {
            readTimeout = 60000; // 60秒
        }
        if (maxConnections == null) {
            maxConnections = 10;
        }
        if (connectionCount == null) {
            connectionCount = 0L;
        }
        if (successCount == null) {
            successCount = 0L;
        }
        if (errorCount == null) {
            errorCount = 0L;
        }
        if (successRate == null) {
            successRate = 0.0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        if (connectionCount > 0) {
            successRate = (double) successCount / connectionCount;
        }
    }
}
