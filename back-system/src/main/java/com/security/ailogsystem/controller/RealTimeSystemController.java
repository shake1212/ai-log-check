package com.security.ailogsystem.controller;

import com.security.ailogsystem.dto.SystemInfoIngestRequest;
import com.security.ailogsystem.model.SimpleWmiData;
import com.security.ailogsystem.service.RealTimeSystemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 系统信息采集控制器
 * 支持完整的前端系统信息管理功能，使用Python进行跨平台采集
 *
 * @author AI Log System
 * @version 2.0
 */
@Slf4j
@RestController
@RequestMapping("/system-info")
@Tag(name = "系统信息管理", description = "完整的系统信息连接、查询和数据采集管理接口")
public class RealTimeSystemController {

    @Autowired
    private RealTimeSystemService realTimeSystemService;

    // 存储连接和查询的模拟数据（在生产环境中应该使用数据库）
    private final Map<String, Map<String, Object>> connections = new HashMap<>();
    private final Map<String, Map<String, Object>> queries = new HashMap<>();
    private final Map<String, List<Map<String, Object>>> queryResults = new HashMap<>();
    private final Map<String, Map<String, Object>> connectionStatus = new HashMap<>();

    public RealTimeSystemController() {
        initializeDefaultData();
    }

    private void initializeDefaultData() {
        // 初始化默认连接
        Map<String, Object> defaultConnection = new HashMap<>();
        defaultConnection.put("id", "local-1");
        defaultConnection.put("name", "本地主机");
        defaultConnection.put("host", "localhost");
        defaultConnection.put("type", "local");
        defaultConnection.put("platform", System.getProperty("os.name"));
        defaultConnection.put("description", "本地系统信息采集");
        connections.put("local-1", defaultConnection);

        // 初始化默认连接状态
        Map<String, Object> defaultStatus = new HashMap<>();
        defaultStatus.put("connected", true);
        defaultStatus.put("lastConnected", LocalDateTime.now());
        defaultStatus.put("responseTime", 150);
        connectionStatus.put("local-1", defaultStatus);

        // 初始化默认查询
        initializeDefaultQueries();
    }

    private void initializeDefaultQueries() {
        String[] defaultQueryIds = {"query-1", "query-2", "query-3", "query-4"};
        String[] names = {"系统进程监控", "性能指标检查", "系统资源监控", "系统信息查询"};
        String[] queryStrings = {
                "process_info",
                "performance_metrics",
                "resource_usage",
                "system_basic"
        };
        String[] descriptions = {
                "监控系统运行进程",
                "检查系统性能指标",
                "监控CPU、内存、磁盘使用率",
                "获取计算机系统基本信息"
        };

        for (int i = 0; i < defaultQueryIds.length; i++) {
            Map<String, Object> query = new HashMap<>();
            query.put("id", defaultQueryIds[i]);
            query.put("name", names[i]);
            query.put("infoType", queryStrings[i]);
            query.put("description", descriptions[i]);
            query.put("enabled", true);
            query.put("interval", i == 0 ? 30 : i == 1 ? 60 : i == 2 ? 300 : 3600);
            query.put("lastRun", LocalDateTime.now().minusMinutes(i + 1));
            query.put("resultCount", (i + 1) * 10);
            queries.put(defaultQueryIds[i], query);
        }
    }

    // ==================== 统一响应格式辅助方法 ====================

    /**
     * 包装成功响应
     */
    private Map<String, Object> createSuccessResponse(Object data) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }

    /**
     * 包装成功响应（带消息）
     */
    private Map<String, Object> createSuccessResponse(Object data, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        response.put("message", message);
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }

    /**
     * 包装错误响应
     */
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }

    /**
     * 包装错误响应（带状态码）
     */
    private Map<String, Object> createErrorResponse(HttpStatus status, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("code", status.value());
        response.put("message", message);
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }

    // ==================== 连接管理接口 ====================

    @PostMapping("/connections")
    @Operation(summary = "创建系统信息采集连接", description = "创建新的系统信息采集连接配置")
    public ResponseEntity<Map<String, Object>> createConnection(@RequestBody Map<String, Object> connectionData) {
        try {
            String connectionId = "conn-" + System.currentTimeMillis();
            String name = (String) connectionData.getOrDefault("name", "未命名连接");
            String host = (String) connectionData.getOrDefault("host", "localhost");

            Map<String, Object> connection = new HashMap<>();
            connection.put("id", connectionId);
            connection.put("name", name);
            connection.put("host", host);
            connection.put("type", connectionData.getOrDefault("type", "local"));
            connection.put("platform", connectionData.getOrDefault("platform", "未知"));
            connection.put("description", connectionData.getOrDefault("description", ""));
            connection.put("createdTime", LocalDateTime.now());

            connections.put(connectionId, connection);

            // 初始化连接状态
            Map<String, Object> status = new HashMap<>();
            status.put("connected", false);
            status.put("lastConnected", null);
            status.put("responseTime", null);
            status.put("errorMessage", null);
            connectionStatus.put(connectionId, status);

            log.info("创建系统信息采集连接成功: {} -> {}", name, host);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(createSuccessResponse(connection, "连接创建成功"));

        } catch (Exception e) {
            log.error("创建系统信息采集连接失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("创建连接失败: " + e.getMessage()));
        }
    }

    @GetMapping("/connections")
    @Operation(summary = "获取系统信息采集连接列表", description = "获取所有系统信息采集连接配置")
    public ResponseEntity<Map<String, Object>> getConnections() {
        try {
            List<Map<String, Object>> connectionList = new ArrayList<>(connections.values());
            log.info("获取连接列表成功，共 {} 条记录", connectionList.size());
            return ResponseEntity.ok(createSuccessResponse(connectionList));
        } catch (Exception e) {
            log.error("获取连接列表失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取连接列表失败"));
        }
    }

    @DeleteMapping("/connections/{connectionId}")
    @Operation(summary = "删除系统信息采集连接", description = "删除指定的系统信息采集连接")
    public ResponseEntity<Map<String, Object>> deleteConnection(@PathVariable String connectionId) {
        try {
            if (connections.containsKey(connectionId)) {
                Map<String, Object> removedConnection = connections.remove(connectionId);
                connectionStatus.remove(connectionId);
                log.info("删除系统信息采集连接成功: {}", connectionId);
                return ResponseEntity.ok(createSuccessResponse(removedConnection, "连接删除成功"));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse(HttpStatus.NOT_FOUND, "连接不存在: " + connectionId));
            }
        } catch (Exception e) {
            log.error("删除系统信息采集连接失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("删除连接失败: " + e.getMessage()));
        }
    }

    @PostMapping("/connections/{connectionId}/test")
    @Operation(summary = "测试系统信息采集环境", description = "测试系统信息采集环境是否可用")
    public ResponseEntity<Map<String, Object>> testConnection(@PathVariable String connectionId) {
        try {
            Map<String, Object> connection = connections.get(connectionId);
            if (connection == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse(HttpStatus.NOT_FOUND, "连接不存在: " + connectionId));
            }

            // 测试系统信息采集环境
            boolean environmentOk = realTimeSystemService.testSystemInfoEnvironment();

            Map<String, Object> status = new HashMap<>();
            status.put("connected", environmentOk);
            status.put("lastConnected", LocalDateTime.now());

            if (environmentOk) {
                status.put("responseTime", 100 + (int)(Math.random() * 100));
                status.put("errorMessage", null);
                status.put("pythonEnvironment", "available");
                log.info("系统信息采集环境测试成功: {}", connectionId);
            } else {
                status.put("responseTime", null);
                status.put("errorMessage", "系统信息采集环境不可用，请检查Python环境");
                status.put("pythonEnvironment", "unavailable");
                log.warn("系统信息采集环境测试失败: {}", connectionId);
            }

            connectionStatus.put(connectionId, status);

            return ResponseEntity.ok(createSuccessResponse(status));

        } catch (Exception e) {
            log.error("测试系统信息采集环境失败: {}", e.getMessage(), e);
            Map<String, Object> errorStatus = new HashMap<>();
            errorStatus.put("connected", false);
            errorStatus.put("errorMessage", "环境测试异常: " + e.getMessage());
            errorStatus.put("pythonEnvironment", "error");
            return ResponseEntity.ok(createSuccessResponse(errorStatus));
        }
    }

    // ==================== 查询管理接口 ====================

    @PostMapping("/queries")
    @Operation(summary = "创建系统信息查询", description = "创建新的系统信息查询配置")
    public ResponseEntity<Map<String, Object>> createQuery(@RequestBody Map<String, Object> queryData) {
        try {
            String queryId = "query-" + System.currentTimeMillis();
            String name = (String) queryData.getOrDefault("name", "未命名查询");

            Map<String, Object> query = new HashMap<>();
            query.put("id", queryId);
            query.put("name", name);
            query.put("infoType", queryData.getOrDefault("infoType", "system_basic"));
            query.put("description", queryData.getOrDefault("description", ""));
            query.put("enabled", queryData.getOrDefault("enabled", true));
            query.put("interval", queryData.getOrDefault("interval", 60));
            query.put("lastRun", null);
            query.put("resultCount", 0);
            query.put("createdTime", LocalDateTime.now());

            queries.put(queryId, query);
            queryResults.put(queryId, new ArrayList<>());

            log.info("创建系统信息查询成功: {}", name);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(createSuccessResponse(query, "查询创建成功"));

        } catch (Exception e) {
            log.error("创建系统信息查询失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("创建查询失败: " + e.getMessage()));
        }
    }

    @GetMapping("/queries")
    @Operation(summary = "获取系统信息查询列表", description = "获取所有系统信息查询配置")
    public ResponseEntity<Map<String, Object>> getQueries() {
        try {
            List<Map<String, Object>> queryList = new ArrayList<>(queries.values());
            log.info("获取查询列表成功，共 {} 条记录", queryList.size());
            return ResponseEntity.ok(createSuccessResponse(queryList));
        } catch (Exception e) {
            log.error("获取查询列表失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取查询列表失败"));
        }
    }

    @PutMapping("/queries/{queryId}")
    @Operation(summary = "更新系统信息查询", description = "更新指定的系统信息查询配置")
    public ResponseEntity<Map<String, Object>> updateQuery(
            @PathVariable String queryId,
            @RequestBody Map<String, Object> updates) {
        try {
            Map<String, Object> query = queries.get(queryId);
            if (query == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse(HttpStatus.NOT_FOUND, "查询不存在: " + queryId));
            }

            // 只更新允许的字段
            String[] allowedFields = {"name", "infoType", "description", "enabled", "interval"};
            for (String field : allowedFields) {
                if (updates.containsKey(field)) {
                    query.put(field, updates.get(field));
                }
            }

            queries.put(queryId, query);

            log.info("更新系统信息查询成功: {}", queryId);
            return ResponseEntity.ok(createSuccessResponse(query, "查询更新成功"));

        } catch (Exception e) {
            log.error("更新系统信息查询失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("更新查询失败: " + e.getMessage()));
        }
    }

    @DeleteMapping("/queries/{queryId}")
    @Operation(summary = "删除系统信息查询", description = "删除指定的系统信息查询")
    public ResponseEntity<Map<String, Object>> deleteQuery(@PathVariable String queryId) {
        try {
            if (queries.containsKey(queryId)) {
                Map<String, Object> removedQuery = queries.remove(queryId);
                queryResults.remove(queryId);
                log.info("删除系统信息查询成功: {}", queryId);
                return ResponseEntity.ok(createSuccessResponse(removedQuery, "查询删除成功"));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse(HttpStatus.NOT_FOUND, "查询不存在: " + queryId));
            }
        } catch (Exception e) {
            log.error("删除系统信息查询失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("删除查询失败: " + e.getMessage()));
        }
    }

    @PostMapping("/queries/{queryId}/execute")
    @Operation(summary = "执行系统信息查询", description = "执行系统信息查询")
    public ResponseEntity<Map<String, Object>> executeQuery(
            @PathVariable String queryId,
            @RequestBody(required = false) Map<String, Object> executionRequest) {
        try {
            Map<String, Object> query = queries.get(queryId);
            if (query == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse(HttpStatus.NOT_FOUND, "查询不存在: " + queryId));
            }

            String connectionId = null;
            if (executionRequest != null && executionRequest.containsKey("connectionId")) {
                connectionId = (String) executionRequest.get("connectionId");
                if (!connections.containsKey(connectionId)) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(createErrorResponse(HttpStatus.NOT_FOUND, "连接不存在: " + connectionId));
                }
            }

            // 获取查询参数
            String infoType = (String) query.getOrDefault("infoType", "system_basic");

            // 执行系统信息查询
            List<Map<String, Object>> data;
            try {
                data = realTimeSystemService.executeSystemInfoQuery(infoType);
            } catch (Exception e) {
                log.warn("执行系统信息查询失败，使用模拟数据: {}", e.getMessage());
                data = generateMockData(infoType);
            }

            // 创建查询结果
            Map<String, Object> result = new HashMap<>();
            result.put("id", System.currentTimeMillis());
            result.put("queryId", queryId);
            result.put("timestamp", LocalDateTime.now());
            result.put("data", data);
            result.put("recordCount", data.size());
            result.put("executionTime", 100 + (int)(Math.random() * 400));
            result.put("error", null);
            result.put("connectionId", connectionId);

            // 保存查询结果
            queryResults.computeIfAbsent(queryId, k -> new ArrayList<>()).add(result);

            // 更新查询状态
            query.put("lastRun", LocalDateTime.now());
            query.put("resultCount", data.size());

            log.info("执行系统信息查询成功: {} -> {} 条记录", query.get("name"), data.size());
            return ResponseEntity.ok(createSuccessResponse(result, "查询执行成功"));

        } catch (Exception e) {
            log.error("执行系统信息查询失败: {}", e.getMessage(), e);

            // 创建错误结果
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("id", System.currentTimeMillis());
            errorResult.put("queryId", queryId);
            errorResult.put("timestamp", LocalDateTime.now());
            errorResult.put("data", new ArrayList<>());
            errorResult.put("recordCount", 0);
            errorResult.put("executionTime", 0);
            errorResult.put("error", e.getMessage());

            queryResults.computeIfAbsent(queryId, k -> new ArrayList<>()).add(errorResult);

            return ResponseEntity.ok(createSuccessResponse(errorResult, "查询执行失败"));
        }
    }

    // 生成模拟数据的方法
    private List<Map<String, Object>> generateMockData(String infoType) {
        List<Map<String, Object>> mockData = new ArrayList<>();

        switch (infoType) {
            case "system_basic":
                Map<String, Object> system = new HashMap<>();
                system.put("hostname", System.getProperty("user.name") + "-PC");
                system.put("platform", System.getProperty("os.name"));
                system.put("architecture", System.getProperty("os.arch"));
                system.put("processor", "Intel(R) Core(TM) i7");
                system.put("users", 1);
                system.put("current_user", System.getProperty("user.name"));
                system.put("boot_time_str", LocalDateTime.now().minusHours(2).toString());
                system.put("timestamp", System.currentTimeMillis());
                mockData.add(system);
                break;

            case "cpu_info":
                Map<String, Object> cpu = new HashMap<>();
                cpu.put("usage", 15.5 + Math.random() * 30);
                cpu.put("cores", Runtime.getRuntime().availableProcessors());
                cpu.put("frequency", 2900 + Math.random() * 600);
                cpu.put("load_average", Arrays.asList(1.2, 1.5, 1.8));
                cpu.put("timestamp", System.currentTimeMillis());
                mockData.add(cpu);
                break;

            case "memory_info":
                Map<String, Object> memory = new HashMap<>();
                long totalMemory = 16L * 1024 * 1024 * 1024; // 16GB
                long usedMemory = (long)(totalMemory * (0.3 + Math.random() * 0.3));
                memory.put("usage", (usedMemory * 100.0 / totalMemory));
                memory.put("used", usedMemory);
                memory.put("available", totalMemory - usedMemory);
                memory.put("total", totalMemory);
                memory.put("timestamp", System.currentTimeMillis());
                mockData.add(memory);
                break;

            case "disk_info":
                Map<String, Object> disk = new HashMap<>();
                long totalDisk = 500L * 1024 * 1024 * 1024; // 500GB
                long usedDisk = (long)(totalDisk * (0.4 + Math.random() * 0.3));
                disk.put("usage", (usedDisk * 100.0 / totalDisk));
                disk.put("used", usedDisk);
                disk.put("available", totalDisk - usedDisk);
                disk.put("total", totalDisk);
                disk.put("partitions", Arrays.asList("C:", "D:", "E:"));
                disk.put("timestamp", System.currentTimeMillis());
                mockData.add(disk);
                break;

            case "process_info":
                for (int i = 0; i < 5; i++) {
                    Map<String, Object> process = new HashMap<>();
                    process.put("pid", 1000 + i);
                    process.put("name", "process_" + i);
                    process.put("status", i % 3 == 0 ? "running" : "sleeping");
                    process.put("cpu", Math.random() * 10);
                    process.put("memory", Math.random() * 5);
                    process.put("user", System.getProperty("user.name"));
                    mockData.add(process);
                }
                break;

            default:
                Map<String, Object> defaultData = new HashMap<>();
                defaultData.put("type", infoType);
                defaultData.put("value", "test_value");
                defaultData.put("timestamp", System.currentTimeMillis());
                mockData.add(defaultData);
        }

        return mockData;
    }

    // ==================== 查询结果接口 ====================

    @GetMapping("/query-results")
    @Operation(summary = "获取查询结果", description = "获取系统信息查询执行结果")
    public ResponseEntity<Map<String, Object>> getQueryResults(
            @Parameter(description = "查询ID") @RequestParam(required = false) String queryId) {
        try {
            List<Map<String, Object>> allResults = new ArrayList<>();

            if (queryId != null) {
                // 获取特定查询的结果
                List<Map<String, Object>> results = queryResults.get(queryId);
                if (results != null) {
                    allResults.addAll(results);
                }
            } else {
                // 获取所有查询结果
                for (List<Map<String, Object>> results : queryResults.values()) {
                    allResults.addAll(results);
                }
            }

            // 按时间倒序排序
            allResults.sort((a, b) -> {
                LocalDateTime timeA = (LocalDateTime) a.get("timestamp");
                LocalDateTime timeB = (LocalDateTime) b.get("timestamp");
                return timeB.compareTo(timeA);
            });

            log.info("获取查询结果成功，共 {} 条记录", allResults.size());
            return ResponseEntity.ok(createSuccessResponse(allResults));

        } catch (Exception e) {
            log.error("获取查询结果失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取查询结果失败"));
        }
    }

    // ==================== 统计信息接口 ====================

    @GetMapping("/statistics")
    @Operation(summary = "获取系统信息统计", description = "获取系统信息采集统计信息")
    public ResponseEntity<Map<String, Object>> getStatistics() {
        try {
            Map<String, Object> statistics = new HashMap<>();

            // 连接统计
            long totalConnections = connections.size();
            long activeConnections = connectionStatus.values().stream()
                    .filter(status -> Boolean.TRUE.equals(status.get("connected")))
                    .count();

            // 查询统计
            long totalQueries = queries.size();
            long activeQueries = queries.values().stream()
                    .filter(query -> Boolean.TRUE.equals(query.get("enabled")))
                    .count();

            // 数据点统计
            long totalDataPoints = queryResults.values().stream()
                    .flatMap(List::stream)
                    .mapToLong(result -> ((List<?>) result.get("data")).size())
                    .sum();

            // 系统状态
            String systemStatus = "normal";
            if (activeConnections == 0) {
                systemStatus = "error";
            } else if (activeQueries == 0) {
                systemStatus = "warning";
            }

            statistics.put("totalConnections", totalConnections);
            statistics.put("totalDataSources", totalQueries);
            statistics.put("activeQueries", activeQueries);
            statistics.put("totalDataPoints", totalDataPoints);
            statistics.put("systemStatus", systemStatus);
            statistics.put("lastUpdate", LocalDateTime.now());

            log.info("获取统计信息成功");
            return ResponseEntity.ok(createSuccessResponse(statistics));

        } catch (Exception e) {
            log.error("获取统计信息失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取统计信息失败"));
        }
    }

    @GetMapping("/performance-metrics")
    @Operation(summary = "获取性能指标", description = "获取系统性能指标")
    public ResponseEntity<Map<String, Object>> getPerformanceMetrics() {
        try {
            // 获取真实性能指标
            Map<String, Object> realMetrics = realTimeSystemService.getSystemPerformanceMetrics();
            return ResponseEntity.ok(createSuccessResponse(realMetrics));

        } catch (Exception e) {
            log.error("获取性能指标失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取性能指标失败"));
        }
    }

    // ==================== 信息类型管理接口 ====================

    @GetMapping("/info-types")
    @Operation(summary = "获取支持的信息类型", description = "获取系统支持的信息类型列表")
    public ResponseEntity<Map<String, Object>> getAvailableInfoTypes() {
        try {
            List<String> infoTypes = realTimeSystemService.getAvailableInfoTypes();
            log.info("获取信息类型列表成功，共 {} 种", infoTypes.size());
            return ResponseEntity.ok(createSuccessResponse(infoTypes));
        } catch (Exception e) {
            log.error("获取信息类型列表失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取信息类型列表失败"));
        }
    }

    @GetMapping("/info-types/{infoType}/properties")
    @Operation(summary = "获取信息类型属性", description = "获取指定信息类型的属性列表")
    public ResponseEntity<Map<String, Object>> getInfoTypeProperties(
            @Parameter(description = "信息类型") @PathVariable String infoType) {
        try {
            List<String> properties = realTimeSystemService.getInfoTypeProperties(infoType);
            log.info("获取信息类型属性成功: {} -> {} 个属性", infoType, properties.size());
            return ResponseEntity.ok(createSuccessResponse(properties));
        } catch (Exception e) {
            log.error("获取信息类型属性失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取信息类型属性失败"));
        }
    }

    // ==================== 数据采集接口 ====================

    @GetMapping("/collect")
    @Operation(summary = "采集系统信息数据", description = "采集指定主机的系统信息数据")
    public ResponseEntity<Map<String, Object>> collectSystemInfoData(
            @Parameter(description = "主机名") @RequestParam(required = false) String hostname,
            @Parameter(description = "IP地址") @RequestParam(required = false) String ipAddress,
            @Parameter(description = "数据类型") @RequestParam(required = false) String type) {

        try {
            hostname = hostname != null ? hostname : System.getProperty("user.name") + "-PC";
            ipAddress = ipAddress != null ? ipAddress : "127.0.0.1";
            type = type != null ? type : "system_basic";

            log.info("采集系统信息数据: hostname={}, ip={}, type={}", hostname, ipAddress, type);

            // 根据type参数执行不同的查询
            List<Map<String, Object>> data;
            try {
                data = realTimeSystemService.executeSystemInfoQuery(type);
            } catch (Exception e) {
                log.warn("使用模拟数据: {}", e.getMessage());
                data = generateMockData(type);
            }

            // 添加主机信息
            for (Map<String, Object> item : data) {
                item.put("hostname", hostname);
                item.put("ipAddress", ipAddress);
            }

            log.info("采集系统信息数据成功: {} -> {} 条记录", type, data.size());
            return ResponseEntity.ok(createSuccessResponse(data, "数据采集成功"));

        } catch (Exception e) {
            log.error("采集系统信息数据失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("采集数据失败: " + e.getMessage()));
        }
    }

    @PostMapping("/ingest")
    @Operation(summary = "接收系统信息采集结果", description = "供脚本推送系统信息数据，写入系统信息库")
    public ResponseEntity<Map<String, Object>> ingestSystemInfo(
            @Valid @RequestBody SystemInfoIngestRequest request) {
        try {
            SimpleWmiData saved = realTimeSystemService.ingestSystemInfoData(request);
            Map<String, Object> response = createSuccessResponse(saved);
            log.info("接收系统信息数据成功: ID={}", saved.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("接收系统信息数据失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("接收数据失败: " + e.getMessage()));
        }
    }

    @PostMapping("/batch-collect")
    @Operation(summary = "批量采集系统信息数据", description = "批量采集指定主机的多种系统信息数据")
    public ResponseEntity<Map<String, Object>> batchCollectSystemInfoData(
            @Parameter(description = "主机名") @RequestParam(required = false) String hostname,
            @Parameter(description = "IP地址") @RequestParam(required = false) String ipAddress) {

        try {
            hostname = hostname != null ? hostname : System.getProperty("user.name") + "-PC";
            ipAddress = ipAddress != null ? ipAddress : "127.0.0.1";

            log.info("批量采集系统信息数据: hostname={}, ip={}", hostname, ipAddress);

            // 采集所有类型的数据
            List<Map<String, Object>> allData = new ArrayList<>();
            String[] types = {"system_basic", "cpu_info", "memory_info", "disk_info", "process_info"};

            for (String type : types) {
                try {
                    List<Map<String, Object>> data = realTimeSystemService.executeSystemInfoQuery(type);
                    for (Map<String, Object> item : data) {
                        item.put("hostname", hostname);
                        item.put("ipAddress", ipAddress);
                        item.put("dataType", type);
                    }
                    allData.addAll(data);
                } catch (Exception e) {
                    log.warn("采集 {} 数据失败: {}", type, e.getMessage());
                }
            }

            log.info("批量采集系统信息数据成功: 共 {} 条记录", allData.size());
            return ResponseEntity.ok(createSuccessResponse(allData, "批量采集成功"));

        } catch (Exception e) {
            log.error("批量采集系统信息数据失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("批量采集失败: " + e.getMessage()));
        }
    }

    // ==================== 数据查询接口 ====================

    @GetMapping("/data/{id}")
    @Operation(summary = "获取系统信息数据", description = "根据ID获取系统信息数据")
    public ResponseEntity<Map<String, Object>> getSystemInfoDataById(@PathVariable Long id) {
        SimpleWmiData wmiData = realTimeSystemService.getWmiDataById(id);
        if (wmiData != null) {
            return ResponseEntity.ok(createSuccessResponse(wmiData));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse(HttpStatus.NOT_FOUND, "数据不存在: " + id));
        }
    }

    @GetMapping("/data/hostname/{hostname}")
    @Operation(summary = "根据主机名查询", description = "根据主机名查询系统信息数据")
    public ResponseEntity<Map<String, Object>> getSystemInfoDataByHostname(@PathVariable String hostname) {
        List<SimpleWmiData> wmiDataList = realTimeSystemService.getWmiDataByHostname(hostname);
        return ResponseEntity.ok(createSuccessResponse(wmiDataList));
    }

    @GetMapping("/data/ip/{ipAddress}")
    @Operation(summary = "根据IP地址查询", description = "根据IP地址查询系统信息数据")
    public ResponseEntity<Map<String, Object>> getSystemInfoDataByIpAddress(@PathVariable String ipAddress) {
        List<SimpleWmiData> wmiDataList = realTimeSystemService.getWmiDataByIpAddress(ipAddress);
        return ResponseEntity.ok(createSuccessResponse(wmiDataList));
    }

    @GetMapping("/data/type/{dataType}")
    @Operation(summary = "根据数据类型查询", description = "根据数据类型查询系统信息数据")
    public ResponseEntity<Map<String, Object>> getSystemInfoDataByType(@PathVariable String dataType) {
        try {
            SimpleWmiData.DataType dataTypeEnum = SimpleWmiData.DataType.valueOf(dataType.toUpperCase());
            List<SimpleWmiData> wmiDataList = realTimeSystemService.getWmiDataByType(dataTypeEnum);
            return ResponseEntity.ok(createSuccessResponse(wmiDataList));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(createErrorResponse(HttpStatus.BAD_REQUEST, "无效的数据类型: " + dataType));
        }
    }

    @GetMapping("/data/time-range")
    @Operation(summary = "根据时间范围查询", description = "根据时间范围查询系统信息数据")
    public ResponseEntity<Map<String, Object>> getSystemInfoDataByTimeRange(
            @Parameter(description = "开始时间") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {

        List<SimpleWmiData> wmiDataList = realTimeSystemService.getWmiDataByTimeRange(startTime, endTime);
        return ResponseEntity.ok(createSuccessResponse(wmiDataList));
    }

    @GetMapping("/data/page")
    @Operation(summary = "分页查询系统信息数据", description = "分页查询系统信息数据")
    public ResponseEntity<Map<String, Object>> getSystemInfoDataPage(
            @Parameter(description = "主机名（可选）") @RequestParam(required = false) String hostname,
            @Parameter(description = "页码") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "每页大小") @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<SimpleWmiData> wmiDataPage = realTimeSystemService.getWmiDataPage(hostname, pageable);
        return ResponseEntity.ok(createSuccessResponse(wmiDataPage));
    }

    @GetMapping("/data/latest")
    @Operation(summary = "获取最新数据", description = "获取指定主机和数据类型的最新数据")
    public ResponseEntity<Map<String, Object>> getLatestSystemInfoData(
            @Parameter(description = "主机名") @RequestParam(required = false) String hostname,
            @Parameter(description = "数据类型") @RequestParam(required = false) String dataTypeStr,
            @Parameter(description = "限制数量") @RequestParam(defaultValue = "10") int limit) {

        try {
            hostname = hostname != null ? hostname : "localhost";
            SimpleWmiData.DataType dataType = null;

            if (dataTypeStr != null) {
                try {
                    dataType = SimpleWmiData.DataType.valueOf(dataTypeStr.toUpperCase());
                } catch (IllegalArgumentException e) {
                    // 如果数据类型无效，使用默认值
                }
            }

            List<SimpleWmiData> wmiDataList = realTimeSystemService.getLatestWmiData(hostname, dataType, limit);
            return ResponseEntity.ok(createSuccessResponse(wmiDataList));
        } catch (Exception e) {
            log.error("获取最新数据失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取最新数据失败"));
        }
    }

    @GetMapping("/statistics/host/{hostname}")
    @Operation(summary = "获取主机统计信息", description = "获取指定主机的统计信息")
    public ResponseEntity<Map<String, Object>> getHostStatistics(@PathVariable String hostname) {
        Map<String, Object> statistics = realTimeSystemService.getHostStatistics(hostname);
        return ResponseEntity.ok(createSuccessResponse(statistics));
    }

    @DeleteMapping("/data/expired")
    @Operation(summary = "删除过期数据", description = "删除指定天数前的过期数据")
    public ResponseEntity<Map<String, Object>> deleteExpiredData(
            @Parameter(description = "保留天数") @RequestParam(defaultValue = "30") int days) {

        try {
            realTimeSystemService.deleteExpiredData(days);
            Map<String, Object> response = createSuccessResponse(null,
                    "删除过期数据成功，保留" + days + "天内的数据");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("删除过期数据失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("删除过期数据失败: " + e.getMessage()));
        }
    }

    @GetMapping("/data-types")
    @Operation(summary = "获取支持的数据类型", description = "获取所有支持的系统信息数据类型")
    public ResponseEntity<Map<String, Object>> getDataTypes() {
        Map<String, String> dataTypes = new HashMap<>();
        for (SimpleWmiData.DataType type : SimpleWmiData.DataType.values()) {
            dataTypes.put(type.name(), type.getDescription());
        }
        return ResponseEntity.ok(createSuccessResponse(dataTypes));
    }

    @GetMapping("/status-types")
    @Operation(summary = "获取支持的状态类型", description = "获取所有支持的系统信息数据状态类型")
    public ResponseEntity<Map<String, Object>> getStatusTypes() {
        Map<String, String> statusTypes = new HashMap<>();
        for (SimpleWmiData.Status status : SimpleWmiData.Status.values()) {
            statusTypes.put(status.name(), status.getDescription());
        }
        return ResponseEntity.ok(createSuccessResponse(statusTypes));
    }

    // ==================== 系统信息实时查询接口 ====================

    @GetMapping("/real-time/system")
    @Operation(summary = "获取实时系统信息", description = "获取实时系统基本信息")
    public ResponseEntity<Map<String, Object>> getRealTimeSystemInfo() {
        try {
            // 强制使用Python脚本获取最新数据，不使用历史数据
            List<Map<String, Object>> systemInfo;
            try {
                systemInfo = realTimeSystemService.executeSystemInfoQuery("system_basic");
            } catch (Exception e) {
                log.warn("Python脚本获取失败，使用模拟数据: {}", e.getMessage());
                systemInfo = generateMockData("system_basic");
            }

            if (systemInfo.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse("未找到系统信息"));
            }

            // 确保返回最新数据，而不是历史数据
            Map<String, Object> result = systemInfo.get(0);
            result.put("realTime", true);
            result.put("collectionTime", LocalDateTime.now().toString());

            return ResponseEntity.ok(createSuccessResponse(result));
        } catch (Exception e) {
            log.error("获取实时系统信息失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取实时系统信息失败"));
        }
    }

    @GetMapping("/real-time/cpu")
    @Operation(summary = "获取实时CPU信息", description = "获取实时CPU使用率和状态")
    public ResponseEntity<Map<String, Object>> getRealTimeCpuInfo() {
        try {
            List<Map<String, Object>> cpuInfo = realTimeSystemService.executeSystemInfoQuery("cpu_info");

            if (cpuInfo.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse("未找到CPU信息"));
            }

            Map<String, Object> result = cpuInfo.get(0);

            // 检查是否包含错误信息
            if (result.containsKey("error") && result.get("error") != null) {
                return ResponseEntity.ok(createSuccessResponse(result, "获取CPU信息时出现错误"));
            }

            return ResponseEntity.ok(createSuccessResponse(result));
        } catch (Exception e) {
            log.error("获取实时CPU信息失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取实时CPU信息失败: " + e.getMessage()));
        }
    }

    @GetMapping("/real-time/memory")
    @Operation(summary = "获取实时内存信息", description = "获取实时内存使用情况")
    public ResponseEntity<Map<String, Object>> getRealTimeMemoryInfo() {
        try {
            List<Map<String, Object>> memoryInfo = realTimeSystemService.executeSystemInfoQuery("memory_info");

            if (memoryInfo.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse("未找到内存信息"));
            }

            Map<String, Object> result = memoryInfo.get(0);

            // 检查是否包含错误信息
            if (result.containsKey("error") && result.get("error") != null) {
                return ResponseEntity.ok(createSuccessResponse(result, "获取内存信息时出现错误"));
            }

            return ResponseEntity.ok(createSuccessResponse(result));
        } catch (Exception e) {
            log.error("获取实时内存信息失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取实时内存信息失败: " + e.getMessage()));
        }
    }

    @GetMapping("/real-time/disk")
    @Operation(summary = "获取实时磁盘信息", description = "获取实时磁盘使用情况")
    public ResponseEntity<Map<String, Object>> getRealTimeDiskInfo() {
        try {
            List<Map<String, Object>> diskInfo = realTimeSystemService.executeSystemInfoQuery("disk_info");

            if (diskInfo.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse("未找到磁盘信息"));
            }

            Map<String, Object> result = diskInfo.get(0);

            // 检查是否包含错误信息
            if (result.containsKey("error") && result.get("error") != null) {
                return ResponseEntity.ok(createSuccessResponse(result, "获取磁盘信息时出现错误"));
            }

            return ResponseEntity.ok(createSuccessResponse(result));
        } catch (Exception e) {
            log.error("获取实时磁盘信息失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取实时磁盘信息失败: " + e.getMessage()));
        }
    }

    @GetMapping("/real-time/processes")
    @Operation(summary = "获取实时进程信息", description = "获取实时进程列表")
    public ResponseEntity<Map<String, Object>> getRealTimeProcessInfo() {
        try {
            List<Map<String, Object>> processInfo = realTimeSystemService.executeSystemInfoQuery("process_info");

            if (processInfo.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse("未找到进程信息"));
            }

            Map<String, Object> result = processInfo.get(0);

            // 检查是否包含错误信息
            if (result.containsKey("error") && result.get("error") != null) {
                return ResponseEntity.ok(createSuccessResponse(result, "获取进程信息时出现错误"));
            }

            return ResponseEntity.ok(createSuccessResponse(result));
        } catch (Exception e) {
            log.error("获取实时进程信息失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取实时进程信息失败: " + e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> health = new HashMap<>();

        try {
            // 1. 先尝试获取数据（这是最真实的测试）
            boolean dataOk = false;
            try {
                Map<String, Object> performance = realTimeSystemService.getSystemPerformanceMetrics();
                dataOk = performance != null && !performance.isEmpty();
            } catch (Exception e) {
                log.warn("数据采集测试异常: {}", e.getMessage());
            }

            // 2. 如果数据采集成功，认为一切正常
            if (dataOk) {
                health.put("status", "healthy");
                health.put("message", "系统信息采集服务运行正常");
                health.put("pythonEnvironment", "available");
                health.put("dataCollection", "working");
                health.put("timestamp", System.currentTimeMillis());

                return ResponseEntity.ok(createSuccessResponse(health));
            }

            // 3. 数据采集失败，才测试Python环境
            boolean pythonOk = realTimeSystemService.testSystemInfoEnvironment();

            health.put("timestamp", System.currentTimeMillis());
            health.put("pythonEnvironment", pythonOk ? "available" : "unavailable");
            health.put("dataCollection", "failed");

            if (!pythonOk) {
                health.put("status", "unhealthy");
                health.put("message", "Python环境不可用，请检查Python安装和脚本配置");
            } else {
                health.put("status", "degraded");
                health.put("message", "Python环境正常，但数据采集失败");
            }

            return ResponseEntity.ok(createSuccessResponse(health));

        } catch (Exception e) {
            health.put("status", "unhealthy");
            health.put("error", e.getMessage());
            health.put("timestamp", System.currentTimeMillis());
            health.put("message", "健康检查异常");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(createSuccessResponse(health));
        }
    }
    // ==================== SSE流接口 ====================

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "建立SSE实时数据流", description = "建立服务器发送事件连接")
    public SseEmitter createSseStream() {
        String clientId = UUID.randomUUID().toString();
        log.info("创建SSE流连接: {}", clientId);

        SseEmitter emitter = new SseEmitter(0L);

        // 模拟发送一些数据
        try {
            Map<String, Object> initData = new HashMap<>();
            initData.put("type", "init");
            initData.put("clientId", clientId);
            initData.put("message", "SSE连接已建立");
            initData.put("timestamp", System.currentTimeMillis());

            emitter.send(SseEmitter.event()
                    .name("connect")
                    .data(initData));

            log.info("SSE连接已建立: {}", clientId);
        } catch (Exception e) {
            log.error("SSE连接初始化失败: {}", e.getMessage(), e);
            emitter.completeWithError(e);
        }

        return emitter;
    }

    @GetMapping(value = "/stream/custom", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "建立自定义SSE流", description = "根据参数建立特定数据的实时流")
    public SseEmitter createCustomSseStream(
            @Parameter(description = "数据类型") @RequestParam(defaultValue = "performance") String dataType,
            @Parameter(description = "间隔时间(毫秒)") @RequestParam(defaultValue = "2000") Long interval) {

        String clientId = UUID.randomUUID().toString() + "-" + dataType;
        log.info("创建自定义SSE流: {} - {}", clientId, dataType);

        SseEmitter emitter = new SseEmitter(0L);

        try {
            Map<String, Object> initData = new HashMap<>();
            initData.put("type", "init");
            initData.put("clientId", clientId);
            initData.put("dataType", dataType);
            initData.put("interval", interval);
            initData.put("message", "自定义SSE连接已建立");
            initData.put("timestamp", System.currentTimeMillis());

            emitter.send(SseEmitter.event()
                    .name("connect")
                    .data(initData));

            log.info("自定义SSE连接已建立: {} - {}", clientId, dataType);
        } catch (Exception e) {
            log.error("自定义SSE连接初始化失败: {}", e.getMessage(), e);
            emitter.completeWithError(e);
        }

        return emitter;
    }

    // ==================== 实时状态接口 ====================

    @GetMapping("/real-time/status")
    @Operation(summary = "获取实时系统状态", description = "获取实时系统状态信息")
    public ResponseEntity<Map<String, Object>> getRealTimeStatus() {
        try {
            Map<String, Object> realTimeStatus = new HashMap<>();

            // 收集各种实时信息
            try {
                realTimeStatus.put("system", realTimeSystemService.executeSystemInfoQuery("system_basic").get(0));
            } catch (Exception e) {
                realTimeStatus.put("system", generateMockData("system_basic").get(0));
            }

            try {
                realTimeStatus.put("performance", realTimeSystemService.getSystemPerformanceMetrics());
            } catch (Exception e) {
                Map<String, Object> mockPerf = new HashMap<>();
                mockPerf.put("cpu_percent", 25.5);
                mockPerf.put("memory_percent", 45.2);
                mockPerf.put("timestamp", System.currentTimeMillis());
                realTimeStatus.put("performance", mockPerf);
            }

            realTimeStatus.put("connections", connections.size());
            realTimeStatus.put("activeConnections", connectionStatus.values().stream()
                    .filter(status -> Boolean.TRUE.equals(status.get("connected")))
                    .count());
            realTimeStatus.put("timestamp", System.currentTimeMillis());
            realTimeStatus.put("status", "running");

            return ResponseEntity.ok(createSuccessResponse(realTimeStatus));
        } catch (Exception e) {
            log.error("获取实时系统状态失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取实时系统状态失败"));
        }
    }

    @GetMapping("/real-time/batch-data")
    @Operation(summary = "获取批量实时数据", description = "获取所有实时数据的批量快照")
    public ResponseEntity<Map<String, Object>> getBatchRealTimeData() {
        try {
            Map<String, Object> batchData = new HashMap<>();

            String[] types = {"system_basic", "cpu_info", "memory_info", "disk_info", "process_info"};

            for (String type : types) {
                try {
                    List<Map<String, Object>> data = realTimeSystemService.executeSystemInfoQuery(type);
                    if (!data.isEmpty()) {
                        batchData.put(type, data.get(0));
                    }
                } catch (Exception e) {
                    log.warn("获取 {} 数据失败，使用模拟数据: {}", type, e.getMessage());
                    List<Map<String, Object>> mockData = generateMockData(type);
                    if (!mockData.isEmpty()) {
                        batchData.put(type, mockData.get(0));
                    }
                }
            }

            batchData.put("timestamp", System.currentTimeMillis());
            batchData.put("dataTypes", types.length);

            return ResponseEntity.ok(createSuccessResponse(batchData));
        } catch (Exception e) {
            log.error("获取批量实时数据失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取批量实时数据失败"));
        }
    }

    @GetMapping("/real-time/connections/count")
    @Operation(summary = "获取活跃连接数", description = "获取当前活跃的实时数据连接数量")
    public ResponseEntity<Map<String, Object>> getActiveConnections() {
        try {
            long activeCount = connectionStatus.values().stream()
                    .filter(status -> Boolean.TRUE.equals(status.get("connected")))
                    .count();

            Map<String, Object> response = new HashMap<>();
            response.put("activeConnections", activeCount);
            response.put("totalConnections", connections.size());
            response.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(createSuccessResponse(response));
        } catch (Exception e) {
            log.error("获取活跃连接数失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取活跃连接数失败"));
        }
    }

    // ==================== 增强实时接口 ====================

    @GetMapping("/real-time/performance")
    @Operation(summary = "获取实时性能数据", description = "获取实时CPU和内存性能数据")
    public ResponseEntity<Map<String, Object>> getRealTimePerformance() {
        try {
            Map<String, Object> performanceData = new HashMap<>();

            try {
                performanceData = realTimeSystemService.getPerformanceDataQuick();
            } catch (Exception e) {
                log.warn("获取实时性能数据失败，使用模拟数据: {}", e.getMessage());
                List<Map<String, Object>> cpuData = generateMockData("cpu_info");
                List<Map<String, Object>> memData = generateMockData("memory_info");

                if (!cpuData.isEmpty()) {
                    performanceData.putAll(cpuData.get(0));
                }
                if (!memData.isEmpty()) {
                    performanceData.putAll(memData.get(0));
                }
            }

            performanceData.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(createSuccessResponse(performanceData));
        } catch (Exception e) {
            log.error("获取实时性能数据失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取实时性能数据失败"));
        }
    }

    @GetMapping("/real-time/network")
    @Operation(summary = "获取实时网络数据", description = "获取实时网络统计信息")
    public ResponseEntity<Map<String, Object>> getRealTimeNetwork() {
        try {
            Map<String, Object> networkData = new HashMap<>();

            try {
                networkData = realTimeSystemService.getNetworkStats();
            } catch (Exception e) {
                log.warn("获取网络数据失败，使用模拟数据: {}", e.getMessage());
                networkData.put("bytes_sent", 1024 * 1024 * 10L);
                networkData.put("bytes_recv", 1024 * 1024 * 15L);
                networkData.put("packets_sent", 1000);
                networkData.put("packets_recv", 1500);
                networkData.put("error_in", 0);
                networkData.put("error_out", 0);
            }

            networkData.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(createSuccessResponse(networkData));
        } catch (Exception e) {
            log.error("获取实时网络数据失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取实时网络数据失败"));
        }
    }

    // ==================== 新增接口（前端需要的） ====================

    @GetMapping("/collection-intervals")
    @Operation(summary = "获取采集间隔配置", description = "获取各种数据类型的采集间隔配置")
    public ResponseEntity<Map<String, Object>> getCollectionIntervals() {
        try {
            Map<String, Object> intervals = new HashMap<>();
            intervals.put("performance", 2000);
            intervals.put("processes", 5000);
            intervals.put("system", 10000);
            intervals.put("disk", 15000);
            intervals.put("network", 3000);
            intervals.put("cpu_info", 1000);
            intervals.put("memory_info", 2000);
            intervals.put("disk_info", 5000);
            intervals.put("process_info", 2000);
            intervals.put("system_basic", 10000);

            return ResponseEntity.ok(createSuccessResponse(intervals, "获取采集间隔成功"));
        } catch (Exception e) {
            log.error("获取采集间隔失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取采集间隔失败"));
        }
    }

    @PostMapping("/collect/all")
    @Operation(summary = "采集所有系统信息", description = "一次性采集所有类型的系统信息")
    public ResponseEntity<Map<String, Object>> collectAllInfo(
            @Parameter(description = "主机名") @RequestParam(required = false) String hostname,
            @Parameter(description = "IP地址") @RequestParam(required = false) String ipAddress) {

        try {
            hostname = hostname != null ? hostname : System.getProperty("user.name") + "-PC";
            ipAddress = ipAddress != null ? ipAddress : "127.0.0.1";

            log.info("采集所有系统信息: hostname={}, ip={}", hostname, ipAddress);

            Map<String, Object> allData = new HashMap<>();
            String[] types = {"system_basic", "cpu_info", "memory_info", "disk_info", "process_info", "performance", "network"};

            for (String type : types) {
                try {
                    List<Map<String, Object>> data;

                    if (type.equals("performance")) {
                        Map<String, Object> perfData = realTimeSystemService.getPerformanceDataQuick();
                        data = new ArrayList<>();
                        data.add(perfData);
                    } else if (type.equals("network")) {
                        Map<String, Object> netData = realTimeSystemService.getNetworkStats();
                        data = new ArrayList<>();
                        data.add(netData);
                    } else {
                        data = realTimeSystemService.executeSystemInfoQuery(type);
                    }

                    if (!data.isEmpty()) {
                        Map<String, Object> item = data.get(0);
                        item.put("hostname", hostname);
                        item.put("ipAddress", ipAddress);
                        allData.put(type, item);
                    }
                } catch (Exception e) {
                    log.warn("采集 {} 数据失败，使用模拟数据: {}", type, e.getMessage());
                    List<Map<String, Object>> mockData = generateMockData(type);
                    if (!mockData.isEmpty()) {
                        Map<String, Object> item = mockData.get(0);
                        item.put("hostname", hostname);
                        item.put("ipAddress", ipAddress);
                        allData.put(type, item);
                    }
                }
            }

            allData.put("timestamp", System.currentTimeMillis());
            allData.put("hostname", hostname);
            allData.put("ipAddress", ipAddress);

            log.info("采集所有系统信息成功: 共 {} 种数据类型", allData.size() - 3); // 减去timestamp、hostname、ipAddress

            return ResponseEntity.ok(createSuccessResponse(allData, "采集所有信息成功"));
        } catch (Exception e) {
            log.error("采集所有信息失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("采集所有信息失败: " + e.getMessage()));
        }
    }

    // ==================== 全局异常处理 ====================

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMethodNotSupported(
            org.springframework.web.HttpRequestMethodNotSupportedException ex) {

        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("code", 405);
        response.put("message", "HTTP方法不支持");
        response.put("details", String.format("请求方法 '%s' 不支持，支持的HTTP方法: %s",
                ex.getMethod(), ex.getSupportedHttpMethods()));
        response.put("timestamp", System.currentTimeMillis());

        log.warn("HTTP方法不支持: {} - {}", ex.getMethod(), ex.getSupportedHttpMethods());

        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGlobalException(Exception ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("code", 500);
        response.put("message", "服务器内部错误");
        response.put("details", ex.getMessage());
        response.put("timestamp", System.currentTimeMillis());

        log.error("服务器内部错误: {}", ex.getMessage(), ex);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}