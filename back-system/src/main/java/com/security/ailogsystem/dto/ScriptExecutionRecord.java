package com.security.ailogsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScriptExecutionRecord {
    private String executionId;
    private String scriptKey;
    private String scriptName;
    private ScriptStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
    private Integer exitCode;
    private String outputSnippet;
    private String triggerType;
    private String message;
    private List<String> args;
}

