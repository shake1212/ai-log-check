package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.ScriptRunResponse;

import java.util.Map;

/**
 * 安全日志采集服务接口
 * 负责调用Python脚本采集Windows安全事件日志
 */
public interface SecurityLogCollectorService {

    /**
     * 手动触发安全日志采集
     * @return 采集执行结果
     */
    ScriptRunResponse collectSecurityLogs();

    /**
     * 获取采集器状态
     * @return 状态信息
     */
    Map<String, Object> getCollectorStatus();

    /**
     * 启动定时采集任务
     * @param intervalMinutes 采集间隔（分钟）
     * @return 是否启动成功
     */
    boolean startScheduledCollection(int intervalMinutes);

    /**
     * 停止定时采集任务
     * @return 是否停止成功
     */
    boolean stopScheduledCollection();

    /**
     * 检查定时任务是否正在运行
     * @return 是否运行中
     */
    boolean isScheduledCollectionRunning();
}
