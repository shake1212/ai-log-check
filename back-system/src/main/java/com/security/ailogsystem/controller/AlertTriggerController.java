// AlertTriggerController.java
package com.security.ailogsystem.controller;

import com.security.ailogsystem.service.AutoAlertScheduler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertTriggerController {

    private final AutoAlertScheduler autoAlertScheduler;

    /**
     * 手动触发性能检查
     */
    @PostMapping("/trigger/performance")
    public ResponseEntity<Map<String, Object>> triggerPerformanceCheck() {
        log.info("手动触发性能检查");

        try {
            autoAlertScheduler.checkSystemPerformance();

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "性能检查已触发");
            response.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("触发性能检查失败", e);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "触发失败: " + e.getMessage());

            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 手动触发进程检查
     */
    @PostMapping("/trigger/process")
    public ResponseEntity<Map<String, Object>> triggerProcessCheck() {
        log.info("手动触发进程检查");

        try {
            autoAlertScheduler.checkSuspiciousProcesses();

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "进程检查已触发");
            response.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("触发进程检查失败", e);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "触发失败: " + e.getMessage());

            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 手动触发所有检查
     */
    @PostMapping("/trigger/all")
    public ResponseEntity<Map<String, Object>> triggerAllChecks() {
        log.info("手动触发所有告警检查");

        try {
            autoAlertScheduler.checkSystemPerformance();
            autoAlertScheduler.checkSuspiciousProcesses();
            autoAlertScheduler.checkNetworkAnomalies();

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "所有检查已触发");
            response.put("timestamp", System.currentTimeMillis());
            response.put("checks", new String[]{"performance", "process", "network"});

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("触发所有检查失败", e);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "触发失败: " + e.getMessage());

            return ResponseEntity.internalServerError().body(response);
        }
    }
}