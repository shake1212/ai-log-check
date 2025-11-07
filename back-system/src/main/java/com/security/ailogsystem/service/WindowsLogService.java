// service/WindowsLogService.java
package com.security.ailogsystem.service;

import com.security.ailogsystem.entity.SecurityLog;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Windows日志采集服务接口
 */
public interface WindowsLogService {

    /**
     * 采集Windows安全日志
     * @return 采集到的日志列表
     */
    List<SecurityLog> collectSecurityLogs();

    /**
     * 采集指定时间范围的日志
     * @param startTime 开始时间
     * @param endTime 结束时间
     * @return 日志列表
     */
    List<SecurityLog> collectLogsByTimeRange(LocalDateTime startTime, LocalDateTime endTime);

    /**
     * 实时监听日志事件
     */
    void startRealTimeMonitoring();

    /**
     * 停止实时监听
     */
    void stopRealTimeMonitoring();

    /**
     * 获取采集状态
     * @return 状态信息
     */
    Map<String, Object> getCollectionStatus();

    /**
     * 清理过期日志
     * @param retentionDays 保留天数
     * @return 清理数量
     */
    int cleanupExpiredLogs(int retentionDays);
}