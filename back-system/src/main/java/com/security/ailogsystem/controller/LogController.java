// controller/LogController.java
package com.security.ailogsystem.controller;

import com.security.ailogsystem.entity.SecurityLog;
import com.security.ailogsystem.entity.SecurityAlert;
import com.security.ailogsystem.service.WindowsLogService;
import com.security.ailogsystem.repository.SecurityLogRepository;
import com.security.ailogsystem.repository.SecurityAlertRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
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
    private WindowsLogService logService;

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
     * 获取统计信息
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getStatistics() {
        LocalDateTime last24Hours = LocalDateTime.now().minusHours(24);

        List<Object[]> eventCounts = logRepository.countEventsByType(last24Hours);
        List<Object[]> dailyCounts = logRepository.getDailyLogCounts(last24Hours);
        List<Object[]> bruteForceAttempts = logRepository.findBruteForceAttempts(last24Hours, 5L);

        Map<String, Object> stats = new HashMap<>();
        stats.put("eventCounts", eventCounts);
        stats.put("dailyCounts", dailyCounts);
        stats.put("bruteForceAttempts", bruteForceAttempts);
        stats.put("totalAlerts", alertRepository.count());
        stats.put("unhandledAlerts", alertRepository.findByHandledFalseOrderByCreatedTimeDesc().size());

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
}