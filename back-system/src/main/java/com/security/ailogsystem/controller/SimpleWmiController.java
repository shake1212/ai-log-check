package com.security.ailogsystem.controller;

import com.security.ailogsystem.model.SimpleWmiData;
import com.security.ailogsystem.service.SimpleWmiService;
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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 扩展的WMI控制器
 * 支持完整的前端WMI管理功能
 *
 * @author AI Log System
 * @version 2.0
 */
@Slf4j
@RestController
@RequestMapping("/wmi")
@Tag(name = "WMI管理", description = "完整的WMI连接、查询和数据采集管理接口")
public class SimpleWmiController {

    @Autowired
    private SimpleWmiService simpleWmiService;

    // 存储连接和查询的模拟数据（在生产环境中应该使用数据库）
    private final Map<String, Map<String, Object>> connections = new HashMap<>();
    private final Map<String, Map<String, Object>> queries = new HashMap<>();
    private final Map<String, List<Map<String, Object>>> queryResults = new HashMap<>();
    private final Map<String, Map<String, Object>> connectionStatus = new HashMap<>();

    public SimpleWmiController() {
        initializeDefaultData();
    }

    private void initializeDefaultData() {
        // 初始化默认连接
        Map<String, Object> defaultConnection = new HashMap<>();
        defaultConnection.put("id", "local-1");
        defaultConnection.put("name", "本地主机");
        defaultConnection.put("host", "localhost");
        defaultConnection.put("username", "administrator");
        defaultConnection.put("password", "password");
        defaultConnection.put("domain", "WORKGROUP");
        defaultConnection.put("port", 135);
        defaultConnection.put("timeout", 30000);
        connections.put("local-1", defaultConnection);

        // 初始化默认连接状态
        Map<String, Object> defaultStatus = new HashMap<>();
        defaultStatus.put("connected", true);
        defaultStatus.put("lastConnected", LocalDateTime.now());
        defaultStatus.put("responseTime", 150);
        connectionStatus.put("local-1", defaultStatus);

        // 初始化默认查询
        String[] defaultQueryIds = {"1", "2", "3", "4"};
        String[] names = {"系统进程监控", "服务状态检查", "事件日志监控", "系统信息查询"};
        String[] queryStrings = {
                "SELECT ProcessId, Name, WorkingSetSize, PageFileUsage FROM Win32_Process WHERE ProcessId > 0",
                "SELECT Name, State, Status, StartMode FROM Win32_Service",
                "SELECT EventCode, EventType, Message, SourceName, TimeGenerated FROM Win32_NTLogEvent WHERE EventType = 1 OR EventType = 2",
                "SELECT Name, Manufacturer, Model, TotalPhysicalMemory, NumberOfProcessors FROM Win32_ComputerSystem"
        };
        String[] descriptions = {
                "监控系统运行进程",
                "检查系统服务状态",
                "监控错误和警告事件日志",
                "获取计算机系统基本信息"
        };

        for (int i = 0; i < defaultQueryIds.length; i++) {
            Map<String, Object> query = new HashMap<>();
            query.put("id", defaultQueryIds[i]);
            query.put("name", names[i]);
            query.put("namespace", "root\\cimv2");
            query.put("query", queryStrings[i]);
            query.put("description", descriptions[i]);
            query.put("enabled", i != 3); // 最后一个查询默认禁用
            query.put("interval", i == 0 ? 30 : i == 1 ? 60 : i == 2 ? 300 : 3600);
            query.put("lastRun", i < 3 ? LocalDateTime.now().minusMinutes(5) : null);
            query.put("resultCount", i < 3 ? (i + 1) * 10 : 0);
            queries.put(defaultQueryIds[i], query);
        }
    }

    // ==================== 连接管理接口 ====================

    @PostMapping("/connections")
    @Operation(summary = "创建WMI连接", description = "创建新的WMI连接配置")
    public ResponseEntity<Map<String, Object>> createConnection(@RequestBody Map<String, Object> connectionData) {
        try {
            String connectionId = "conn-" + System.currentTimeMillis();

            Map<String, Object> connection = new HashMap<>();
            connection.put("id", connectionId);
            connection.put("name", connectionData.get("name"));
            connection.put("host", connectionData.get("host"));
            connection.put("username", connectionData.get("username"));
            connection.put("password", connectionData.get("password"));
            connection.put("domain", connectionData.get("domain"));
            connection.put("port", connectionData.get("port"));
            connection.put("timeout", connectionData.get("timeout"));

            connections.put(connectionId, connection);

            // 初始化连接状态
            Map<String, Object> status = new HashMap<>();
            status.put("connected", false);
            status.put("lastConnected", null);
            status.put("responseTime", null);
            status.put("errorMessage", null);
            connectionStatus.put(connectionId, status);

            log.info("创建WMI连接成功: {} -> {}", connectionData.get("name"), connectionData.get("host"));
            return ResponseEntity.status(HttpStatus.CREATED).body(connection);

        } catch (Exception e) {
            log.error("创建WMI连接失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/connections")
    @Operation(summary = "获取WMI连接列表", description = "获取所有WMI连接配置")
    public ResponseEntity<List<Map<String, Object>>> getConnections() {
        try {
            List<Map<String, Object>> connectionList = new ArrayList<>(connections.values());
            return ResponseEntity.ok(connectionList);
        } catch (Exception e) {
            log.error("获取连接列表失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/connections/{connectionId}")
    @Operation(summary = "删除WMI连接", description = "删除指定的WMI连接")
    public ResponseEntity<Void> deleteConnection(@PathVariable String connectionId) {
        try {
            if (connections.containsKey(connectionId)) {
                connections.remove(connectionId);
                connectionStatus.remove(connectionId);
                log.info("删除WMI连接成功: {}", connectionId);
                return ResponseEntity.noContent().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("删除WMI连接失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/connections/{connectionId}/test")
    @Operation(summary = "测试WMI连接", description = "测试指定WMI连接的状态")
    public ResponseEntity<Map<String, Object>> testConnection(@PathVariable String connectionId) {
        try {
            Map<String, Object> connection = connections.get(connectionId);
            if (connection == null) {
                return ResponseEntity.notFound().build();
            }

            // 使用真实WMI连接测试
            String host = (String) connection.get("host");
            String username = (String) connection.get("username");
            String password = (String) connection.get("password");
            String domain = (String) connection.get("domain");

            boolean connected = simpleWmiService.testWmiConnection(host, username, password, domain);

            Map<String, Object> status = new HashMap<>();
            status.put("connected", connected);
            status.put("lastConnected", LocalDateTime.now());

            if (connected) {
                status.put("responseTime", (int)(Math.random() * 100 + 50)); // 模拟响应时间
                status.put("errorMessage", null);
                log.info("WMI连接测试成功: {}", connectionId);
            } else {
                status.put("responseTime", null);
                status.put("errorMessage", "连接测试失败，请检查凭据和网络连接");
                log.warn("WMI连接测试失败: {}", connectionId);
            }

            connectionStatus.put(connectionId, status);

            return ResponseEntity.ok(status);

        } catch (Exception e) {
            log.error("测试WMI连接失败: {}", e.getMessage(), e);
            Map<String, Object> errorStatus = new HashMap<>();
            errorStatus.put("connected", false);
            errorStatus.put("errorMessage", "连接测试异常: " + e.getMessage());
            return ResponseEntity.ok(errorStatus);
        }
    }

    // ==================== 查询管理接口 ====================

    @PostMapping("/queries")
    @Operation(summary = "创建WMI查询", description = "创建新的WMI查询配置")
    public ResponseEntity<Map<String, Object>> createQuery(@RequestBody Map<String, Object> queryData) {
        try {
            String queryId = "query-" + System.currentTimeMillis();

            Map<String, Object> query = new HashMap<>();
            query.put("id", queryId);
            query.put("name", queryData.get("name"));
            query.put("namespace", queryData.get("namespace"));
            query.put("query", queryData.get("query"));
            query.put("description", queryData.get("description"));
            query.put("enabled", true);
            query.put("interval", queryData.get("interval"));
            query.put("lastRun", null);
            query.put("resultCount", 0);

            queries.put(queryId, query);
            queryResults.put(queryId, new ArrayList<>());

            log.info("创建WMI查询成功: {}", queryData.get("name"));
            return ResponseEntity.status(HttpStatus.CREATED).body(query);

        } catch (Exception e) {
            log.error("创建WMI查询失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/queries")
    @Operation(summary = "获取WMI查询列表", description = "获取所有WMI查询配置")
    public ResponseEntity<List<Map<String, Object>>> getQueries() {
        try {
            List<Map<String, Object>> queryList = new ArrayList<>(queries.values());
            return ResponseEntity.ok(queryList);
        } catch (Exception e) {
            log.error("获取查询列表失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/queries/{queryId}")
    @Operation(summary = "更新WMI查询", description = "更新指定的WMI查询配置")
    public ResponseEntity<Map<String, Object>> updateQuery(
            @PathVariable String queryId,
            @RequestBody Map<String, Object> updates) {
        try {
            Map<String, Object> query = queries.get(queryId);
            if (query == null) {
                return ResponseEntity.notFound().build();
            }

            // 更新查询属性
            query.putAll(updates);
            queries.put(queryId, query);

            log.info("更新WMI查询成功: {}", queryId);
            return ResponseEntity.ok(query);

        } catch (Exception e) {
            log.error("更新WMI查询失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/queries/{queryId}")
    @Operation(summary = "删除WMI查询", description = "删除指定的WMI查询")
    public ResponseEntity<Void> deleteQuery(@PathVariable String queryId) {
        try {
            if (queries.containsKey(queryId)) {
                queries.remove(queryId);
                queryResults.remove(queryId);
                log.info("删除WMI查询成功: {}", queryId);
                return ResponseEntity.noContent().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("删除WMI查询失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/queries/{queryId}/execute")
    @Operation(summary = "执行WMI查询", description = "在指定连接上执行WMI查询")
    public ResponseEntity<Map<String, Object>> executeQuery(
            @PathVariable String queryId,
            @RequestBody Map<String, Object> executionRequest) {
        try {
            Map<String, Object> query = queries.get(queryId);
            String connectionId = (String) executionRequest.get("connectionId");
            Map<String, Object> connection = connections.get(connectionId);

            if (query == null || connection == null) {
                return ResponseEntity.notFound().build();
            }

            // 获取连接参数
            String host = (String) connection.get("host");
            String username = (String) connection.get("username");
            String password = (String) connection.get("password");
            String domain = (String) connection.get("domain");
            String namespace = (String) query.get("namespace");
            String queryString = (String) query.get("query");

            // 执行真实WMI查询
            List<Map<String, Object>> data = simpleWmiService.executeRealWmiQuery(
                    host, username, password, domain, namespace, queryString
            );

            // 创建查询结果
            Map<String, Object> result = new HashMap<>();
            result.put("id", System.currentTimeMillis());
            result.put("queryId", queryId);
            result.put("timestamp", LocalDateTime.now());
            result.put("data", data);
            result.put("recordCount", data.size());
            result.put("executionTime", (int)(Math.random() * 500 + 100)); // 模拟执行时间
            result.put("error", null);

            // 保存查询结果
            queryResults.computeIfAbsent(queryId, k -> new ArrayList<>()).add(result);

            // 更新查询状态
            query.put("lastRun", LocalDateTime.now());
            query.put("resultCount", data.size());

            log.info("执行WMI查询成功: {} -> {} 条记录", query.get("name"), data.size());
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("执行WMI查询失败: {}", e.getMessage(), e);

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

            return ResponseEntity.ok(errorResult);
        }
    }

    // ==================== 查询结果接口 ====================

    @GetMapping("/query-results")
    @Operation(summary = "获取查询结果", description = "获取WMI查询执行结果")
    public ResponseEntity<List<Map<String, Object>>> getQueryResults(
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

            return ResponseEntity.ok(allResults);

        } catch (Exception e) {
            log.error("获取查询结果失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==================== 统计信息接口 ====================

    @GetMapping("/statistics")
    @Operation(summary = "获取WMI统计信息", description = "获取WMI系统统计信息")
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
                    .mapToLong(result -> (Integer) result.get("recordCount"))
                    .sum();

            // 系统状态
            String systemStatus = "normal";
            if (activeConnections == 0) {
                systemStatus = "error";
            } else if (activeQueries == 0) {
                systemStatus = "warning";
            }

            statistics.put("totalConnections", totalConnections);
            statistics.put("totalDataSources", totalQueries); // 使用查询数量作为数据源数量
            statistics.put("activeQueries", activeQueries);
            statistics.put("totalDataPoints", totalDataPoints);
            statistics.put("systemStatus", systemStatus);
            statistics.put("lastUpdate", LocalDateTime.now());

            return ResponseEntity.ok(statistics);

        } catch (Exception e) {
            log.error("获取统计信息失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/performance-metrics")
    @Operation(summary = "获取性能指标", description = "获取WMI系统性能指标")
    public ResponseEntity<Map<String, Object>> getPerformanceMetrics() {
        try {
            // 如果有连接，使用第一个连接获取真实性能指标
            if (!connections.isEmpty()) {
                String firstConnectionId = connections.keySet().iterator().next();
                Map<String, Object> connection = connections.get(firstConnectionId);

                String host = (String) connection.get("host");
                String username = (String) connection.get("username");
                String password = (String) connection.get("password");
                String domain = (String) connection.get("domain");

                Map<String, Object> realMetrics = simpleWmiService.getSystemPerformanceMetrics(
                        host, username, password, domain
                );
                return ResponseEntity.ok(realMetrics);
            }

            // 如果没有连接，返回模拟数据
            Map<String, Object> metrics = new HashMap<>();
            metrics.put("collectionRate", 45.6);
            metrics.put("processingRate", 78.2);
            metrics.put("cpuUsage", 25.5);
            metrics.put("memoryUsage", 345);
            metrics.put("activeConnections", connections.size());
            metrics.put("totalDataPoints", queryResults.values().stream()
                    .flatMap(List::stream)
                    .mapToLong(result -> (Integer) result.get("recordCount"))
                    .sum());

            return ResponseEntity.ok(metrics);

        } catch (Exception e) {
            log.error("获取性能指标失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==================== WMI类管理接口 ====================

    @GetMapping("/wmi-classes")
    @Operation(summary = "获取可用WMI类", description = "获取指定主机上可用的WMI类列表")
    public ResponseEntity<List<String>> getAvailableWmiClasses(
            @Parameter(description = "连接ID") @RequestParam String connectionId) {
        try {
            Map<String, Object> connection = connections.get(connectionId);
            if (connection == null) {
                return ResponseEntity.notFound().build();
            }

            String host = (String) connection.get("host");
            String username = (String) connection.get("username");
            String password = (String) connection.get("password");
            String domain = (String) connection.get("domain");

            List<String> wmiClasses = simpleWmiService.getAvailableWmiClasses(host, username, password, domain);
            return ResponseEntity.ok(wmiClasses);

        } catch (Exception e) {
            log.error("获取WMI类列表失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/wmi-classes/{wmiClass}/properties")
    @Operation(summary = "获取WMI类属性", description = "获取指定WMI类的属性列表")
    public ResponseEntity<List<String>> getWmiClassProperties(
            @Parameter(description = "连接ID") @RequestParam String connectionId,
            @Parameter(description = "WMI类名") @PathVariable String wmiClass) {
        try {
            Map<String, Object> connection = connections.get(connectionId);
            if (connection == null) {
                return ResponseEntity.notFound().build();
            }

            String host = (String) connection.get("host");
            String username = (String) connection.get("username");
            String password = (String) connection.get("password");
            String domain = (String) connection.get("domain");

            List<String> properties = simpleWmiService.getWmiClassProperties(host, username, password, domain, wmiClass);
            return ResponseEntity.ok(properties);

        } catch (Exception e) {
            log.error("获取WMI类属性失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==================== 原有接口保持不变 ====================

    @PostMapping("/collect")
    @Operation(summary = "采集WMI数据", description = "采集指定主机的WMI数据")
    public ResponseEntity<SimpleWmiData> collectWmiData(
            @Parameter(description = "主机名") @RequestParam String hostname,
            @Parameter(description = "IP地址") @RequestParam String ipAddress,
            @Parameter(description = "数据类型") @RequestParam SimpleWmiData.DataType dataType) {

        try {
            SimpleWmiData wmiData = simpleWmiService.collectWmiData(hostname, ipAddress, dataType);
            return ResponseEntity.ok(wmiData);
        } catch (Exception e) {
            log.error("采集WMI数据失败: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/batch-collect")
    @Operation(summary = "批量采集WMI数据", description = "批量采集指定主机的多种WMI数据")
    public ResponseEntity<List<SimpleWmiData>> batchCollectWmiData(
            @Parameter(description = "主机名") @RequestParam String hostname,
            @Parameter(description = "IP地址") @RequestParam String ipAddress) {

        try {
            List<SimpleWmiData> wmiDataList = simpleWmiService.batchCollectWmiData(hostname, ipAddress);
            return ResponseEntity.ok(wmiDataList);
        } catch (Exception e) {
            log.error("批量采集WMI数据失败: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/data/{id}")
    @Operation(summary = "获取WMI数据", description = "根据ID获取WMI数据")
    public ResponseEntity<SimpleWmiData> getWmiDataById(@PathVariable Long id) {
        SimpleWmiData wmiData = simpleWmiService.getWmiDataById(id);
        if (wmiData != null) {
            return ResponseEntity.ok(wmiData);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/data/hostname/{hostname}")
    @Operation(summary = "根据主机名查询", description = "根据主机名查询WMI数据")
    public ResponseEntity<List<SimpleWmiData>> getWmiDataByHostname(@PathVariable String hostname) {
        List<SimpleWmiData> wmiDataList = simpleWmiService.getWmiDataByHostname(hostname);
        return ResponseEntity.ok(wmiDataList);
    }

    @GetMapping("/data/ip/{ipAddress}")
    @Operation(summary = "根据IP地址查询", description = "根据IP地址查询WMI数据")
    public ResponseEntity<List<SimpleWmiData>> getWmiDataByIpAddress(@PathVariable String ipAddress) {
        List<SimpleWmiData> wmiDataList = simpleWmiService.getWmiDataByIpAddress(ipAddress);
        return ResponseEntity.ok(wmiDataList);
    }

    @GetMapping("/data/type/{dataType}")
    @Operation(summary = "根据数据类型查询", description = "根据数据类型查询WMI数据")
    public ResponseEntity<List<SimpleWmiData>> getWmiDataByType(@PathVariable SimpleWmiData.DataType dataType) {
        List<SimpleWmiData> wmiDataList = simpleWmiService.getWmiDataByType(dataType);
        return ResponseEntity.ok(wmiDataList);
    }

    @GetMapping("/data/time-range")
    @Operation(summary = "根据时间范围查询", description = "根据时间范围查询WMI数据")
    public ResponseEntity<List<SimpleWmiData>> getWmiDataByTimeRange(
            @Parameter(description = "开始时间") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {

        List<SimpleWmiData> wmiDataList = simpleWmiService.getWmiDataByTimeRange(startTime, endTime);
        return ResponseEntity.ok(wmiDataList);
    }

    @GetMapping("/data/page")
    @Operation(summary = "分页查询WMI数据", description = "分页查询WMI数据")
    public ResponseEntity<Page<SimpleWmiData>> getWmiDataPage(
            @Parameter(description = "主机名（可选）") @RequestParam(required = false) String hostname,
            @Parameter(description = "页码") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "每页大小") @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<SimpleWmiData> wmiDataPage = simpleWmiService.getWmiDataPage(hostname, pageable);
        return ResponseEntity.ok(wmiDataPage);
    }

    @GetMapping("/data/latest")
    @Operation(summary = "获取最新数据", description = "获取指定主机和数据类型的最新数据")
    public ResponseEntity<List<SimpleWmiData>> getLatestWmiData(
            @Parameter(description = "主机名") @RequestParam String hostname,
            @Parameter(description = "数据类型") @RequestParam SimpleWmiData.DataType dataType,
            @Parameter(description = "限制数量") @RequestParam(defaultValue = "10") int limit) {

        List<SimpleWmiData> wmiDataList = simpleWmiService.getLatestWmiData(hostname, dataType, limit);
        return ResponseEntity.ok(wmiDataList);
    }

    @GetMapping("/statistics/host/{hostname}")
    @Operation(summary = "获取主机统计信息", description = "获取指定主机的统计信息")
    public ResponseEntity<Map<String, Object>> getHostStatistics(@PathVariable String hostname) {
        Map<String, Object> statistics = simpleWmiService.getHostStatistics(hostname);
        return ResponseEntity.ok(statistics);
    }

    @DeleteMapping("/data/expired")
    @Operation(summary = "删除过期数据", description = "删除指定天数前的过期数据")
    public ResponseEntity<Map<String, String>> deleteExpiredData(
            @Parameter(description = "保留天数") @RequestParam(defaultValue = "30") int days) {

        try {
            simpleWmiService.deleteExpiredData(days);
            Map<String, String> response = Map.of(
                    "status", "success",
                    "message", "删除过期数据成功，保留" + days + "天内的数据"
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("删除过期数据失败: {}", e.getMessage(), e);
            Map<String, String> response = Map.of(
                    "status", "error",
                    "message", "删除过期数据失败: " + e.getMessage()
            );
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/data-types")
    @Operation(summary = "获取支持的数据类型", description = "获取所有支持的WMI数据类型")
    public ResponseEntity<Map<String, String>> getDataTypes() {
        Map<String, String> dataTypes = new HashMap<>();
        for (SimpleWmiData.DataType type : SimpleWmiData.DataType.values()) {
            dataTypes.put(type.name(), type.getDescription());
        }
        return ResponseEntity.ok(dataTypes);
    }

    @GetMapping("/status-types")
    @Operation(summary = "获取支持的状态类型", description = "获取所有支持的WMI数据状态类型")
    public ResponseEntity<Map<String, String>> getStatusTypes() {
        Map<String, String> statusTypes = new HashMap<>();
        for (SimpleWmiData.Status status : SimpleWmiData.Status.values()) {
            statusTypes.put(status.name(), status.getDescription());
        }
        return ResponseEntity.ok(statusTypes);
    }
}