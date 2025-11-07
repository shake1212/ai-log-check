// controller/AlertController.java
package com.security.ailogsystem.controller;

import com.security.ailogsystem.entity.SecurityAlert;
import com.security.ailogsystem.service.AlertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
@CrossOrigin(origins = "*")
public class AlertController {

    @Autowired
    private AlertService alertService;

    /**
     * 创建警报
     */
    @PostMapping
    public ResponseEntity<SecurityAlert> createAlert(@RequestBody SecurityAlert alert) {
        try {
            SecurityAlert createdAlert = alertService.createAlert(alert);
            return ResponseEntity.ok(createdAlert);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 根据ID获取警报
     */
    @GetMapping("/{id}")
    public ResponseEntity<SecurityAlert> getAlertById(@PathVariable Long id) {
        try {
            SecurityAlert alert = alertService.getAlertById(id);
            if (alert != null) {
                return ResponseEntity.ok(alert);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 获取所有警报（分页）
     */
    @GetMapping
    public ResponseEntity<Page<SecurityAlert>> getAllAlerts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdTime") String sort,
            @RequestParam(defaultValue = "desc") String direction) {

        try {
            Sort.Direction sortDirection = direction.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
            Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sort));

            Page<SecurityAlert> alerts = alertService.getAllAlerts(pageable);
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 获取未处理警报
     */
    @GetMapping("/unhandled")
    public ResponseEntity<List<SecurityAlert>> getUnhandledAlerts() {
        try {
            List<SecurityAlert> alerts = alertService.getUnhandledAlerts();
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 根据状态获取警报
     */
    @GetMapping("/status/{handled}")
    public ResponseEntity<Page<SecurityAlert>> getAlertsByStatus(
            @PathVariable Boolean handled,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdTime"));
            Page<SecurityAlert> alerts = alertService.getAlertsByStatus(handled, pageable);
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 搜索警报
     */
    @GetMapping("/search")
    public ResponseEntity<Page<SecurityAlert>> searchAlerts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) SecurityAlert.AlertLevel level,
            @RequestParam(required = false) String alertType,
            @RequestParam(required = false) Boolean handled,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdTime"));
            Page<SecurityAlert> alerts = alertService.searchAlerts(keyword, level, alertType, handled, startTime, endTime, pageable);
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 更新警报状态
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<Void> updateAlertStatus(
            @PathVariable Long id,
            @RequestParam Boolean handled,
            @RequestParam(required = false) String handledBy,
            @RequestParam(required = false) String handledNote) {

        try {
            boolean success = alertService.updateAlertStatus(id, handled, handledBy, handledNote);
            if (success) {
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 标记警报为已处理
     */
    @PutMapping("/{id}/handle")
    public ResponseEntity<Void> handleAlert(@PathVariable Long id) {
        try {
            boolean success = alertService.markAlertAsHandled(id);
            if (success) {
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 获取最近警报
     */
    @GetMapping("/recent")
    public ResponseEntity<List<SecurityAlert>> getRecentAlerts(
            @RequestParam(defaultValue = "10") int count) {

        try {
            List<SecurityAlert> alerts = alertService.getRecentAlerts(count);
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 获取警报统计
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getAlertStatistics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {

        try {
            Map<String, Object> statistics;
            if (startTime != null && endTime != null) {
                statistics = alertService.getAlertStatistics(startTime, endTime);
            } else {
                statistics = alertService.getAlertStatistics();
            }
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 删除警报
     */
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
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 批量处理警报
     */
    @PutMapping("/batch/handle")
    public ResponseEntity<Map<String, Object>> batchHandleAlerts(@RequestBody List<Long> alertIds) {
        try {
            int handledCount = alertService.markAlertsAsHandled(alertIds);
            Map<String, Object> result = Map.of(
                    "success", true,
                    "handledCount", handledCount,
                    "message", "成功处理 " + handledCount + " 个警报"
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> result = Map.of(
                    "success", false,
                    "message", "批量处理失败"
            );
            return ResponseEntity.badRequest().body(result);
        }
    }
}