package com.security.ailogsystem.service;

import com.security.ailogsystem.model.WmiCollectionResult;
import com.security.ailogsystem.model.WmiCollectionTask;
import com.security.ailogsystem.model.WmiHost;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * WMI采集服务接口
 * 
 * @author AI Log System
 * @version 1.0
 */
public interface WmiCollectionService {

    /**
     * 执行WMI采集任务
     * 
     * @param task 采集任务
     * @return 采集结果
     */
    WmiCollectionResult executeCollectionTask(WmiCollectionTask task);

    /**
     * 异步执行WMI采集任务
     * 
     * @param task 采集任务
     * @return 异步结果
     */
    CompletableFuture<WmiCollectionResult> executeCollectionTaskAsync(WmiCollectionTask task);

    /**
     * 批量执行WMI采集任务
     * 
     * @param tasks 采集任务列表
     * @return 采集结果列表
     */
    List<WmiCollectionResult> executeCollectionTasks(List<WmiCollectionTask> tasks);

    /**
     * 异步批量执行WMI采集任务
     * 
     * @param tasks 采集任务列表
     * @return 异步结果列表
     */
    List<CompletableFuture<WmiCollectionResult>> executeCollectionTasksAsync(List<WmiCollectionTask> tasks);

    /**
     * 执行WMI查询
     * 
     * @param host 目标主机
     * @param wmiClass WMI类名
     * @param properties 查询属性
     * @return 查询结果
     */
    WmiCollectionResult executeWmiQuery(WmiHost host, String wmiClass, List<String> properties);

    /**
     * 测试WMI连接
     * 
     * @param host 目标主机
     * @return 连接测试结果
     */
    boolean testWmiConnection(WmiHost host);

    /**
     * 获取WMI类属性列表
     * 
     * @param host 目标主机
     * @param wmiClass WMI类名
     * @return 属性列表
     */
    List<String> getWmiClassProperties(WmiHost host, String wmiClass);

    /**
     * 获取可用的WMI类列表
     * 
     * @param host 目标主机
     * @return WMI类列表
     */
    List<String> getAvailableWmiClasses(WmiHost host);

    /**
     * 执行带重试的WMI采集
     * 
     * @param task 采集任务
     * @param maxRetries 最大重试次数
     * @param retryDelay 重试延迟（毫秒）
     * @return 采集结果
     */
    WmiCollectionResult executeCollectionTaskWithRetry(WmiCollectionTask task, int maxRetries, long retryDelay);

    /**
     * 处理采集异常
     * 
     * @param task 采集任务
     * @param exception 异常
     * @param retryCount 重试次数
     * @return 处理结果
     */
    WmiCollectionResult handleCollectionException(WmiCollectionTask task, Exception exception, int retryCount);

    /**
     * 获取采集统计信息
     * 
     * @param startTime 开始时间
     * @param endTime 结束时间
     * @return 统计信息
     */
    Map<String, Object> getCollectionStatistics(LocalDateTime startTime, LocalDateTime endTime);

    /**
     * 获取主机采集统计信息
     * 
     * @param hostId 主机ID
     * @param startTime 开始时间
     * @param endTime 结束时间
     * @return 统计信息
     */
    Map<String, Object> getHostCollectionStatistics(String hostId, LocalDateTime startTime, LocalDateTime endTime);

    /**
     * 清理过期的采集结果
     * 
     * @param expiredTime 过期时间
     * @return 清理数量
     */
    int cleanupExpiredResults(LocalDateTime expiredTime);

    /**
     * 停止所有正在执行的采集任务
     */
    void stopAllCollectionTasks();

    /**
     * 停止指定任务的采集
     * 
     * @param taskId 任务ID
     */
    void stopCollectionTask(String taskId);

    /**
     * 获取正在执行的任务列表
     * 
     * @return 任务列表
     */
    List<WmiCollectionTask> getRunningTasks();

    /**
     * 获取任务执行状态
     * 
     * @param taskId 任务ID
     * @return 执行状态
     */
    Map<String, Object> getTaskExecutionStatus(String taskId);
}
