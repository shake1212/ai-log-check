package com.security.ailogsystem.controller;

import com.security.ailogsystem.dto.UnifiedEventQueryDTO;
import com.security.ailogsystem.dto.UnifiedSecurityEventDTO;
import com.security.ailogsystem.repository.UnifiedEventRepository;
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

import java.security.Timestamp;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/events")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UnifiedEventController {

    private final UnifiedEventService eventService;
    private final UnifiedLogCollector logCollector;
    private final UnifiedEventRepository eventRepository;



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
    /**
     * 获取仪表板统计信息（无需时间参数）
     */
    @GetMapping("/dashboard-stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        log.debug("获取仪表板统计信息");

        try {
            Map<String, Object> stats = new HashMap<>();
            LocalDateTime now = LocalDateTime.now();

            // 1. 总事件数
            long totalEvents = eventRepository.count();
            stats.put("totalLogs", totalEvents);

            // 2. 今日事件数（从当天00:00:00开始）
            LocalDateTime todayStart = now.with(LocalTime.MIN);
            long todayEvents = eventRepository.countByTimestampAfter(todayStart);
            stats.put("todayLogs", todayEvents);

            // 3. 最近7天每日统计
            LocalDateTime weekAgo = now.minusDays(7);
            List<Object[]> dailyStats = getDailyStatisticsNative(weekAgo);

            // 转换格式
            List<Object[]> dailyCounts = dailyStats.stream()
                    .map(row -> new Object[]{
                            row[0].toString(),  // 日期
                            row[1]              // 数量
                    })
                    .collect(Collectors.toList());

            stats.put("dailyCounts", dailyCounts);

            // 4. 异常事件数量
            long anomalyCount = eventRepository.countByIsAnomalyTrue();
            stats.put("anomalyCount", anomalyCount);

            // 5. 按严重程度统计所有事件
            List<Object[]> severityStats = getSeverityStatisticsNative();
            Map<String, Long> severityCounts = new HashMap<>();
            for (Object[] row : severityStats) {
                if (row[0] != null && row[1] != null) {
                    severityCounts.put(row[0].toString(), ((Number) row[1]).longValue());
                }
            }
            stats.put("severityCounts", severityCounts);

            // 6. 最后更新时间
            stats.put("lastUpdate", now.toString());

            // 7. 计算平均每日事件数
            double avgDailyEvents = dailyStats.isEmpty() ? 0 :
                    dailyStats.stream()
                            .mapToLong(row -> ((Number) row[1]).longValue())
                            .average()
                            .orElse(0.0);
            stats.put("avgDailyEvents", avgDailyEvents);

            log.info("仪表板统计 - 总事件数: {}, 今日事件数: {}, 异常事件数: {}",
                    totalEvents, todayEvents, anomalyCount);

            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            log.error("获取仪表板统计信息失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取每日统计（使用原生SQL）
     */
    private List<Object[]> getDailyStatisticsNative(LocalDateTime startDate) {
        try {
            // 使用现有的高级统计查询方法，或创建新查询
            // 这里假设你已经有 countBySourceSystemGroup 方法
            // 暂时返回空列表或调用其他可用方法
            return new ArrayList<>();
        } catch (Exception e) {
            log.error("获取每日统计失败", e);
            return new ArrayList<>();
        }
    }

    /**
     * 获取严重程度统计（使用原生SQL）
     */
    private List<Object[]> getSeverityStatisticsNative() {
        try {
            // 查询所有时间的严重程度统计
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime longTimeAgo = now.minusYears(10); // 很久以前
            return eventRepository.countBySeverityGroup(longTimeAgo, now);
        } catch (Exception e) {
            log.error("获取严重程度统计失败", e);
            return new ArrayList<>();
        }
    }
}