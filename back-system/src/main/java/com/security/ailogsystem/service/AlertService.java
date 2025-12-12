package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.request.AlertRequest;
import com.security.ailogsystem.dto.response.AlertResponse;
import com.security.ailogsystem.model.Alert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Map;

public interface AlertService {

    // 创建告警
    AlertResponse createAlert(AlertRequest request);

    // 获取告警详情
    AlertResponse getAlertById(Long id);

    // 获取所有告警（分页）
    Page<AlertResponse> getAllAlerts(Pageable pageable);

    // 获取未处理告警
    Page<AlertResponse> getUnhandledAlerts(Pageable pageable);

    // 按处理状态获取告警
    Page<AlertResponse> getAlertsByHandled(Boolean handled, Pageable pageable);

    // 搜索告警
    Page<AlertResponse> searchAlerts(String keyword, String alertLevel,
                                     Boolean handled, Alert.AlertStatus status,
                                     Pageable pageable);

    // 标记告警为已处理
    boolean markAlertAsHandled(Long id, String handledBy, String resolution);

    // 更新告警状态
    boolean updateAlertStatus(Long id, Alert.AlertStatus status,
                              String assignee, String resolution);

    // 删除告警
    boolean deleteAlert(Long id);

    // 获取告警统计
    Map<String, Object> getAlertStatistics();

    // 获取最近告警
    Page<AlertResponse> getRecentAlerts(int count);
}