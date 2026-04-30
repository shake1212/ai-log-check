package com.security.ailogsystem.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 自适应阈值管理器
 * 使用滑动窗口统计法动态计算阈值
 */
@Slf4j
@Service
public class AdaptiveThresholdManager {
    
    // 滑动窗口缓存
    private final ConcurrentHashMap<String, Deque<Double>> windows = new ConcurrentHashMap<>();
    
    // 窗口大小
    private final int windowSize = 50;
    
    // Z-score系数
    private final double k = 2.5;
    
    // 最小数据量
    private final int minDataCount = 10;
    
    /**
     * 获取动态阈值
     */
    public double getThreshold(String metricType, double currentValue) {
        Deque<Double> window = windows.computeIfAbsent(
            metricType, 
            key -> new ArrayDeque<>()
        );
        
        // 添加当前值
        window.addLast(currentValue);
        if (window.size() > windowSize) {
            window.removeFirst();
        }
        
        // 数据不足，使用固定倍数
        if (window.size() < minDataCount) {
            return currentValue * 1.5;
        }
        
        // 计算统计量
        double mean = calculateMean(window);
        double std = calculateStd(window, mean);
        
        // 动态阈值 = mean + k * std
        return mean + k * std;
    }
    
    /**
     * 判断是否异常
     */
    public boolean isAnomaly(String metricType, double value) {
        double threshold = getThreshold(metricType, value);
        return value > threshold;
    }
    
    /**
     * 获取Z-score
     */
    public double getZScore(String metricType, double value) {
        Deque<Double> window = windows.get(metricType);
        if (window == null || window.size() < minDataCount) {
            return 0.0;
        }
        
        double mean = calculateMean(window);
        double std = calculateStd(window, mean);
        
        if (std == 0) return 0.0;
        
        return Math.abs(value - mean) / std;
    }
    
    /**
     * 计算均值
     */
    private double calculateMean(Deque<Double> window) {
        return window.stream()
            .mapToDouble(Double::doubleValue)
            .average()
            .orElse(0.0);
    }
    
    /**
     * 计算标准差
     */
    private double calculateStd(Deque<Double> window, double mean) {
        double variance = window.stream()
            .mapToDouble(v -> Math.pow(v - mean, 2))
            .average()
            .orElse(0.0);
        return Math.sqrt(variance);
    }
    
    /**
     * 定时刷新阈值（每小时）
     */
    @Scheduled(cron = "0 0 * * * ?")
    public void refreshThresholds() {
        log.info("自适应阈值刷新，当前监控指标数: {}", windows.size());
        // 清空缓存，重新计算
        windows.clear();
    }
    
    /**
     * 获取窗口统计信息
     */
    public Map<String, Object> getWindowStats(String metricType) {
        Deque<Double> window = windows.get(metricType);
        if (window == null || window.isEmpty()) {
            return Map.of("count", 0);
        }
        
        double mean = calculateMean(window);
        double std = calculateStd(window, mean);
        
        return Map.of(
            "count", window.size(),
            "mean", mean,
            "std", std,
            "threshold", mean + k * std
        );
    }
}
