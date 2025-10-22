package com.security.ailogsystem.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "log_entries")
public class LogEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    private String source;

    @Column(nullable = false)
    private String level;

    @Column(columnDefinition = "TEXT")
    private String content;

    private String ipAddress;

    private String userId;

    private String action;

    @Column(nullable = false)
    private boolean isAnomaly;

    private Double anomalyScore;

    @Column(columnDefinition = "TEXT")
    private String anomalyReason;

    @Column(columnDefinition = "TEXT")
    private String rawData;

    @ElementCollection
    @CollectionTable(name = "log_entry_features", joinColumns = @JoinColumn(name = "log_entry_id"))
    @MapKeyColumn(name = "feature_name")
    @Column(name = "feature_value")
    private Map<String, Double> features;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
} 