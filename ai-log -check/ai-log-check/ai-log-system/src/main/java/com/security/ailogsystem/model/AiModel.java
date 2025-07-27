package com.security.ailogsystem.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "ai_models")
public class AiModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String modelId;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ModelType type;

    @Column(nullable = false)
    private String algorithm;

    @Column(nullable = false)
    private String version;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ModelStatus status;

    private Double accuracy;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private LocalDateTime lastTrainedAt;

    @Column(columnDefinition = "TEXT")
    private String filePath;

    @ElementCollection
    @CollectionTable(name = "model_parameters", joinColumns = @JoinColumn(name = "model_id"))
    @MapKeyColumn(name = "param_name")
    @Column(name = "param_value")
    private Map<String, String> parameters = new HashMap<>();

    @ElementCollection
    @CollectionTable(name = "model_metrics", joinColumns = @JoinColumn(name = "model_id"))
    @MapKeyColumn(name = "metric_name")
    @Column(name = "metric_value")
    private Map<String, Double> metrics = new HashMap<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum ModelType {
        ANOMALY_DETECTION,
        CLASSIFICATION,
        CLUSTERING,
        FORECASTING
    }

    public enum ModelStatus {
        ACTIVE,
        TRAINING,
        INACTIVE,
        FAILED
    }
} 