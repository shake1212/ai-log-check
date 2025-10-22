package com.security.ailogsystem.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 简单性能监控器
 * 适合大学生大创项目的轻量级监控方案
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SimplePerformanceMonitor {

    // 简单的计数器
    private final AtomicLong totalEventsCollected = new AtomicLong(0);
    private final AtomicLong totalEventsProcessed = new AtomicLong(0);
    private final AtomicLong errorCount = new AtomicLong(0);
    
    private LocalDateTime lastCollectionTime = LocalDateTime.now();
    private LocalDateTime startTime = LocalDateTime.now();

    /**
     * 记录事件采集
     */
    public void recordEventCollected(int count) {
        totalEventsCollected.addAndGet(count);
        lastCollectionTime = LocalDateTime.now();
        log.debug("记录了 {} 个事件的采集", count);
    }

    /**
     * 记录事件处理
     */
    public void recordEventProcessed(int count) {
        totalEventsProcessed.addAndGet(count);
        log.debug("记录了 {} 个事件的处理", count);
    }

    /**
     * 记录错误
     */
    public void recordError() {
        errorCount.incrementAndGet();
        log.warn("记录了1个错误");
    }

    /**
     * 获取性能统计
     */
    public Map<String, Object> getPerformanceStats() {
        long uptimeMinutes = java.time.Duration.between(startTime, LocalDateTime.now()).toMinutes();
        long eventsCollected = totalEventsCollected.get();
        long eventsProcessed = totalEventsProcessed.get();
        long errors = errorCount.get();
        
        // 计算简单的性能指标
        double eventsPerMinute = uptimeMinutes > 0 ? (double) eventsCollected / uptimeMinutes : 0;
        double errorRate = eventsCollected > 0 ? (double) errors / eventsCollected * 100 : 0;
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("uptimeMinutes", uptimeMinutes);
        stats.put("totalEventsCollected", eventsCollected);
        stats.put("totalEventsProcessed", eventsProcessed);
        stats.put("errorCount", errors);
        stats.put("eventsPerMinute", String.format("%.2f", eventsPerMinute));
        stats.put("errorRate", String.format("%.2f%%", errorRate));
        stats.put("lastCollectionTime", lastCollectionTime);
        stats.put("status", errors > eventsCollected * 0.1 ? "WARNING" : "HEALTHY");
        
        return stats;
    }

    /**
     * 获取健康状态
     */
    public Map<String, String> getHealthStatus() {
        Map<String, Object> stats = getPerformanceStats();
        String status = (String) stats.get("status");
        
        Map<String, String> health = new HashMap<>();
        health.put("status", status);
        health.put("message", "WARNING".equals(status) ? "错误率较高，请检查系统" : "系统运行正常");
        health.put("lastCheck", LocalDateTime.now().toString());
        
        return health;
    }

    /**
     * 重置统计
     */
    public void resetStats() {
        totalEventsCollected.set(0);
        totalEventsProcessed.set(0);
        errorCount.set(0);
        startTime = LocalDateTime.now();
        lastCollectionTime = LocalDateTime.now();
        log.info("性能统计已重置");
    }
}
