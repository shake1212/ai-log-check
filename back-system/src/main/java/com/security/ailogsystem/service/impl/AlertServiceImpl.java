// service/impl/AlertServiceImpl.java
package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.entity.SecurityAlert;
import com.security.ailogsystem.repository.SecurityAlertRepository;
import com.security.ailogsystem.service.AlertService;
import com.security.ailogsystem.service.WebSocketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AlertServiceImpl implements AlertService {

    private static final Logger logger = LoggerFactory.getLogger(AlertServiceImpl.class);

    @Autowired
    private SecurityAlertRepository alertRepository;

    @Autowired
    private WebSocketService webSocketService;

    @Override
    public SecurityAlert createAlert(SecurityAlert alert) {
        try {
            alert.setCreatedTime(LocalDateTime.now());
            alert.setHandled(false);

            SecurityAlert savedAlert = alertRepository.save(alert);

            logger.info("创建安全警报: {} - {}", savedAlert.getAlertType(), savedAlert.getDescription());

            // 发送WebSocket通知
            webSocketService.sendSecurityAlert(savedAlert);

            return savedAlert;

        } catch (Exception e) {
            logger.error("创建警报失败", e);
            throw new RuntimeException("创建警报失败", e);
        }
    }

    @Override
    public List<SecurityAlert> createAlerts(List<SecurityAlert> alerts) {
        try {
            alerts.forEach(alert -> {
                alert.setCreatedTime(LocalDateTime.now());
                alert.setHandled(false);
            });

            List<SecurityAlert> savedAlerts = alertRepository.saveAll(alerts);

            logger.info("批量创建 {} 个安全警报", savedAlerts.size());

            // 发送WebSocket通知
            savedAlerts.forEach(webSocketService::sendSecurityAlert);

            return savedAlerts;

        } catch (Exception e) {
            logger.error("批量创建警报失败", e);
            throw new RuntimeException("批量创建警报失败", e);
        }
    }

    @Override
    public List<SecurityAlert> getUnhandledAlerts() {
        try {
            return alertRepository.findByHandledFalseOrderByCreatedTimeDesc();
        } catch (Exception e) {
            logger.error("获取未处理警报失败", e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<SecurityAlert> getAlertsByLevel(SecurityAlert.AlertLevel level) {
        try {
            return alertRepository.findByAlertLevelOrderByCreatedTimeDesc(level);
        } catch (Exception e) {
            logger.error("按级别获取警报失败", e);
            return Collections.emptyList();
        }
    }

    @Override
    public boolean markAlertAsHandled(Long alertId) {
        try {
            Optional<SecurityAlert> alertOpt = alertRepository.findById(alertId);
            if (alertOpt.isPresent()) {
                SecurityAlert alert = alertOpt.get();
                alert.setHandled(true);
                alertRepository.save(alert);

                logger.info("标记警报为已处理: {}", alertId);
                return true;
            }
            return false;
        } catch (Exception e) {
            logger.error("标记警报为已处理失败: {}", alertId, e);
            return false;
        }
    }

    @Override
    public int markAlertsAsHandled(List<Long> alertIds) {
        try {
            List<SecurityAlert> alerts = alertRepository.findAllById(alertIds);
            alerts.forEach(alert -> alert.setHandled(true));
            List<SecurityAlert> savedAlerts = alertRepository.saveAll(alerts);

            logger.info("批量标记 {} 个警报为已处理", savedAlerts.size());
            return savedAlerts.size();

        } catch (Exception e) {
            logger.error("批量标记警报为已处理失败", e);
            return 0;
        }
    }

    @Override
    public boolean deleteAlert(Long alertId) {
        try {
            if (alertRepository.existsById(alertId)) {
                alertRepository.deleteById(alertId);
                logger.info("删除警报: {}", alertId);
                return true;
            }
            return false;
        } catch (Exception e) {
            logger.error("删除警报失败: {}", alertId, e);
            return false;
        }
    }

    @Override
    public Map<String, Object> getAlertStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        Map<String, Object> statistics = new HashMap<>();

        try {
            // 获取警报总数
            Long totalAlerts = alertRepository.countByCreatedTimeBetween(startTime, endTime);
            statistics.put("totalAlerts", totalAlerts);

            // 获取未处理警报数
            Long unhandledAlerts = alertRepository.countByHandledFalseAndCreatedTimeBetween(startTime, endTime);
            statistics.put("unhandledAlerts", unhandledAlerts);

            // 按级别统计
            Map<String, Long> alertsByLevel = new HashMap<>();
            for (SecurityAlert.AlertLevel level : SecurityAlert.AlertLevel.values()) {
                Long count = alertRepository.countByAlertLevelAndCreatedTimeBetween(level, startTime, endTime);
                alertsByLevel.put(level.toString(), count);
            }
            statistics.put("alertsByLevel", alertsByLevel);

            // 按类型统计
            List<Object[]> alertsByType = alertRepository.countAlertsByType(startTime, endTime);
            Map<String, Long> alertsByTypeMap = alertsByType.stream()
                    .collect(Collectors.toMap(
                            arr -> (String) arr[0],
                            arr -> (Long) arr[1]
                    ));
            statistics.put("alertsByType", alertsByTypeMap);

            // 获取最近的高危警报
            List<SecurityAlert> recentCriticalAlerts = alertRepository
                    .findByAlertLevelAndCreatedTimeAfterOrderByCreatedTimeDesc(
                            SecurityAlert.AlertLevel.CRITICAL,
                            LocalDateTime.now().minusHours(24)
                    );
            statistics.put("recentCriticalAlerts", recentCriticalAlerts);

        } catch (Exception e) {
            logger.error("获取警报统计失败", e);
        }

        return statistics;
    }

    @Override
    public int cleanupExpiredAlerts(int retentionDays) {
        try {
            LocalDateTime threshold = LocalDateTime.now().minusDays(retentionDays);
            List<SecurityAlert> expiredAlerts = alertRepository.findByCreatedTimeBefore(threshold);

            if (!expiredAlerts.isEmpty()) {
                alertRepository.deleteAll(expiredAlerts);
                logger.info("清理了 {} 条过期警报", expiredAlerts.size());
                return expiredAlerts.size();
            }
        } catch (Exception e) {
            logger.error("清理过期警报失败", e);
        }

        return 0;
    }

    // 新增方法的实现

    @Override
    public SecurityAlert getAlertById(Long id) {
        try {
            return alertRepository.findById(id).orElse(null);
        } catch (Exception e) {
            logger.error("根据ID获取警报失败: {}", id, e);
            return null;
        }
    }

    @Override
    public Page<SecurityAlert> getAllAlerts(Pageable pageable) {
        try {
            return alertRepository.findAll(pageable);
        } catch (Exception e) {
            logger.error("获取所有警报失败", e);
            return Page.empty();
        }
    }

    @Override
    public Page<SecurityAlert> getAlertsByStatus(Boolean handled, Pageable pageable) {
        try {
            if (handled == null) {
                return alertRepository.findAll(pageable);
            }
            return alertRepository.findByHandled(handled, pageable);
        } catch (Exception e) {
            logger.error("根据状态获取警报失败", e);
            return Page.empty();
        }
    }

    @Override
    public Page<SecurityAlert> searchAlerts(String keyword, SecurityAlert.AlertLevel level,
                                            String alertType, Boolean handled,
                                            LocalDateTime startTime, LocalDateTime endTime,
                                            Pageable pageable) {
        try {
            return alertRepository.searchAlerts(keyword, level, alertType, handled, startTime, endTime, pageable);
        } catch (Exception e) {
            logger.error("搜索警报失败", e);
            return Page.empty();
        }
    }

    @Override
    public boolean updateAlertStatus(Long alertId, Boolean handled, String handledBy, String handledNote) {
        try {
            Optional<SecurityAlert> alertOpt = alertRepository.findById(alertId);
            if (alertOpt.isPresent()) {
                SecurityAlert alert = alertOpt.get();
                alert.setHandled(handled);
                // 这里可以添加处理人和处理备注字段
                alertRepository.save(alert);

                logger.info("更新警报状态: {} -> {}", alertId, handled);
                return true;
            }
            return false;
        } catch (Exception e) {
            logger.error("更新警报状态失败: {}", alertId, e);
            return false;
        }
    }

    @Override
    public List<SecurityAlert> getRecentAlerts(int count) {
        try {
            List<SecurityAlert> recentAlerts = alertRepository.findTop10ByOrderByCreatedTimeDesc();
            return recentAlerts.stream().limit(count).collect(Collectors.toList());
        } catch (Exception e) {
            logger.error("获取最近警报失败", e);
            return Collections.emptyList();
        }
    }

    @Override
    public Map<String, Object> getAlertStatistics() {
        // 默认获取最近30天的统计
        LocalDateTime endTime = LocalDateTime.now();
        LocalDateTime startTime = endTime.minusDays(30);
        return getAlertStatistics(startTime, endTime);
    }
}