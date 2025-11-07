package com.security.ailogsystem.dto;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnifiedEventQueryDTO {

    // 时间范围
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    // 基本条件
    private String sourceSystem;
    private String eventType;
    private String category;
    private String severity;
    private String threatLevel;
    private String status;
    private Boolean isAnomaly;

    // 主机和用户条件
    private String hostIp;
    private String hostName;
    private String userId;
    private String userName;

    // 网络条件
    private String sourceIp;
    private String destinationIp;
    private String protocol;

    // 进程条件
    private Integer processId;
    private String processName;

    // 关键词搜索
    private String keyword;

    // 异常检测条件
    private Double minAnomalyScore;
    private Double maxAnomalyScore;
    private String detectionAlgorithm;

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
     * 验证查询参数
     */
    public boolean isValid() {
        if (startTime != null && endTime != null && startTime.isAfter(endTime)) {
            return false;
        }

        if (minAnomalyScore != null && maxAnomalyScore != null &&
                minAnomalyScore > maxAnomalyScore) {
            return false;
        }

        return true;
    }

    /**
     * 获取安全的排序字段
     */
    public String getSafeSortBy() {
        String[] allowedFields = {
                "timestamp", "sourceSystem", "eventType", "category",
                "severity", "threatLevel", "anomalyScore", "createdAt"
        };

        for (String field : allowedFields) {
            if (field.equals(sortBy)) {
                return field;
            }
        }
        return "timestamp";
    }

    /**
     * 获取安全的排序方向
     */
    public String getSafeSortDirection() {
        return "desc".equalsIgnoreCase(sortDirection) ? "desc" : "asc";
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
}