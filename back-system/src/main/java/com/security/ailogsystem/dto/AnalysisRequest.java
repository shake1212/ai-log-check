package com.security.ailogsystem.dto;

import lombok.Data;
import java.util.Map;

@Data
public class AnalysisRequest {
    private String category;
    private Map<String, Object> parameters;
}