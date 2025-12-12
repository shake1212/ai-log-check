// SecurityAnalysisRequest.java
package com.security.ailogsystem.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

@Data
public class SecurityAnalysisRequest {
    private String category; // 可选，指定分析类别
    private List<String> targetSystems; // 可选，指定目标系统
    private String analysisScope; // 可选，分析范围
}
