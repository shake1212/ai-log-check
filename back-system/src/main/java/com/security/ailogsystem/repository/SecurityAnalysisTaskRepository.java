package com.security.ailogsystem.repository;

import com.security.ailogsystem.entity.SecurityAnalysisTask;
import com.security.ailogsystem.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SecurityAnalysisTaskRepository extends JpaRepository<SecurityAnalysisTask, String> {
    List<SecurityAnalysisTask> findByCategory(String category);
    List<SecurityAnalysisTask> findByStatus(String status);
    List<SecurityAnalysisTask> findByRiskScoreGreaterThan(Integer minScore);
    Long countByStatus(String status);

    @Query("SELECT COUNT(s) FROM SecurityAnalysisTask s WHERE s.lastRun >= :startDate")
    Long countRecentTasks(LocalDateTime startDate);


}