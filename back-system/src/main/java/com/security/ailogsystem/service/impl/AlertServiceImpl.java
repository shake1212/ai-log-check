package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.dto.request.AlertRequest;
import com.security.ailogsystem.dto.response.AlertResponse;
import com.security.ailogsystem.model.Alert;
import com.security.ailogsystem.model.LogEntry;
import com.security.ailogsystem.repository.AlertRepository;
import com.security.ailogsystem.repository.LogEntryRepository;
import com.security.ailogsystem.service.AlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertServiceImpl implements AlertService {

    private final AlertRepository alertRepository;
    private final LogEntryRepository logEntryRepository;

    @Override
    @Transactional
    public AlertResponse createAlert(AlertRequest request) {
        Alert alert = Alert.builder()
                .alertId(request.getAlertId())
                .source(request.getSource())
                .alertType(request.getAlertType())
                .alertLevel(request.getAlertLevel())
                .description(request.getDescription())
                .aiConfidence(request.getAiConfidence())
                .handled(false)
                .status(Alert.AlertStatus.PENDING)
                .build();

        if (request.getLogEntryId() != null) {
            LogEntry logEntry = logEntryRepository.findById(request.getLogEntryId())
                    .orElseThrow(() -> new RuntimeException("日志条目不存在: " + request.getLogEntryId()));
            alert.setLogEntry(logEntry);
        }

        Alert savedAlert = alertRepository.save(alert);
        log.info("创建告警成功: ID={}, Type={}, Level={}",
                savedAlert.getId(), savedAlert.getAlertType(), savedAlert.getAlertLevel());

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
    public Page<AlertResponse> searchAlerts(String keyword, String alertLevel,
                                            Boolean handled, Alert.AlertStatus status,
                                            Pageable pageable) {
        Page<Alert> alerts = alertRepository.searchAlerts(keyword, alertLevel, handled, status, pageable);
        return alerts.map(AlertResponse::fromEntity);
    }

    @Override
    @Transactional
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

        // 按级别统计
        Map<String, Long> levelStats = new HashMap<>();
        levelStats.put("CRITICAL", alertRepository.countByAlertLevel("CRITICAL"));
        levelStats.put("HIGH", alertRepository.countByAlertLevel("HIGH"));
        levelStats.put("MEDIUM", alertRepository.countByAlertLevel("MEDIUM"));
        levelStats.put("LOW", alertRepository.countByAlertLevel("LOW"));
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
}