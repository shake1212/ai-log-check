package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.dto.request.AlertRequest;
import com.security.ailogsystem.dto.response.AlertResponse;
import com.security.ailogsystem.model.Alert;
import com.security.ailogsystem.repository.AlertRepository;
import com.security.ailogsystem.service.AlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertServiceImpl implements AlertService {

    private final AlertRepository alertRepository;
    private final com.security.ailogsystem.repository.SecurityAlertRepository securityAlertRepository;
    private final com.security.ailogsystem.service.WebSocketService webSocketService;

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"logs:statistics", "analysis:real-time-stats", "events:dashboard-stats"}, allEntries = true)
    public AlertResponse createAlert(AlertRequest request) {
        Alert alert = Alert.builder()
                .alertId(request.getAlertId())
                .source(request.getSource())
                .alertType(request.getAlertType())
                .alertLevel(request.getAlertLevel())
                .description(request.getDescription())
                .aiConfidence(request.getAiConfidence())
                .metricValue(request.getMetricValue())
                .threshold(request.getThreshold())
                .handled(false)
                .status(Alert.AlertStatus.PENDING)
                .build();

        if (request.getUnifiedEventId() != null) {
            alert.setUnifiedEventId(request.getUnifiedEventId());
        }

        Alert savedAlert = alertRepository.save(alert);
        log.info("创建告警成功: ID={}, Type={}, Level={}",
                savedAlert.getId(), savedAlert.getAlertType(), savedAlert.getAlertLevel());

        // 同步写入 SecurityAlert 表（供 /log-collector/alerts 端点查询）
        try {
            com.security.ailogsystem.entity.SecurityAlert secAlert = new com.security.ailogsystem.entity.SecurityAlert();
            secAlert.setAlertType(request.getAlertType());
            secAlert.setDescription(request.getDescription());
            secAlert.setHandled(false);
            secAlert.setCreatedTime(java.time.LocalDateTime.now());
            secAlert.setMetricValue(request.getMetricValue());
            secAlert.setThreshold(request.getThreshold());
            try {
                secAlert.setAlertLevel(com.security.ailogsystem.entity.SecurityAlert.AlertLevel
                        .valueOf(request.getAlertLevel().toUpperCase()));
            } catch (IllegalArgumentException e) {
                secAlert.setAlertLevel(com.security.ailogsystem.entity.SecurityAlert.AlertLevel.MEDIUM);
            }

            securityAlertRepository.save(secAlert);

            // 通过WebSocket推送告警事件
            try {
                webSocketService.sendAlert(secAlert);
            } catch (Exception wsEx) {
                log.warn("推送告警WebSocket失败: {}", wsEx.getMessage());
            }
        } catch (Exception e) {
            log.warn("同步写入 SecurityAlert 失败: {}", e.getMessage());
        }

        return AlertResponse.fromEntity(savedAlert);
    }

    @Override
    public AlertResponse getAlertById(Long id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("告警不存在: " + id));
        return AlertResponse.fromEntity(alert);
    }

    @Override
    public Page<AlertResponse> getAllAlerts(Pageable pageable) {
        Page<Alert> alerts = alertRepository.findAll(pageable);
        return alerts.map(AlertResponse::fromEntity);
    }

    @Override
    public Page<AlertResponse> getUnhandledAlerts(Pageable pageable) {
        Page<Alert> alerts = alertRepository.findByHandled(false, pageable);
        return alerts.map(AlertResponse::fromEntity);
    }

    @Override
    public Page<AlertResponse> getAlertsByHandled(Boolean handled, Pageable pageable) {
        Page<Alert> alerts = alertRepository.findByHandled(handled, pageable);
        return alerts.map(AlertResponse::fromEntity);
    }

    @Override
    public Page<AlertResponse> searchAlerts(String keyword, String alertLevel, String alertType,
                                            Boolean handled, Alert.AlertStatus status,
                                            Pageable pageable) {
        Page<Alert> alerts = alertRepository.searchAlerts(keyword, alertLevel, alertType, handled, status, pageable);
        return alerts.map(AlertResponse::fromEntity);
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"logs:statistics", "analysis:real-time-stats", "events:dashboard-stats"}, allEntries = true)
    public boolean markAlertAsHandled(Long id, String handledBy, String resolution) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("告警不存在: " + id));

        alert.setHandled(true);
        alert.setStatus(Alert.AlertStatus.RESOLVED);
        alert.setAssignee(handledBy);
        alert.setResolution(resolution);

        alertRepository.save(alert);
        log.info("标记告警为已处理: ID={}, HandledBy={}", id, handledBy);

        return true;
    }

    @Override
    @Transactional
    public boolean updateAlertStatus(Long id, Alert.AlertStatus status,
                                     String assignee, String resolution) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("告警不存在: " + id));

        alert.setStatus(status);
        if (assignee != null) {
            alert.setAssignee(assignee);
        }
        if (resolution != null) {
            alert.setResolution(resolution);
        }
        alert.setHandled(status == Alert.AlertStatus.RESOLVED);

        alertRepository.save(alert);
        log.info("更新告警状态: ID={}, Status={}", id, status);

        return true;
    }

    @Override
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = {"logs:statistics", "analysis:real-time-stats", "events:dashboard-stats"}, allEntries = true)
    public boolean deleteAlert(Long id) {
        if (!alertRepository.existsById(id)) {
            throw new RuntimeException("告警不存在: " + id);
        }

        alertRepository.deleteById(id);
        log.info("删除告警: ID={}", id);

        return true;
    }

    @Override
    public Map<String, Object> getAlertStatistics() {
        Map<String, Object> stats = new HashMap<>();

        // 总数
        long totalAlerts = alertRepository.count();
        stats.put("totalAlerts", totalAlerts);

        // 未处理数量
        long unhandledAlerts = alertRepository.countByHandledFalse();
        stats.put("unhandledAlerts", unhandledAlerts);

        // 按级别统计（1次GROUP BY替代4次独立查询）
        Map<String, Long> levelStats = new HashMap<>();
        levelStats.put("CRITICAL", 0L);
        levelStats.put("HIGH", 0L);
        levelStats.put("MEDIUM", 0L);
        levelStats.put("LOW", 0L);
        List<Object[]> levelGroups = alertRepository.countByAlertLevelGroup();
        for (Object[] row : levelGroups) {
            String level = (String) row[0];
            Long count = ((Number) row[1]).longValue();
            levelStats.put(level, count);
        }
        stats.put("alertsByLevel", levelStats);

        // 最近24小时告警数（需要创建对应的方法）
        // long recentAlerts = alertRepository.countByCreatedTimeAfter(LocalDateTime.now().minusHours(24));
        // stats.put("recent24hAlerts", recentAlerts);

        return stats;
    }

    @Override
    public Page<AlertResponse> getRecentAlerts(int count) {
        // 使用第一页，指定数量
        Pageable pageable = Pageable.ofSize(count);
        Page<Alert> alerts = alertRepository.findAll(pageable);
        return alerts.map(AlertResponse::fromEntity);
    }

    @Override
    public java.util.List<com.security.ailogsystem.entity.SecurityAlert> getLogCollectorAlerts(
            String status, String severity) {
        
        java.util.List<com.security.ailogsystem.entity.SecurityAlert> alerts;
        
        // Apply filters if provided
        if (severity != null && !severity.trim().isEmpty()) {
            try {
                com.security.ailogsystem.entity.SecurityAlert.AlertLevel level = 
                    com.security.ailogsystem.entity.SecurityAlert.AlertLevel.valueOf(severity.toUpperCase());
                
                if (status != null && !status.trim().isEmpty()) {
                    // Filter by both severity and status
                    boolean handled = "RESOLVED".equalsIgnoreCase(status) || "HANDLED".equalsIgnoreCase(status);
                    alerts = securityAlertRepository.findByAlertLevelAndHandledFalseOrderByCreatedTimeDesc(level);
                    if (handled) {
                        alerts = alerts.stream()
                            .filter(a -> a.getHandled() != null && a.getHandled())
                            .collect(java.util.stream.Collectors.toList());
                    } else {
                        alerts = alerts.stream()
                            .filter(a -> a.getHandled() == null || !a.getHandled())
                            .collect(java.util.stream.Collectors.toList());
                    }
                } else {
                    // Filter by severity only
                    alerts = securityAlertRepository.findByAlertLevelOrderByCreatedTimeDesc(level);
                }
            } catch (IllegalArgumentException e) {
                log.warn("Invalid severity level: {}", severity);
                throw new IllegalArgumentException("Severity must be one of: LOW, MEDIUM, HIGH, CRITICAL");
            }
        } else if (status != null && !status.trim().isEmpty()) {
            // Filter by status only
            boolean handled = "RESOLVED".equalsIgnoreCase(status) || "HANDLED".equalsIgnoreCase(status);
            if (handled) {
                alerts = securityAlertRepository.findAll().stream()
                    .filter(a -> a.getHandled() != null && a.getHandled())
                    .sorted((a1, a2) -> a2.getCreatedTime().compareTo(a1.getCreatedTime()))
                    .collect(java.util.stream.Collectors.toList());
            } else {
                alerts = securityAlertRepository.findByHandledFalseOrderByCreatedTimeDesc();
            }
        } else {
            // No filters - get all alerts ordered by timestamp descending
            alerts = securityAlertRepository.findAll().stream()
                .sorted((a1, a2) -> a2.getCreatedTime().compareTo(a1.getCreatedTime()))
                .collect(java.util.stream.Collectors.toList());
        }
        
        log.debug("Retrieved {} log collector alerts with filters: status={}, severity={}", 
                alerts.size(), status, severity);
        
        return alerts;
    }
    
    @Override
    @Transactional
    public boolean acknowledgeAlert(Long id) {
        try {
            com.security.ailogsystem.entity.SecurityAlert alert = 
                securityAlertRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("告警不存在: " + id));
            
            // 标记为已确认（但未解决）
            alert.setHandled(false); // 确认但未解决
            securityAlertRepository.save(alert);
            
            log.info("告警已确认: ID={}", id);
            return true;
        } catch (Exception e) {
            log.error("确认告警失败: ID={}", id, e);
            return false;
        }
    }

    @Override
    @Transactional
    public boolean resolveAlert(Long id) {
        try {
            com.security.ailogsystem.entity.SecurityAlert alert =
                securityAlertRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("告警不存在: " + id));

            // 标记为已解决
            alert.setHandled(true);
            securityAlertRepository.save(alert);

            log.info("告警已解决: ID={}", id);
            return true;
        } catch (Exception e) {
            log.error("解决告警失败: ID={}", id, e);
            return false;
        }
    }
}
