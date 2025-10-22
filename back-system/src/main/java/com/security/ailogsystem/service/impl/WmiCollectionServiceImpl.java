package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.exception.WmiAuthenticationException;
import com.security.ailogsystem.exception.WmiCollectionException;
import com.security.ailogsystem.exception.WmiConnectionException;
import com.security.ailogsystem.model.WmiCollectionResult;
import com.security.ailogsystem.model.WmiCollectionTask;
import com.security.ailogsystem.model.WmiHost;
import com.security.ailogsystem.repository.WmiCollectionResultRepository;
import com.security.ailogsystem.repository.WmiCollectionTaskRepository;
import com.security.ailogsystem.repository.WmiHostRepository;
import com.security.ailogsystem.service.WmiCollectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.retry.support.RetryTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

/**
 * WMI采集服务实现类
 * 
 * @author AI Log System
 * @version 1.0
 */
@Slf4j
@Service
@Transactional
public class WmiCollectionServiceImpl implements WmiCollectionService {

    private final WmiCollectionTaskRepository taskRepository;
    private final WmiCollectionResultRepository resultRepository;
    private final WmiHostRepository hostRepository;
    private final RetryTemplate retryTemplate;
    private final RetryTemplate exponentialRetryTemplate;
    private final RetryTemplate quickRetryTemplate;
    private final RetryTemplate longRetryTemplate;

    public WmiCollectionServiceImpl(
            WmiCollectionTaskRepository taskRepository,
            WmiCollectionResultRepository resultRepository,
            WmiHostRepository hostRepository,
            @Qualifier("wmiRetryTemplate") RetryTemplate retryTemplate,
            @Qualifier("wmiExponentialRetryTemplate") RetryTemplate exponentialRetryTemplate,
            @Qualifier("wmiQuickRetryTemplate") RetryTemplate quickRetryTemplate,
            @Qualifier("wmiLongRetryTemplate") RetryTemplate longRetryTemplate) {
        this.taskRepository = taskRepository;
        this.resultRepository = resultRepository;
        this.hostRepository = hostRepository;
        this.retryTemplate = retryTemplate;
        this.exponentialRetryTemplate = exponentialRetryTemplate;
        this.quickRetryTemplate = quickRetryTemplate;
        this.longRetryTemplate = longRetryTemplate;
    }

    // 正在执行的任务缓存
    private final Map<String, WmiCollectionTask> runningTasks = new ConcurrentHashMap<>();

    @Override
    @Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class)
    public WmiCollectionResult executeCollectionTask(WmiCollectionTask task) {
        log.info("开始执行WMI采集任务: {} -> {}:{}", task.getTaskId(), task.getTargetHost(), task.getWmiClass());
        
        long startTime = System.currentTimeMillis();
        WmiCollectionResult result = null;
        
        try {
            // 标记任务为运行中
            runningTasks.put(task.getTaskId(), task);
            updateTaskStatus(task.getTaskId(), WmiCollectionTask.TaskStatus.RUNNING);
            
            // 获取主机配置
            WmiHost host = hostRepository.findByHostname(task.getTargetHost())
                    .orElseThrow(() -> new WmiConnectionException("主机不存在: " + task.getTargetHost(), task.getTargetHost()));
            
            // 执行WMI查询
            result = executeWmiQueryWithRetry(host, task);
            
            // 更新任务统计
            updateTaskSuccessStats(task.getTaskId());
            updateHostSuccessStats(host.getHostId());
            
            log.info("WMI采集任务执行成功: {} -> {}:{}，耗时: {}ms", 
                    task.getTaskId(), task.getTargetHost(), task.getWmiClass(), 
                    System.currentTimeMillis() - startTime);
            
        } catch (Exception e) {
            log.error("WMI采集任务执行失败: {} -> {}:{}", 
                    task.getTaskId(), task.getTargetHost(), task.getWmiClass(), e);
            
            result = handleCollectionException(task, e, task.getCurrentRetryCount());
            updateTaskFailureStats(task.getTaskId(), e.getMessage());
            updateHostFailureStatsByHostname(task.getTargetHost(), e.getMessage());
            
        } finally {
            // 移除运行中的任务
            runningTasks.remove(task.getTaskId());
        }
        
        return result;
    }

    @Override
    @Async("wmiCollectionExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)
    public CompletableFuture<WmiCollectionResult> executeCollectionTaskAsync(WmiCollectionTask task) {
        return CompletableFuture.supplyAsync(() -> executeCollectionTask(task));
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class)
    public List<WmiCollectionResult> executeCollectionTasks(List<WmiCollectionTask> tasks) {
        log.info("开始批量执行WMI采集任务，数量: {}", tasks.size());
        
        List<WmiCollectionResult> results = new ArrayList<>();
        
        for (WmiCollectionTask task : tasks) {
            try {
                WmiCollectionResult result = executeCollectionTask(task);
                results.add(result);
            } catch (Exception e) {
                log.error("批量执行WMI采集任务失败: {}", task.getTaskId(), e);
                WmiCollectionResult errorResult = handleCollectionException(task, e, 0);
                results.add(errorResult);
            }
        }
        
        log.info("批量执行WMI采集任务完成，成功: {}，失败: {}", 
                results.stream().mapToInt(r -> r.getStatus() == WmiCollectionResult.CollectionStatus.SUCCESS ? 1 : 0).sum(),
                results.stream().mapToInt(r -> r.getStatus() != WmiCollectionResult.CollectionStatus.SUCCESS ? 1 : 0).sum());
        
        return results;
    }

    @Override
    @Async("wmiCollectionExecutor")
    public List<CompletableFuture<WmiCollectionResult>> executeCollectionTasksAsync(List<WmiCollectionTask> tasks) {
        return tasks.stream()
                .map(this::executeCollectionTaskAsync)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class)
    public WmiCollectionResult executeWmiQuery(WmiHost host, String wmiClass, List<String> properties) {
        log.info("执行WMI查询: {} -> {}", host.getHostname(), wmiClass);
        
        long startTime = System.currentTimeMillis();
        
        try {
            // 测试连接
            if (!testWmiConnection(host)) {
                throw new WmiConnectionException("WMI连接失败", host.getHostname());
            }
            
            // 执行WMI查询（模拟）
            WmiCollectionResult result = simulateWmiQuery(host, wmiClass, properties);
            result.setDurationMs(System.currentTimeMillis() - startTime);
            
            // 保存结果
            result = resultRepository.save(result);
            
            log.info("WMI查询执行成功: {} -> {}，耗时: {}ms", 
                    host.getHostname(), wmiClass, result.getDurationMs());
            
            return result;
            
        } catch (Exception e) {
            log.error("WMI查询执行失败: {} -> {}", host.getHostname(), wmiClass, e);
            
            WmiCollectionResult errorResult = createErrorResult(host, wmiClass, e, 0);
            errorResult.setDurationMs(System.currentTimeMillis() - startTime);
            
            return resultRepository.save(errorResult);
        }
    }

    @Override
    public boolean testWmiConnection(WmiHost host) {
        log.debug("测试WMI连接: {}", host.getHostname());
        
        try {
            return quickRetryTemplate.execute(context -> {
                // 模拟连接测试
                if (Math.random() < 0.1) { // 10%的失败率用于测试
                    throw new WmiConnectionException("连接超时", host.getHostname());
                }
                
                // 更新连接统计
                updateHostConnectionStats(host.getHostId());
                return true;
            });
            
        } catch (Exception e) {
            log.error("WMI连接测试失败: {}", host.getHostname(), e);
            updateHostFailureStats(host.getHostId(), e.getMessage());
            return false;
        }
    }

    @Override
    public List<String> getWmiClassProperties(WmiHost host, String wmiClass) {
        log.debug("获取WMI类属性: {} -> {}", host.getHostname(), wmiClass);
        
        // 模拟返回WMI类属性
        return Arrays.asList("Name", "Description", "Status", "State", "Enabled", "InstallDate", "LastBootUpTime");
    }

    @Override
    public List<String> getAvailableWmiClasses(WmiHost host) {
        log.debug("获取可用WMI类: {}", host.getHostname());
        
        // 模拟返回可用的WMI类
        return Arrays.asList(
                "Win32_ComputerSystem",
                "Win32_OperatingSystem", 
                "Win32_Process",
                "Win32_Service",
                "Win32_LogicalDisk",
                "Win32_NetworkAdapter",
                "Win32_SystemDriver"
        );
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class)
    public WmiCollectionResult executeCollectionTaskWithRetry(WmiCollectionTask task, int maxRetries, long retryDelay) {
        log.info("执行带重试的WMI采集任务: {} -> {}:{}，最大重试次数: {}", 
                task.getTaskId(), task.getTargetHost(), task.getWmiClass(), maxRetries);
        
        return longRetryTemplate.execute(context -> {
            try {
                return executeCollectionTask(task);
            } catch (Exception e) {
                log.warn("WMI采集任务重试失败 (第{}次): {} -> {}:{}", 
                        context.getRetryCount(), task.getTaskId(), task.getTargetHost(), task.getWmiClass(), e);
                
                if (context.getRetryCount() >= maxRetries) {
                    throw new WmiCollectionException(
                            "WMI采集任务重试次数已达上限", 
                            task.getTargetHost(), 
                            task.getWmiClass(), 
                            context.getRetryCount(), 
                            System.currentTimeMillis(), 
                            e
                    );
                }
                
                throw e;
            }
        });
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class)
    public WmiCollectionResult handleCollectionException(WmiCollectionTask task, Exception exception, int retryCount) {
        log.error("处理WMI采集异常: {} -> {}:{}，重试次数: {}", 
                task.getTaskId(), task.getTargetHost(), task.getWmiClass(), retryCount, exception);
        
        WmiCollectionResult result = createErrorResult(task, exception, retryCount);
        
        // 判断是否需要重试
        if (retryCount < task.getMaxRetryCount() && shouldRetry(exception)) {
            log.info("WMI采集任务将进行重试: {} -> {}:{}，当前重试次数: {}/{}", 
                    task.getTaskId(), task.getTargetHost(), task.getWmiClass(), 
                    retryCount + 1, task.getMaxRetryCount());
            
            // 更新重试计数
            updateTaskRetryCount(task.getTaskId(), retryCount + 1, exception.getMessage());
            
            // 设置任务状态为重试中
            updateTaskStatus(task.getTaskId(), WmiCollectionTask.TaskStatus.RETRYING);
            
            // 计算下次执行时间
            LocalDateTime nextTime = LocalDateTime.now().plusSeconds(calculateRetryDelay(retryCount));
            updateTaskNextCollectionTime(task.getTaskId(), nextTime);
            
        } else {
            log.error("WMI采集任务重试次数已达上限或不可重试: {} -> {}:{}", 
                    task.getTaskId(), task.getTargetHost(), task.getWmiClass());
            
            // 设置任务状态为失败
            updateTaskStatus(task.getTaskId(), WmiCollectionTask.TaskStatus.FAILED);
        }
        
        return resultRepository.save(result);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getCollectionStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        Map<String, Object> stats = new HashMap<>();
        
        // 总采集次数
        long totalCollections = resultRepository.countResultsByTimeRange(startTime, endTime);
        stats.put("totalCollections", totalCollections);
        
        // 成功采集次数
        long successCollections = resultRepository.countSuccessResultsByTimeRange(startTime, endTime);
        stats.put("successCollections", successCollections);
        
        // 失败采集次数
        long failureCollections = resultRepository.countFailureResultsByTimeRange(startTime, endTime);
        stats.put("failureCollections", failureCollections);
        
        // 成功率
        double successRate = totalCollections > 0 ? (double) successCollections / totalCollections : 0.0;
        stats.put("successRate", successRate);
        
        // 各状态统计
        List<Object[]> statusStats = resultRepository.countResultsByStatus();
        Map<String, Long> statusMap = new HashMap<>();
        for (Object[] stat : statusStats) {
            statusMap.put(stat[0].toString(), (Long) stat[1]);
        }
        stats.put("statusStatistics", statusMap);
        
        // 各主机统计
        List<Object[]> hostStats = resultRepository.countResultsByHost();
        Map<String, Long> hostMap = new HashMap<>();
        for (Object[] stat : hostStats) {
            hostMap.put(stat[0].toString(), (Long) stat[1]);
        }
        stats.put("hostStatistics", hostMap);
        
        return stats;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getHostCollectionStatistics(String hostId, LocalDateTime startTime, LocalDateTime endTime) {
        Map<String, Object> stats = new HashMap<>();
        
        // 获取主机信息
        WmiHost host = hostRepository.findByHostId(hostId).orElse(null);
        if (host == null) {
            stats.put("error", "主机不存在");
            return stats;
        }
        
        stats.put("hostId", hostId);
        stats.put("hostname", host.getHostname());
        stats.put("ipAddress", host.getIpAddress());
        
        // 采集统计
        List<WmiCollectionResult> results = resultRepository.findByTargetHostAndCollectionTimeBetween(
                host.getHostname(), startTime, endTime);
        
        long totalCollections = results.size();
        long successCollections = results.stream()
                .mapToLong(r -> r.getStatus() == WmiCollectionResult.CollectionStatus.SUCCESS ? 1 : 0)
                .sum();
        long failureCollections = totalCollections - successCollections;
        
        stats.put("totalCollections", totalCollections);
        stats.put("successCollections", successCollections);
        stats.put("failureCollections", failureCollections);
        stats.put("successRate", totalCollections > 0 ? (double) successCollections / totalCollections : 0.0);
        
        // 平均响应时间
        double avgResponseTime = results.stream()
                .filter(r -> r.getDurationMs() != null)
                .mapToLong(WmiCollectionResult::getDurationMs)
                .average()
                .orElse(0.0);
        stats.put("avgResponseTime", avgResponseTime);
        
        return stats;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class)
    public int cleanupExpiredResults(LocalDateTime expiredTime) {
        log.info("清理过期的WMI采集结果，过期时间: {}", expiredTime);
        
        int deletedCount = resultRepository.deleteExpiredResults(expiredTime);
        log.info("清理过期的WMI采集结果完成，删除数量: {}", deletedCount);
        
        return deletedCount;
    }

    @Override
    public void stopAllCollectionTasks() {
        log.info("停止所有正在执行的WMI采集任务");
        
        runningTasks.clear();
        
        // 更新所有运行中的任务状态为取消
        taskRepository.updateTaskStatus("RUNNING", WmiCollectionTask.TaskStatus.CANCELLED, LocalDateTime.now());
    }

    @Override
    public void stopCollectionTask(String taskId) {
        log.info("停止WMI采集任务: {}", taskId);
        
        runningTasks.remove(taskId);
        updateTaskStatus(taskId, WmiCollectionTask.TaskStatus.CANCELLED);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WmiCollectionTask> getRunningTasks() {
        return new ArrayList<>(runningTasks.values());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getTaskExecutionStatus(String taskId) {
        Map<String, Object> status = new HashMap<>();
        
        WmiCollectionTask task = taskRepository.findByTaskId(taskId).orElse(null);
        if (task == null) {
            status.put("error", "任务不存在");
            return status;
        }
        
        status.put("taskId", taskId);
        status.put("status", task.getStatus());
        status.put("targetHost", task.getTargetHost());
        status.put("wmiClass", task.getWmiClass());
        status.put("currentRetryCount", task.getCurrentRetryCount());
        status.put("maxRetryCount", task.getMaxRetryCount());
        status.put("lastCollectionTime", task.getLastCollectionTime());
        status.put("nextCollectionTime", task.getNextCollectionTime());
        status.put("lastSuccessTime", task.getLastSuccessTime());
        status.put("lastErrorTime", task.getLastErrorTime());
        status.put("lastErrorMessage", task.getLastErrorMessage());
        status.put("totalCollections", task.getTotalCollections());
        status.put("successfulCollections", task.getSuccessfulCollections());
        status.put("failedCollections", task.getFailedCollections());
        status.put("successRate", task.getSuccessRate());
        status.put("isRunning", runningTasks.containsKey(taskId));
        
        return status;
    }

    // 私有辅助方法

    private WmiCollectionResult executeWmiQueryWithRetry(WmiHost host, WmiCollectionTask task) {
        return retryTemplate.execute(context -> {
            try {
                return executeWmiQuery(host, task.getWmiClass(), 
                        task.getParameters() != null ? 
                                new ArrayList<>(task.getParameters().keySet()) : 
                                getWmiClassProperties(host, task.getWmiClass()));
            } catch (Exception e) {
                log.warn("WMI查询重试失败 (第{}次): {} -> {}:{}", 
                        context.getRetryCount(), task.getTaskId(), task.getTargetHost(), task.getWmiClass(), e);
                throw e;
            }
        });
    }

    private WmiCollectionResult simulateWmiQuery(WmiHost host, String wmiClass, List<String> properties) {
        // 模拟WMI查询结果
        WmiCollectionResult result = WmiCollectionResult.builder()
                .resultId(UUID.randomUUID().toString())
                .taskId(UUID.randomUUID().toString())
                .targetHost(host.getHostname())
                .wmiClass(wmiClass)
                .status(WmiCollectionResult.CollectionStatus.SUCCESS)
                .collectionTime(LocalDateTime.now())
                .retryCount(0)
                .recordsCollected(1)
                .rawData("{\"Name\":\"TestSystem\",\"Status\":\"OK\",\"LastBootUpTime\":\"" + LocalDateTime.now() + "\"}")
                .processedData("{\"system_name\":\"TestSystem\",\"status\":\"OK\",\"last_boot\":\"" + LocalDateTime.now() + "\"}")
                .isAnomaly(false)
                .anomalyScore(0.0)
                .build();
        
        // 模拟异常检测
        if (Math.random() < 0.05) { // 5%的异常率
            result.setIsAnomaly(true);
            result.setAnomalyScore(Math.random());
            result.setAnomalyReason("检测到异常模式");
        }
        
        return result;
    }

    private WmiCollectionResult createErrorResult(WmiHost host, String wmiClass, Exception exception, int retryCount) {
        return WmiCollectionResult.builder()
                .resultId(UUID.randomUUID().toString())
                .taskId(UUID.randomUUID().toString())
                .targetHost(host.getHostname())
                .wmiClass(wmiClass)
                .status(determineErrorStatus(exception))
                .collectionTime(LocalDateTime.now())
                .retryCount(retryCount)
                .recordsCollected(0)
                .errorMessage(exception.getMessage())
                .errorCode(exception.getClass().getSimpleName())
                .isAnomaly(false)
                .anomalyScore(0.0)
                .build();
    }

    private WmiCollectionResult createErrorResult(WmiCollectionTask task, Exception exception, int retryCount) {
        return WmiCollectionResult.builder()
                .resultId(UUID.randomUUID().toString())
                .taskId(task.getTaskId())
                .targetHost(task.getTargetHost())
                .wmiClass(task.getWmiClass())
                .status(determineErrorStatus(exception))
                .collectionTime(LocalDateTime.now())
                .retryCount(retryCount)
                .recordsCollected(0)
                .errorMessage(exception.getMessage())
                .errorCode(exception.getClass().getSimpleName())
                .isAnomaly(false)
                .anomalyScore(0.0)
                .build();
    }

    private WmiCollectionResult.CollectionStatus determineErrorStatus(Exception exception) {
        if (exception instanceof WmiConnectionException) {
            return WmiCollectionResult.CollectionStatus.CONNECTION_ERROR;
        } else if (exception instanceof WmiAuthenticationException) {
            return WmiCollectionResult.CollectionStatus.AUTHENTICATION_ERROR;
        } else if (exception instanceof SecurityException) {
            return WmiCollectionResult.CollectionStatus.PERMISSION_ERROR;
        } else if (exception instanceof IllegalArgumentException) {
            return WmiCollectionResult.CollectionStatus.DATA_ERROR;
        } else {
            return WmiCollectionResult.CollectionStatus.UNKNOWN_ERROR;
        }
    }

    private boolean shouldRetry(Exception exception) {
        // 连接错误和认证错误可以重试
        return exception instanceof WmiConnectionException || 
               exception instanceof WmiAuthenticationException;
    }

    private long calculateRetryDelay(int retryCount) {
        // 指数退避：1秒, 2秒, 4秒, 8秒...
        return (long) Math.pow(2, retryCount);
    }

    private void updateTaskStatus(String taskId, WmiCollectionTask.TaskStatus status) {
        taskRepository.updateTaskStatus(taskId, status, LocalDateTime.now());
    }

    private void updateTaskRetryCount(String taskId, int retryCount, String errorMessage) {
        taskRepository.updateRetryCount(taskId, retryCount, LocalDateTime.now(), errorMessage, LocalDateTime.now());
    }

    private void updateTaskSuccessStats(String taskId) {
        taskRepository.updateSuccessStats(taskId, LocalDateTime.now(), LocalDateTime.now());
    }

    private void updateTaskFailureStats(String taskId, String errorMessage) {
        taskRepository.updateFailureStats(taskId, LocalDateTime.now(), errorMessage, LocalDateTime.now());
    }

    private void updateTaskNextCollectionTime(String taskId, LocalDateTime nextTime) {
        taskRepository.updateNextCollectionTime(taskId, nextTime, LocalDateTime.now());
    }

    private void updateHostConnectionStats(String hostId) {
        hostRepository.updateConnectionStats(hostId, LocalDateTime.now(), LocalDateTime.now());
    }

    private void updateHostSuccessStats(String hostId) {
        hostRepository.updateSuccessStats(hostId, LocalDateTime.now(), LocalDateTime.now());
    }

    private void updateHostFailureStats(String hostId, String errorMessage) {
        hostRepository.updateFailureStats(hostId, LocalDateTime.now(), errorMessage, LocalDateTime.now());
    }

    private void updateHostFailureStatsByHostname(String hostname, String errorMessage) {
        WmiHost host = hostRepository.findByHostname(hostname).orElse(null);
        if (host != null) {
            updateHostFailureStats(host.getHostId(), errorMessage);
        }
    }
}
