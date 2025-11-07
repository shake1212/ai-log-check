// service/AlertService.java
package com.security.ailogsystem.service;

import com.security.ailogsystem.entity.SecurityAlert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 警报服务接口
 */
public interface AlertService {

    /**
     * 创建安全警报
     * @param alert 警报信息
     * @return 创建的警报
     */
    SecurityAlert createAlert(SecurityAlert alert);

    /**
     * 批量创建警报
     * @param alerts 警报列表
     * @return 创建的警报列表
     */
    List<SecurityAlert> createAlerts(List<SecurityAlert> alerts);

    /**
     * 获取未处理的警报
     * @return 未处理警报列表
     */
    List<SecurityAlert> getUnhandledAlerts();

    /**
     * 获取指定级别的警报
     * @param level 警报级别
     * @return 警报列表
     */
    List<SecurityAlert> getAlertsByLevel(SecurityAlert.AlertLevel level);

    /**
     * 标记警报为已处理
     * @param alertId 警报ID
     * @return 是否成功
     */
    boolean markAlertAsHandled(Long alertId);

    /**
     * 批量标记警报为已处理
     * @param alertIds 警报ID列表
     * @return 成功数量
     */
    int markAlertsAsHandled(List<Long> alertIds);

    /**
     * 删除警报
     * @param alertId 警报ID
     * @return 是否成功
     */
    boolean deleteAlert(Long alertId);

    /**
     * 获取警报统计信息
     * @param startTime 开始时间
     * @param endTime 结束时间
     * @return 统计信息
     */
    Map<String, Object> getAlertStatistics(LocalDateTime startTime, LocalDateTime endTime);

    /**
     * 清理过期警报
     * @param retentionDays 保留天数
     * @return 清理数量
     */
    int cleanupExpiredAlerts(int retentionDays);

    // 新增方法
    /**
     * 根据ID获取警报
     * @param id 警报ID
     * @return 警报信息
     */
    SecurityAlert getAlertById(Long id);

    /**
     * 获取所有警报（分页）
     * @param pageable 分页信息
     * @return 分页警报列表
     */
    Page<SecurityAlert> getAllAlerts(Pageable pageable);

    /**
     * 根据处理状态获取警报
     * @param handled 处理状态
     * @param pageable 分页信息
     * @return 分页警报列表
     */
    Page<SecurityAlert> getAlertsByStatus(Boolean handled, Pageable pageable);

    /**
     * 搜索警报
     * @param keyword 关键词
     * @param level 警报级别
     * @param alertType 警报类型
     * @param handled 处理状态
     * @param startTime 开始时间
     * @param endTime 结束时间
     * @param pageable 分页信息
     * @return 分页警报列表
     */
    Page<SecurityAlert> searchAlerts(String keyword, SecurityAlert.AlertLevel level,
                                     String alertType, Boolean handled,
                                     LocalDateTime startTime, LocalDateTime endTime,
                                     Pageable pageable);

    /**
     * 更新警报状态
     * @param alertId 警报ID
     * @param handled 处理状态
     * @param handledBy 处理人
     * @param handledNote 处理备注
     * @return 是否成功
     */
    boolean updateAlertStatus(Long alertId, Boolean handled, String handledBy, String handledNote);

    /**
     * 获取最近警报
     * @param count 数量
     * @return 警报列表
     */
    List<SecurityAlert> getRecentAlerts(int count);

    /**
     * 获取警报统计（无参数）
     * @return 统计信息
     */
    Map<String, Object> getAlertStatistics();
}