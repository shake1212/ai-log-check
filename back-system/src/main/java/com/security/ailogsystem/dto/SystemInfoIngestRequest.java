package com.security.ailogsystem.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
public class SystemInfoIngestRequest {

    @NotBlank
    private String hostname;

    @NotBlank
    private String ipAddress;

    @NotBlank
    private String dataType;

    @NotNull
    private Map<String, Object> payload;

    private String status;

    private String remark;

    private LocalDateTime collectTime;
}

