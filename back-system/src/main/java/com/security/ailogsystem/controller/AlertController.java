package com.security.ailogsystem.controller;

import com.security.ailogsystem.dto.request.AlertRequest;
import com.security.ailogsystem.dto.response.AlertResponse;
import com.security.ailogsystem.model.Alert;
import com.security.ailogsystem.repository.AlertRepository;
import com.security.ailogsystem.service.AlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/alerts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AlertController {

    private final AlertService alertService;
    private final AlertRepository alertRepository;

    @PostMapping
    public ResponseEntity<AlertResponse> createAlert(@RequestBody AlertRequest request) {
        try {
            AlertResponse response = alertService.createAlert(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("创建告警失败", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<AlertResponse> getAlert(@PathVariable Long id) {
        try {
            AlertResponse response = alertService.getAlertById(id);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("获取告警失败: {}", id, e);
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping
    public ResponseEntity<Page<AlertResponse>> getAllAlerts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdTime") String sort,
            @RequestParam(defaultValue = "desc") String direction) {

        try {
            Sort.Direction sortDirection = direction.equalsIgnoreCase("asc")
                    ? Sort.Direction.ASC : Sort.Direction.DESC;
            Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sort));

            Page<AlertResponse> alerts = alertService.getAllAlerts(pageable);
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            log.error("获取告警列表失败", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/unhandled")
    public ResponseEntity<Page<AlertResponse>> getUnhandledAlerts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdTime"));
            Page<AlertResponse> alerts = alertService.getUnhandledAlerts(pageable);
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            log.error("获取未处理告警失败", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/search")
    public ResponseEntity<Page<AlertResponse>> searchAlerts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String alertLevel,
            @RequestParam(required = false) Boolean handled,
            @RequestParam(required = false) Alert.AlertStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdTime"));
            Page<AlertResponse> alerts = alertService.searchAlerts(keyword, alertLevel, handled, status, pageable);
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            log.error("搜索告警失败", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/handle")
    public ResponseEntity<Void> handleAlert(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "system") String handledBy,
            @RequestParam(required = false, defaultValue = "通过界面处理") String resolution) {

        try {
            boolean success = alertService.markAlertAsHandled(id, handledBy, resolution);
            if (success) {
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("处理告警失败: {}", id, e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Void> updateAlertStatus(
            @PathVariable Long id,
            @RequestParam Alert.AlertStatus status,
            @RequestParam(required = false) String assignee,
            @RequestParam(required = false) String resolution) {

        try {
            boolean success = alertService.updateAlertStatus(id, status, assignee, resolution);
            if (success) {
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("更新告警状态失败: {}", id, e);
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAlert(@PathVariable Long id) {
        try {
            boolean success = alertService.deleteAlert(id);
            if (success) {
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("删除告警失败: {}", id, e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getStatistics() {
        try {
            Map<String, Object> statistics = alertService.getAlertStatistics();
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("获取告警统计失败", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/recent")
    public ResponseEntity<Page<AlertResponse>> getRecentAlerts(
            @RequestParam(defaultValue = "10") int count) {

        try {
            Page<AlertResponse> alerts = alertService.getRecentAlerts(count);
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            log.error("获取最近告警失败", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/batch/handle")
    public ResponseEntity<Map<String, Object>> batchHandleAlerts(
            @RequestBody Map<String, Object> request) {

        try {
            @SuppressWarnings("unchecked")
            List<Long> alertIds = (List<Long>) request.get("alertIds");
            String handledBy = (String) request.getOrDefault("handledBy", "system");
            String resolution = (String) request.getOrDefault("resolution", "批量处理");

            if (alertIds == null || alertIds.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "alertIds不能为空"
                ));
            }

            // 批量处理逻辑
            int handledCount = 0;
            for (Long alertId : alertIds) {
                boolean success = alertService.markAlertAsHandled(alertId, handledBy, resolution);
                if (success) {
                    handledCount++;
                }
            }

            return ResponseEntity.ok(Map.of(
                    "handledCount", handledCount,
                    "totalCount", alertIds.size(),
                    "success", true
            ));

        } catch (Exception e) {
            log.error("批量处理告警失败", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "批量处理失败: " + e.getMessage(),
                    "success", false
            ));
        }
    }
    @GetMapping("/statistics/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardStatistics() {
        try {
            Map<String, Object> statistics = new HashMap<>();

            // 1. 威胁等级分布
            Map<String, Long> threatLevels = new HashMap<>();
            threatLevels.put("LOW", alertRepository.countByAlertLevel("LOW"));
            threatLevels.put("MEDIUM", alertRepository.countByAlertLevel("MEDIUM"));
            threatLevels.put("HIGH", alertRepository.countByAlertLevel("HIGH"));
            threatLevels.put("CRITICAL", alertRepository.countByAlertLevel("CRITICAL"));
            statistics.put("threatLevels", threatLevels);

            // 2. 总告警数
            long totalAlerts = alertRepository.count();
            statistics.put("totalLogs", totalAlerts);
            statistics.put("securityEvents", totalAlerts);

            // 3. 未处理告警
            long unhandledAlerts = alertRepository.countByHandled(false);
            statistics.put("unhandledAlerts", unhandledAlerts);

            // 4. 高/严重风险数量
            long highRiskCount = threatLevels.getOrDefault("HIGH", 0L) +
                    threatLevels.getOrDefault("CRITICAL", 0L);
            statistics.put("highRiskCount", highRiskCount);

            // 5. 每日统计（最近7天）
            List<Object[]> dailyStats = alertRepository.countByDateForLast7Days();
            List<Object[]> dailyCounts = dailyStats.stream()
                    .map(arr -> new Object[]{arr[0], arr[1]})
                    .collect(Collectors.toList());
            statistics.put("dailyCounts", dailyCounts);

            // 6. 暴力破解尝试
            List<Object[]> bruteForceAttempts = alertRepository.findBruteForceAttempts();
            statistics.put("bruteForceAttempts", bruteForceAttempts);

            // 7. 事件类型统计
            List<Object[]> eventCounts = alertRepository.countByEventType();
            statistics.put("eventCounts", eventCounts);

            return ResponseEntity.ok(statistics);

        } catch (Exception e) {
            log.error("获取仪表盘统计失败", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}