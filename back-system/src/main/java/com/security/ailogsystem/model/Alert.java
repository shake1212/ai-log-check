// Alert.java - 完整修改
package com.security.ailogsystem.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "alerts", indexes = {
    @Index(name = "idx_alerts_handled_created", columnList = "handled, created_time"),
    @Index(name = "idx_alerts_created_time", columnList = "created_time"),
    @Index(name = "idx_alerts_alert_level", columnList = "alert_level"),
    @Index(name = "idx_alerts_alert_type", columnList = "alert_type"),
    @Index(name = "idx_alerts_status", columnList = "status"),
    @Index(name = "idx_alerts_source", columnList = "source")
})
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "alert_id", unique = true, nullable = false)
    private String alertId;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    private String source;

    @Column(name = "alert_type", nullable = false)
    private String alertType;

    @Column(name = "alert_level", nullable = false)
    private String alertLevel;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private AlertStatus status;

    private String assignee;

    @Column(columnDefinition = "TEXT")
    private String resolution;

    @Column(name = "confidence", precision = 5, scale = 4)
    private BigDecimal aiConfidence;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unified_event_id", insertable = false, updatable = false)
    private com.security.ailogsystem.model.UnifiedSecurityEvent unifiedEvent;

    @Column(name = "unified_event_id")
    private Long unifiedEventId;

    @Column(name = "metric_value")
    private Double metricValue;

    @Column(name = "threshold")
    private Double threshold;

    @Column(name = "created_time", nullable = false, updatable = false)
    private LocalDateTime createdTime;

    @Column(name = "updated_time")
    private LocalDateTime updatedTime;

    @Column(name = "handled", nullable = false)
    private Boolean handled;

    @PrePersist
    protected void onCreate() {
        createdTime = LocalDateTime.now();
        timestamp = LocalDateTime.now();
        if (handled == null) {
            handled = false;
        }
        if (status == null) {
            status = AlertStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedTime = LocalDateTime.now();
    }

    public enum AlertStatus {
        PENDING,
        PROCESSING,
        RESOLVED,
        FALSE_POSITIVE
    }
}