package com.security.ailogsystem.repository;

import com.security.ailogsystem.model.LogEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LogEntryRepository extends JpaRepository<LogEntry, Long> {
    
    Page<LogEntry> findByIsAnomalyTrue(Pageable pageable);
    
    Page<LogEntry> findBySource(String source, Pageable pageable);
    
    Page<LogEntry> findByLevel(String level, Pageable pageable);
    
    Page<LogEntry> findByTimestampBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
    
    Page<LogEntry> findBySourceAndLevelAndTimestampBetween(
            String source, String level, LocalDateTime start, LocalDateTime end, Pageable pageable);
    
    @Query("SELECT l FROM LogEntry l WHERE l.content LIKE %:keyword% OR l.rawData LIKE %:keyword%")
    Page<LogEntry> findByKeyword(String keyword, Pageable pageable);
    
    List<LogEntry> findTop100ByOrderByTimestampDesc();
    
    @Query("SELECT COUNT(l) FROM LogEntry l WHERE l.isAnomaly = true AND l.timestamp >= :since")
    long countAnomaliesSince(LocalDateTime since);
} 