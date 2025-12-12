package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.dto.ThreatIntelSyncRequest;
import com.security.ailogsystem.entity.*;
import com.security.ailogsystem.repository.*;
import com.security.ailogsystem.service.PythonIntegrationService;
import com.security.ailogsystem.service.SecurityAnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Service
@Slf4j
@RequiredArgsConstructor
public class SecurityAnalysisServiceImpl implements SecurityAnalysisService {

    private final SecurityAnalysisTaskRepository taskRepository;
    private final ThreatIntelligenceRepository threatRepository;
    private final AnalysisResultRepository resultRepository;
    private final ThreatIndicatorRepository indicatorRepository;
    private final PythonIntegrationService pythonIntegrationService;

    @Override
    public List<SecurityAnalysisTask> getSecurityAnalyses() {
        return taskRepository.findAll();
    }

    @Override
    @Transactional
    public List<ThreatIntelligence> getThreatIntelligence() {
        return threatRepository.findAllWithIndicators();
    }

    @Override
    @Async("taskExecutor")
    public CompletableFuture<Map<String, Object>> runThreatAnalysis() {
        String taskId = UUID.randomUUID().toString();
        log.info("开始威胁分析任务: {}", taskId);

        return CompletableFuture.supplyAsync(() -> {
            try {
                // 创建分析任务
                SecurityAnalysisTask task = createTask(taskId, "threat_hunting", "威胁分析扫描");

                // 调用Python收集器进行威胁分析
                Map<String, Object> pythonResult = pythonIntegrationService.runThreatAnalysis();

                // 处理分析结果
                return processAnalysisResult(task, pythonResult, "threat_hunting");

            } catch (Exception e) {
                log.error("威胁分析失败: {}", e.getMessage(), e);
                return createErrorResponse(taskId, e);
            }
        });
    }

    @Override
    @Async("taskExecutor")
    public CompletableFuture<Map<String, Object>> runComplianceScan() {
        String taskId = UUID.randomUUID().toString();
        log.info("开始合规扫描任务: {}", taskId);

        return CompletableFuture.supplyAsync(() -> {
            try {
                SecurityAnalysisTask task = createTask(taskId, "compliance", "合规性扫描");

                // 调用Python收集器进行合规检查
                Map<String, Object> result = pythonIntegrationService.runComplianceScan();

                // 处理结果
                return processAnalysisResult(task, result, "compliance");

            } catch (Exception e) {
                log.error("合规扫描失败: {}", e.getMessage(), e);
                return createErrorResponse(taskId, e);
            }
        });
    }

    @Override
    @Async("taskExecutor")
    public CompletableFuture<Map<String, Object>> runAnomalyDetection() {
        String taskId = UUID.randomUUID().toString();
        log.info("开始异常检测任务: {}", taskId);

        return CompletableFuture.supplyAsync(() -> {
            try {
                SecurityAnalysisTask task = createTask(taskId, "anomaly_detection", "异常行为检测");

                // 调用Python收集器进行异常检测
                Map<String, Object> result = pythonIntegrationService.runAnomalyDetection();

                // 处理结果
                return processAnalysisResult(task, result, "anomaly_detection");

            } catch (Exception e) {
                log.error("异常检测失败: {}", e.getMessage(), e);
                return createErrorResponse(taskId, e);
            }
        });
    }

    @Override
    @Transactional
    public Map<String, Object> syncCloudThreatIntel(ThreatIntelSyncRequest request) {
        log.info("开始同步云端威胁情报: {}", request.getSource());

        int syncedCount = 0;
        try {
            // 这里可以集成真实的威胁情报源，如：
            // - AlienVault OTX
            // - VirusTotal
            // - AbuseIPDB
            // - 或其他商业/开源威胁情报源

            // 示例：模拟从云源获取威胁情报
            List<Map<String, Object>> cloudThreats = simulateCloudThreatIntel(request);

            for (Map<String, Object> threatData : cloudThreats) {
                if (syncThreatIntelligence(threatData)) {
                    syncedCount++;
                }
            }

            log.info("成功同步 {} 条威胁情报", syncedCount);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("syncedCount", syncedCount);
            response.put("timestamp", LocalDateTime.now());

            return response;

        } catch (Exception e) {
            log.error("同步威胁情报失败: {}", e.getMessage(), e);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "failed");
            response.put("error", e.getMessage());
            response.put("syncedCount", syncedCount);

            return response;
        }
    }

    @Override
    public Map<String, Object> getAnalysisStats() {
        Map<String, Object> stats = new HashMap<>();

        LocalDateTime lastWeek = LocalDateTime.now().minusDays(7);
        LocalDateTime lastMonth = LocalDateTime.now().minusDays(30);

        stats.put("totalAnalyses", taskRepository.count());
        stats.put("completed", taskRepository.countByStatus("completed"));
        stats.put("running", taskRepository.countByStatus("running"));
        stats.put("failed", taskRepository.countByStatus("failed"));

        // 计算高风险数量
        List<SecurityAnalysisTask> highRiskTasks = taskRepository.findByRiskScoreGreaterThan(70);
        stats.put("highRiskCount", highRiskTasks.size());

        // 计算平均风险评分
        Double avgScore = resultRepository.getAverageRiskScore(lastWeek);
        stats.put("avgRiskScore", avgScore != null ? Math.round(avgScore * 10.0) / 10.0 : 0);

        // 获取最后运行时间
        List<SecurityAnalysisTask> recentTasks = taskRepository.findAll();
        recentTasks.sort((a, b) -> {
            if (a.getLastRun() == null) return 1;
            if (b.getLastRun() == null) return -1;
            return b.getLastRun().compareTo(a.getLastRun());
        });
        stats.put("lastRun", recentTasks.isEmpty() ? null : recentTasks.get(0).getLastRun());

        // 计算成功率
        long totalTasks = taskRepository.count();
        long completedTasks = taskRepository.countByStatus("completed");
        if (totalTasks > 0) {
            double successRate = (completedTasks * 100.0) / totalTasks;
            stats.put("successRate", Math.round(successRate * 10.0) / 10.0);
        } else {
            stats.put("successRate", 0.0);
        }

        return stats;
    }

    @Override
    public Map<String, Object> getThreatIntelStats() {
        Map<String, Object> stats = new HashMap<>();

        stats.put("totalThreats", threatRepository.count());
        stats.put("activeThreats", threatRepository.countByStatus("active"));
        stats.put("mitigatedThreats", threatRepository.countByStatus("mitigated"));
        stats.put("malwareCount", threatRepository.findByType("malware").size());
        stats.put("phishingCount", threatRepository.findByType("phishing").size());
        stats.put("vulnerabilityCount", threatRepository.findByType("vulnerability").size());
        stats.put("criticalCount", threatRepository.countBySeverity("critical"));
        stats.put("highCount", threatRepository.countBySeverity("high"));

        // 获取最后更新时间
        List<ThreatIntelligence> recentThreats = threatRepository.findAll();
        recentThreats.sort((a, b) -> b.getUpdatedAt().compareTo(a.getUpdatedAt()));
        stats.put("lastUpdate", recentThreats.isEmpty() ? null : recentThreats.get(0).getUpdatedAt());

        // 计算平均置信度
        List<ThreatIntelligence> allThreats = threatRepository.findAll();
        if (!allThreats.isEmpty()) {
            double avgConfidence = allThreats.stream()
                    .mapToInt(ThreatIntelligence::getConfidence)
                    .average()
                    .orElse(0.0);
            stats.put("avgConfidence", Math.round(avgConfidence * 10.0) / 10.0);
        } else {
            stats.put("avgConfidence", 0.0);
        }

        return stats;
    }

    @Override
    public SecurityAnalysisTask getAnalysisTaskById(String taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("分析任务不存在: " + taskId));
    }

    @Override
    public ThreatIntelligence getThreatIntelligenceById(String threatId) {
        return threatRepository.findById(threatId)
                .orElseThrow(() -> new RuntimeException("威胁情报不存在: " + threatId));
    }

    @Override
    @Transactional
    public SecurityAnalysisTask createAnalysisTask(SecurityAnalysisTask task) {
        if (task.getId() == null) {
            task.setId(UUID.randomUUID().toString());
        }
        task.setCreatedAt(LocalDateTime.now());
        task.setUpdatedAt(LocalDateTime.now());
        return taskRepository.save(task);
    }

    @Override
    @Transactional
    public SecurityAnalysisTask updateTaskStatus(String taskId, String status, String error) {
        SecurityAnalysisTask task = getAnalysisTaskById(taskId);
        task.setStatus(status);
        task.setUpdatedAt(LocalDateTime.now());

        if (error != null && !error.isEmpty()) {
            List<String> recommendations = (List<String>) task.getRecommendations();
            if (recommendations == null) {
                recommendations = new ArrayList<>();
            }
            recommendations.add("任务失败: " + error);
            task.setRecommendations((Map<String, Object>) recommendations);
        }

        return taskRepository.save(task);
    }

    // ========== 私有辅助方法 ==========

    private SecurityAnalysisTask createTask(String id, String category, String name) {
        SecurityAnalysisTask task = new SecurityAnalysisTask();
        task.setId(id);
        task.setCategory(category);
        task.setName(name);
        task.setDescription(category + " 分析任务");
        task.setStatus("running");
        task.setLastRun(LocalDateTime.now());
        task.setNextRun(LocalDateTime.now().plusHours(6));
        task.setCreatedAt(LocalDateTime.now());
        task.setUpdatedAt(LocalDateTime.now());
        return taskRepository.save(task);
    }

    private Map<String, Object> processAnalysisResult(SecurityAnalysisTask task,
                                                      Map<String, Object> result,
                                                      String analysisType) {

        // 创建分析结果
        AnalysisResult analysisResult = new AnalysisResult();
        analysisResult.setId(UUID.randomUUID().toString());
        analysisResult.setTask(task);
        analysisResult.setAnalysisType(analysisType);
        analysisResult.setResultData(result);
        analysisResult.setStatus("completed");
        analysisResult.setStartedAt(LocalDateTime.now().minusMinutes(5));
        analysisResult.setCompletedAt(LocalDateTime.now());
        analysisResult.setCreatedAt(LocalDateTime.now());
        analysisResult.setUpdatedAt(LocalDateTime.now());

        // 计算评分
        int riskScore = calculateRiskScore(result, analysisType);
        int confidenceScore = calculateConfidenceScore(result);

        analysisResult.setRiskScore(riskScore);
        analysisResult.setRiskLevel(getRiskLevel(riskScore));
        analysisResult.setConfidenceScore(confidenceScore);

        resultRepository.save(analysisResult);

        // 更新任务状态
        task.setStatus("completed");
        task.setRiskScore(riskScore);
        task.setFindings(extractFindings(result));
        task.setRecommendations(generateRecommendations(result, riskScore));
        task.setLastRun(LocalDateTime.now());
        task.setUpdatedAt(LocalDateTime.now());
        taskRepository.save(task);

        // 准备响应
        Map<String, Object> response = new HashMap<>();
        response.put("taskId", task.getId());
        response.put("status", "completed");
        response.put("riskScore", riskScore);
        response.put("analysisType", analysisType);
        response.put("timestamp", LocalDateTime.now());

        return response;
    }

    private int calculateRiskScore(Map<String, Object> result, String analysisType) {
        switch (analysisType) {
            case "threat_hunting":
                return calculateThreatRiskScore(result);
            case "anomaly_detection":
                return calculateAnomalyRiskScore(result);
            case "compliance":
                return calculateComplianceRiskScore(result);
            default:
                return 50;
        }
    }

    private int calculateThreatRiskScore(Map<String, Object> result) {
        int baseScore = 50;

        if (result.containsKey("suspicious_count")) {
            baseScore += ((Number) result.get("suspicious_count")).intValue() * 2;
        }

        if (result.containsKey("critical_findings")) {
            baseScore += ((Number) result.get("critical_findings")).intValue() * 10;
        }

        if (result.containsKey("threat_count")) {
            baseScore += ((Number) result.get("threat_count")).intValue() * 3;
        }

        return Math.min(Math.max(baseScore, 0), 100);
    }

    private int calculateAnomalyRiskScore(Map<String, Object> result) {
        int score = 30;

        if (result.containsKey("anomaly_score")) {
            score += ((Number) result.get("anomaly_score")).intValue();
        }

        if (result.containsKey("anomaly_count")) {
            score += ((Number) result.get("anomaly_count")).intValue() * 5;
        }

        return Math.min(Math.max(score, 0), 100);
    }

    private int calculateComplianceRiskScore(Map<String, Object> result) {
        int score = 40;

        if (result.containsKey("violations")) {
            score += ((Number) result.get("violations")).intValue() * 5;
        }

        if (result.containsKey("failed")) {
            score += ((Number) result.get("failed")).intValue() * 3;
        }

        return Math.min(Math.max(score, 0), 100);
    }

    private int calculateConfidenceScore(Map<String, Object> result) {
        if (result.containsKey("confidence")) {
            int confidence = ((Number) result.get("confidence")).intValue();
            return Math.min(Math.max(confidence, 0), 100);
        }
        return 75; // 默认置信度
    }

    private String getRiskLevel(int score) {
        if (score >= 80) return "critical";
        if (score >= 60) return "high";
        if (score >= 40) return "medium";
        return "low";
    }

    private Map<String, Object> extractFindings(Map<String, Object> result) {
        List<String> findings = new ArrayList<>();

        if (result.containsKey("findings")) {
            Object findingsObj = result.get("findings");
            if (findingsObj instanceof List) {
                findings = (List<String>) findingsObj;
            }
        } else {
            // 从结果中提取关键信息作为发现
            findings.add("分析完成，发现 " + result.size() + " 个相关数据点");
        }

        return (Map<String, Object>) findings;
    }

    private Map<String, Object> generateRecommendations(Map<String, Object> result, int riskScore) {
        List<String> recommendations = new ArrayList<>();

        if (riskScore >= 80) {
            recommendations.add("立即采取行动！检测到高风险威胁");
            recommendations.add("隔离受影响系统");
            recommendations.add("通知安全团队立即响应");
            recommendations.add("启动应急响应预案");
        } else if (riskScore >= 60) {
            recommendations.add("高优先级处理建议");
            recommendations.add("审查相关安全日志");
            recommendations.add("加强监控和告警设置");
            recommendations.add("更新安全策略和规则");
        } else if (riskScore >= 40) {
            recommendations.add("中等风险，建议定期检查");
            recommendations.add("优化安全配置");
            recommendations.add("执行深度安全扫描");
        } else {
            recommendations.add("低风险，保持监控");
            recommendations.add("定期执行安全检查");
        }

        return (Map<String, Object>) recommendations;
    }

    private boolean syncThreatIntelligence(Map<String, Object> threatData) {
        try {
            ThreatIntelligence threat = new ThreatIntelligence();
            threat.setId(UUID.randomUUID().toString());
            threat.setType((String) threatData.getOrDefault("type", "malware"));
            threat.setSeverity((String) threatData.getOrDefault("severity", "medium"));
            threat.setSource((String) threatData.getOrDefault("source", "cloud_sync"));
            threat.setDescription((String) threatData.getOrDefault("description", ""));
            threat.setDetectionDate(LocalDateTime.now());
            threat.setConfidence((Integer) threatData.getOrDefault("confidence", 70));
            threat.setStatus("active");
            threat.setCreatedAt(LocalDateTime.now());
            threat.setUpdatedAt(LocalDateTime.now());

            // 处理受影响系统
            if (threatData.containsKey("affected_systems")) {
                Object affectedObj = threatData.get("affected_systems");
                if (affectedObj instanceof List) {
                    threat.setAffectedSystems((List<String>) affectedObj);
                }
            }

            // 保存威胁情报
            ThreatIntelligence savedThreat = threatRepository.save(threat);

            // 保存指标（如果有）
            if (threatData.containsKey("indicators")) {
                List<Map<String, Object>> indicators =
                        (List<Map<String, Object>>) threatData.get("indicators");
                for (Map<String, Object> indicatorData : indicators) {
                    ThreatIndicator indicator = new ThreatIndicator();
                    indicator.setId(UUID.randomUUID().toString());
                    indicator.setThreat(savedThreat);
                    indicator.setIndicatorType((String) indicatorData.get("type"));
                    indicator.setIndicatorValue((String) indicatorData.get("value"));
                    indicator.setFirstSeen(LocalDateTime.now());
                    indicator.setLastSeen(LocalDateTime.now());
                    indicator.setCreatedAt(LocalDateTime.now());
                    indicator.setUpdatedAt(LocalDateTime.now());
                    indicatorRepository.save(indicator);
                }
                savedThreat.setIocCount(indicators.size());
                threatRepository.save(savedThreat);
            }

            return true;
        } catch (Exception e) {
            log.error("同步单个威胁情报失败: {}", e.getMessage());
            return false;
        }
    }

    private List<Map<String, Object>> simulateCloudThreatIntel(ThreatIntelSyncRequest request) {
        List<Map<String, Object>> threats = new ArrayList<>();

        // 根据请求过滤威胁类型
        List<String> threatTypes = request.getThreatTypes();
        if (threatTypes == null || threatTypes.isEmpty()) {
            threatTypes = Arrays.asList("malware", "phishing", "vulnerability", "botnet");
        }

        // 模拟威胁数据
        Random random = new Random();
        int threatCount = random.nextInt(10) + 5; // 5-15个威胁

        for (int i = 0; i < threatCount; i++) {
            String type = threatTypes.get(random.nextInt(threatTypes.size()));
            String severity = random.nextBoolean() ? "high" : "medium";
            if (i % 5 == 0) severity = "critical";

            Map<String, Object> threat = new HashMap<>();
            threat.put("type", type);
            threat.put("severity", severity);
            threat.put("source", request.getSource() != null ? request.getSource() : "CloudThreatFeed");
            threat.put("description", "检测到新的" + type + "威胁 #" + (1000 + i));
            threat.put("confidence", 70 + random.nextInt(30));

            // 模拟指标
            List<Map<String, Object>> indicators = new ArrayList<>();
            int indicatorCount = random.nextInt(5) + 2; // 2-7个指标
            for (int j = 0; j < indicatorCount; j++) {
                Map<String, Object> indicator = new HashMap<>();
                String[] indicatorTypes = {"ip", "domain", "url", "hash", "email"};
                String indicatorType = indicatorTypes[random.nextInt(indicatorTypes.length)];
                indicator.put("type", indicatorType);
                indicator.put("value", "malicious-" + type + "-" + (i * 10 + j) + ".com");
                indicators.add(indicator);
            }
            threat.put("indicators", indicators);

            threats.add(threat);
        }

        return threats;
    }

    private Map<String, Object> createErrorResponse(String taskId, Exception e) {
        Map<String, Object> response = new HashMap<>();
        response.put("taskId", taskId);
        response.put("status", "failed");
        response.put("error", e.getMessage());
        response.put("timestamp", LocalDateTime.now());

        // 更新任务状态为失败
        try {
            updateTaskStatus(taskId, "failed", e.getMessage());
        } catch (Exception ex) {
            log.error("更新任务状态失败: {}", ex.getMessage());
        }

        return response;
    }
}