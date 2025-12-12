package com.security.ailogsystem.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.security.ailogsystem.entity.ThreatIndicator;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "threat_intelligence")
@Data
public class ThreatIntelligence {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, length = 50)
    private String type; // malware, phishing, vulnerability, botnet, zero-day

    @Column(nullable = false, length = 20)
    private String severity; // low, medium, high, critical

    @Column(nullable = false, length = 100)
    private String source;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "affected_systems", columnDefinition = "json")
    private List<String> affectedSystems;

    @Column(name = "detection_date", nullable = false)
    private LocalDateTime detectionDate;

    @Column(name = "ioc_count")
    private Integer iocCount = 0;

    private Integer confidence = 0;

    @Column(length = 20)
    private String status = "active"; // active, inactive, mitigated

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "related_threats", columnDefinition = "json")
    private List<String> relatedThreats;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "mitigation_actions", columnDefinition = "json")
    private List<String> mitigationActions;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "threat", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<ThreatIndicator> indicators;

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}