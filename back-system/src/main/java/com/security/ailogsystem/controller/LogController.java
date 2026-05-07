// controller/LogController.java
package com.security.ailogsystem.controller;

import com.security.ailogsystem.entity.SecurityLog;
import com.security.ailogsystem.entity.SecurityAlert;
import com.security.ailogsystem.service.WindowsLogService;
import com.security.ailogsystem.service.DataExportService;
import com.security.ailogsystem.repository.SecurityLogRepository;
import com.security.ailogsystem.repository.SecurityAlertRepository;
import com.security.ailogsystem.repository.AlertRepository;
import com.security.ailogsystem.repository.UnifiedEventRepository;
import org.springframework.core.io.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/logs")
@CrossOrigin(origins = "*")
public class LogController {

    @Autowired
    private SecurityLogRepository logRepository;

    @Autowired
    private SecurityAlertRepository alertRepository;

    @Autowired
    private AlertRepository alertStatsRepository;

    @Autowired
    private UnifiedEventRepository eventRepository;

    @Autowired
    private WindowsLogService logService;

    @Autowired
    private DataExportService dataExportService;

    /**
     * 获取最近的日志
     */
    @GetMapping("/recent")
    public ResponseEntity<List<SecurityLog>> getRecentLogs(
            @RequestParam(defaultValue = "100") int limit) {

        List<SecurityLog> logs = logRepository.findAll(
                PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "eventTime"))
        ).getContent();

        return ResponseEntity.ok(logs);
    }

    /**
     * 按时间范围查询日志
     */
    @GetMapping("/by-time-range")
    public ResponseEntity<List<SecurityLog>> getLogsByTimeRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {

        List<SecurityLog> logs = logRepository.findLogsByTimeRange(start, end);
        return ResponseEntity.ok(logs);
    }

    /**
     * 获取未处理的警报
     */
    @GetMapping("/alerts/unhandled")
    public ResponseEntity<List<SecurityAlert>> getUnhandledAlerts() {
        List<SecurityAlert> alerts = alertRepository.findByHandledFalseOrderByCreatedTimeDesc();
        return ResponseEntity.ok(alerts);
    }

    /**
     * 标记警报为已处理
     */
    @PutMapping("/alerts/{id}/handle")
    public ResponseEntity<Void> handleAlert(@PathVariable Long id) {
        alertRepository.findById(id).ifPresent(alert -> {
            alert.setHandled(true);
            alertRepository.save(alert);
        });
        return ResponseEntity.ok().build();
    }

    /**
     * 手动触发日志采集
     */
    @PostMapping("/collect")
    public ResponseEntity<Map<String, Object>> collectLogs() {
        List<SecurityLog> logs = logService.collectSecurityLogs();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("collected", logs.size());
        response.put("message", "成功采集 " + logs.size() + " 条日志");

        return ResponseEntity.ok(response);
    }

    /**
     * 获取统计信息（优化版）
     */
    @GetMapping("/statistics")
    @org.springframework.cache.annotation.Cacheable(value = "logs:statistics")
    public ResponseEntity<Map<String, Object>> getStatistics() {
        LocalDateTime last24Hours = LocalDateTime.now().minusHours(24);

        // 优化：用1次GROUP BY替代4次独立威胁等级查询
        List<Object[]> threatLevelRows = logRepository.countByThreatLevelGroup(last24Hours);
        Map<String, Long> threatLevels = new HashMap<>();
        for (Object[] row : threatLevelRows) {
            if (row[0] != null) {
                threatLevels.put((String) row[0], (Long) row[1]);
            }
        }
        // 确保所有等级都有值
        threatLevels.putIfAbsent("LOW", 0L);
        threatLevels.putIfAbsent("MEDIUM", 0L);
        threatLevels.putIfAbsent("HIGH", 0L);
        threatLevels.putIfAbsent("CRITICAL", 0L);

        // 优化：直接计数，不加载数据
        long totalAlerts = alertRepository.count();
        long unhandledAlerts = alertRepository.countByHandledFalse();

        // 其他统计（已有索引，较快）
        List<Object[]> eventCounts = logRepository.countEventsByType(last24Hours);
        List<Object[]> dailyCounts = logRepository.getDailyLogCounts(last24Hours);
        List<Object[]> bruteForceAttempts = logRepository.findBruteForceAttempts(last24Hours, 5L);

        Map<String, Object> stats = new HashMap<>();
        stats.put("eventCounts", eventCounts);
        stats.put("dailyCounts", dailyCounts);
        stats.put("bruteForceAttempts", bruteForceAttempts);
        stats.put("totalAlerts", totalAlerts);
        stats.put("unhandledAlerts", unhandledAlerts);
        stats.put("threatLevels", threatLevels);

        return ResponseEntity.ok(stats);
    }

    /**
     * 搜索日志
     */
    @GetMapping("/search")
    public ResponseEntity<List<SecurityLog>> searchLogs(
            @RequestParam(required = false) Integer eventId,
            @RequestParam(required = false) String ipAddress,
            @RequestParam(required = false) String userName,
            @RequestParam(required = false) String threatLevel) {

        // 这里可以实现更复杂的搜索逻辑
        // 目前简化为按事件ID搜索
        if (eventId != null) {
            List<SecurityLog> logs = logRepository.findByEventIdAndEventTimeAfter(
                    eventId, LocalDateTime.now().minusDays(1));
            return ResponseEntity.ok(logs);
        }

        return ResponseEntity.ok(List.of());
    }
    @GetMapping("/threat-levels")
    public ResponseEntity<Map<String, Long>> getThreatLevels(
            @RequestParam(defaultValue = "24") int hours) {

        LocalDateTime since = LocalDateTime.now().minusHours(hours);

        // 优化：1次GROUP BY替代4次独立查询
        List<Object[]> rows = logRepository.countByThreatLevelGroup(since);
        Map<String, Long> threatLevels = new HashMap<>();
        for (Object[] row : rows) {
            if (row[0] != null) {
                threatLevels.put((String) row[0], (Long) row[1]);
            }
        }
        threatLevels.putIfAbsent("LOW", 0L);
        threatLevels.putIfAbsent("MEDIUM", 0L);
        threatLevels.putIfAbsent("HIGH", 0L);
        threatLevels.putIfAbsent("CRITICAL", 0L);

        return ResponseEntity.ok(threatLevels);
    }

    /**
     * Dashboard 聚合接口：一次请求返回所有 Dashboard 所需数据
     * 替代前端 7 个并发请求为 1 个请求
     * 统一从 UnifiedSecurityEvent 查询，消除 SecurityLog/UnifiedEvent 双表重复统计
     */
    @GetMapping("/dashboard/all-stats")
    @org.springframework.cache.annotation.Cacheable(value = "dashboard:all-stats")
    public ResponseEntity<Map<String, Object>> getDashboardAllStats() {
        Map<String, Object> result = new HashMap<>();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime last24Hours = now.minusHours(24);
        LocalDateTime todayStart = now.with(java.time.LocalTime.MIN);

        long totalEvents = eventRepository.count();
        long todayLogs = eventRepository.countByTimestampAfter(todayStart);
        long anomalyCount = eventRepository.countByIsAnomalyTrue();

        // 1. 威胁等级分布（24小时）— 从 UnifiedSecurityEvent.threatLevel
        Map<String, Long> threatLevels = new HashMap<>();
        threatLevels.put("LOW", 0L);
        threatLevels.put("MEDIUM", 0L);
        threatLevels.put("HIGH", 0L);
        threatLevels.put("CRITICAL", 0L);
        try {
            List<Object[]> threatLevelRows = eventRepository.countByThreatLevelGroup(last24Hours, now);
            for (Object[] row : threatLevelRows) {
                if (row[0] != null) threatLevels.put((String) row[0], ((Number) row[1]).longValue());
            }
        } catch (Exception ignored) {}

        // 2. 严重级别分布（全量）— 从 UnifiedSecurityEvent.severity
        Map<String, Long> severityCounts = new HashMap<>();
        try {
            List<Object[]> severityRows = eventRepository.countBySeverityGroupAll();
            for (Object[] row : severityRows) {
                if (row[0] != null) severityCounts.put((String) row[0], ((Number) row[1]).longValue());
            }
        } catch (Exception ignored) {}

        // 3. 事件类型分布（24小时）
        List<Object[]> eventCounts = List.of();
        try { eventCounts = eventRepository.countByEventTypeGroup(last24Hours, now); } catch (Exception ignored) {}

        // 4. 日统计（7天）
        List<Object[]> dailyCounts = List.of();
        try { dailyCounts = eventRepository.getDailyStatistics(now.minusDays(7)); } catch (Exception ignored) {}

        // 5. 暴力破解（24小时，>=5次失败的同IP）
        List<Object[]> bruteForceAttempts = List.of();
        try { bruteForceAttempts = eventRepository.findBruteForceAttempts(last24Hours, 5L); } catch (Exception ignored) {}

        // 6. 威胁等级全量分布
        Map<String, Long> threatDist = new HashMap<>();
        threatDist.put("CRITICAL", 0L);
        threatDist.put("HIGH", 0L);
        threatDist.put("MEDIUM", 0L);
        threatDist.put("LOW", 0L);
        try {
            for (Object[] row : eventRepository.countByThreatLevelGroupAll()) {
                threatDist.put((String) row[0], ((Number) row[1]).longValue());
            }
        } catch (Exception ignored) {}

        // 组装 logsStatistics（前端用）
        Map<String, Object> logsStats = new HashMap<>();
        logsStats.put("threatLevels", threatLevels);
        logsStats.put("totalAlerts", alertStatsRepository.count());
        logsStats.put("unhandledAlerts", alertStatsRepository.countByHandledFalse());
        logsStats.put("eventCounts", eventCounts);
        logsStats.put("dailyCounts", dailyCounts);
        logsStats.put("bruteForceAttempts", bruteForceAttempts);
        result.put("logsStatistics", logsStats);

        // 组装 eventDashboardStats（前端用）
        Map<String, Object> eventStats = new HashMap<>();
        eventStats.put("totalLogs", totalEvents);
        eventStats.put("todayLogs", todayLogs);
        eventStats.put("anomalyCount", anomalyCount);
        eventStats.put("severityCounts", severityCounts);
        eventStats.put("lastUpdate", now.toString());
        result.put("eventDashboardStats", eventStats);

        // 组装 realTimeStats
        Map<String, Object> realTimeStats = new HashMap<>();
        realTimeStats.put("totalEvents", totalEvents);
        realTimeStats.put("activeAlerts", alertStatsRepository.countByHandled(false));
        realTimeStats.put("eventsLastHour", eventRepository.countByTimestampAfter(now.minusHours(1)));
        realTimeStats.put("threatDistribution", threatDist);
        result.put("realTimeStats", realTimeStats);

        // 告警级别分布
        Map<String, Long> alertLevelStats = new HashMap<>();
        alertLevelStats.put("CRITICAL", 0L);
        alertLevelStats.put("HIGH", 0L);
        alertLevelStats.put("MEDIUM", 0L);
        alertLevelStats.put("LOW", 0L);
        try {
            for (Object[] row : alertStatsRepository.countByAlertLevelGroup()) {
                alertLevelStats.put((String) row[0], ((Number) row[1]).longValue());
            }
        } catch (Exception ignored) {}
        result.put("alertLevelStats", alertLevelStats);

        return ResponseEntity.ok(result);
    }
}