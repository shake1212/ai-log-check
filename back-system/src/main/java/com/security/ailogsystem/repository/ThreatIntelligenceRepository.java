package com.security.ailogsystem.repository;

import com.security.ailogsystem.entity.ThreatIntelligence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ThreatIntelligenceRepository extends JpaRepository<ThreatIntelligence, String> {
    List<ThreatIntelligence> findByType(String type);
    List<ThreatIntelligence> findBySeverity(String severity);
    List<ThreatIntelligence> findByStatus(String status);
    List<ThreatIntelligence> findByDetectionDateAfter(LocalDateTime date);
    Long countBySeverity(String severity);
    Long countByStatus(String status);

    @Query("SELECT DISTINCT ti FROM ThreatIntelligence ti LEFT JOIN FETCH ti.indicators")
    List<ThreatIntelligence> findAllWithIndicators();

}