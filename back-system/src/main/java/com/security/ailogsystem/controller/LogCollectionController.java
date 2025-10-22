package com.security.ailogsystem.controller;

import com.security.ailogsystem.service.SimpleLogCollector;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 日志采集控制器
 * 提供简单的日志采集管理功能
 */
@Slf4j
@RestController
@RequestMapping("/api/log-collection")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LogCollectionController {

    private final SimpleLogCollector logCollector;

    /**
     * 手动触发日志采集
     */
    @PostMapping("/collect")
    public ResponseEntity<Map<String, String>> manualCollect() {
        log.info("手动触发日志采集");
        
        try {
            logCollector.manualCollect();
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "日志采集任务已启动"
            ));
        } catch (Exception e) {
            log.error("手动采集失败", e);
            return ResponseEntity.status(500).body(Map.of(
                "status", "error",
                "message", "日志采集失败: " + e.getMessage()
            ));
        }
    }

    /**
     * 获取采集器状态
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, String>> getCollectionStatus() {
        log.debug("获取日志采集器状态");
        
        try {
            String stats = logCollector.getCollectionStats();
            return ResponseEntity.ok(Map.of(
                "status", "running",
                "message", stats,
                "schedule", "每5分钟自动采集一次"
            ));
        } catch (Exception e) {
            log.error("获取采集器状态失败", e);
            return ResponseEntity.status(500).body(Map.of(
                "status", "error",
                "message", "获取状态失败: " + e.getMessage()
            ));
        }
    }

    /**
     * 获取采集配置信息
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getCollectionConfig() {
        log.debug("获取日志采集配置");
        
        return ResponseEntity.ok(Map.of(
            "collectorType", "SimpleLogCollector",
            "schedule", "每5分钟",
            "batchSize", "1-5条事件",
            "dataSource", "模拟数据（实际项目中连接真实日志源）",
            "description", "适合大学生大创项目的轻量级采集方案",
            "features", new String[]{
                "定时自动采集",
                "手动触发采集", 
                "批量数据保存",
                "模拟数据生成",
                "异常检测支持"
            }
        ));
    }
}
