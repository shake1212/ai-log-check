package com.security.ailogsystem.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AnalysisStatsResponse {
    private Long totalAnalyses;
    private Long completed;
    private Long running;
    private Long highRiskCount;
    private Double avgRiskScore;
    private LocalDateTime lastRun;
}