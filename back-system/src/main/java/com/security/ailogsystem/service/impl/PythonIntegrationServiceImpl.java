package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.service.PythonIntegrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
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
            return createUnavailableResult("threat_hunting", "Python collector is disabled");
        }

        try {
            if (!testPythonCollectorConnection()) {
                return createUnavailableResult("threat_hunting", "Python collector connection failed");
            }

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

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    pythonCollectorUrl + "/api/analysis/threat",
                    HttpMethod.POST,
                    entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return response.getBody();
            } else {
                return createUnavailableResult("threat_hunting", "Python collector returned non-OK status");
            }

        } catch (Exception e) {
            log.error("调用Python威胁分析失败: {}", e.getMessage());
            return createUnavailableResult("threat_hunting", e.getMessage());
        }
    }

    @Override
    public Map<String, Object> runComplianceScan() {
        if (!pythonCollectorEnabled) {
            return createUnavailableResult("compliance", "Python collector is disabled");
        }

        try {
            if (!testPythonCollectorConnection()) {
                return createUnavailableResult("compliance", "Python collector connection failed");
            }

            Map<String, Object> request = new HashMap<>();
            request.put("scan_type", "compliance");
            request.put("checklist", "cis_benchmark");
            request.put("os_type", getOsType());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Request-Source", "java-backend");

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    pythonCollectorUrl + "/api/analysis/compliance",
                    HttpMethod.POST,
                    entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return response.getBody();
            } else {
                return createUnavailableResult("compliance", "Python collector returned non-OK status");
            }

        } catch (Exception e) {
            log.error("调用Python合规扫描失败: {}", e.getMessage());
            return createUnavailableResult("compliance", e.getMessage());
        }
    }

    @Override
    public Map<String, Object> runAnomalyDetection() {
        if (!pythonCollectorEnabled) {
            return createUnavailableResult("anomaly_detection", "Python collector is disabled");
        }

        try {
            if (!testPythonCollectorConnection()) {
                return createUnavailableResult("anomaly_detection", "Python collector connection failed");
            }

            Map<String, Object> request = new HashMap<>();
            request.put("detection_type", "behavioral");
            request.put("time_window", "1h");
            request.put("algorithm", "statistical");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Request-Source", "java-backend");

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    pythonCollectorUrl + "/api/analysis/anomaly",
                    HttpMethod.POST,
                    entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return response.getBody();
            } else {
                return createUnavailableResult("anomaly_detection", "Python collector returned non-OK status");
            }

        } catch (Exception e) {
            log.error("调用Python异常检测失败: {}", e.getMessage());
            return createUnavailableResult("anomaly_detection", e.getMessage());
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
        status.put("enabled", pythonCollectorEnabled);
        status.put("collectorUrl", pythonCollectorUrl);

        if (!pythonCollectorEnabled) {
            status.put("connected", false);
            status.put("status", "disabled");
            return status;
        }

        try {
            boolean connected = testPythonCollectorConnection();
            status.put("connected", connected);
            status.put("lastCheck", new Date());

            if (connected) {
                try {
                    ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                            pythonCollectorUrl + "/api/status",
                            HttpMethod.GET,
                            HttpEntity.EMPTY,
                            new ParameterizedTypeReference<Map<String, Object>>() {}
                    );
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

    private Map<String, Object> createUnavailableResult(String analysisType, String reason) {
        Map<String, Object> result = new HashMap<>();
        result.put("analysis_type", analysisType);
        result.put("status", "failed");
        result.put("error", reason);
        result.put("timestamp", Instant.now().toString());
        result.put("available", false);
        return result;
    }
}