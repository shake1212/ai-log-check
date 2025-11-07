package com.security.ailogsystem.controller;

import com.security.ailogsystem.dto.UnifiedEventQueryDTO;
import com.security.ailogsystem.dto.UnifiedSecurityEventDTO;
import com.security.ailogsystem.service.UnifiedEventService;
import com.security.ailogsystem.service.UnifiedLogCollector;
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

@Slf4j
@RestController

@RequestMapping("/events")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UnifiedEventController {

    private final UnifiedEventService eventService;
    private final UnifiedLogCollector logCollector;



    /**
     * 创建安全事件
     */
    @PostMapping
    public ResponseEntity<UnifiedSecurityEventDTO> createEvent(@Valid @RequestBody UnifiedSecurityEventDTO eventDTO) {
        log.info("创建安全事件: {}", eventDTO.getEventType());

        try {
            UnifiedSecurityEventDTO createdEvent = eventService.createEvent(eventDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdEvent);
        } catch (Exception e) {
            log.error("创建安全事件失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 批量创建安全事件
     */
    @PostMapping("/batch")
    public ResponseEntity<List<UnifiedSecurityEventDTO>> createEvents(@Valid @RequestBody List<UnifiedSecurityEventDTO> eventDTOs) {
        log.info("批量创建 {} 个安全事件", eventDTOs.size());

        try {
            List<UnifiedSecurityEventDTO> createdEvents = eventService.createEvents(eventDTOs);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdEvents);
        } catch (Exception e) {
            log.error("批量创建安全事件失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 根据ID获取事件
     */
    @GetMapping("/{id}")
    public ResponseEntity<UnifiedSecurityEventDTO> getEventById(@PathVariable Long id) {
        log.debug("根据ID获取事件: {}", id);

        Optional<UnifiedSecurityEventDTO> event = eventService.getEventById(id);
        return event.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 高级查询事件
     */
    @PostMapping("/search")
    public ResponseEntity<Page<UnifiedSecurityEventDTO>> searchEvents(@RequestBody UnifiedEventQueryDTO queryDTO) {
        log.debug("高级查询事件");

        if (!queryDTO.isValid()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            Page<UnifiedSecurityEventDTO> events = eventService.searchEvents(queryDTO);
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            log.error("查询事件失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取最近事件
     */
    @GetMapping("/recent")
    public ResponseEntity<List<UnifiedSecurityEventDTO>> getRecentEvents(
            @RequestParam(defaultValue = "20") int limit) {
        log.debug("获取最近 {} 个事件", limit);

        try {
            List<UnifiedSecurityEventDTO> events = eventService.getRecentEvents(limit);
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            log.error("获取最近事件失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取异常事件
     */
    @GetMapping("/anomalies")
    public ResponseEntity<Page<UnifiedSecurityEventDTO>> getAnomalyEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        log.debug("获取异常事件");

        try {
            Page<UnifiedSecurityEventDTO> events = eventService.getAnomalyEvents(
                    org.springframework.data.domain.PageRequest.of(page, size));
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            log.error("获取异常事件失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 更新事件状态
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<UnifiedSecurityEventDTO> updateEventStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) String resolutionNotes,
            @RequestParam(required = false) String assignedTo) {
        log.info("更新事件状态: ID={}, 状态={}", id, status);

        try {
            Optional<UnifiedSecurityEventDTO> updatedEvent = eventService.updateEventStatus(
                    id, status, resolutionNotes, assignedTo);
            return updatedEvent.map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("更新事件状态失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 删除事件
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        log.info("删除事件: {}", id);

        try {
            boolean deleted = eventService.deleteEvent(id);
            return deleted ? ResponseEntity.noContent().build()
                    : ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("删除事件失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取统计信息
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getStatistics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        log.debug("获取统计信息: {} - {}", startTime, endTime);

        try {
            Map<String, Object> statistics = eventService.getStatistics(startTime, endTime);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("获取统计信息失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取时间序列统计
     */
    @GetMapping("/statistics/timeseries")
    public ResponseEntity<List<Map<String, Object>>> getTimeSeriesStatistics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        log.debug("获取时间序列统计: {} - {}", startTime, endTime);

        try {
            List<Map<String, Object>> statistics = eventService.getTimeSeriesStatistics(startTime, endTime);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("获取时间序列统计失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 手动触发日志收集
     */
    @PostMapping("/collect")
    public ResponseEntity<Map<String, String>> triggerLogCollection() {
        log.info("手动触发日志收集");

        try {
            // 异步执行日志收集
            new Thread(() -> {
                try {
                    logCollector.collectAllLogs();
                } catch (Exception e) {
                    log.error("手动日志收集失败", e);
                }
            }).start();

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "日志收集任务已启动"
            ));
        } catch (Exception e) {
            log.error("触发日志收集失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "status", "error",
                            "message", "触发日志收集失败: " + e.getMessage()
                    ));
        }
    }

    /**
     * 清理旧数据
     */
    @PostMapping("/cleanup")
    public ResponseEntity<Map<String, String>> cleanupOldEvents(
            @RequestParam(defaultValue = "30") int daysToKeep) {
        log.info("清理 {} 天前的旧数据", daysToKeep);

        try {
            eventService.cleanupOldEvents(daysToKeep);
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", String.format("已清理 %d 天前的旧数据", daysToKeep)
            ));
        } catch (Exception e) {
            log.error("清理旧数据失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "status", "error",
                            "message", "清理旧数据失败: " + e.getMessage()
                    ));
        }
    }
}