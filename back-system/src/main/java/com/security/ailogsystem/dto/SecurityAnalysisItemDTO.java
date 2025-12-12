// src/main/java/com/security/ailogsystem/dto/SecurityAnalysisItemDTO.java
package com.security.ailogsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SecurityAnalysisItemDTO {
    private String id;
    private String category; // anomaly_detection, threat_hunting, risk_assessment, compliance
    private String name;
    private String description;
    private Integer riskScore;
    private List<String> findings;
    private List<String> recommendations;
    private LocalDateTime lastRun;
    private LocalDateTime nextRun;
    private String status; // completed, running, failed, pending
}