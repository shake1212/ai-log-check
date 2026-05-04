package com.security.ailogsystem.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.security.ailogsystem.config.ScriptProperties;
import com.security.ailogsystem.service.SystemInfoService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class SystemInfoServiceImpl implements SystemInfoService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, Object> realTimeCache = new ConcurrentHashMap<>();
    private final Map<String, Long> cacheTimestamps = new ConcurrentHashMap<>();
    private static final long CACHE_EXPIRY_MS = 10000; // 10秒缓存

    @Autowired
    private ScriptProperties scriptProperties;

    @Value("${system.info.python.script.path:}")
    private String pythonScriptPath;

    // 数据采集间隔配置
    private static final Map<String, Integer> COLLECTION_INTERVALS = Map.of(
            "performance", 2000,
            "processes", 5000,
            "system", 10000,
            "disk", 15000,
            "network", 3000
    );

    @Override
    public Map<String, Object> collectSystemInfo() {
        log.info("开始收集完整系统信息");
        Map<String, Object> systemInfo = new HashMap<>();

        try {
            // 并行收集各类信息
            Map<String, Object> performance = collectSpecificInfo("performance");
            Map<String, Object> system = collectSpecificInfo("system_basic");
            Map<String, Object> processes = collectSpecificInfo("process_info");

            systemInfo.put("performance", performance);
            systemInfo.put("system", system);
            systemInfo.put("processes", processes);
            systemInfo.put("timestamp", System.currentTimeMillis());
            systemInfo.put("status", "success");

        } catch (Exception e) {
            log.error("收集完整系统信息失败: {}", e.getMessage(), e);
            systemInfo.put("error", "系统信息收集失败: " + e.getMessage());
            systemInfo.put("status", "error");
        }

        return systemInfo;
    }

    @Override
    public Map<String, Object> collectSpecificInfo(String infoType) {
        // 检查缓存
        Long cachedTime = cacheTimestamps.get(infoType);
        if (cachedTime != null && System.currentTimeMillis() - cachedTime < CACHE_EXPIRY_MS) {
            Object cached = realTimeCache.get(infoType);
            if (cached != null) {
                log.debug("使用缓存数据: {}", infoType);
                @SuppressWarnings("unchecked")
                Map<String, Object> result = (Map<String, Object>) cached;
                return result;
            }
        }

        log.info("收集特定类型信息: {}", infoType);
        String scriptPath = getPythonScriptPath();

        try {
            // 验证脚本文件是否存在
            File scriptFile = new File(scriptPath);
            if (!scriptFile.exists()) {
                log.error("Python脚本文件不存在: {}", scriptPath);
                return createErrorResponse("Python脚本文件不存在: " + scriptPath);
            }

            // 构建进程命令
            List<String> command = new ArrayList<>();
            command.add(resolvePythonExecutable());
            command.add(scriptPath);
            command.add(infoType);

            ProcessBuilder processBuilder = new ProcessBuilder(command);
            processBuilder.directory(scriptFile.getParentFile());
            // 不合并 stderr 到 stdout，避免非 JSON 输出污染解析
            processBuilder.redirectErrorStream(false);

            log.info("执行Python命令: {}", String.join(" ", command));

            Process process = processBuilder.start();

            // 异步读取 stderr，防止缓冲区满导致死锁
            final StringBuilder stderrBuilder = new StringBuilder();
            Thread stderrReader = new Thread(() -> {
                try (BufferedReader errReader = new BufferedReader(
                        new InputStreamReader(process.getErrorStream()))) {
                    String line;
                    while ((line = errReader.readLine()) != null) {
                        stderrBuilder.append(line).append(System.lineSeparator());
                    }
                } catch (Exception e) {
                    log.warn("读取脚本stderr失败: {}", e.getMessage());
                }
            });
            stderrReader.setDaemon(true);
            stderrReader.start();

            // 读取 stdout
            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()));

            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line);
            }

            // 等待进程结束，最多 30 秒
            boolean finished = process.waitFor(30, java.util.concurrent.TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                log.warn("Python脚本执行超时（30秒），类型: {}，已强制终止", infoType);
                return createErrorResponse("Python脚本执行超时（30秒）");
            }
            stderrReader.join(3000);

            int exitCode = process.exitValue();

            if (exitCode == 0) {
                String outputStr = output.toString().trim();
                // 只取第一行 JSON，忽略后续非 JSON 输出
                String jsonLine = outputStr.contains("\n") ? outputStr.substring(0, outputStr.indexOf('\n')).trim() : outputStr;
                log.debug("Python脚本执行成功，类型: {}, 输出长度: {}", infoType, jsonLine.length());
                if (!stderrBuilder.isEmpty()) {
                    log.debug("Python脚本stderr: {}", stderrBuilder.toString().trim());
                }
                Map<String, Object> result = objectMapper.readValue(
                        jsonLine,
                        new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {}
                );
                result.put("collection_timestamp", System.currentTimeMillis());
                // 写入缓存
                realTimeCache.put(infoType, result);
                cacheTimestamps.put(infoType, System.currentTimeMillis());
                return result;
            } else {
                log.error("Python脚本执行失败，类型: {}, 退出码: {}, stderr: {}", infoType, exitCode, stderrBuilder.toString().trim());
                return createErrorResponse("Python脚本执行失败，退出码: " + exitCode);
            }

        } catch (Exception e) {
            log.error("执行Python信息采集失败，类型: {}, 错误: {}", infoType, e.getMessage(), e);
            return createErrorResponse("执行Python脚本异常: " + e.getMessage());
        }
    }

    @Override
    public boolean testPythonEnvironment() {
        log.info("测试Python环境");

        try {
            // 测试Python是否可用
            ProcessBuilder versionBuilder = new ProcessBuilder("python", "--version");
            Process versionProcess = versionBuilder.start();
            int versionExitCode = versionProcess.waitFor();

            if (versionExitCode != 0) {
                log.error("Python环境测试失败: 无法执行python --version");
                return false;
            }

            // 测试脚本是否可执行
            String scriptPath = getPythonScriptPath();
            File scriptFile = new File(scriptPath);
            if (!scriptFile.exists()) {
                log.error("Python脚本不存在: {}", scriptPath);
                return false;
            }

            // 测试脚本执行
            ProcessBuilder testBuilder = new ProcessBuilder("python", scriptPath, "performance");
            testBuilder.redirectErrorStream(true);
            Process testProcess = testBuilder.start();

            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(testProcess.getInputStream()));
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line);
            }

            int testExitCode = testProcess.waitFor();

            if (testExitCode == 0) {
                log.info("Python环境测试成功，脚本输出: {}", output.toString());
                return true;
            } else {
                log.error("Python脚本测试失败，退出码: {}, 输出: {}", testExitCode, output.toString());
                return false;
            }

        } catch (Exception e) {
            log.error("Python环境测试异常: {}", e.getMessage(), e);
            return false;
        }
    }

    @Override
    public List<String> getSupportedInfoTypes() {
        return Arrays.asList(
                "performance",    // 性能数据
                "cpu_info",       // CPU信息
                "system_basic",   // 系统基本信息
                "memory_info",    // 内存信息
                "disk_info",      // 磁盘信息
                "process_info",   // 进程信息
                "network"         // 网络信息
        );
    }

    @Override
    public List<String> getInfoTypeProperties(String infoType) {
        Map<String, List<String>> propertiesMap = new HashMap<>();

        propertiesMap.put("performance", Arrays.asList(
                "cpu_percent", "memory_percent", "memory_used", "memory_available", "timestamp"
        ));

        propertiesMap.put("cpu_info", Arrays.asList(
                "usage", "cores", "physical_cores", "frequency", "max_frequency",
                "user_time", "system_time", "idle_time", "usage_per_core", "load_average", "timestamp"
        ));

        propertiesMap.put("system_basic", Arrays.asList(
                "hostname", "platform", "platform_version", "architecture", "processor",
                "boot_time", "boot_time_str", "users", "current_user", "timestamp"
        ));

        propertiesMap.put("memory_info", Arrays.asList(
                "usage", "used", "available", "total", "free",
                "swap_used", "swap_total", "swap_free", "swap_percent", "timestamp"
        ));

        propertiesMap.put("disk_info", Arrays.asList(
                "usage", "used", "available", "total", "read_bytes", "write_bytes",
                "read_count", "write_count", "partitions", "timestamp"
        ));

        propertiesMap.put("process_info", Arrays.asList(
                "total", "running", "sleeping", "processes", "timestamp"
        ));

        propertiesMap.put("network", Arrays.asList(
                "bytes_sent", "bytes_recv", "bytes_sent_rate", "bytes_recv_rate", "timestamp"
        ));

        return propertiesMap.getOrDefault(infoType, Arrays.asList("name", "value"));
    }

    @Override
    public Map<String, Object> extractPerformanceMetrics() {
        log.info("提取性能指标");

        try {
            Map<String, Object> performanceData = collectPerformanceDataQuick();
            return extractMetricsFromPerformanceData(performanceData);
        } catch (Exception e) {
            log.error("提取性能指标失败: {}", e.getMessage(), e);
            return buildUnavailablePerformanceMetrics(e.getMessage());
        }
    }

    @Override
    public Map<String, Object> collectPerformanceDataQuick() {
        // 使用缓存避免频繁调用
        Long perfTime = cacheTimestamps.get("performance");
        if (perfTime != null && System.currentTimeMillis() - perfTime < CACHE_EXPIRY_MS) {
            Object cached = realTimeCache.get("performance");
            if (cached instanceof Map<?, ?> cachedMap) {
                log.debug("使用缓存的性能数据");
                Map<String, Object> normalized = new HashMap<>();
                for (Map.Entry<?, ?> entry : cachedMap.entrySet()) {
                    normalized.put(String.valueOf(entry.getKey()), entry.getValue());
                }
                return normalized;
            }
        }

        try {
            Map<String, Object> result = collectSpecificInfo("performance");
            realTimeCache.put("performance", result);
            cacheTimestamps.put("performance", System.currentTimeMillis());
            return result;
        } catch (Exception e) {
            log.warn("快速性能数据采集失败: {}", e.getMessage());
            return createErrorResponse("快速性能数据采集失败: " + e.getMessage());
        }
    }

    @Override
    public Map<String, Object> collectQuickProcessInfo(int limit) {
        log.info("收集快速进程信息，限制: {}", limit);

        try {
            Map<String, Object> result = collectSpecificInfo("process_info");

            // 限制进程数量
            if (result.containsKey("processes") && result.get("processes") instanceof List) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> processes = (List<Map<String, Object>>) result.get("processes");
                if (processes.size() > limit) {
                    result.put("processes", processes.subList(0, limit));
                }
            }

            return result;
        } catch (Exception e) {
            log.warn("快速进程信息采集失败: {}", e.getMessage());
            return createErrorResponse("快速进程信息采集失败: " + e.getMessage());
        }
    }

    @Override
    public Map<String, Object> collectNetworkStats() {
        log.info("收集网络统计信息");

        try {
            return collectSpecificInfo("network");
        } catch (Exception e) {
            log.warn("网络统计信息采集失败: {}", e.getMessage());
            return createErrorResponse("网络统计信息采集失败: " + e.getMessage());
        }
    }

    @Override
    public Map<String, Object> collectSystemMetrics() {
        log.info("收集系统指标");

        try {
            return collectSpecificInfo("system_basic");
        } catch (Exception e) {
            log.warn("系统指标采集失败: {}", e.getMessage());
            return createErrorResponse("系统指标采集失败: " + e.getMessage());
        }
    }

    @Override
    public Map<String, Object> collectRealTimeStatus() {
        log.info("收集实时系统状态");

        Map<String, Object> status = new HashMap<>();
        long startTime = System.currentTimeMillis();

        try {
            // 收集关键性能指标
            Map<String, Object> performance = collectPerformanceDataQuick();
            Map<String, Object> processes = collectQuickProcessInfo(5);
            Map<String, Object> system = collectSystemMetrics();

            status.put("performance", performance);
            status.put("processes", processes);
            status.put("system", system);
            status.put("collection_time", System.currentTimeMillis() - startTime);
            status.put("timestamp", startTime);
            status.put("status", "healthy");

        } catch (Exception e) {
            log.error("实时状态采集失败: {}", e.getMessage());
            status.put("error", e.getMessage());
            status.put("status", "unhealthy");
        }

        return status;
    }

    @Override
    public Map<String, Object> collectBatchRealTimeData() {
        log.info("批量收集实时数据");

        Map<String, Object> batchData = new HashMap<>();
        long startTime = System.currentTimeMillis();

        try {
            // 并行收集所有类型数据
            Map<String, Object> performance = collectPerformanceDataQuick();
            Map<String, Object> system = collectSystemMetrics();
            Map<String, Object> processes = collectQuickProcessInfo(10);
            Map<String, Object> network = collectNetworkStats();

            batchData.put("performance", performance);
            batchData.put("system", system);
            batchData.put("processes", processes);
            batchData.put("network", network);
            batchData.put("collection_duration", System.currentTimeMillis() - startTime);
            batchData.put("timestamp", startTime);
            batchData.put("status", "success");

        } catch (Exception e) {
            log.error("批量实时数据采集失败: {}", e.getMessage());
            batchData.put("error", e.getMessage());
            batchData.put("status", "error");
        }

        return batchData;
    }

    @Override
    public Map<String, Integer> getCollectionIntervals() {
        return new HashMap<>(COLLECTION_INTERVALS);
    }

    // ================ 私有辅助方法 ================

    private String getPythonScriptPath() {
        // 如果有明确配置路径，则使用配置的路径
        if (pythonScriptPath != null && !pythonScriptPath.trim().isEmpty()) {
            return pythonScriptPath;
        }

        // 否则使用与ScriptExecutionServiceImpl相同的路径解析机制
        ScriptProperties.ScriptDefinition definition = scriptProperties.getAllowed().get("system_info_collector");
        if (definition != null) {
            Path scriptPath = resolveScriptPath(definition.getFile());
            log.info("使用Python脚本路径: {}", scriptPath.toString());
            return scriptPath.toString();
        }

        // 最后回退到默认路径（基于脚本基础路径）
        Path fallbackPath = resolveScriptDirectory().resolve("system_info_collector.py").normalize();
        log.info("使用默认Python脚本路径: {}", fallbackPath);
        return fallbackPath.toString();
    }

    private String resolvePythonExecutable() {
        try {
            return scriptProperties.getResolvedPythonExecutable();
        } catch (Exception e) {
            log.warn("无法从配置解析Python路径，使用系统python: {}", e.getMessage());
            return "python";
        }
    }

    private Path resolveScriptDirectory() {
        return Paths.get(scriptProperties.getResolvedBasePath()).toAbsolutePath().normalize();
    }

    private Path resolveScriptPath(String fileName) {
        return resolveScriptDirectory().resolve(fileName).normalize();
    }

    private Map<String, Object> createErrorResponse(String error) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", error);
        errorResponse.put("timestamp", System.currentTimeMillis());
        errorResponse.put("status", "error");
        return errorResponse;
    }

    private Map<String, Object> extractMetricsFromPerformanceData(Map<String, Object> performanceData) {
        Map<String, Object> metrics = new HashMap<>();

        try {
            if (performanceData != null && !performanceData.containsKey("error")) {
                // 提取CPU和内存使用率
                Object cpuPercent = performanceData.get("cpu_percent");
                Object memoryPercent = performanceData.get("memory_percent");

                if (cpuPercent != null) {
                    metrics.put("cpu_usage", cpuPercent);
                }
                if (memoryPercent != null) {
                    metrics.put("memory_usage", memoryPercent);
                }

                // 计算其他指标
                metrics.put("collection_rate", 95.0);
                metrics.put("data_freshness", System.currentTimeMillis());
                metrics.put("active_sources", 1);

            } else {
                log.warn("性能数据包含错误，使用默认指标");
                metrics.putAll(buildUnavailablePerformanceMetrics("性能数据不可用"));
            }

        } catch (Exception e) {
            log.warn("提取性能指标失败: {}", e.getMessage());
            metrics.putAll(buildUnavailablePerformanceMetrics(e.getMessage()));
        }

        return metrics;
    }

    private Map<String, Object> buildUnavailablePerformanceMetrics(String reason) {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("cpu_usage", null);
        metrics.put("memory_usage", null);
        metrics.put("collection_rate", 0.0);
        metrics.put("data_freshness", System.currentTimeMillis());
        metrics.put("active_sources", 0);
        metrics.put("status", "error");
        metrics.put("error", reason);

        return metrics;
    }
}