package com.security.ailogsystem.controller;

import com.security.ailogsystem.service.SimplePerformanceMonitor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 性能监控控制器
 * 提供简单的性能监控功能
 */
@Slf4j
@RestController
@RequestMapping("/api/performance")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PerformanceMonitorController {

    private final SimplePerformanceMonitor performanceMonitor;

    /**
     * 获取性能统计
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getPerformanceStats() {
        log.debug("获取性能统计信息");
        
        try {
            Map<String, Object> stats = performanceMonitor.getPerformanceStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("获取性能统计失败", e);
            return ResponseEntity.status(500).body(Map.of(
                "error", "获取性能统计失败: " + e.getMessage()
            ));
        }
    }

    /**
     * 获取健康状态
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> getHealthStatus() {
        log.debug("获取健康状态");
        
        try {
            Map<String, String> health = performanceMonitor.getHealthStatus();
            return ResponseEntity.ok(health);
        } catch (Exception e) {
            log.error("获取健康状态失败", e);
            return ResponseEntity.status(500).body(Map.of(
                "status", "ERROR",
                "message", "获取健康状态失败: " + e.getMessage()
            ));
        }
    }

    /**
     * 重置性能统计
     */
    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetStats() {
        log.info("重置性能统计");
        
        try {
            performanceMonitor.resetStats();
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "性能统计已重置"
            ));
        } catch (Exception e) {
            log.error("重置性能统计失败", e);
            return ResponseEntity.status(500).body(Map.of(
                "status", "error",
                "message", "重置失败: " + e.getMessage()
            ));
        }
    }

    /**
     * 获取监控配置信息
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getMonitorConfig() {
        log.debug("获取监控配置信息");
        
        return ResponseEntity.ok(Map.of(
            "monitorType", "SimplePerformanceMonitor",
            "description", "适合大学生大创项目的轻量级性能监控",
            "features", new String[]{
                "事件采集计数",
                "事件处理计数", 
                "错误计数",
                "性能指标计算",
                "健康状态检查",
                "统计重置功能"
            },
            "metrics", new String[]{
                "总采集事件数",
                "总处理事件数",
                "错误计数",
                "每分钟事件数",
                "错误率",
                "运行时间"
            },
            "recommendation", "对于大创项目，这个简单监控方案完全够用，无需复杂的性能监控系统"
        ));
    }
}
