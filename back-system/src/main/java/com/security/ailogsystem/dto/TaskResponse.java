package com.security.ailogsystem.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class TaskResponse {
    private String taskId;
    private String status;
    private String message;
    private LocalDateTime startedAt;
    private LocalDateTime estimatedCompletion;
}