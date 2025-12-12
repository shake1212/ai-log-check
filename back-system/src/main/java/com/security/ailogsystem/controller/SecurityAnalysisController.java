package com.security.ailogsystem.controller;

import com.security.ailogsystem.dto.SystemMetricsDTO;
import com.security.ailogsystem.dto.ThreatIntelSyncRequest;
import com.security.ailogsystem.dto.TrafficStatsDTO;
import com.security.ailogsystem.entity.SecurityAnalysisTask;
import com.security.ailogsystem.entity.ThreatIntelligence;
import com.security.ailogsystem.repository.AlertRepository;
import com.security.ailogsystem.repository.SecurityLogRepository;
import com.security.ailogsystem.service.SecurityAnalysisService;
import com.security.ailogsystem.service.SystemMetricsService;
import com.security.ailogsystem.service.TrafficStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/analysis")
@Slf4j
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SecurityAnalysisController {

    private final SecurityAnalysisService securityAnalysisService;
    private final AlertRepository alertRepository;
    @Autowired
    private SystemMetricsService systemMetricsService;

    @Autowired
    private TrafficStatsService trafficStatsService;

    @Autowired
    private SecurityLogRepository securityLogRepository;

    // 1. 获取安全分析数据
    @GetMapping("/security-analyses")
    public ResponseEntity<List<SecurityAnalysisTask>> getSecurityAnalyses() {
        try {
            List<SecurityAnalysisTask> analyses = securityAnalysisService.getSecurityAnalyses();
            return ResponseEntity.ok(analyses);
        } catch (Exception e) {
            log.error("获取安全分析数据失败", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // 2. 获取威胁情报数据
    @GetMapping("/threat-intelligence")
    public ResponseEntity<List<ThreatIntelligence>> getThreatIntelligence() {
        try {
            List<ThreatIntelligence> threats = securityAnalysisService.getThreatIntelligence();
            return ResponseEntity.ok(threats);
        } catch (Exception e) {
            log.error("获取威胁情报数据失败", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // 3. 运行威胁分析
    @PostMapping("/run-threat-analysis")
    public ResponseEntity<Map<String, Object>> runThreatAnalysis() {
        try {
            CompletableFuture<Map<String, Object>> future = securityAnalysisService.runThreatAnalysis();

            // 异步处理，立即返回响应
            Map<String, Object> immediateResponse = Map.of(
                    "message", "威胁分析任务已启动，正在后台处理",
                    "timestamp", java.time.LocalDateTime.now(),
                    "status", "processing"
            );

            return ResponseEntity.accepted().body(immediateResponse);
        } catch (Exception e) {
            log.error("启动威胁分析失败", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of(
                            "error", e.getMessage(),
                            "status", "failed"
                    ));
        }
    }

    // 4. 运行合规扫描
    @PostMapping("/run-compliance-scan")
    public ResponseEntity<Map<String, Object>> runComplianceScan() {
        try {
            CompletableFuture<Map<String, Object>> future = securityAnalysisService.runComplianceScan();

            Map<String, Object> immediateResponse = Map.of(
                    "message", "合规扫描任务已启动，正在后台处理",
                    "timestamp", java.time.LocalDateTime.now(),
                    "status", "processing"
            );

            return ResponseEntity.accepted().body(immediateResponse);
        } catch (Exception e) {
            log.error("启动合规扫描失败", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of(
                            "error", e.getMessage(),
                            "status", "failed"
                    ));
        }
    }

    // 5. 运行异常检测
    @PostMapping("/run-anomaly-detection")
    public ResponseEntity<Map<String, Object>> runAnomalyDetection() {
        try {
            CompletableFuture<Map<String, Object>> future = securityAnalysisService.runAnomalyDetection();

            Map<String, Object> immediateResponse = Map.of(
                    "message", "异常检测任务已启动，正在后台处理",
                    "timestamp", java.time.LocalDateTime.now(),
                    "status", "processing"
            );

            return ResponseEntity.accepted().body(immediateResponse);
        } catch (Exception e) {
            log.error("启动异常检测失败", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of(
                            "error", e.getMessage(),
                            "status", "failed"
                    ));
        }
    }

    // 6. 同步云端威胁情报
    @PostMapping("/sync-cloud-threat-intel")
    public ResponseEntity<Map<String, Object>> syncCloudThreatIntel(
            @RequestBody ThreatIntelSyncRequest request) {
        try {
            Map<String, Object> result = securityAnalysisService.syncCloudThreatIntel(request);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("同步云端威胁情报失败", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of(
                            "status", "failed",
                            "error", e.getMessage()
                    ));
        }
    }

    // 7. 获取分析结果统计
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getAnalysisStats() {
        try {
            Map<String, Object> stats = securityAnalysisService.getAnalysisStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("获取分析统计失败", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // 8. 获取威胁情报统计
    @GetMapping("/threat-stats")
    public ResponseEntity<Map<String, Object>> getThreatIntelStats() {
        try {
            Map<String, Object> stats = securityAnalysisService.getThreatIntelStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("获取威胁情报统计失败", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // 额外接口：获取任务状态
    @GetMapping("/task-status/{taskId}")
    public ResponseEntity<Map<String, Object>> getTaskStatus(@PathVariable String taskId) {
        try {
            SecurityAnalysisTask task = securityAnalysisService.getAnalysisTaskById(taskId);

            Map<String, Object> status = Map.of(
                    "taskId", task.getId(),
                    "status", task.getStatus(),
                    "name", task.getName(),
                    "category", task.getCategory(),
                    "riskScore", task.getRiskScore(),
                    "lastRun", task.getLastRun(),
                    "nextRun", task.getNextRun(),
                    "findings", task.getFindings(),
                    "recommendations", task.getRecommendations()
            );

            return ResponseEntity.ok(status);
        } catch (Exception e) {
            log.error("获取任务状态失败", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // 额外接口：获取威胁情报详情
    @GetMapping("/threat-intelligence/{threatId}")
    public ResponseEntity<Map<String, Object>> getThreatIntelligence(@PathVariable String threatId) {
        try {
            ThreatIntelligence threat = securityAnalysisService.getThreatIntelligenceById(threatId);

            // 改用 HashMap，支持任意数量键值对
            Map<String, Object> threatDetail = new HashMap<>();
            threatDetail.put("id", threat.getId());
            threatDetail.put("type", threat.getType());
            threatDetail.put("severity", threat.getSeverity());
            threatDetail.put("source", threat.getSource());
            threatDetail.put("description", threat.getDescription());
            threatDetail.put("affectedSystems", threat.getAffectedSystems());
            threatDetail.put("detectionDate", threat.getDetectionDate());
            threatDetail.put("iocCount", threat.getIocCount());
            threatDetail.put("confidence", threat.getConfidence());
            threatDetail.put("status", threat.getStatus());
            threatDetail.put("relatedThreats", threat.getRelatedThreats());
            threatDetail.put("mitigationActions", threat.getMitigationActions());
            threatDetail.put("createdAt", threat.getCreatedAt());
            threatDetail.put("updatedAt", threat.getUpdatedAt());

            return ResponseEntity.ok(threatDetail);
        } catch (Exception e) {
            log.error("获取威胁情报详情失败", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

        // 额外接口：手动创建分析任务
        @PostMapping("/tasks")
        public ResponseEntity<SecurityAnalysisTask> createAnalysisTask (
                @RequestBody SecurityAnalysisTask task){
            try {
                SecurityAnalysisTask createdTask = securityAnalysisService.createAnalysisTask(task);
                return ResponseEntity.ok(createdTask);
            } catch (Exception e) {
                log.error("创建分析任务失败", e);
                return ResponseEntity.internalServerError().build();
            }
        }

        // 健康检查接口
        @GetMapping("/health")
        public ResponseEntity<Map<String, Object>> healthCheck () {
            Map<String, Object> health = Map.of(
                    "status", "UP",
                    "service", "security-analysis",
                    "timestamp", java.time.LocalDateTime.now(),
                    "version", "2.0.0"
            );
            return ResponseEntity.ok(health);
        }

    @GetMapping("/system-metrics")
    public ResponseEntity<SystemMetricsDTO> getSystemMetrics() {
        try {
            SystemMetricsDTO metrics = systemMetricsService.getSystemMetrics();
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            log.error("获取系统监控指标失败", e);
            return ResponseEntity.internalServerError()
                    .body(new SystemMetricsDTO());
        }
    }

    // 新增接口：获取流量统计数据
    @GetMapping("/traffic-stats")
    public ResponseEntity<TrafficStatsDTO> getTrafficStats() {
        try {
            TrafficStatsDTO stats = trafficStatsService.getTrafficStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("获取流量统计数据失败", e);
            return ResponseEntity.internalServerError()
                    .body(new TrafficStatsDTO());
        }
    }

    // 新增接口：获取实时统计（基于事件）
    @GetMapping("/real-time-stats")
    public ResponseEntity<Map<String, Object>> getRealTimeStats() {
        try {
            Map<String, Object> stats = new HashMap<>();

            // 1. 总事件数
            long totalEvents = securityLogRepository.count();
            stats.put("totalEvents", totalEvents);

            // 2. 活跃告警数
            long activeAlerts = alertRepository.countByHandled(false);
            stats.put("activeAlerts", activeAlerts);

            // 3. 最近一小时事件数
            LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
            long eventsLastHour = securityLogRepository.countByEventTimeAfter(oneHourAgo);
            stats.put("eventsLastHour", eventsLastHour);

            // 4. 系统状态
            stats.put("systemStatus", "NORMAL");

            // 5. 威胁分布
            Map<String, Long> threatDistribution = new HashMap<>();
            threatDistribution.put("CRITICAL", securityLogRepository.countByThreatLevel("CRITICAL"));
            threatDistribution.put("HIGH", securityLogRepository.countByThreatLevel("HIGH"));
            threatDistribution.put("MEDIUM", securityLogRepository.countByThreatLevel("MEDIUM"));
            threatDistribution.put("LOW", securityLogRepository.countByThreatLevel("LOW"));
            stats.put("threatDistribution", threatDistribution);

            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            log.error("获取实时统计失败", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    }
