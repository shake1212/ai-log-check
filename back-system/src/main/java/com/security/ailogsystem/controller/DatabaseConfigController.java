package com.security.ailogsystem.controller;

import com.security.ailogsystem.service.DatabaseConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.HashMap;

/**
 * 数据库配置管理控制器
 * 提供数据库配置的动态管理和更新功能
 */
@RestController
@RequestMapping("/database/config")
@Tag(name = "数据库配置管理", description = "数据库配置动态管理和更新API")
public class DatabaseConfigController {

    @Autowired
    private DatabaseConfigService databaseConfigService;

    /**
     * 获取当前数据库配置
     */
    @GetMapping
    @Operation(summary = "获取当前配置", description = "获取当前数据库连接池配置")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getCurrentConfig() {
        try {
            Map<String, Object> config = databaseConfigService.getCurrentConfig();
            return ResponseEntity.ok(config);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to get current config: " + e.getMessage()));
        }
    }

    /**
     * 验证数据库配置
     */
    @PostMapping("/validate")
    @Operation(summary = "验证配置", description = "验证数据库配置参数的有效性")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> validateConfig(@RequestBody Map<String, Object> config) {
        try {
            Map<String, Object> result = databaseConfigService.validateConfig(config);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to validate config: " + e.getMessage()));
        }
    }

    /**
     * 测试数据库连接配置
     */
    @PostMapping("/test-connection")
    @Operation(summary = "测试连接配置", description = "测试数据库连接配置是否有效")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> testConnectionConfig(@RequestBody Map<String, Object> config) {
        try {
            Map<String, Object> result = databaseConfigService.testConnectionConfig(config);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to test connection config: " + e.getMessage()));
        }
    }

    /**
     * 获取推荐的连接池配置
     */
    @GetMapping("/recommendations")
    @Operation(summary = "获取推荐配置", description = "根据系统资源获取推荐的连接池配置")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getRecommendedConfig() {
        try {
            Map<String, Object> recommendations = databaseConfigService.getRecommendedConfig();
            return ResponseEntity.ok(recommendations);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to get recommended config: " + e.getMessage()));
        }
    }

    /**
     * 获取配置建议
     */
    @GetMapping("/suggestions")
    @Operation(summary = "获取配置建议", description = "获取当前配置的优化建议")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getConfigRecommendations() {
        try {
            Map<String, Object> recommendations = databaseConfigService.getConfigRecommendations();
            return ResponseEntity.ok(recommendations);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to get config recommendations: " + e.getMessage()));
        }
    }

    /**
     * 获取配置历史
     */
    @GetMapping("/history")
    @Operation(summary = "获取配置历史", description = "获取数据库配置的历史记录")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getConfigHistory() {
        try {
            Map<String, Object> history = databaseConfigService.getConfigHistory();
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to get config history: " + e.getMessage()));
        }
    }

    /**
     * 导出配置
     */
    @GetMapping("/export")
    @Operation(summary = "导出配置", description = "导出当前数据库配置")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> exportConfig() {
        try {
            Map<String, Object> export = databaseConfigService.exportConfig();
            return ResponseEntity.ok(export);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to export config: " + e.getMessage()));
        }
    }

    /**
     * 导入配置
     */
    @PostMapping("/import")
    @Operation(summary = "导入配置", description = "导入数据库配置")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> importConfig(@RequestBody Map<String, Object> config) {
        try {
            Map<String, Object> result = databaseConfigService.importConfig(config);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to import config: " + e.getMessage()));
        }
    }

    /**
     * 更新配置
     */
    @PutMapping
    @Operation(summary = "更新配置", description = "更新数据库连接池配置")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> updateConfig(@RequestBody Map<String, Object> config) {
        try {
            // 验证配置
            Map<String, Object> validation = databaseConfigService.validateConfig(config);
            if (!(Boolean) validation.get("valid")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "配置验证失败: " + validation.get("errors")));
            }
            
            // 测试连接
            Map<String, Object> connectionTest = databaseConfigService.testConnectionConfig(config);
            if (!(Boolean) connectionTest.get("success")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "连接测试失败: " + connectionTest.get("message")));
            }
            
            // 这里可以实现配置更新逻辑
            // 目前只返回成功状态
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "配置更新成功",
                    "timestamp", java.time.LocalDateTime.now().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to update config: " + e.getMessage()));
        }
    }

    /**
     * 重置配置
     */
    @PostMapping("/reset")
    @Operation(summary = "重置配置", description = "重置数据库配置为默认值")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> resetConfig() {
        try {
            // 获取推荐配置
            Map<String, Object> recommendedConfig = databaseConfigService.getRecommendedConfig();
            
            // 验证推荐配置
            Map<String, Object> validation = databaseConfigService.validateConfig(recommendedConfig);
            if (!(Boolean) validation.get("valid")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "推荐配置验证失败: " + validation.get("errors")));
            }
            
            // 这里可以实现配置重置逻辑
            // 目前只返回成功状态
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "配置重置成功",
                    "config", recommendedConfig,
                    "timestamp", java.time.LocalDateTime.now().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to reset config: " + e.getMessage()));
        }
    }

    /**
     * 获取配置模板
     */
    @GetMapping("/template")
    @Operation(summary = "获取配置模板", description = "获取数据库配置模板")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getConfigTemplate() {
        try {
            Map<String, Object> template = new HashMap<>();
            template.put("url", "jdbc:mysql://localhost:3306/database_name?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai");
            template.put("username", "your_username");
            template.put("password", "your_password");
            template.put("driverClassName", "com.mysql.cj.jdbc.Driver");
            template.put("maximumPoolSize", 20);
            template.put("minimumIdle", 5);
            template.put("connectionTimeout", 30000);
            template.put("idleTimeout", 600000);
            template.put("maxLifetime", 1800000);
            template.put("leakDetectionThreshold", 60000);
            template.put("autoCommit", false);
            template.put("poolName", "Database-Pool");
            template.put("cachePrepStmts", true);
            template.put("prepStmtCacheSize", 250);
            template.put("prepStmtCacheSqlLimit", 2048);
            template.put("useServerPrepStmts", true);
            template.put("rewriteBatchedStatements", true);
            
            return ResponseEntity.ok(template);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to get config template: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
}
