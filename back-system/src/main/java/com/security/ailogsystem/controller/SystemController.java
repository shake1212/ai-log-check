package com.security.ailogsystem.controller;

import com.security.ailogsystem.repository.AlertRepository;
import com.security.ailogsystem.repository.SecurityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/system")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SystemController {

    private final SecurityLogRepository securityLogRepository;
    private final AlertRepository alertRepository;
    private final Map<String, Object> systemConfig = new ConcurrentHashMap<>();

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getSystemStatus() {
        long activeAlerts = alertRepository.countByHandled(false);
        String status = activeAlerts > 0 ? "warning" : "normal";
        return ResponseEntity.ok(Map.of(
                "status", status,
                "activeAlerts", activeAlerts,
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getSystemConfig() {
        if (systemConfig.isEmpty()) {
            systemConfig.put("retentionDays", 30);
            systemConfig.put("alertingEnabled", true);
            systemConfig.put("autoCollectEnabled", true);
        }
        return ResponseEntity.ok(systemConfig);
    }

    @PutMapping("/config")
    public ResponseEntity<Void> updateSystemConfig(@RequestBody Map<String, Object> payload) {
        systemConfig.putAll(payload);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getSystemStatistics() {
        LocalDateTime oneDayAgo = LocalDateTime.now().minusDays(1);
        return ResponseEntity.ok(Map.of(
                "totalLogs", securityLogRepository.count(),
                "logsLast24h", securityLogRepository.countByEventTimeAfter(oneDayAgo),
                "totalAlerts", alertRepository.count(),
                "unhandledAlerts", alertRepository.countByHandled(false),
                "timestamp", LocalDateTime.now().toString()
        ));
    }
}
