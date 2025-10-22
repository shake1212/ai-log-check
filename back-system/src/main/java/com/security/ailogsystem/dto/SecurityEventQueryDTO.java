package com.security.ailogsystem.dto;

import com.security.ailogsystem.model.SecurityEvent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 安全事件查询条件DTO
 * 用于构建复杂的查询条件
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SecurityEventQueryDTO {

    // 时间范围
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    // 基本条件
    private SecurityEvent.LogLevel level;
    private String source;
    private String hostIp;
    private String hostName;
    private String userId;
    private SecurityEvent.EventType eventType;
    private SecurityEvent.EventCategory category;
    private SecurityEvent.ThreatLevel threatLevel;
    private SecurityEvent.EventStatus status;
    private Boolean isAnomaly;

    // 关键词搜索
    private String keyword;

    // 事件ID
    private Integer eventId;

    // 进程和线程
    private Integer processId;
    private Integer threadId;

    // 会话
    private String sessionId;

    // 分配人
    private String assignedTo;

    // 异常评分范围
    private Double minAnomalyScore;
    private Double maxAnomalyScore;

    // 分页参数
    @Builder.Default
    private Integer page = 0;
    @Builder.Default
    private Integer size = 20;

    // 排序参数
    @Builder.Default
    private String sortBy = "timestamp";
    @Builder.Default
    private String sortDirection = "desc";

    /**
     * 获取排序字段，防止SQL注入
     */
    public String getSafeSortBy() {
        if (sortBy == null) {
            return "timestamp";
        }
        
        // 允许的排序字段
        String[] allowedSortFields = {
            "timestamp", "level", "source", "hostIp", "hostName", 
            "userId", "eventType", "category", "threatLevel", 
            "status", "isAnomaly", "anomalyScore", "createdAt", "updatedAt"
        };
        
        for (String field : allowedSortFields) {
            if (field.equals(sortBy)) {
                return field;
            }
        }
        
        return "timestamp";
    }

    /**
     * 获取排序方向
     */
    public String getSafeSortDirection() {
        if (sortDirection == null) {
            return "desc";
        }
        
        return "desc".equalsIgnoreCase(sortDirection) ? "desc" : "asc";
    }

    /**
     * 验证时间范围
     */
    public boolean isValidTimeRange() {
        if (startTime == null || endTime == null) {
            return true; // 没有时间限制
        }
        return !startTime.isAfter(endTime);
    }

    /**
     * 验证异常评分范围
     */
    public boolean isValidAnomalyScoreRange() {
        if (minAnomalyScore == null || maxAnomalyScore == null) {
            return true; // 没有评分限制
        }
        return minAnomalyScore <= maxAnomalyScore && 
               minAnomalyScore >= 0 && 
               maxAnomalyScore <= 100;
    }

    /**
     * 验证分页参数
     */
    public void validatePagination() {
        if (page == null || page < 0) {
            page = 0;
        }
        if (size == null || size <= 0 || size > 1000) {
            size = 20;
        }
    }

    /**
     * 检查是否有搜索条件
     */
    public boolean hasSearchConditions() {
        return startTime != null || endTime != null || level != null || 
               source != null || hostIp != null || hostName != null || 
               userId != null || eventType != null || category != null || 
               threatLevel != null || status != null || isAnomaly != null || 
               keyword != null || eventId != null || processId != null || 
               threadId != null || sessionId != null || assignedTo != null ||
               minAnomalyScore != null || maxAnomalyScore != null;
    }
}
