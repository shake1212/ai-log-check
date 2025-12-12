// src/main/java/com/security/ailogsystem/service/AnalysisService.java
package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.SecurityAnalysisItemDTO;
import com.security.ailogsystem.dto.ThreatIntelItemDTO;
import java.util.List;
import java.util.Map;

public interface AnalysisService {

    // 安全分析相关
    List<SecurityAnalysisItemDTO> getSecurityAnalyses();
    SecurityAnalysisItemDTO runThreatAnalysis();
    SecurityAnalysisItemDTO runComplianceScan();
    SecurityAnalysisItemDTO runAnomalyDetection();
    Map<String, Object> getAnalysisStats();

    // 威胁情报相关
    List<ThreatIntelItemDTO> getThreatIntelligence();
    Map<String, Object> syncCloudThreatIntel();
    Map<String, Object> getThreatIntelStats();
}