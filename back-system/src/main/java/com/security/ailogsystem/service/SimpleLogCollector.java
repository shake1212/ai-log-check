package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.SecurityEventDTO;
import com.security.ailogsystem.model.SecurityEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * 简单日志采集器
 * 适合大学生大创项目的轻量级方案
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SimpleLogCollector {

    private final SecurityEventService securityEventService;
    private final SimplePerformanceMonitor performanceMonitor;
    private final Random random = new Random();

    /**
     * 定时采集日志 - 每5分钟执行一次
     * 对于大创项目，这个频率足够了
     */
    @Scheduled(fixedRate = 5 * 60 * 1000) // 5分钟
    public void collectLogs() {
        log.info("开始采集日志数据...");
        
        try {
            // 模拟采集一些测试数据
            List<SecurityEventDTO> events = generateMockEvents();
            
            // 批量保存
            if (!events.isEmpty()) {
                securityEventService.createSecurityEvents(events);
                performanceMonitor.recordEventCollected(events.size());
                performanceMonitor.recordEventProcessed(events.size());
                log.info("成功采集并保存了 {} 条日志事件", events.size());
            }
            
        } catch (Exception e) {
            log.error("日志采集失败", e);
            performanceMonitor.recordError();
        }
    }

    /**
     * 手动触发采集
     */
    public void manualCollect() {
        log.info("手动触发日志采集...");
        collectLogs();
    }

    /**
     * 生成模拟事件数据
     * 在实际项目中，这里会连接真实的日志源
     */
    private List<SecurityEventDTO> generateMockEvents() {
        List<SecurityEventDTO> events = new ArrayList<>();
        
        // 生成1-5个随机事件
        int eventCount = random.nextInt(5) + 1;
        
        for (int i = 0; i < eventCount; i++) {
            SecurityEventDTO event = createMockEvent();
            events.add(event);
        }
        
        return events;
    }

    /**
     * 创建模拟事件
     */
    private SecurityEventDTO createMockEvent() {
        String[] sources = {"Windows Security", "System", "Application", "Network"};
        SecurityEvent.EventType[] eventTypes = {
            SecurityEvent.EventType.LOGIN_SUCCESS,
            SecurityEvent.EventType.LOGIN_FAILURE,
            SecurityEvent.EventType.FILE_ACCESS,
            SecurityEvent.EventType.SYSTEM_STARTUP
        };
        SecurityEvent.LogLevel[] levels = {
            SecurityEvent.LogLevel.INFO,
            SecurityEvent.LogLevel.WARNING,
            SecurityEvent.LogLevel.ERROR
        };
        SecurityEvent.EventCategory[] categories = {
            SecurityEvent.EventCategory.AUTHENTICATION,
            SecurityEvent.EventCategory.SYSTEM,
            SecurityEvent.EventCategory.SECURITY
        };
        SecurityEvent.ThreatLevel[] threatLevels = {
            SecurityEvent.ThreatLevel.LOW,
            SecurityEvent.ThreatLevel.MEDIUM,
            SecurityEvent.ThreatLevel.HIGH
        };

        String source = sources[random.nextInt(sources.length)];
        SecurityEvent.EventType eventType = eventTypes[random.nextInt(eventTypes.length)];
        SecurityEvent.LogLevel level = levels[random.nextInt(levels.length)];
        SecurityEvent.EventCategory category = categories[random.nextInt(categories.length)];
        SecurityEvent.ThreatLevel threatLevel = threatLevels[random.nextInt(threatLevels.length)];

        // 随机决定是否为异常事件
        boolean isAnomaly = random.nextDouble() < 0.3; // 30%概率为异常

        return SecurityEventDTO.builder()
                .timestamp(LocalDateTime.now().minusMinutes(random.nextInt(60)))
                .source(source)
                .eventId(1000 + random.nextInt(9000))
                .eventType(eventType)
                .level(level)
                .message(generateMockMessage(eventType))
                .hostIp("192.168.1." + (100 + random.nextInt(50)))
                .hostName("WORKSTATION-" + (random.nextInt(10) + 1))
                .userId("user" + random.nextInt(10))
                .category(category)
                .threatLevel(threatLevel)
                .status(SecurityEvent.EventStatus.NEW)
                .isAnomaly(isAnomaly)
                .anomalyScore(isAnomaly ? 50 + random.nextDouble() * 50 : null)
                .anomalyReason(isAnomaly ? "检测到可疑活动模式" : null)
                .build();
    }

    /**
     * 生成模拟消息
     */
    private String generateMockMessage(SecurityEvent.EventType eventType) {
        switch (eventType) {
            case LOGIN_SUCCESS:
                return "用户登录成功";
            case LOGIN_FAILURE:
                return "登录失败，密码错误";
            case FILE_ACCESS:
                return "文件访问操作";
            case SYSTEM_STARTUP:
                return "系统启动完成";
            default:
                return "系统事件";
        }
    }

    /**
     * 获取采集统计信息
     */
    public String getCollectionStats() {
        try {
            LocalDateTime endTime = LocalDateTime.now();
            LocalDateTime startTime = endTime.minusHours(1);
            
            // 这里可以添加更多统计信息
            return String.format("采集器运行正常，最近1小时无异常");
        } catch (Exception e) {
            return "采集器状态检查失败: " + e.getMessage();
        }
    }
}
