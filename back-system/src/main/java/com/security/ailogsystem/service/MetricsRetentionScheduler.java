package com.security.ailogsystem.service;

import com.security.ailogsystem.repository.SecurityAlertRepository;
import com.security.ailogsystem.repository.SecurityLogRepository;
import com.security.ailogsystem.repository.UnifiedEventRepository;
import com.security.ailogsystem.service.LogCollectorConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled service for data retention policy.
 * Cleans up old metrics, security alerts, security logs, and unified events
 * based on the retention period configured in log_collector_configs table.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MetricsRetentionScheduler {

    private final MetricsService metricsService;
    private final SecurityAlertRepository securityAlertRepository;
    private final SecurityLogRepository securityLogRepository;
    private final UnifiedEventRepository unifiedEventRepository;
    private final LogCollectorConfigService logCollectorConfigService;

    @Value("${log-collector.metrics.retention-days:30}")
    private int defaultRetentionDays;

    /**
     * Scheduled cleanup job that runs daily at midnight.
     * Reads retention days from the 'default' collector config in DB,
     * falls back to application.yml value if not configured.
     */
    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void cleanupOldData() {
        int retentionDays = resolveRetentionDays();
        LocalDateTime cutoff = LocalDateTime.now().minusDays(retentionDays);
        log.info("Starting scheduled data cleanup (retention: {} days, cutoff: {})", retentionDays, cutoff);

        // 1. 清理系统指标
        try {
            int deleted = metricsService.cleanupOldMetrics(retentionDays);
            log.info("Cleaned up {} old system metrics records", deleted);
        } catch (Exception e) {
            log.error("Failed to cleanup system metrics", e);
        }

        // 2. 清理安全告警 (security_alerts 表)
        try {
            List<com.security.ailogsystem.entity.SecurityAlert> oldAlerts =
                    securityAlertRepository.findByCreatedTimeBefore(cutoff);
            if (!oldAlerts.isEmpty()) {
                securityAlertRepository.deleteAll(oldAlerts);
                log.info("Cleaned up {} old security alert records", oldAlerts.size());
            }
        } catch (Exception e) {
            log.error("Failed to cleanup security alerts", e);
        }

        // 3. 清理安全日志 (security_logs 表)
        try {
            List<com.security.ailogsystem.entity.SecurityLog> oldLogs =
                    securityLogRepository.findByEventTimeBefore(cutoff);
            if (!oldLogs.isEmpty()) {
                securityLogRepository.deleteAll(oldLogs);
                log.info("Cleaned up {} old security log records", oldLogs.size());
            }
        } catch (Exception e) {
            log.error("Failed to cleanup security logs", e);
        }

        // 4. 清理统一安全事件 (unified_security_events 表)
        try {
            unifiedEventRepository.deleteByTimestampBefore(cutoff);
            log.info("Cleaned up unified security events older than {}", cutoff);
        } catch (Exception e) {
            log.error("Failed to cleanup unified security events", e);
        }
    }

    /**
     * 从数据库配置读取保留天数，找不到时使用 application.yml 默认值
     */
    private int resolveRetentionDays() {
        try {
            return logCollectorConfigService.getConfigById("default")
                    .map(c -> c.getRetentionDays() != null ? c.getRetentionDays() : defaultRetentionDays)
                    .orElse(defaultRetentionDays);
        } catch (Exception e) {
            log.warn("Failed to read retention days from DB config, using default: {}", defaultRetentionDays);
            return defaultRetentionDays;
        }
    }
}
