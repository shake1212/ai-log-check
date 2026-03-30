package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.dto.ScriptRunResponse;
import com.security.ailogsystem.dto.ScriptStatus;
import com.security.ailogsystem.service.ScriptExecutionService;
import com.security.ailogsystem.service.SecurityLogCollectorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
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

    // 定时任务控制
    private final AtomicBoolean scheduledCollectionEnabled = new AtomicBoolean(false);
    private final AtomicInteger collectionIntervalMinutes = new AtomicInteger(5);

    // 状态跟踪
    private final AtomicReference<LocalDateTime> lastCollectionTime = new AtomicReference<>();
    private final AtomicReference<ScriptStatus> lastCollectionStatus = new AtomicReference<>(ScriptStatus.SUCCESS);
    private final AtomicInteger totalCollections = new AtomicInteger(0);
    private final AtomicInteger successfulCollections = new AtomicInteger(0);
    private final AtomicInteger failedCollections = new AtomicInteger(0);

    @Override
    public ScriptRunResponse collectSecurityLogs() {
        log.info("手动触发安全日志采集");
        
        try {
            // 使用ScriptExecutionService执行Python脚本
            ScriptRunResponse response = scriptExecutionService.triggerScript(
                    SECURITY_LOG_SCRIPT_KEY,
                    Collections.emptyList()
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
        
        // 计算成功率
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
        
        log.info("启动定时安全日志采集，间隔: {} 分钟", intervalMinutes);
        return true;
    }

    @Override
    public boolean stopScheduledCollection() {
        scheduledCollectionEnabled.set(false);
        log.info("停止定时安全日志采集");
        return true;
    }

    @Override
    public boolean isScheduledCollectionRunning() {
        return scheduledCollectionEnabled.get();
    }

    /**
     * 定时任务 - 每5分钟执行一次
     * 只有在启用定时采集时才会实际执行
     */
    @Scheduled(fixedRate = 300000) // 5分钟 = 300000毫秒
    public void scheduledCollectionTask() {
        if (!scheduledCollectionEnabled.get()) {
            return;
        }

        log.info("执行定时安全日志采集");
        collectSecurityLogs();
    }

    /**
     * 更新采集统计信息
     */
    private void updateCollectionStats(ScriptStatus status) {
        lastCollectionTime.set(LocalDateTime.now());
        lastCollectionStatus.set(status);
        totalCollections.incrementAndGet();

        if (status == ScriptStatus.SUCCESS) {
            successfulCollections.incrementAndGet();
        } else if (status == ScriptStatus.FAILED) {
            failedCollections.incrementAndGet();
        }
    }
}
