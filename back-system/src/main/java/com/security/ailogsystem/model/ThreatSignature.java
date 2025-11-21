package com.security.ailogsystem.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * 威胁特征库实体
 */
@Entity
@Table(name = "threat_signatures")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ThreatSignature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String pattern;

    @Column(name = "pattern_type", nullable = false, length = 20)
    private String patternType;

    @Column(name = "threat_type", length = 50)
    private String threatType;

    @Column(length = 20)
    private String severity;

    private Double score;

    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = Boolean.TRUE;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Integer version;

    @Column(name = "hit_count")
    private Long hitCount;

    @Column(name = "last_hit_time")
    private LocalDateTime lastHitTime;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by", length = 50)
    private String createdBy;

    @Column(name = "updated_by", length = 50)
    private String updatedBy;

    @Column(columnDefinition = "TEXT")
    private String remark;
}

