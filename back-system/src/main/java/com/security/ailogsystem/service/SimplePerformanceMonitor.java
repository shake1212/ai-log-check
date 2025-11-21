package com.security.ailogsystem.service;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 简单性能监控服务
 * 适用于大学生大创项目的轻量级性能监控方案
 */
@Service
public class SimplePerformanceMonitor {

    // 性能计数器
    private final AtomicLong totalCollectedEvents = new AtomicLong(0);
    private final AtomicLong totalProcessedEvents = new AtomicLong(0);
    private final AtomicLong errorCount = new AtomicLong(0);
    
    // 启动时间
    private final long startTime = System.currentTimeMillis();

    /**
     * 记录采集事件数
     */
    public void recordCollection(int count) {
        totalCollectedEvents.addAndGet(count);
    }

    /**
     * 记录处理事件数
     */
    public void recordProcessing(int count) {
        totalProcessedEvents.addAndGet(count);
    }

    /**
     * 记录错误数
     */
    public void recordError(int count) {
        errorCount.addAndGet(count);
    }

    /**
     * 获取性能统计信息
     */
    public Map<String, Object> getPerformanceStats() {
        Map<String, Object> stats = new HashMap<>();
        
        long collected = totalCollectedEvents.get();
        long processed = totalProcessedEvents.get();
        long errors = errorCount.get();
        long uptime = System.currentTimeMillis() - startTime;
        
        // 计算每分钟事件数
        double eventsPerMinute = collected / (uptime / 60000.0);
        
        // 计算错误率
        double errorRate = collected > 0 ? (errors * 100.0 / collected) : 0.0;
        
        stats.put("totalCollectedEvents", collected);
        stats.put("totalProcessedEvents", processed);
        stats.put("errorCount", errors);
        stats.put("eventsPerMinute", Math.round(eventsPerMinute * 100.0) / 100.0);
        stats.put("errorRate", Math.round(errorRate * 100.0) / 100.0);
        stats.put("uptimeMinutes", Math.round(uptime / 60000.0 * 100.0) / 100.0);
        
        return stats;
    }

    /**
     * 获取健康状态
     */
    public Map<String, String> getHealthStatus() {
        Map<String, String> health = new HashMap<>();
        
        long collected = totalCollectedEvents.get();
        long errors = errorCount.get();
        
        // 简单健康检查逻辑
        if (errors == 0) {
            health.put("status", "HEALTHY");
            health.put("message", "系统运行正常");
        } else if (errors > collected * 0.1) { // 错误率超过10%
            health.put("status", "UNHEALTHY");
            health.put("message", "错误率过高，请检查系统");
        } else {
            health.put("status", "WARNING");
            health.put("message", "系统有少量错误，但仍在运行");
        }
        
        return health;
    }

    /**
     * 重置统计信息
     */
    public void resetStats() {
        totalCollectedEvents.set(0);
        totalProcessedEvents.set(0);
        errorCount.set(0);
    }
}