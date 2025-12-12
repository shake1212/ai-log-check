// src/main/java/com/security/ailogsystem/dto/ThreatIntelItemDTO.java
package com.security.ailogsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ThreatIntelItemDTO {
    private String id;
    private String type; // malware, phishing, vulnerability, botnet, zero-day
    private String severity; // low, medium, high, critical
    private String source;
    private String description;
    private List<String> affectedSystems;
    private LocalDateTime detectionDate;
    private Integer iocCount;
    private Integer confidence;
    private String status; // active, inactive, mitigated
    private List<String> relatedThreats;
}