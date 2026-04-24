package com.security.ailogsystem.controller;

import com.security.ailogsystem.service.DatabaseMonitoringService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * 数据库管理控制器
 * 提供数据库连接池监控和管理功能
 */
@RestController
@RequestMapping("/database")
@Tag(name = "数据库管理", description = "数据库连接池监控和管理API")
public class DatabaseController {

    @Autowired
    private DatabaseMonitoringService databaseMonitoringService;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * 获取数据库状态概览
     */
    @GetMapping("/status")
    @Operation(summary = "获取数据库状态", description = "获取数据库连接池状态和性能指标")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getDatabaseStatus() {
        try {
            Map<String, Object> status = databaseMonitoringService.getDatabaseStatus();
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to get database status: " + e.getMessage()));
        }
    }

    /**
     * 获取连接池状态
     */
    @GetMapping("/pool/status")
    @Operation(summary = "获取连接池状态", description = "获取HikariCP连接池详细状态")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getPoolStatus() {
        try {
            Map<String, Object> status = databaseMonitoringService.getPoolStatus();
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to get pool status: " + e.getMessage()));
        }
    }

    /**
     * 获取性能指标
     */
    @GetMapping("/performance")
    @Operation(summary = "获取性能指标", description = "获取数据库性能指标和统计信息")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getPerformanceMetrics() {
        try {
            Map<String, Object> metrics = databaseMonitoringService.getPerformanceMetrics();
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to get performance metrics: " + e.getMessage()));
        }
    }

    /**
     * 健康检查
     */
    @GetMapping("/health")
    @Operation(summary = "数据库健康检查", description = "执行数据库连接健康检查")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        try {
            Map<String, Object> health = databaseMonitoringService.healthCheck();
            return ResponseEntity.ok(health);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to perform health check: " + e.getMessage()));
        }
    }

    /**
     * 获取慢查询统计
     */
    @GetMapping("/slow-queries")
    @Operation(summary = "获取慢查询统计", description = "获取慢查询配置和统计信息")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getSlowQueries() {
        try {
            Map<String, Object> slowQueries = databaseMonitoringService.getSlowQueries();
            return ResponseEntity.ok(slowQueries);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to get slow query stats: " + e.getMessage()));
        }
    }

    /**
     * 获取表统计信息
     */
    @GetMapping("/tables")
    @Operation(summary = "获取表统计信息", description = "获取数据库表统计信息")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getTableStats() {
        try {
            Map<String, Object> tableStats = databaseMonitoringService.getTableStats();
            return ResponseEntity.ok(tableStats);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to get table stats: " + e.getMessage()));
        }
    }

    /**
     * 获取连接池配置
     */
    @GetMapping("/pool/config")
    @Operation(summary = "获取连接池配置", description = "获取HikariCP连接池配置信息")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getPoolConfig() {
        try {
            Map<String, Object> config = databaseMonitoringService.getPoolConfig();
            return ResponseEntity.ok(config);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to get pool config: " + e.getMessage()));
        }
    }

    /**
     * 测试数据库连接
     */
    @GetMapping("/test-connection")
    @Operation(summary = "测试数据库连接", description = "测试数据库连接是否正常")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> testConnection() {
        try {
            boolean connected = databaseMonitoringService.testConnection();
            return ResponseEntity.ok(Map.of(
                    "connected", connected,
                    "message", connected ? "Database connection is healthy" : "Database connection failed",
                    "timestamp", java.time.LocalDateTime.now().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to test connection: " + e.getMessage()));
        }
    }

    /**
     * 获取数据库版本信息
     */
    @GetMapping("/version")
    @Operation(summary = "获取数据库版本", description = "获取数据库版本信息")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getDatabaseVersion() {
        try {
            Map<String, Object> metrics = databaseMonitoringService.getPerformanceMetrics();
            Map<String, Object> versionInfo = Map.of(
                    "databaseVersion", metrics.getOrDefault("databaseVersion", "Unknown"),
                    "databaseProductName", metrics.getOrDefault("databaseProductName", "Unknown"),
                    "driverName", metrics.getOrDefault("driverName", "Unknown"),
                    "driverVersion", metrics.getOrDefault("driverVersion", "Unknown"),
                    "timestamp", java.time.LocalDateTime.now().toString()
            );
            return ResponseEntity.ok(versionInfo);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to get database version: " + e.getMessage()));
        }
    }

    /**
     * 获取系统概览
     */
    @GetMapping("/overview")
    @Operation(summary = "获取系统概览", description = "获取数据库系统概览信息")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getOverview() {
        try {
            Map<String, Object> overview = Map.of(
                    "databaseStatus", databaseMonitoringService.getDatabaseStatus(),
                    "poolStatus", databaseMonitoringService.getPoolStatus(),
                    "performanceMetrics", databaseMonitoringService.getPerformanceMetrics(),
                    "healthCheck", databaseMonitoringService.healthCheck(),
                    "timestamp", java.time.LocalDateTime.now().toString()
            );
            return ResponseEntity.ok(overview);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to get overview: " + e.getMessage()));
        }
    }

    @PostMapping("/query")
    @Operation(summary = "执行SQL查询", description = "执行数据库查询（仅管理用途）")
    public ResponseEntity<Map<String, Object>> executeQuery(@RequestBody Map<String, Object> payload) {
        try {
            String sql = String.valueOf(payload.getOrDefault("sql", ""));
            @SuppressWarnings("unchecked")
            List<Object> params = (List<Object>) payload.getOrDefault("params", List.of());
            if (sql.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "sql不能为空"));
            }
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, params.toArray());
            Map<String, Object> result = new HashMap<>();
            result.put("rows", rows);
            result.put("fields", List.of());
            result.put("affectedRows", rows.size());
            result.put("insertId", 0);
            result.put("changedRows", 0);
            result.put("message", "Query OK");
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Query failed: " + e.getMessage()));
        }
    }

    @PostMapping("/transaction")
    @Operation(summary = "执行事务", description = "按顺序执行SQL语句事务")
    public ResponseEntity<Map<String, Object>> executeTransaction(@RequestBody Map<String, Object> payload) {
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> queries = (List<Map<String, Object>>) payload.getOrDefault("queries", List.of());
            int affected = 0;
            for (Map<String, Object> q : queries) {
                String sql = String.valueOf(q.getOrDefault("sql", ""));
                @SuppressWarnings("unchecked")
                List<Object> params = (List<Object>) q.getOrDefault("params", List.of());
                affected += jdbcTemplate.update(sql, params.toArray());
            }
            return ResponseEntity.ok(Map.of("message", "Transaction OK", "affectedRows", affected));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Transaction failed: " + e.getMessage()));
        }
    }
}
