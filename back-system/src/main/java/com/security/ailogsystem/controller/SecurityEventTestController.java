package com.security.ailogsystem.controller;

import com.security.ailogsystem.dto.SecurityEventDTO;
import com.security.ailogsystem.model.SecurityEvent;
import com.security.ailogsystem.service.SecurityEventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 安全事件测试控制器
 * 用于测试安全事件功能
 */
@Slf4j
@RestController
@RequestMapping("/api/test/security-events")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SecurityEventTestController {

    private final SecurityEventService securityEventService;

    /**
     * 创建测试安全事件
     */
    @PostMapping("/create-test-data")
    public ResponseEntity<String> createTestData() {
        log.info("Creating test security events");
        
        try {
            // 创建一些测试事件
            SecurityEventDTO event1 = SecurityEventDTO.builder()
                    .timestamp(LocalDateTime.now().minusHours(1))
                    .source("Windows Security")
                    .eventId(4624)
                    .eventType(SecurityEvent.EventType.LOGIN_SUCCESS)
                    .level(SecurityEvent.LogLevel.INFO)
                    .message("User login successful")
                    .hostIp("192.168.1.100")
                    .hostName("WORKSTATION-01")
                    .userId("S-1-5-21-1234567890-1234567890-1234567890-1001")
                    .category(SecurityEvent.EventCategory.AUTHENTICATION)
                    .threatLevel(SecurityEvent.ThreatLevel.LOW)
                    .status(SecurityEvent.EventStatus.NEW)
                    .isAnomaly(false)
                    .build();

            SecurityEventDTO event2 = SecurityEventDTO.builder()
                    .timestamp(LocalDateTime.now().minusMinutes(30))
                    .source("Windows Security")
                    .eventId(4625)
                    .eventType(SecurityEvent.EventType.LOGIN_FAILURE)
                    .level(SecurityEvent.LogLevel.WARNING)
                    .message("Failed login attempt")
                    .hostIp("192.168.1.100")
                    .hostName("WORKSTATION-01")
                    .userId("admin")
                    .category(SecurityEvent.EventCategory.AUTHENTICATION)
                    .threatLevel(SecurityEvent.ThreatLevel.MEDIUM)
                    .status(SecurityEvent.EventStatus.NEW)
                    .isAnomaly(true)
                    .anomalyScore(75.5)
                    .anomalyReason("Multiple failed login attempts detected")
                    .build();

            SecurityEventDTO event3 = SecurityEventDTO.builder()
                    .timestamp(LocalDateTime.now().minusMinutes(10))
                    .source("System")
                    .eventId(1074)
                    .eventType(SecurityEvent.EventType.SYSTEM_SHUTDOWN)
                    .level(SecurityEvent.LogLevel.INFO)
                    .message("System shutdown initiated by user")
                    .hostIp("192.168.1.101")
                    .hostName("SERVER-01")
                    .userId("administrator")
                    .category(SecurityEvent.EventCategory.SYSTEM)
                    .threatLevel(SecurityEvent.ThreatLevel.LOW)
                    .status(SecurityEvent.EventStatus.NEW)
                    .isAnomaly(false)
                    .build();

            List<SecurityEventDTO> testEvents = List.of(event1, event2, event3);
            List<SecurityEventDTO> createdEvents = securityEventService.createSecurityEvents(testEvents);
            
            log.info("Created {} test security events", createdEvents.size());
            return ResponseEntity.ok("Created " + createdEvents.size() + " test security events successfully");
            
        } catch (Exception e) {
            log.error("Error creating test data", e);
            return ResponseEntity.status(500).body("Error creating test data: " + e.getMessage());
        }
    }

    /**
     * 获取所有测试事件
     */
    @GetMapping("/list")
    public ResponseEntity<List<SecurityEventDTO>> listTestEvents() {
        log.debug("Listing all test security events");
        
        try {
            List<SecurityEventDTO> recentEvents = securityEventService.getRecentSecurityEvents(20);
            return ResponseEntity.ok(recentEvents);
        } catch (Exception e) {
            log.error("Error listing test events", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 获取异常事件
     */
    @GetMapping("/anomalies")
    public ResponseEntity<List<SecurityEventDTO>> listAnomalyEvents() {
        log.debug("Listing anomaly security events");
        
        try {
            List<SecurityEventDTO> anomalyEvents = securityEventService.getRecentAnomalyEvents(10);
            return ResponseEntity.ok(anomalyEvents);
        } catch (Exception e) {
            log.error("Error listing anomaly events", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 获取待处理事件
     */
    @GetMapping("/pending")
    public ResponseEntity<List<SecurityEventDTO>> listPendingEvents() {
        log.debug("Listing pending security events");
        
        try {
            List<SecurityEventDTO> pendingEvents = securityEventService.getPendingEvents();
            return ResponseEntity.ok(pendingEvents);
        } catch (Exception e) {
            log.error("Error listing pending events", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 获取威胁等级统计
     */
    @GetMapping("/statistics/threat-levels")
    public ResponseEntity<Object> getThreatLevelStats() {
        log.debug("Getting threat level statistics");
        
        try {
            LocalDateTime endTime = LocalDateTime.now();
            LocalDateTime startTime = endTime.minusDays(1);
            
            var statistics = securityEventService.getThreatLevelStatistics(startTime, endTime);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("Error getting threat level statistics", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 获取事件类型统计
     */
    @GetMapping("/statistics/event-types")
    public ResponseEntity<Object> getEventTypeStats() {
        log.debug("Getting event type statistics");
        
        try {
            LocalDateTime endTime = LocalDateTime.now();
            LocalDateTime startTime = endTime.minusDays(1);
            
            var statistics = securityEventService.getEventTypeStatistics(startTime, endTime);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("Error getting event type statistics", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 解决事件测试
     */
    @PostMapping("/{id}/resolve")
    public ResponseEntity<String> resolveTestEvent(@PathVariable Long id) {
        log.info("Resolving test security event with ID: {}", id);
        
        try {
            boolean resolved = securityEventService.resolveEvent(id, "Test resolution", "test-user");
            if (resolved) {
                return ResponseEntity.ok("Event resolved successfully");
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Error resolving test event", e);
            return ResponseEntity.status(500).body("Error resolving event: " + e.getMessage());
        }
    }

    /**
     * 标记为误报测试
     */
    @PostMapping("/{id}/false-positive")
    public ResponseEntity<String> markAsFalsePositiveTest(@PathVariable Long id) {
        log.info("Marking test security event as false positive with ID: {}", id);
        
        try {
            boolean marked = securityEventService.markAsFalsePositive(id, "Test false positive marking");
            if (marked) {
                return ResponseEntity.ok("Event marked as false positive successfully");
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Error marking test event as false positive", e);
            return ResponseEntity.status(500).body("Error marking event as false positive: " + e.getMessage());
        }
    }
}
