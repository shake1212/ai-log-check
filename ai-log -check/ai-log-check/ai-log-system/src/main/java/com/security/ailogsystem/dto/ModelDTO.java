package com.security.ailogsystem.dto;

import com.security.ailogsystem.model.AiModel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModelDTO {
    private String id;
    private String name;
    private String description;
    private AiModel.ModelType type;
    private String algorithm;
    private String version;
    private AiModel.ModelStatus status;
    private Double accuracy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastTrainedAt;
    private Map<String, String> parameters;
    private Map<String, Double> metrics;
} 