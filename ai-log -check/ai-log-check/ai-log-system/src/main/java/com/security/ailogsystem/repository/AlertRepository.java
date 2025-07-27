package com.security.ailogsystem.repository;

import com.security.ailogsystem.model.Alert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {
    
    Optional<Alert> findByAlertId(String alertId);
    
    Page<Alert> findByStatus(Alert.AlertStatus status, Pageable pageable);
    
    Page<Alert> findByLevel(String level, Pageable pageable);
    
    Page<Alert> findBySource(String source, Pageable pageable);
    
    Page<Alert> findByType(String type, Pageable pageable);
    
    Page<Alert> findByTimestampBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
    
    @Query("SELECT a FROM Alert a WHERE a.description LIKE %:keyword%")
    Page<Alert> findByKeyword(String keyword, Pageable pageable);
    
    List<Alert> findTop10ByStatusOrderByTimestampDesc(Alert.AlertStatus status);
    
    @Query("SELECT COUNT(a) FROM Alert a WHERE a.status = :status AND a.timestamp >= :since")
    long countByStatusSince(Alert.AlertStatus status, LocalDateTime since);
    
    @Query("SELECT COUNT(a) FROM Alert a WHERE a.level = :level AND a.timestamp >= :since")
    long countByLevelSince(String level, LocalDateTime since);
} 