package com.security.ailogsystem.controller;

import com.security.ailogsystem.dto.EventStatisticsDTO;
import com.security.ailogsystem.dto.LogEntryDTO;
import com.security.ailogsystem.service.EventQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 事件查询和统计控制器
 * 提供高级事件查询和统计分析功能
 */
@Slf4j
@RestController
@RequestMapping("/api/events")
@Tag(name = "事件查询和统计", description = "事件查询、统计分析和报表接口")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EventController {

    private final EventQueryService eventQueryService;

    /**
     * 获取综合事件统计信息
     */
    @GetMapping("/statistics/comprehensive")
    @Operation(summary = "获取综合事件统计", description = "获取系统完整的事件统计信息，包括基础统计、时间范围统计、来源统计等")
    public ResponseEntity<EventStatisticsDTO> getComprehensiveStatistics() {
        log.debug("获取综合事件统计信息");
        
        try {
            EventStatisticsDTO statistics = eventQueryService.getComprehensiveStatistics();
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("获取综合事件统计失败", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 获取指定时间范围的事件统计
     */
    @GetMapping("/statistics/range")
    @Operation(summary = "获取时间范围统计", description = "获取指定时间范围内的事件统计信息")
    public ResponseEntity<EventStatisticsDTO> getStatisticsByTimeRange(
            @Parameter(description = "开始时间") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        log.debug("获取时间范围统计: {} - {}", startTime, endTime);
        
        try {
            EventStatisticsDTO statistics = eventQueryService.getStatisticsByTimeRange(startTime, endTime);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("获取时间范围统计失败", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 获取事件趋势数据
     */
    @GetMapping("/trends")
    @Operation(summary = "获取事件趋势", description = "获取指定时间范围内的事件趋势数据")
    public ResponseEntity<List<EventStatisticsDTO.TrendData>> getEventTrends(
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @Parameter(description = "时间粒度") @RequestParam(defaultValue = "hour") String granularity) {
        log.debug("获取事件趋势数据: {} - {}, 粒度: {}", startTime, endTime, granularity);
        
        try {
            List<EventStatisticsDTO.TrendData> trends = eventQueryService.getEventTrends(startTime, endTime, granularity);
            return ResponseEntity.ok(trends);
        } catch (Exception e) {
            log.error("获取事件趋势失败", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 获取来源统计
     */
    @GetMapping("/statistics/sources")
    @Operation(summary = "获取来源统计", description = "获取各来源的事件统计信息")
    public ResponseEntity<Map<String, Long>> getSourceStatistics(
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        log.debug("获取来源统计: {} - {}", startTime, endTime);
        
        try {
            Map<String, Long> statistics = eventQueryService.getSourceStatistics(startTime, endTime);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("获取来源统计失败", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 获取级别统计
     */
    @GetMapping("/statistics/levels")
    @Operation(summary = "获取级别统计", description = "获取各日志级别的事件统计信息")
    public ResponseEntity<Map<String, Long>> getLevelStatistics(
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        log.debug("获取级别统计: {} - {}", startTime, endTime);
        
        try {
            Map<String, Long> statistics = eventQueryService.getLevelStatistics(startTime, endTime);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("获取级别统计失败", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 获取异常统计
     */
    @GetMapping("/statistics/anomalies")
    @Operation(summary = "获取异常统计", description = "获取异常事件和告警的统计信息")
    public ResponseEntity<EventStatisticsDTO.AnomalyStatistics> getAnomalyStatistics(
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        log.debug("获取异常统计: {} - {}", startTime, endTime);
        
        try {
            EventStatisticsDTO.AnomalyStatistics statistics = eventQueryService.getAnomalyStatistics(startTime, endTime);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("获取异常统计失败", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 获取热点IP统计
     */
    @GetMapping("/statistics/top-ips")
    @Operation(summary = "获取热点IP统计", description = "获取事件数量最多的IP地址统计")
    public ResponseEntity<List<EventStatisticsDTO.IpStatistics>> getTopIps(
            @Parameter(description = "返回数量限制") @RequestParam(defaultValue = "10") int limit,
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        log.debug("获取热点IP统计: 限制{}, 时间范围: {} - {}", limit, startTime, endTime);
        
        try {
            List<EventStatisticsDTO.IpStatistics> statistics = eventQueryService.getTopIps(limit, startTime, endTime);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("获取热点IP统计失败", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 获取用户活动统计
     */
    @GetMapping("/statistics/user-activity")
    @Operation(summary = "获取用户活动统计", description = "获取用户活动统计信息")
    public ResponseEntity<List<EventStatisticsDTO.UserActivityStatistics>> getUserActivityStatistics(
            @Parameter(description = "返回数量限制") @RequestParam(defaultValue = "10") int limit,
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        log.debug("获取用户活动统计: 限制{}, 时间范围: {} - {}", limit, startTime, endTime);
        
        try {
            List<EventStatisticsDTO.UserActivityStatistics> statistics = eventQueryService.getUserActivityStatistics(limit, startTime, endTime);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("获取用户活动统计失败", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 高级事件查询
     */
    @GetMapping("/search/advanced")
    @Operation(summary = "高级事件查询", description = "支持多条件组合的高级事件查询")
    public ResponseEntity<Page<LogEntryDTO>> advancedEventQuery(
            @Parameter(description = "事件来源") @RequestParam(required = false) String source,
            @Parameter(description = "日志级别") @RequestParam(required = false) String level,
            @Parameter(description = "IP地址") @RequestParam(required = false) String ipAddress,
            @Parameter(description = "用户ID") @RequestParam(required = false) String userId,
            @Parameter(description = "操作类型") @RequestParam(required = false) String action,
            @Parameter(description = "是否异常") @RequestParam(required = false) Boolean isAnomaly,
            @Parameter(description = "最小异常分数") @RequestParam(required = false) Double minAnomalyScore,
            @Parameter(description = "最大异常分数") @RequestParam(required = false) Double maxAnomalyScore,
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @Parameter(description = "关键字搜索") @RequestParam(required = false) String keyword,
            Pageable pageable) {
        log.debug("执行高级事件查询");
        
        try {
            Page<LogEntryDTO> results = eventQueryService.advancedEventQuery(
                    source, level, ipAddress, userId, action, isAnomaly,
                    minAnomalyScore, maxAnomalyScore, startTime, endTime, keyword, pageable);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            log.error("高级事件查询失败", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 获取事件聚合统计
     */
    @GetMapping("/aggregations")
    @Operation(summary = "获取事件聚合统计", description = "按指定维度进行事件聚合统计")
    public ResponseEntity<Map<String, Object>> getEventAggregations(
            @Parameter(description = "分组维度") @RequestParam String groupBy,
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @Parameter(description = "聚合类型") @RequestParam(defaultValue = "count") String aggregationType) {
        log.debug("获取事件聚合统计: 分组{}, 聚合类型{}, 时间范围: {} - {}", groupBy, aggregationType, startTime, endTime);
        
        try {
            Map<String, Object> aggregations = eventQueryService.getEventAggregations(groupBy, startTime, endTime, aggregationType);
            return ResponseEntity.ok(aggregations);
        } catch (Exception e) {
            log.error("获取事件聚合统计失败", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 获取实时事件统计
     */
    @GetMapping("/statistics/realtime")
    @Operation(summary = "获取实时事件统计", description = "获取最近1小时和24小时的事件统计")
    public ResponseEntity<Map<String, Long>> getRealTimeStatistics() {
        log.debug("获取实时事件统计");
        
        try {
            Map<String, Long> statistics = eventQueryService.getRealTimeStatistics();
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            log.error("获取实时事件统计失败", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 获取事件分布统计
     */
    @GetMapping("/statistics/distribution")
    @Operation(summary = "获取事件分布统计", description = "按指定维度获取事件分布统计")
    public ResponseEntity<Map<String, Long>> getEventDistribution(
            @Parameter(description = "分布维度") @RequestParam String dimension,
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        log.debug("获取事件分布统计: 维度{}, 时间范围: {} - {}", dimension, startTime, endTime);
        
        try {
            Map<String, Long> distribution = eventQueryService.getEventDistribution(dimension, startTime, endTime);
            return ResponseEntity.ok(distribution);
        } catch (Exception e) {
            log.error("获取事件分布统计失败", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 获取事件查询帮助信息
     */
    @GetMapping("/help")
    @Operation(summary = "获取查询帮助", description = "获取事件查询和统计功能的帮助信息")
    public ResponseEntity<Map<String, Object>> getQueryHelp() {
        log.debug("获取事件查询帮助信息");
        
        Map<String, Object> help = new HashMap<>();
        help.put("description", "事件查询和统计API帮助信息");
        
        Map<String, String> endpoints = new HashMap<>();
        endpoints.put("comprehensive", "GET /api/events/statistics/comprehensive - 获取综合统计");
        endpoints.put("timeRange", "GET /api/events/statistics/range - 获取时间范围统计");
        endpoints.put("trends", "GET /api/events/trends - 获取趋势数据");
        endpoints.put("sources", "GET /api/events/statistics/sources - 获取来源统计");
        endpoints.put("levels", "GET /api/events/statistics/levels - 获取级别统计");
        endpoints.put("anomalies", "GET /api/events/statistics/anomalies - 获取异常统计");
        endpoints.put("topIps", "GET /api/events/statistics/top-ips - 获取热点IP统计");
        endpoints.put("userActivity", "GET /api/events/statistics/user-activity - 获取用户活动统计");
        endpoints.put("advancedSearch", "GET /api/events/search/advanced - 高级事件查询");
        endpoints.put("aggregations", "GET /api/events/aggregations - 获取聚合统计");
        endpoints.put("realtime", "GET /api/events/statistics/realtime - 获取实时统计");
        endpoints.put("distribution", "GET /api/events/statistics/distribution - 获取分布统计");
        help.put("endpoints", endpoints);
        
        Map<String, String> parameters = new HashMap<>();
        parameters.put("timeFormat", "ISO 8601格式: 2024-01-01T00:00:00");
        parameters.put("granularity", "时间粒度: hour, day");
        parameters.put("groupBy", "分组维度: source, level, ip, user, hour, day");
        parameters.put("aggregationType", "聚合类型: count, sum, avg");
        parameters.put("dimension", "分布维度: source, level, ip, user");
        help.put("parameters", parameters);
        
        Map<String, String> examples = new HashMap<>();
        examples.put("comprehensive", "/api/events/statistics/comprehensive");
        examples.put("timeRange", "/api/events/statistics/range?startTime=2024-01-01T00:00:00&endTime=2024-01-02T00:00:00");
        examples.put("trends", "/api/events/trends?startTime=2024-01-01T00:00:00&endTime=2024-01-02T00:00:00&granularity=hour");
        examples.put("advancedSearch", "/api/events/search/advanced?source=web-server&level=ERROR&isAnomaly=true&page=0&size=20");
        help.put("examples", examples);
        
        return ResponseEntity.ok(help);
    }
}
