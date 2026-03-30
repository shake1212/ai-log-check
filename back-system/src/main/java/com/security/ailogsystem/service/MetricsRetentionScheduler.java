package com.security.ailogsystem.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Scheduled service for metrics retention policy.
 * Automatically cleans up old metrics based on configured retention period.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MetricsRetentionScheduler {

    private final MetricsService metricsService;

    @Value("${log-collector.metrics.retention-days:30}")
    private int retentionDays;

    /**
     * Scheduled cleanup job that runs daily at midnight.
     * Deletes metrics older than the configured retention period.
     */
    @Scheduled(cron = "0 0 0 * * ?")
    public void cleanupOldMetrics() {
        log.info("Starting scheduled metrics cleanup job (retention: {} days)", retentionDays);
        
        try {
            int deletedCount = metricsService.cleanupOldMetrics(retentionDays);
            
            if (deletedCount > 0) {
                log.info("Successfully cleaned up {} old metrics records", deletedCount);
            } else {
                log.debug("No old metrics to clean up");
            }
            
        } catch (Exception e) {
            log.error("Failed to cleanup old metrics during scheduled job", e);
        }
    }
}
