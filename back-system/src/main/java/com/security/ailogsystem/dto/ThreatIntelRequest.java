package com.security.ailogsystem.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

@Data
public class ThreatIntelRequest {
    @NotBlank(message = "威胁类型不能为空")
    private String type;

    @NotBlank(message = "来源不能为空")
    private String source;

    @NotBlank(message = "描述不能为空")
    private String description;

    private List<String> affectedSystems;
    private Integer iocCount;
    private Integer confidence;
    private List<String> relatedThreats;
}