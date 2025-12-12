package com.security.ailogsystem.repository;

import com.security.ailogsystem.entity.AnalysisResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AnalysisResultRepository extends JpaRepository<AnalysisResult, String> {

    List<AnalysisResult> findByAnalysisType(String analysisType);
    List<AnalysisResult> findByStatus(String status);
    Optional<AnalysisResult> findByTaskId(String taskId);

    @Query("SELECT COUNT(a) FROM AnalysisResult a WHERE a.createdAt >= :startDate")
    Long countRecentResults(LocalDateTime startDate);

    @Query("SELECT AVG(a.riskScore) FROM AnalysisResult a WHERE a.completedAt >= :startDate")
    Double getAverageRiskScore(LocalDateTime startDate);
}