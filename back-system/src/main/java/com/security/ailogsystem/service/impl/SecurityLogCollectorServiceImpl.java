package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.dto.ScriptRunResponse;
import com.security.ailogsystem.dto.ScriptStatus;
import com.security.ailogsystem.service.ScriptExecutionService;
import com.security.ailogsystem.service.SecurityLogCollectorService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * 安全日志采集服务实现
 * 使用现有的ScriptExecutionService来执行Python脚本
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SecurityLogCollectorServiceImpl implements SecurityLogCollectorService {

    private final ScriptExecutionService scriptExecutionService;

    // 脚本key，对应application.yml中配置的unified_log_collector
    private static final String SECURITY_LOG_SCRIPT_KEY = "unified_log_collector";
    private static final String SYSTEM_INFO_SCRIPT_KEY = "system_info_collector";

    @Value("${log.security.collector.auto-start:false}")
    private boolean autoStart;

    @Value("${log.security.collector.default-interval-minutes:5}")
    private int defaultIntervalMinutes;

    // 定时任务控制
    private final AtomicBoolean scheduledCollectionEnabled = new AtomicBoolean(false);
    private final AtomicInteger collectionIntervalMinutes = new AtomicInteger(5);

    // 动态调度器
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(
            r -> { Thread t = new Thread(r, "log-collector-scheduler"); t.setDaemon(true); return t; }
    );
    private final AtomicReference<ScheduledFuture<?>> currentTask = new AtomicReference<>();

    // 状态跟�?
    private final AtomicReference<LocalDateTime> lastCollectionTime = new AtomicReference<>();
    private final AtomicReference<ScriptStatus> lastCollectionStatus = new AtomicReference<>(ScriptStatus.SUCCESS);
    private final AtomicInteger totalCollections = new AtomicInteger(0);
    private final AtomicInteger successfulCollections = new AtomicInteger(0);
    private final AtomicInteger failedCollections = new AtomicInteger(0);

    @PostConstruct
    public void init() {
        if (autoStart) {
            log.info("auto-start=true，自动启动定时安全日志采集，间隔: {} 分钟", defaultIntervalMinutes);
            startScheduledCollection(defaultIntervalMinutes);
        }
    }

    @Override
    public ScriptRunResponse collectSecurityLogs() {
        log.info("手动触发安全日志采集");
        
        try {
            // unified_log_collector.py 默认是常驻循环模式；这里必须使用单次执行参数�?
            // 否则会一�?RUNNING，后续触发全�?BUSY，导致看起来“采集失效”�?
            ScriptRunResponse response = scriptExecutionService.triggerScript(
                    SECURITY_LOG_SCRIPT_KEY,
                    java.util.List.of("--test")
            );

            // 更新统计信息
            updateCollectionStats(response.getStatus());

            return response;
        } catch (Exception e) {
            log.error("安全日志采集失败", e);
            updateCollectionStats(ScriptStatus.FAILED);
            
            return ScriptRunResponse.builder()
                    .scriptKey(SECURITY_LOG_SCRIPT_KEY)
                    .scriptName("安全日志采集脚本")
                    .status(ScriptStatus.FAILED)
                    .message("采集失败: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Map<String, Object> getCollectorStatus() {
        Map<String, Object> status = new HashMap<>();
        
        status.put("enabled", scheduledCollectionEnabled.get());
        status.put("intervalMinutes", collectionIntervalMinutes.get());
        status.put("lastCollectionTime", lastCollectionTime.get());
        status.put("lastCollectionStatus", lastCollectionStatus.get());
        status.put("totalCollections", totalCollections.get());
        status.put("successfulCollections", successfulCollections.get());
        status.put("failedCollections", failedCollections.get());
        
        // 计算成功�?
        int total = totalCollections.get();
        double successRate = total > 0 ? (successfulCollections.get() * 100.0 / total) : 0.0;
        status.put("successRate", String.format("%.2f%%", successRate));
        
        // 下次采集时间
        if (scheduledCollectionEnabled.get() && lastCollectionTime.get() != null) {
            LocalDateTime nextCollection = lastCollectionTime.get()
                    .plusMinutes(collectionIntervalMinutes.get());
            status.put("nextCollectionTime", nextCollection);
        }
        
        return status;
    }

    @Override
    public boolean startScheduledCollection(int intervalMinutes) {
        if (intervalMinutes < 1) {
            log.warn("采集间隔必须大于0分钟");
            return false;
        }

        collectionIntervalMinutes.set(intervalMinutes);
        scheduledCollectionEnabled.set(true);

        // 取消旧任务，按新间隔重新调度
        ScheduledFuture<?> old = currentTask.getAndSet(null);
        if (old != null) old.cancel(false);

        long intervalMs = (long) intervalMinutes * 60 * 1000;
        ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(
                this::runScheduledTask, intervalMs, intervalMs, TimeUnit.MILLISECONDS
        );
        currentTask.set(future);

        log.info("启动定时安全日志采集，间隔: {} 分钟", intervalMinutes);
        return true;
    }

    @Override
    public boolean stopScheduledCollection() {
        scheduledCollectionEnabled.set(false);
        ScheduledFuture<?> task = currentTask.getAndSet(null);
        if (task != null) task.cancel(false);
        log.info("停止定时安全日志采集");
        return true;
    }

    @Override
    public boolean isScheduledCollectionRunning() {
        return scheduledCollectionEnabled.get();
    }

    private void runScheduledTask() {
        if (!scheduledCollectionEnabled.get()) return;
        log.info("执行定时采集（间隔: {} 分钟）", collectionIntervalMinutes.get());
        
        // 1. 安全日志采集
        collectSecurityLogs();
        
        // 2. 系统信息采集（依次采集多种数据类型）
        collectSystemInfo();
    }
    
    private void collectSystemInfo() {
        String[] dataTypes = {"performance", "cpu_info", "memory_info", "disk_info", "process_info"};
        for (String dataType : dataTypes) {
            try {
                ScriptRunResponse response = scriptExecutionService.triggerScript(
                        SYSTEM_INFO_SCRIPT_KEY,
                        java.util.List.of(dataType)
                );
                log.debug("系统信息采集({}): {}", dataType, response.getStatus());
            } catch (Exception e) {
                log.warn("系统信息采集({})失败: {}", dataType, e.getMessage());
            }
        }
    }

    @PreDestroy
    public void shutdown() {
        stopScheduledCollection();
        scheduler.shutdownNow();
    }

    /**
     * 更新采集统计信息
     */
    private void updateCollectionStats(ScriptStatus status) {
        lastCollectionTime.set(LocalDateTime.now());
        lastCollectionStatus.set(status);
        totalCollections.incrementAndGet();

        if (status == ScriptStatus.SUCCESS
                || status == ScriptStatus.RUNNING
                || status == ScriptStatus.BUSY) {
            // RUNNING/BUSY 表示脚本已成功触发（异步执行中），计为成功
            successfulCollections.incrementAndGet();
        } else if (status == ScriptStatus.FAILED) {
            failedCollections.incrementAndGet();
        }
    }
}
