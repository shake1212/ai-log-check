package com.security.ailogsystem.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "analysis_results")
@Data
public class AnalysisResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private SecurityAnalysisTask task;

    @Column(name = "analysis_type", nullable = false, length = 50)
    private String analysisType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "result_data", nullable = false, columnDefinition = "json")
    private Map<String, Object> resultData;

    @Column(name = "risk_level", length = 20)
    private String riskLevel;

    @Column(name = "risk_score")
    private Integer riskScore = 0;

    @Column(name = "confidence_score")
    private Integer confidenceScore = 0;

    @Column(length = 20)
    private String status = "pending"; // pending, processing, completed, failed

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}