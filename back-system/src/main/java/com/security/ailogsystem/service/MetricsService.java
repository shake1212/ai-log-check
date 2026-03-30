package com.security.ailogsystem.service;

import com.security.ailogsystem.entity.SystemMetrics;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Service interface for managing system metrics from log collectors.
 * Handles storage, retrieval, and transformation of metrics data.
 */
public interface MetricsService {
    
    /**
     * Store metrics from Python collector data.
     * Parses the collector payload and persists metrics to database.
     * 
     * @param collectorData Map containing metrics data from Python collector
     * @return Stored SystemMetrics entity
     * @throws IllegalArgumentException if collectorData is invalid
     */
    SystemMetrics storeMetrics(Map<String, Object> collectorData);
    
    /**
     * Get the most recent metrics for real-time monitoring.
     * 
     * @return Optional containing the most recent SystemMetrics, or empty if none exist
     */
    Optional<SystemMetrics> getRealtimeMetrics();
    
    /**
     * Get historical metrics within a specific time range.
     * 
     * @param start Start of time range (inclusive), null for no lower bound
     * @param end End of time range (inclusive), null for no upper bound
     * @return List of SystemMetrics within the time range, ordered by timestamp ascending
     */
    List<SystemMetrics> getHistoricalMetrics(LocalDateTime start, LocalDateTime end);
    
    /**
     * Get historical metrics for the last N hours.
     * 
     * @param hours Number of hours to look back
     * @return List of SystemMetrics from the last N hours, ordered by timestamp ascending
     */
    List<SystemMetrics> getHistoricalMetrics(int hours);
    
    /**
     * Transform SystemMetrics entity to real-time API response format.
     * Includes all required fields for the real-time metrics endpoint.
     * 
     * @param metrics SystemMetrics entity to transform
     * @return Map containing formatted response data
     */
    Map<String, Object> transformToRealtimeResponse(SystemMetrics metrics);
    
    /**
     * Transform list of SystemMetrics to historical API response format.
     * Includes essential fields for historical trend analysis.
     * 
     * @param metricsList List of SystemMetrics to transform
     * @return List of maps containing formatted response data
     */
    List<Map<String, Object>> transformToHistoricalResponse(List<SystemMetrics> metricsList);
    
    /**
     * Clean up old metrics based on retention policy.
     * Deletes metrics older than the specified number of days.
     * 
     * @param retentionDays Number of days to retain metrics
     * @return Number of deleted metrics records
     */
    int cleanupOldMetrics(int retentionDays);
}
