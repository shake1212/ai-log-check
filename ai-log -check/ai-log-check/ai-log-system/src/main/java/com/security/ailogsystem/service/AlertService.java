package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.AlertDTO;
import com.security.ailogsystem.model.Alert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface AlertService {
    
    AlertDTO createAlert(AlertDTO alertDTO);
    
    AlertDTO getAlertById(String id);
    
    Page<AlertDTO> getAllAlerts(Pageable pageable);
    
    Page<AlertDTO> getAlertsByStatus(Alert.AlertStatus status, Pageable pageable);
    
    Page<AlertDTO> searchAlerts(
            String source,
            String type,
            String level,
            Alert.AlertStatus status,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String keyword,
            Pageable pageable);
    
    AlertDTO updateAlertStatus(String id, Alert.AlertStatus status, String assignee, String resolution);
    
    List<AlertDTO> getRecentAlerts(int limit);
    
    Map<String, Long> getAlertStatistics();
    
    void deleteAlert(String id);
} 