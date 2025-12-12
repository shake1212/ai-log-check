package com.security.ailogsystem.repository;


import com.security.ailogsystem.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
@Repository
public interface ThreatIndicatorRepository extends JpaRepository<ThreatIndicator, String> {
    List<ThreatIndicator> findByIndicatorType(String type);
    List<ThreatIndicator> findByIndicatorValueContaining(String value);
    List<ThreatIndicator> findByThreatId(String threatId);

    @Query("SELECT COUNT(DISTINCT ti.threat.id) FROM ThreatIndicator ti")
    Long countThreatsWithIndicators();
}