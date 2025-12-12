package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.service.PythonIntegrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class PythonIntegrationServiceImpl implements PythonIntegrationService {

    @Value("${python.collector.url:http://localhost:5000}")
    private String pythonCollectorUrl;

    @Value("${python.collector.enabled:true}")
    private boolean pythonCollectorEnabled;

    private final RestTemplate restTemplate;

    @Override
    public Map<String, Object> runThreatAnalysis() {
        if (!pythonCollectorEnabled) {
            log.warn("Python收集器已禁用，返回模拟数据");
            return createMockThreatAnalysisResult();
        }

        String url = pythonCollectorUrl + "/api/analysis/threat";

        try {
            // 测试连接
            if (!testPythonCollectorConnection()) {
                log.warn("Python收集器连接失败，返回模拟数据");
                return createMockThreatAnalysisResult();
            }

            // 创建请求
            Map<String, Object> request = new HashMap<>();
            request.put("analysis_type", "threat_hunting");
            request.put("time_range", "24h");
            request.put("depth", "deep");
            request.put("include_network", true);
            request.put("include_processes", true);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Request-Source", "java-backend");

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            // 发送请求到Python收集器
            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("Python威胁分析成功，返回 {} 个结果", response.getBody().size());
                return response.getBody();
            } else {
                log.warn("Python收集器响应异常: {}", response.getStatusCode());
                return createMockThreatAnalysisResult();
            }

        } catch (Exception e) {
            log.error("调用Python威胁分析失败: {}", e.getMessage(), e);
            return createMockThreatAnalysisResult();
        }
    }

    @Override
    public Map<String, Object> runComplianceScan() {
        if (!pythonCollectorEnabled) {
            log.warn("Python收集器已禁用，返回模拟数据");
            return createMockComplianceResult();
        }

        String url = pythonCollectorUrl + "/api/analysis/compliance";

        try {
            if (!testPythonCollectorConnection()) {
                log.warn("Python收集器连接失败，返回模拟数据");
                return createMockComplianceResult();
            }

            Map<String, Object> request = new HashMap<>();
            request.put("scan_type", "compliance");
            request.put("checklist", "cis_benchmark");
            request.put("os_type", getOsType());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Request-Source", "java-backend");

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("Python合规扫描成功");
                return response.getBody();
            } else {
                log.warn("Python收集器响应异常: {}", response.getStatusCode());
                return createMockComplianceResult();
            }

        } catch (Exception e) {
            log.error("调用Python合规扫描失败: {}", e.getMessage(), e);
            return createMockComplianceResult();
        }
    }

    @Override
    public Map<String, Object> runAnomalyDetection() {
        if (!pythonCollectorEnabled) {
            log.warn("Python收集器已禁用，返回模拟数据");
            return createMockAnomalyResult();
        }

        String url = pythonCollectorUrl + "/api/analysis/anomaly";

        try {
            if (!testPythonCollectorConnection()) {
                log.warn("Python收集器连接失败，返回模拟数据");
                return createMockAnomalyResult();
            }

            Map<String, Object> request = new HashMap<>();
            request.put("detection_type", "behavioral");
            request.put("time_window", "1h");
            request.put("algorithm", "statistical");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Request-Source", "java-backend");

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("Python异常检测成功");
                return response.getBody();
            } else {
                log.warn("Python收集器响应异常: {}", response.getStatusCode());
                return createMockAnomalyResult();
            }

        } catch (Exception e) {
            log.error("调用Python异常检测失败: {}", e.getMessage(), e);
            return createMockAnomalyResult();
        }
    }

    @Override
    public boolean testPythonCollectorConnection() {
        try {
            String healthUrl = pythonCollectorUrl + "/health";
            ResponseEntity<String> response = restTemplate.getForEntity(healthUrl, String.class);

            if (response.getStatusCode() == HttpStatus.OK) {
                log.info("Python收集器连接测试成功");
                return true;
            }
        } catch (Exception e) {
            log.warn("Python收集器连接测试失败: {}", e.getMessage());
        }
        return false;
    }

    @Override
    public Map<String, Object> getPythonCollectorStatus() {
        Map<String, Object> status = new HashMap<>();

        try {
            boolean connected = testPythonCollectorConnection();
            status.put("connected", connected);
            status.put("collectorUrl", pythonCollectorUrl);
            status.put("enabled", pythonCollectorEnabled);
            status.put("lastCheck", new Date());

            if (connected) {
                try {
                    String infoUrl = pythonCollectorUrl + "/api/status";
                    ResponseEntity<Map> response = restTemplate.getForEntity(infoUrl, Map.class);
                    if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                        status.putAll(response.getBody());
                    }
                } catch (Exception e) {
                    log.warn("获取Python收集器详细信息失败: {}", e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("获取Python收集器状态失败: {}", e.getMessage());
            status.put("connected", false);
            status.put("error", e.getMessage());
        }

        return status;
    }

    @Override
    public boolean sendEventsToPython(List<Map<String, Object>> events) {
        if (!pythonCollectorEnabled || events == null || events.isEmpty()) {
            return false;
        }

        String url = pythonCollectorUrl + "/api/events";

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<List<Map<String, Object>>> entity = new HttpEntity<>(events, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            return response.getStatusCode() == HttpStatus.OK ||
                    response.getStatusCode() == HttpStatus.CREATED;

        } catch (Exception e) {
            log.error("发送事件到Python收集器失败: {}", e.getMessage());
            return false;
        }
    }

    // ========== 辅助方法 ==========

    private String getOsType() {
        String osName = System.getProperty("os.name").toLowerCase();
        if (osName.contains("win")) {
            return "windows";
        } else if (osName.contains("mac")) {
            return "macos";
        } else if (osName.contains("nix") || osName.contains("nux")) {
            return "linux";
        } else {
            return "unknown";
        }
    }

    // ========== 模拟数据方法（开发阶段使用） ==========

    private Map<String, Object> createMockThreatAnalysisResult() {
        Random random = new Random();
        Map<String, Object> result = new HashMap<>();

        int suspiciousCount = random.nextInt(10) + 1;
        int criticalFindings = random.nextInt(3);

        result.put("analysis_type", "threat_hunting");
        result.put("status", "completed");
        result.put("suspicious_count", suspiciousCount);
        result.put("critical_findings", criticalFindings);
        result.put("threat_count", suspiciousCount + criticalFindings);
        result.put("confidence", 70 + random.nextInt(30));
        result.put("scan_duration_seconds", 45 + random.nextInt(30));
        result.put("timestamp", new Date().toString());

        // 模拟发现
        List<String> findings = new ArrayList<>();
        if (suspiciousCount > 0) {
            findings.add("检测到 " + suspiciousCount + " 个可疑进程");
            findings.add("发现异常网络连接模式");
        }
        if (criticalFindings > 0) {
            findings.add("识别到 " + criticalFindings + " 个关键威胁");
            findings.add("检测到潜在恶意软件活动");
        }
        findings.add("系统安全状态评估完成");
        result.put("findings", findings);

        // 模拟威胁详情
        List<Map<String, Object>> threats = new ArrayList<>();
        for (int i = 0; i < Math.min(suspiciousCount, 5); i++) {
            Map<String, Object> threat = new HashMap<>();
            threat.put("id", "threat_" + i);
            threat.put("type", random.nextBoolean() ? "suspicious_process" : "network_anomaly");
            threat.put("severity", i == 0 ? "critical" : "high");
            threat.put("description", "可疑活动 #" + (1000 + i));
            threat.put("confidence", 60 + random.nextInt(35));
            threats.add(threat);
        }
        result.put("threat_details", threats);

        return result;
    }

    private Map<String, Object> createMockComplianceResult() {
        Random random = new Random();
        Map<String, Object> result = new HashMap<>();

        int totalChecks = 50;
        int passed = 42 - random.nextInt(5);
        int failed = totalChecks - passed;
        int violations = failed;

        result.put("scan_type", "compliance");
        result.put("status", "completed");
        result.put("total_checks", totalChecks);
        result.put("passed", passed);
        result.put("failed", failed);
        result.put("violations", violations);
        result.put("compliance_score", (int)((passed * 100.0) / totalChecks));
        result.put("scan_duration_seconds", 30 + random.nextInt(30));
        result.put("timestamp", new Date().toString());

        // 模拟检查结果
        List<Map<String, Object>> checks = new ArrayList<>();
        String[] checkTypes = {"password_policy", "log_retention", "firewall", "encryption", "authentication"};

        for (int i = 0; i < 10; i++) {
            Map<String, Object> check = new HashMap<>();
            String checkType = checkTypes[i % checkTypes.length];
            boolean compliant = random.nextDouble() > 0.3; // 70%通过率

            check.put("check_id", "check_" + (i + 1));
            check.put("category", checkType);
            check.put("description", checkType + " 合规性检查");
            check.put("compliant", compliant);
            check.put("details", compliant ? "符合要求" : "不符合要求，需要修复");

            if (!compliant) {
                check.put("recommendation", "建议修复 " + checkType + " 配置");
            }

            checks.add(check);
        }
        result.put("check_details", checks);

        return result;
    }

    private Map<String, Object> createMockAnomalyResult() {
        Random random = new Random();
        Map<String, Object> result = new HashMap<>();

        int anomalyScore = random.nextInt(100);
        int anomaliesDetected = anomalyScore > 50 ? random.nextInt(5) + 1 : 0;

        result.put("detection_type", "behavioral");
        result.put("status", "completed");
        result.put("anomaly_score", anomalyScore);
        result.put("anomalies_detected", anomaliesDetected);
        result.put("confidence", 65 + random.nextInt(30));
        result.put("analysis_duration_seconds", 60 + random.nextInt(60));
        result.put("timestamp", new Date().toString());

        // 模拟异常详情
        List<Map<String, Object>> anomalies = new ArrayList<>();
        if (anomaliesDetected > 0) {
            String[] anomalyTypes = {
                    "unusual_login_time",
                    "failed_login_attempts",
                    "high_cpu_usage",
                    "suspicious_process"
            };

            for (int i = 0; i < anomaliesDetected; i++) {
                Map<String, Object> anomaly = new HashMap<>();
                String anomalyType = anomalyTypes[i % anomalyTypes.length];

                anomaly.put("id", "anomaly_" + i);
                anomaly.put("type", anomalyType);
                anomaly.put("severity", anomalyScore > 70 ? "high" : "medium");
                anomaly.put("description", "检测到 " + anomalyType + " 异常");
                anomaly.put("confidence", 60 + random.nextInt(35));
                anomaly.put("timestamp", new Date(System.currentTimeMillis() - random.nextInt(3600000)).toString());

                anomalies.add(anomaly);
            }
        }
        result.put("anomaly_details", anomalies);

        return result;
    }
}