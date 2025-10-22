package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.dto.AlertDTO;
import com.security.ailogsystem.model.Alert;
import com.security.ailogsystem.repository.AlertRepository;
import com.security.ailogsystem.service.AlertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class AlertServiceImpl implements AlertService {

    @Autowired
    private AlertRepository alertRepository;

    @Override
    public AlertDTO createAlert(AlertDTO alertDTO) {
        Alert alert = new Alert();
        alert.setAlertId(alertDTO.getId());
        alert.setTimestamp(alertDTO.getTimestamp());
        alert.setSource(alertDTO.getSource());
        alert.setType(alertDTO.getType());
        alert.setLevel(alertDTO.getLevel());
        alert.setDescription(alertDTO.getDescription());
        alert.setStatus(alertDTO.getStatus());
        alert.setAssignee(alertDTO.getAssignee());
        alert.setResolution(alertDTO.getResolution());
        alert.setAiConfidence(alertDTO.getAiConfidence() != null ? 
            java.math.BigDecimal.valueOf(alertDTO.getAiConfidence()) : null);
        
        Alert savedAlert = alertRepository.save(alert);
        return convertToDTO(savedAlert);
    }

    @Override
    @Transactional(readOnly = true)
    public AlertDTO getAlertById(String id) {
        Alert alert = alertRepository.findByAlertId(id)
                .orElseThrow(() -> new RuntimeException("Alert not found with id: " + id));
        return convertToDTO(alert);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AlertDTO> getAllAlerts(Pageable pageable) {
        Page<Alert> alerts = alertRepository.findAll(pageable);
        return alerts.map(this::convertToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AlertDTO> getAlertsByStatus(Alert.AlertStatus status, Pageable pageable) {
        Page<Alert> alerts = alertRepository.findByStatus(status, pageable);
        return alerts.map(this::convertToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AlertDTO> searchAlerts(String source, String type, String level, 
                                      Alert.AlertStatus status, LocalDateTime startTime, 
                                      LocalDateTime endTime, String keyword, Pageable pageable) {
        // 这里可以实现更复杂的搜索逻辑
        Page<Alert> alerts = alertRepository.findAll(pageable);
        return alerts.map(this::convertToDTO);
    }

    @Override
    public AlertDTO updateAlertStatus(String id, Alert.AlertStatus status, String assignee, String resolution) {
        Alert alert = alertRepository.findByAlertId(id)
                .orElseThrow(() -> new RuntimeException("Alert not found with id: " + id));
        
        alert.setStatus(status);
        alert.setAssignee(assignee);
        alert.setResolution(resolution);
        
        Alert updatedAlert = alertRepository.save(alert);
        return convertToDTO(updatedAlert);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlertDTO> getRecentAlerts(int limit) {
        List<Alert> alerts = alertRepository.findTop10ByOrderByTimestampDesc();
        return alerts.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> getAlertStatistics() {
        Map<String, Long> statistics = new HashMap<>();
        
        // 按状态统计
        for (Alert.AlertStatus status : Alert.AlertStatus.values()) {
            long count = alertRepository.countByStatus(status);
            statistics.put("status_" + status.name().toLowerCase(), count);
        }
        
        // 按级别统计
        statistics.put("level_high", alertRepository.countByLevel("HIGH"));
        statistics.put("level_medium", alertRepository.countByLevel("MEDIUM"));
        statistics.put("level_low", alertRepository.countByLevel("LOW"));
        
        return statistics;
    }

    @Override
    public void deleteAlert(String id) {
        Alert alert = alertRepository.findByAlertId(id)
                .orElseThrow(() -> new RuntimeException("Alert not found with id: " + id));
        alertRepository.delete(alert);
    }

    private AlertDTO convertToDTO(Alert alert) {
        AlertDTO dto = new AlertDTO();
        dto.setId(alert.getAlertId());
        dto.setTimestamp(alert.getTimestamp());
        dto.setSource(alert.getSource());
        dto.setType(alert.getType());
        dto.setLevel(alert.getLevel());
        dto.setDescription(alert.getDescription());
        dto.setStatus(alert.getStatus());
        dto.setAssignee(alert.getAssignee());
        dto.setResolution(alert.getResolution());
        dto.setAiConfidence(alert.getAiConfidence() != null ? 
            alert.getAiConfidence().doubleValue() : null);
        dto.setLogEntryId(alert.getLogEntry() != null ? 
            alert.getLogEntry().getId().toString() : null);
        return dto;
    }
}
