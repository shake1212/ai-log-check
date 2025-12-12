package com.security.ailogsystem.dto;

import lombok.Data;
import java.time.LocalDateTime;
@Data
public class ThreatIntelStatsResponse {
    private Long totalThreats;
    private Long activeThreats;
    private Long malwareCount;
    private Long phishingCount;
    private Long criticalCount;
    private LocalDateTime lastUpdate;
}