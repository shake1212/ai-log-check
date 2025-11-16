package com.security.ailogsystem.controller;

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
        defaultConnection.put("type", "local"); // local, remote_ssh, remote_agent
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
        String[] defaultQueryIds = {"1", "2", "3", "4"};
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
            query.put("enabled", i != 3); // 最后一个查询默认禁用
            query.put("interval", i == 0 ? 30 : i == 1 ? 60 : i == 2 ? 300 : 3600);
            query.put("lastRun", i < 3 ? LocalDateTime.now().minusMinutes(5) : null);
            query.put("resultCount", i < 3 ? (i + 1) * 10 : 0);
            queries.put(defaultQueryIds[i], query);
        }
    }

    // ==================== 连接管理接口 ====================

    @PostMapping("/connections")
    @Operation(summary = "创建系统信息采集连接", description = "创建新的系统信息采集连接配置")
    public ResponseEntity<Map<String, Object>> createConnection(@RequestBody Map<String, Object> connectionData) {
        try {
            String connectionId = "conn-" + System.currentTimeMillis();

            Map<String, Object> connection = new HashMap<>();
            connection.put("id", connectionId);
            connection.put("name", connectionData.get("name"));
            connection.put("host", connectionData.get("host"));
            connection.put("type", connectionData.get("type"));
            connection.put("platform", connectionData.get("platform"));
            connection.put("description", connectionData.get("description"));
            connection.put("createdTime", LocalDateTime.now());

            connections.put(connectionId, connection);

            // 初始化连接状态
            Map<String, Object> status = new HashMap<>();
            status.put("connected", false);
            status.put("lastConnected", null);
            status.put("responseTime", null);
            status.put("errorMessage", null);
            connectionStatus.put(connectionId, status);

            log.info("创建系统信息采集连接成功: {} -> {}", connectionData.get("name"), connectionData.get("host"));
            return ResponseEntity.status(HttpStatus.CREATED).body(connection);

        } catch (Exception e) {
            log.error("创建系统信息采集连接失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/connections")
    @Operation(summary = "获取系统信息采集连接列表", description = "获取所有系统信息采集连接配置")
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
    @Operation(summary = "删除系统信息采集连接", description = "删除指定的系统信息采集连接")
    public ResponseEntity<Void> deleteConnection(@PathVariable String connectionId) {
        try {
            if (connections.containsKey(connectionId)) {
                connections.remove(connectionId);
                connectionStatus.remove(connectionId);
                log.info("删除系统信息采集连接成功: {}", connectionId);
                return ResponseEntity.noContent().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("删除系统信息采集连接失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/connections/{connectionId}/test")
    @Operation(summary = "测试系统信息采集环境", description = "测试系统信息采集环境是否可用")
    public ResponseEntity<Map<String, Object>> testConnection(@PathVariable String connectionId) {
        try {
            Map<String, Object> connection = connections.get(connectionId);
            if (connection == null) {
                return ResponseEntity.notFound().build();
            }

            // 测试系统信息采集环境
            boolean environmentOk = realTimeSystemService.testSystemInfoEnvironment();

            Map<String, Object> status = new HashMap<>();
            status.put("connected", environmentOk);
            status.put("lastConnected", LocalDateTime.now());

            if (environmentOk) {
                status.put("responseTime", (int)(Math.random() * 100 + 50)); // 模拟响应时间
                status.put("errorMessage", null);
                log.info("系统信息采集环境测试成功: {}", connectionId);
            } else {
                status.put("responseTime", null);
                status.put("errorMessage", "系统信息采集环境不可用，请检查Python环境");
                log.warn("系统信息采集环境测试失败: {}", connectionId);
            }

            connectionStatus.put(connectionId, status);

            return ResponseEntity.ok(status);

        } catch (Exception e) {
            log.error("测试系统信息采集环境失败: {}", e.getMessage(), e);
            Map<String, Object> errorStatus = new HashMap<>();
            errorStatus.put("connected", false);
            errorStatus.put("errorMessage", "环境测试异常: " + e.getMessage());
            return ResponseEntity.ok(errorStatus);
        }
    }

    // ==================== 查询管理接口 ====================

    @PostMapping("/queries")
    @Operation(summary = "创建系统信息查询", description = "创建新的系统信息查询配置")
    public ResponseEntity<Map<String, Object>> createQuery(@RequestBody Map<String, Object> queryData) {
        try {
            String queryId = "query-" + System.currentTimeMillis();

            Map<String, Object> query = new HashMap<>();
            query.put("id", queryId);
            query.put("name", queryData.get("name"));
            query.put("infoType", queryData.get("infoType"));
            query.put("description", queryData.get("description"));
            query.put("enabled", true);
            query.put("interval", queryData.get("interval"));
            query.put("lastRun", null);
            query.put("resultCount", 0);

            queries.put(queryId, query);
            queryResults.put(queryId, new ArrayList<>());

            log.info("创建系统信息查询成功: {}", queryData.get("name"));
            return ResponseEntity.status(HttpStatus.CREATED).body(query);

        } catch (Exception e) {
            log.error("创建系统信息查询失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/queries")
    @Operation(summary = "获取系统信息查询列表", description = "获取所有系统信息查询配置")
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
    @Operation(summary = "更新系统信息查询", description = "更新指定的系统信息查询配置")
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

            log.info("更新系统信息查询成功: {}", queryId);
            return ResponseEntity.ok(query);

        } catch (Exception e) {
            log.error("更新系统信息查询失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/queries/{queryId}")
    @Operation(summary = "删除系统信息查询", description = "删除指定的系统信息查询")
    public ResponseEntity<Void> deleteQuery(@PathVariable String queryId) {
        try {
            if (queries.containsKey(queryId)) {
                queries.remove(queryId);
                queryResults.remove(queryId);
                log.info("删除系统信息查询成功: {}", queryId);
                return ResponseEntity.noContent().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("删除系统信息查询失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/queries/{queryId}/execute")
    @Operation(summary = "执行系统信息查询", description = "执行系统信息查询")
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

            // 获取查询参数
            String infoType = (String) query.get("infoType");

            // 执行系统信息查询
            List<Map<String, Object>> data = realTimeSystemService.executeSystemInfoQuery(infoType);

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

            log.info("执行系统信息查询成功: {} -> {} 条记录", query.get("name"), data.size());
            return ResponseEntity.ok(result);

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

            return ResponseEntity.ok(errorResult);
        }
    }

    // ==================== 查询结果接口 ====================

    @GetMapping("/query-results")
    @Operation(summary = "获取查询结果", description = "获取系统信息查询执行结果")
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
    @Operation(summary = "获取性能指标", description = "获取系统性能指标")
    public ResponseEntity<Map<String, Object>> getPerformanceMetrics() {
        try {
            // 获取真实性能指标
            Map<String, Object> realMetrics = realTimeSystemService.getSystemPerformanceMetrics();
            return ResponseEntity.ok(realMetrics);

        } catch (Exception e) {
            log.error("获取性能指标失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==================== 信息类型管理接口 ====================

    @GetMapping("/info-types")
    @Operation(summary = "获取支持的信息类型", description = "获取系统支持的信息类型列表")
    public ResponseEntity<List<String>> getAvailableInfoTypes() {
        try {
            List<String> infoTypes = realTimeSystemService.getAvailableInfoTypes();
            return ResponseEntity.ok(infoTypes);

        } catch (Exception e) {
            log.error("获取信息类型列表失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/info-types/{infoType}/properties")
    @Operation(summary = "获取信息类型属性", description = "获取指定信息类型的属性列表")
    public ResponseEntity<List<String>> getInfoTypeProperties(
            @Parameter(description = "信息类型") @PathVariable String infoType) {
        try {
            List<String> properties = realTimeSystemService.getInfoTypeProperties(infoType);
            return ResponseEntity.ok(properties);

        } catch (Exception e) {
            log.error("获取信息类型属性失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==================== 数据采集接口 ====================

    @PostMapping("/collect")
    @Operation(summary = "采集系统信息数据", description = "采集指定主机的系统信息数据")
    public ResponseEntity<SimpleWmiData> collectSystemInfoData(
            @Parameter(description = "主机名") @RequestParam String hostname,
            @Parameter(description = "IP地址") @RequestParam String ipAddress,
            @Parameter(description = "数据类型") @RequestParam SimpleWmiData.DataType dataType) {

        try {
            SimpleWmiData wmiData = realTimeSystemService.collectWmiData(hostname, ipAddress, dataType);
            return ResponseEntity.ok(wmiData);
        } catch (Exception e) {
            log.error("采集系统信息数据失败: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/batch-collect")
    @Operation(summary = "批量采集系统信息数据", description = "批量采集指定主机的多种系统信息数据")
    public ResponseEntity<List<SimpleWmiData>> batchCollectSystemInfoData(
            @Parameter(description = "主机名") @RequestParam String hostname,
            @Parameter(description = "IP地址") @RequestParam String ipAddress) {

        try {
            List<SimpleWmiData> wmiDataList = realTimeSystemService.batchCollectWmiData(hostname, ipAddress);
            return ResponseEntity.ok(wmiDataList);
        } catch (Exception e) {
            log.error("批量采集系统信息数据失败: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/data/{id}")
    @Operation(summary = "获取系统信息数据", description = "根据ID获取系统信息数据")
    public ResponseEntity<SimpleWmiData> getSystemInfoDataById(@PathVariable Long id) {
        SimpleWmiData wmiData = realTimeSystemService.getWmiDataById(id);
        if (wmiData != null) {
            return ResponseEntity.ok(wmiData);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/data/hostname/{hostname}")
    @Operation(summary = "根据主机名查询", description = "根据主机名查询系统信息数据")
    public ResponseEntity<List<SimpleWmiData>> getSystemInfoDataByHostname(@PathVariable String hostname) {
        List<SimpleWmiData> wmiDataList = realTimeSystemService.getWmiDataByHostname(hostname);
        return ResponseEntity.ok(wmiDataList);
    }

    @GetMapping("/data/ip/{ipAddress}")
    @Operation(summary = "根据IP地址查询", description = "根据IP地址查询系统信息数据")
    public ResponseEntity<List<SimpleWmiData>> getSystemInfoDataByIpAddress(@PathVariable String ipAddress) {
        List<SimpleWmiData> wmiDataList = realTimeSystemService.getWmiDataByIpAddress(ipAddress);
        return ResponseEntity.ok(wmiDataList);
    }

    @GetMapping("/data/type/{dataType}")
    @Operation(summary = "根据数据类型查询", description = "根据数据类型查询系统信息数据")
    public ResponseEntity<List<SimpleWmiData>> getSystemInfoDataByType(@PathVariable SimpleWmiData.DataType dataType) {
        List<SimpleWmiData> wmiDataList = realTimeSystemService.getWmiDataByType(dataType);
        return ResponseEntity.ok(wmiDataList);
    }

    @GetMapping("/data/time-range")
    @Operation(summary = "根据时间范围查询", description = "根据时间范围查询系统信息数据")
    public ResponseEntity<List<SimpleWmiData>> getSystemInfoDataByTimeRange(
            @Parameter(description = "开始时间") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {

        List<SimpleWmiData> wmiDataList = realTimeSystemService.getWmiDataByTimeRange(startTime, endTime);
        return ResponseEntity.ok(wmiDataList);
    }

    @GetMapping("/data/page")
    @Operation(summary = "分页查询系统信息数据", description = "分页查询系统信息数据")
    public ResponseEntity<Page<SimpleWmiData>> getSystemInfoDataPage(
            @Parameter(description = "主机名（可选）") @RequestParam(required = false) String hostname,
            @Parameter(description = "页码") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "每页大小") @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<SimpleWmiData> wmiDataPage =realTimeSystemService.getWmiDataPage(hostname, pageable);
        return ResponseEntity.ok(wmiDataPage);
    }

    @GetMapping("/data/latest")
    @Operation(summary = "获取最新数据", description = "获取指定主机和数据类型的最新数据")
    public ResponseEntity<List<SimpleWmiData>> getLatestSystemInfoData(
            @Parameter(description = "主机名") @RequestParam String hostname,
            @Parameter(description = "数据类型") @RequestParam SimpleWmiData.DataType dataType,
            @Parameter(description = "限制数量") @RequestParam(defaultValue = "10") int limit) {

        List<SimpleWmiData> wmiDataList = realTimeSystemService.getLatestWmiData(hostname, dataType, limit);
        return ResponseEntity.ok(wmiDataList);
    }

    @GetMapping("/statistics/host/{hostname}")
    @Operation(summary = "获取主机统计信息", description = "获取指定主机的统计信息")
    public ResponseEntity<Map<String, Object>> getHostStatistics(@PathVariable String hostname) {
        Map<String, Object> statistics = realTimeSystemService.getHostStatistics(hostname);
        return ResponseEntity.ok(statistics);
    }

    @DeleteMapping("/data/expired")
    @Operation(summary = "删除过期数据", description = "删除指定天数前的过期数据")
    public ResponseEntity<Map<String, String>> deleteExpiredData(
            @Parameter(description = "保留天数") @RequestParam(defaultValue = "30") int days) {

        try {
            realTimeSystemService.deleteExpiredData(days);
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
    @Operation(summary = "获取支持的数据类型", description = "获取所有支持的系统信息数据类型")
    public ResponseEntity<Map<String, String>> getDataTypes() {
        Map<String, String> dataTypes = new HashMap<>();
        for (SimpleWmiData.DataType type : SimpleWmiData.DataType.values()) {
            dataTypes.put(type.name(), type.getDescription());
        }
        return ResponseEntity.ok(dataTypes);
    }

    @GetMapping("/status-types")
    @Operation(summary = "获取支持的状态类型", description = "获取所有支持的系统信息数据状态类型")
    public ResponseEntity<Map<String, String>> getStatusTypes() {
        Map<String, String> statusTypes = new HashMap<>();
        for (SimpleWmiData.Status status : SimpleWmiData.Status.values()) {
            statusTypes.put(status.name(), status.getDescription());
        }
        return ResponseEntity.ok(statusTypes);
    }

    // ==================== 系统信息实时查询接口 ====================

    @GetMapping("/real-time/system")
    @Operation(summary = "获取实时系统信息", description = "获取实时系统基本信息")
    public ResponseEntity<Map<String, Object>> getRealTimeSystemInfo() {
        try {
            List<Map<String, Object>> systemInfo = realTimeSystemService.executeSystemInfoQuery("system_basic");
            return ResponseEntity.ok(systemInfo.get(0)); // 返回第一个结果
        } catch (Exception e) {
            log.error("获取实时系统信息失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/real-time/cpu")
    @Operation(summary = "获取实时CPU信息", description = "获取实时CPU使用率和状态")
    public ResponseEntity<Map<String, Object>> getRealTimeCpuInfo() {
        try {
            List<Map<String, Object>> cpuInfo = realTimeSystemService.executeSystemInfoQuery("cpu_info");
            return ResponseEntity.ok(cpuInfo.get(0));
        } catch (Exception e) {
            log.error("获取实时CPU信息失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/real-time/memory")
    @Operation(summary = "获取实时内存信息", description = "获取实时内存使用情况")
    public ResponseEntity<Map<String, Object>> getRealTimeMemoryInfo() {
        try {
            List<Map<String, Object>> memoryInfo =realTimeSystemService.executeSystemInfoQuery("memory_info");
            return ResponseEntity.ok(memoryInfo.get(0));
        } catch (Exception e) {
            log.error("获取实时内存信息失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/real-time/disk")
    @Operation(summary = "获取实时磁盘信息", description = "获取实时磁盘使用情况")
    public ResponseEntity<Map<String, Object>> getRealTimeDiskInfo() {
        try {
            List<Map<String, Object>> diskInfo = realTimeSystemService.executeSystemInfoQuery("disk_info");
            return ResponseEntity.ok(diskInfo.get(0));
        } catch (Exception e) {
            log.error("获取实时磁盘信息失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/real-time/processes")
    @Operation(summary = "获取实时进程信息", description = "获取实时进程列表")
    public ResponseEntity<Map<String, Object>> getRealTimeProcessInfo() {
        try {
            List<Map<String, Object>> processInfo = realTimeSystemService.executeSystemInfoQuery("process_info");
            return ResponseEntity.ok(processInfo.get(0));
        } catch (Exception e) {
            log.error("获取实时进程信息失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/health")
    @Operation(summary = "系统健康检查", description = "检查系统信息采集服务的健康状态")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> health = new HashMap<>();

        try {
            // 测试Python环境
            boolean pythonOk = realTimeSystemService.testSystemInfoEnvironment();

            // 测试数据采集
            Map<String, Object> metrics = realTimeSystemService.getSystemPerformanceMetrics();

            health.put("status", pythonOk ? "healthy" : "unhealthy");
            health.put("pythonEnvironment", pythonOk ? "available" : "unavailable");
            health.put("dataCollection", metrics != null ? "working" : "failed");
            health.put("timestamp", LocalDateTime.now());
            health.put("version", "2.0");

            if (pythonOk && metrics != null) {
                return ResponseEntity.ok(health);
            } else {
                health.put("message", "系统信息采集服务部分功能异常");
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(health);
            }

        } catch (Exception e) {
            log.error("健康检查失败: {}", e.getMessage(), e);
            health.put("status", "unhealthy");
            health.put("error", e.getMessage());
            health.put("timestamp", LocalDateTime.now());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(health);
        }
    }


    @GetMapping(value = "/real-time/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "建立实时数据流", description = "建立服务器发送事件(SSE)连接，实时接收系统数据")
    public SseEmitter createRealTimeStream() {
        String clientId = UUID.randomUUID().toString();
        log.info("创建实时数据流连接: {}", clientId);
        return realTimeSystemService.createConnection(clientId);
    }

    @GetMapping("/real-time/stream/custom")
    @Operation(summary = "建立自定义实时数据流", description = "根据参数建立特定数据的实时流")
    public SseEmitter createCustomRealTimeStream(
            @Parameter(description = "数据类型") @RequestParam(defaultValue = "performance") String dataType,
            @Parameter(description = "间隔时间(毫秒)") @RequestParam(defaultValue = "2000") Long interval) {

        String clientId = UUID.randomUUID().toString() + "-" + dataType;
        log.info("创建自定义实时数据流: {} - {}", clientId, dataType);
        return realTimeSystemService.createConnection(clientId);
    }

    @GetMapping("/real-time/status")
    @Operation(summary = "获取实时系统状态", description = "获取实时系统状态信息")
    public ResponseEntity<Map<String, Object>> getRealTimeStatus() {
        try {
            // 使用增强的SystemInfoService
            Map<String, Object> realTimeStatus = realTimeSystemService.getRealTimeStatus();
            return ResponseEntity.ok(realTimeStatus);
        } catch (Exception e) {
            log.error("获取实时系统状态失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/real-time/batch-data")
    @Operation(summary = "获取批量实时数据", description = "获取所有实时数据的批量快照")
    public ResponseEntity<Map<String, Object>> getBatchRealTimeData() {
        try {
            Map<String, Object> batchData = realTimeSystemService.getBatchRealTimeData();
            return ResponseEntity.ok(batchData);
        } catch (Exception e) {
            log.error("获取批量实时数据失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/real-time/connections/count")
    @Operation(summary = "获取活跃连接数", description = "获取当前活跃的实时数据连接数量")
    public ResponseEntity<Map<String, Object>> getActiveConnections() {
        try {
            int count = realTimeSystemService.getActiveConnections();
            return ResponseEntity.ok(Map.of(
                    "activeConnections", count,
                    "timestamp", System.currentTimeMillis()
            ));
        } catch (Exception e) {
            log.error("获取活跃连接数失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

// ==================== 增强现有实时接口 ====================

    @GetMapping("/real-time/performance")
    @Operation(summary = "获取实时性能数据", description = "获取实时CPU和内存性能数据")
    public ResponseEntity<Map<String, Object>> getRealTimePerformance() {
        try {
            Map<String, Object> performanceData = realTimeSystemService.getPerformanceDataQuick();
            return ResponseEntity.ok(performanceData);
        } catch (Exception e) {
            log.error("获取实时性能数据失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/real-time/network")
    @Operation(summary = "获取实时网络数据", description = "获取实时网络统计信息")
    public ResponseEntity<Map<String, Object>> getRealTimeNetwork() {
        try {
            Map<String, Object> networkData = realTimeSystemService.getNetworkStats();
            return ResponseEntity.ok(networkData);
        } catch (Exception e) {
            log.error("获取实时网络数据失败: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }


}