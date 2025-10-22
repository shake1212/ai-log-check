package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.EventStatisticsDTO;
import com.security.ailogsystem.dto.LogEntryDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 事件查询服务接口
 * 提供高级事件查询和统计功能
 */
public interface EventQueryService {
    
    /**
     * 获取综合事件统计信息
     */
    EventStatisticsDTO getComprehensiveStatistics();
    
    /**
     * 获取指定时间范围的事件统计
     */
    EventStatisticsDTO getStatisticsByTimeRange(LocalDateTime startTime, LocalDateTime endTime);
    
    /**
     * 获取事件趋势数据
     */
    List<EventStatisticsDTO.TrendData> getEventTrends(
            LocalDateTime startTime, 
            LocalDateTime endTime, 
            String granularity);
    
    /**
     * 获取来源统计
     */
    Map<String, Long> getSourceStatistics(LocalDateTime startTime, LocalDateTime endTime);
    
    /**
     * 获取级别统计
     */
    Map<String, Long> getLevelStatistics(LocalDateTime startTime, LocalDateTime endTime);
    
    /**
     * 获取异常统计
     */
    EventStatisticsDTO.AnomalyStatistics getAnomalyStatistics(LocalDateTime startTime, LocalDateTime endTime);
    
    /**
     * 获取热点IP统计
     */
    List<EventStatisticsDTO.IpStatistics> getTopIps(int limit, LocalDateTime startTime, LocalDateTime endTime);
    
    /**
     * 获取用户活动统计
     */
    List<EventStatisticsDTO.UserActivityStatistics> getUserActivityStatistics(int limit, LocalDateTime startTime, LocalDateTime endTime);
    
    /**
     * 高级事件查询
     */
    Page<LogEntryDTO> advancedEventQuery(
            String source,
            String level,
            String ipAddress,
            String userId,
            String action,
            Boolean isAnomaly,
            Double minAnomalyScore,
            Double maxAnomalyScore,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String keyword,
            Pageable pageable);
    
    /**
     * 获取事件聚合统计
     */
    Map<String, Object> getEventAggregations(
            String groupBy,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String aggregationType);
    
    /**
     * 获取实时事件统计
     */
    Map<String, Long> getRealTimeStatistics();
    
    /**
     * 获取事件分布统计
     */
    Map<String, Long> getEventDistribution(String dimension, LocalDateTime startTime, LocalDateTime endTime);
}
