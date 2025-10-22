package com.security.ailogsystem.controller;

import com.security.ailogsystem.service.DatabaseMonitoringService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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
}
