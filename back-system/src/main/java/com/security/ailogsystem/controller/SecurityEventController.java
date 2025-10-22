package com.security.ailogsystem.controller;

import com.security.ailogsystem.dto.SecurityEventDTO;
import com.security.ailogsystem.dto.SecurityEventQueryDTO;
import com.security.ailogsystem.service.SecurityEventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 安全事件控制器
 * 提供安全事件相关的REST API
 */
@Slf4j
@RestController
@RequestMapping("/api/security-events")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SecurityEventController {

    private final SecurityEventService securityEventService;

    /**
     * 创建安全事件
     */
    @PostMapping
    public ResponseEntity<SecurityEventDTO> createSecurityEvent(@Valid @RequestBody SecurityEventDTO eventDTO) {
        log.info("Creating security event from source: {}", eventDTO.getSource());
        
        try {
            SecurityEventDTO createdEvent = securityEventService.createSecurityEvent(eventDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdEvent);
        } catch (Exception e) {
            log.error("Error creating security event", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 批量创建安全事件
     */
    @PostMapping("/batch")
    public ResponseEntity<List<SecurityEventDTO>> createSecurityEvents(@Valid @RequestBody List<SecurityEventDTO> eventDTOs) {
        log.info("Creating {} security events in batch", eventDTOs.size());
        
        try {
            List<SecurityEventDTO> createdEvents = securityEventService.createSecurityEvents(eventDTOs);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdEvents);
        } catch (Exception e) {
            log.error("Error creating security events in batch", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 根据ID获取安全事件
     */
    @GetMapping("/{id}")
    public ResponseEntity<SecurityEventDTO> getSecurityEventById(@PathVariable Long id) {
        log.debug("Getting security event by ID: {}", id);
        
        Optional<SecurityEventDTO> event = securityEventService.getSecurityEventById(id);
        return event.map(ResponseEntity::ok)
                   .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 分页查询安全事件
     */
    @PostMapping("/search")
    public ResponseEntity<Page<SecurityEventDTO>> searchSecurityEvents(@RequestBody SecurityEventQueryDTO queryDTO) {
        log.debug("Searching security events with conditions: {}", queryDTO);
        
        try {
            Page<SecurityEventDTO> events = securityEventService.getSecurityEvents(queryDTO);
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            log.error("Error searching security events", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取最近的安全事件
     */
    @GetMapping("/recent")
    public ResponseEntity<List<SecurityEventDTO>> getRecentSecurityEvents(
            @RequestParam(defaultValue = "10") int limit) {
        log.debug("Getting recent {} security events", limit);
        
        try {
            List<SecurityEventDTO> events = securityEventService.getRecentSecurityEvents(limit);
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            log.error("Error getting recent security events", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取最近的异常事件
     */
    @GetMapping("/anomalies/recent")
    public ResponseEntity<List<SecurityEventDTO>> getRecentAnomalyEvents(
            @RequestParam(defaultValue = "10") int limit) {
        log.debug("Getting recent {} anomaly events", limit);
        
        try {
            List<SecurityEventDTO> events = securityEventService.getRecentAnomalyEvents(limit);
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            log.error("Error getting recent anomaly events", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 更新安全事件
     */
    @PutMapping("/{id}")
    public ResponseEntity<SecurityEventDTO> updateSecurityEvent(
            @PathVariable Long id, 
            @Valid @RequestBody SecurityEventDTO eventDTO) {
        log.info("Updating security event with ID: {}", id);
        
        try {
            Optional<SecurityEventDTO> updatedEvent = securityEventService.updateSecurityEvent(id, eventDTO);
            return updatedEvent.map(ResponseEntity::ok)
                             .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Error updating security event", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 删除安全事件
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSecurityEvent(@PathVariable Long id) {
        log.info("Deleting security event with ID: {}", id);
        
        try {
            boolean deleted = securityEventService.deleteSecurityEvent(id);
            return deleted ? ResponseEntity.noContent().build() 
                          : ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error deleting security event", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取威胁等级统计
     */
    @GetMapping("/statistics/threat-levels")
    public ResponseEntity<Map<String, Long>> getThreatLevelStatistics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        log.debug("Getting threat level statistics from {} to {}", startTime, endTime);
        
        try {
            Map<String, Long> statistics = securityEventService.getThreatLevelStatistics(startTime, endTime);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("Error getting threat level statistics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取事件类型统计
     */
    @GetMapping("/statistics/event-types")
    public ResponseEntity<Map<String, Long>> getEventTypeStatistics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        log.debug("Getting event type statistics from {} to {}", startTime, endTime);
        
        try {
            Map<String, Long> statistics = securityEventService.getEventTypeStatistics(startTime, endTime);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("Error getting event type statistics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取主机统计
     */
    @GetMapping("/statistics/hosts")
    public ResponseEntity<List<Map<String, Object>>> getHostStatistics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        log.debug("Getting host statistics from {} to {}", startTime, endTime);
        
        try {
            List<Map<String, Object>> statistics = securityEventService.getHostStatistics(startTime, endTime);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("Error getting host statistics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取异常事件数量
     */
    @GetMapping("/statistics/anomaly-count")
    public ResponseEntity<Long> getAnomalyEventCount(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        log.debug("Getting anomaly event count from {} to {}", startTime, endTime);
        
        try {
            Long count = securityEventService.getAnomalyEventCount(startTime, endTime);
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            log.error("Error getting anomaly event count", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取事件状态统计
     */
    @GetMapping("/statistics/status")
    public ResponseEntity<Map<String, Long>> getEventStatusStatistics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        log.debug("Getting event status statistics from {} to {}", startTime, endTime);
        
        try {
            Map<String, Long> statistics = securityEventService.getEventStatusStatistics(startTime, endTime);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("Error getting event status statistics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取高频事件源
     */
    @GetMapping("/statistics/top-sources")
    public ResponseEntity<List<Map<String, Object>>> getTopEventSources(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(defaultValue = "10") int limit) {
        log.debug("Getting top {} event sources from {} to {}", limit, startTime, endTime);
        
        try {
            List<Map<String, Object>> statistics = securityEventService.getTopEventSources(startTime, endTime, limit);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("Error getting top event sources", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取高风险用户
     */
    @GetMapping("/statistics/high-risk-users")
    public ResponseEntity<List<Map<String, Object>>> getHighRiskUsers(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(defaultValue = "10") int limit) {
        log.debug("Getting top {} high risk users from {} to {}", limit, startTime, endTime);
        
        try {
            List<Map<String, Object>> statistics = securityEventService.getHighRiskUsers(startTime, endTime, limit);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("Error getting high risk users", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取待处理事件
     */
    @GetMapping("/pending")
    public ResponseEntity<List<SecurityEventDTO>> getPendingEvents() {
        log.debug("Getting pending security events");
        
        try {
            List<SecurityEventDTO> events = securityEventService.getPendingEvents();
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            log.error("Error getting pending events", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取分配给特定用户的事件
     */
    @GetMapping("/assigned/{assignedTo}")
    public ResponseEntity<Page<SecurityEventDTO>> getEventsByAssignee(
            @PathVariable String assignedTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        log.debug("Getting events assigned to: {}", assignedTo);
        
        try {
            Page<SecurityEventDTO> events = securityEventService.getEventsByAssignee(assignedTo, page, size);
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            log.error("Error getting events by assignee", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取相似事件
     */
    @GetMapping("/{id}/similar")
    public ResponseEntity<List<SecurityEventDTO>> getSimilarEvents(
            @PathVariable Long id,
            @RequestParam(defaultValue = "5") int limit) {
        log.debug("Getting similar events for event ID: {}", id);
        
        try {
            // 首先获取原事件
            Optional<SecurityEventDTO> originalEvent = securityEventService.getSecurityEventById(id);
            if (originalEvent.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            SecurityEventDTO event = originalEvent.get();
            List<SecurityEventDTO> similarEvents = securityEventService.getSimilarEvents(
                id, event.getEventType(), event.getMessage(), limit);
            
            return ResponseEntity.ok(similarEvents);
        } catch (Exception e) {
            log.error("Error getting similar events", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 解决事件
     */
    @PostMapping("/{id}/resolve")
    public ResponseEntity<Void> resolveEvent(
            @PathVariable Long id,
            @RequestParam String resolutionNotes,
            @RequestParam String assignedTo) {
        log.info("Resolving security event with ID: {}", id);
        
        try {
            boolean resolved = securityEventService.resolveEvent(id, resolutionNotes, assignedTo);
            return resolved ? ResponseEntity.ok().build() 
                           : ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error resolving security event", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 标记为误报
     */
    @PostMapping("/{id}/false-positive")
    public ResponseEntity<Void> markAsFalsePositive(
            @PathVariable Long id,
            @RequestParam String reason) {
        log.info("Marking security event as false positive with ID: {}", id);
        
        try {
            boolean marked = securityEventService.markAsFalsePositive(id, reason);
            return marked ? ResponseEntity.ok().build() 
                         : ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error marking event as false positive", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
