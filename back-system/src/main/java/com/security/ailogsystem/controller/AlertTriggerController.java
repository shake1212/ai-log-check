// AlertTriggerController.java
package com.security.ailogsystem.controller;

import com.security.ailogsystem.service.AutoAlertScheduler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/alerts/trigger")
public class AlertTriggerController {

    @Autowired(required = false)
    private AutoAlertScheduler autoAlertScheduler;

    private boolean isSchedulerAvailable() {
        return autoAlertScheduler != null;
    }

    private ResponseEntity<Map<String, Object>> schedulerDisabledResponse() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "disabled");
        response.put("message", "自动告警调度器未启用，请在配置中设置 alert.auto.enabled=true");
        return ResponseEntity.ok(response);
    }

    /**
     * 手动触发性能检查
     */
    @PostMapping("/trigger/performance")
    public ResponseEntity<Map<String, Object>> triggerPerformanceCheck() {
        if (!isSchedulerAvailable()) return schedulerDisabledResponse();
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
        if (!isSchedulerAvailable()) return schedulerDisabledResponse();
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
        if (!isSchedulerAvailable()) return schedulerDisabledResponse();
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
