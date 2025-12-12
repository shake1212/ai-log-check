package com.security.ailogsystem.dto;

import lombok.Data;

@Data
public class SyncResponse {
    private String status;
    private Integer syncedCount;
    private String message;
}