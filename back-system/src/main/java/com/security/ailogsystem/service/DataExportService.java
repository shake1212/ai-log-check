package com.security.ailogsystem.service;

import org.springframework.core.io.Resource;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 数据导出服务接口
 */
public interface DataExportService {

    /**
     * 导出日志数据
     */
    Resource exportLogs(String format, LocalDateTime startTime, LocalDateTime endTime, 
                       String level, String keyword);

    /**
     * 导出告警数据
     */
    Resource exportAlerts(String format, LocalDateTime startTime, LocalDateTime endTime, 
                         String alertLevel, String alertType, String status);

    /**
     * 导出安全事件数据
     */
    Resource exportEvents(String format, LocalDateTime startTime, LocalDateTime endTime, 
                         String eventType, String severity);

    /**
     * 导出Windows安全日志
     */
    Resource exportSecurityLogs(String format, LocalDateTime startTime, LocalDateTime endTime, 
                               Integer eventId, String username);

    /**
     * 导出系统性能指标
     */
    Resource exportSystemMetrics(String format, LocalDateTime startTime, LocalDateTime endTime, 
                                String metricType);

    /**
     * 批量导出多种数据
     */
    Resource batchExport(String format, List<String> dataTypes, 
                        LocalDateTime startTime, LocalDateTime endTime);
}
