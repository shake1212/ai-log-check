package com.security.ailogsystem.dto;

import lombok.Data;
import java.util.List;

@Data
public class ThreatIntelSyncRequest {
    private String source;
    private Boolean forceSync = false;
    private List<String> threatTypes;
}