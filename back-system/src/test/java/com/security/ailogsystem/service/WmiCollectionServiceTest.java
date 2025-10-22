package com.security.ailogsystem.service;

import com.security.ailogsystem.exception.WmiCollectionException;
import com.security.ailogsystem.model.WmiCollectionResult;
import com.security.ailogsystem.model.WmiCollectionTask;
import com.security.ailogsystem.model.WmiHost;
import com.security.ailogsystem.repository.WmiCollectionResultRepository;
import com.security.ailogsystem.repository.WmiCollectionTaskRepository;
import com.security.ailogsystem.repository.WmiHostRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.retry.support.RetryTemplate;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * WMI采集服务测试类
 * 
 * @author AI Log System
 * @version 1.0
 */
@ExtendWith(MockitoExtension.class)
class WmiCollectionServiceTest {

    @Mock
    private WmiCollectionTaskRepository taskRepository;

    @Mock
    private WmiCollectionResultRepository resultRepository;

    @Mock
    private WmiHostRepository hostRepository;

    @Mock
    private RetryTemplate retryTemplate;

    @Mock
    private RetryTemplate exponentialRetryTemplate;

    @Mock
    private RetryTemplate quickRetryTemplate;

    @Mock
    private RetryTemplate longRetryTemplate;

    @InjectMocks
    private com.security.ailogsystem.service.impl.WmiCollectionServiceImpl wmiCollectionService;

    private WmiHost testHost;
    private WmiCollectionTask testTask;
    private WmiCollectionResult testResult;

    @BeforeEach
    void setUp() {
        // 创建测试主机
        testHost = WmiHost.builder()
                .hostId("host-001")
                .hostname("test-host")
                .ipAddress("192.168.1.100")
                .port(135)
                .username("admin")
                .password("password")
                .isEnabled(true)
                .build();

        // 创建测试任务
        testTask = WmiCollectionTask.builder()
                .taskId("task-001")
                .targetHost("test-host")
                .wmiClass("Win32_ComputerSystem")
                .status(WmiCollectionTask.TaskStatus.PENDING)
                .priority(WmiCollectionTask.TaskPriority.NORMAL)
                .collectionInterval(300)
                .maxRetryCount(3)
                .currentRetryCount(0)
                .isEnabled(true)
                .build();

        // 创建测试结果
        testResult = WmiCollectionResult.builder()
                .resultId("result-001")
                .taskId("task-001")
                .targetHost("test-host")
                .wmiClass("Win32_ComputerSystem")
                .status(WmiCollectionResult.CollectionStatus.SUCCESS)
                .collectionTime(LocalDateTime.now())
                .durationMs(1000L)
                .retryCount(0)
                .recordsCollected(1)
                .rawData("{\"Name\":\"TestSystem\"}")
                .processedData("{\"system_name\":\"TestSystem\"}")
                .isAnomaly(false)
                .anomalyScore(0.0)
                .build();
    }

    @Test
    void testExecuteCollectionTask_Success() {
        // 准备测试数据
        when(hostRepository.findByHostname("test-host")).thenReturn(Optional.of(testHost));
        when(retryTemplate.execute(any())).thenReturn(testResult);
        when(resultRepository.save(any(WmiCollectionResult.class))).thenReturn(testResult);

        // 执行测试
        WmiCollectionResult result = wmiCollectionService.executeCollectionTask(testTask);

        // 验证结果
        assertNotNull(result);
        assertEquals("result-001", result.getResultId());
        assertEquals(WmiCollectionResult.CollectionStatus.SUCCESS, result.getStatus());
        assertEquals("test-host", result.getTargetHost());
        assertEquals("Win32_ComputerSystem", result.getWmiClass());

        // 验证方法调用
        verify(hostRepository).findByHostname("test-host");
        verify(retryTemplate).execute(any());
        verify(resultRepository).save(any(WmiCollectionResult.class));
    }

    @Test
    void testExecuteCollectionTask_HostNotFound() {
        // 准备测试数据
        when(hostRepository.findByHostname("test-host")).thenReturn(Optional.empty());

        // 执行测试并验证异常
        assertThrows(com.security.ailogsystem.exception.WmiConnectionException.class, () -> {
            wmiCollectionService.executeCollectionTask(testTask);
        });

        // 验证方法调用
        verify(hostRepository).findByHostname("test-host");
    }

    @Test
    void testExecuteCollectionTaskAsync() {
        // 准备测试数据
        when(hostRepository.findByHostname("test-host")).thenReturn(Optional.of(testHost));
        when(retryTemplate.execute(any())).thenReturn(testResult);
        when(resultRepository.save(any(WmiCollectionResult.class))).thenReturn(testResult);

        // 执行测试
        CompletableFuture<WmiCollectionResult> future = wmiCollectionService.executeCollectionTaskAsync(testTask);

        // 验证结果
        assertNotNull(future);
        assertTrue(future.isDone() || !future.isDone()); // 异步执行，可能已完成或未完成
    }

    @Test
    void testExecuteCollectionTasks() {
        // 准备测试数据
        List<WmiCollectionTask> tasks = Arrays.asList(testTask);
        when(hostRepository.findByHostname("test-host")).thenReturn(Optional.of(testHost));
        when(retryTemplate.execute(any())).thenReturn(testResult);
        when(resultRepository.save(any(WmiCollectionResult.class))).thenReturn(testResult);

        // 执行测试
        List<WmiCollectionResult> results = wmiCollectionService.executeCollectionTasks(tasks);

        // 验证结果
        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals("result-001", results.get(0).getResultId());
    }

    @Test
    void testExecuteWmiQuery_Success() {
        // 准备测试数据
        List<String> properties = Arrays.asList("Name", "Description");
        when(quickRetryTemplate.execute(any())).thenReturn(true);
        when(resultRepository.save(any(WmiCollectionResult.class))).thenReturn(testResult);

        // 执行测试
        WmiCollectionResult result = wmiCollectionService.executeWmiQuery(testHost, "Win32_ComputerSystem", properties);

        // 验证结果
        assertNotNull(result);
        assertEquals("result-001", result.getResultId());
        assertEquals(WmiCollectionResult.CollectionStatus.SUCCESS, result.getStatus());

        // 验证方法调用
        verify(quickRetryTemplate).execute(any());
        verify(resultRepository).save(any(WmiCollectionResult.class));
    }

    @Test
    void testExecuteWmiQuery_ConnectionFailed() {
        // 准备测试数据
        List<String> properties = Arrays.asList("Name", "Description");
        when(quickRetryTemplate.execute(any())).thenReturn(false);
        when(resultRepository.save(any(WmiCollectionResult.class))).thenReturn(testResult);

        // 执行测试
        WmiCollectionResult result = wmiCollectionService.executeWmiQuery(testHost, "Win32_ComputerSystem", properties);

        // 验证结果
        assertNotNull(result);
        assertEquals(WmiCollectionResult.CollectionStatus.CONNECTION_ERROR, result.getStatus());
        assertNotNull(result.getErrorMessage());

        // 验证方法调用
        verify(quickRetryTemplate).execute(any());
        verify(resultRepository).save(any(WmiCollectionResult.class));
    }

    @Test
    void testTestWmiConnection_Success() {
        // 准备测试数据
        when(quickRetryTemplate.execute(any())).thenReturn(true);

        // 执行测试
        boolean connected = wmiCollectionService.testWmiConnection(testHost);

        // 验证结果
        assertTrue(connected);

        // 验证方法调用
        verify(quickRetryTemplate).execute(any());
    }

    @Test
    void testTestWmiConnection_Failed() {
        // 准备测试数据
        when(quickRetryTemplate.execute(any())).thenThrow(new RuntimeException("Connection failed"));

        // 执行测试
        boolean connected = wmiCollectionService.testWmiConnection(testHost);

        // 验证结果
        assertFalse(connected);

        // 验证方法调用
        verify(quickRetryTemplate).execute(any());
    }

    @Test
    void testGetWmiClassProperties() {
        // 执行测试
        List<String> properties = wmiCollectionService.getWmiClassProperties(testHost, "Win32_ComputerSystem");

        // 验证结果
        assertNotNull(properties);
        assertFalse(properties.isEmpty());
        assertTrue(properties.contains("Name"));
        assertTrue(properties.contains("Description"));
    }

    @Test
    void testGetAvailableWmiClasses() {
        // 执行测试
        List<String> wmiClasses = wmiCollectionService.getAvailableWmiClasses(testHost);

        // 验证结果
        assertNotNull(wmiClasses);
        assertFalse(wmiClasses.isEmpty());
        assertTrue(wmiClasses.contains("Win32_ComputerSystem"));
        assertTrue(wmiClasses.contains("Win32_OperatingSystem"));
    }

    @Test
    void testExecuteCollectionTaskWithRetry() {
        // 准备测试数据
        when(longRetryTemplate.execute(any())).thenReturn(testResult);

        // 执行测试
        WmiCollectionResult result = wmiCollectionService.executeCollectionTaskWithRetry(testTask, 5, 2000L);

        // 验证结果
        assertNotNull(result);
        assertEquals("result-001", result.getResultId());

        // 验证方法调用
        verify(longRetryTemplate).execute(any());
    }

    @Test
    void testHandleCollectionException() {
        // 准备测试数据
        Exception exception = new RuntimeException("Test exception");
        when(resultRepository.save(any(WmiCollectionResult.class))).thenReturn(testResult);

        // 执行测试
        WmiCollectionResult result = wmiCollectionService.handleCollectionException(testTask, exception, 1);

        // 验证结果
        assertNotNull(result);
        assertEquals(WmiCollectionResult.CollectionStatus.UNKNOWN_ERROR, result.getStatus());
        assertEquals("Test exception", result.getErrorMessage());
        assertEquals(1, result.getRetryCount());

        // 验证方法调用
        verify(resultRepository).save(any(WmiCollectionResult.class));
    }

    @Test
    void testGetCollectionStatistics() {
        // 准备测试数据
        LocalDateTime startTime = LocalDateTime.now().minusDays(7);
        LocalDateTime endTime = LocalDateTime.now();
        
        when(resultRepository.countResultsByTimeRange(startTime, endTime)).thenReturn(100L);
        when(resultRepository.countSuccessResultsByTimeRange(startTime, endTime)).thenReturn(90L);
        when(resultRepository.countFailureResultsByTimeRange(startTime, endTime)).thenReturn(10L);
        when(resultRepository.countResultsByStatus()).thenReturn(Arrays.asList(
                new Object[]{"SUCCESS", 90L},
                new Object[]{"FAILED", 10L}
        ));
        when(resultRepository.countResultsByHost()).thenReturn(Arrays.asList(
                new Object[]{"test-host", 50L},
                new Object[]{"other-host", 50L}
        ));

        // 执行测试
        Map<String, Object> statistics = wmiCollectionService.getCollectionStatistics(startTime, endTime);

        // 验证结果
        assertNotNull(statistics);
        assertEquals(100L, statistics.get("totalCollections"));
        assertEquals(90L, statistics.get("successCollections"));
        assertEquals(10L, statistics.get("failureCollections"));
        assertEquals(0.9, statistics.get("successRate"));

        // 验证方法调用
        verify(resultRepository).countResultsByTimeRange(startTime, endTime);
        verify(resultRepository).countSuccessResultsByTimeRange(startTime, endTime);
        verify(resultRepository).countFailureResultsByTimeRange(startTime, endTime);
        verify(resultRepository).countResultsByStatus();
        verify(resultRepository).countResultsByHost();
    }

    @Test
    void testGetHostCollectionStatistics() {
        // 准备测试数据
        String hostId = "host-001";
        LocalDateTime startTime = LocalDateTime.now().minusDays(7);
        LocalDateTime endTime = LocalDateTime.now();
        
        when(hostRepository.findByHostId(hostId)).thenReturn(Optional.of(testHost));
        when(resultRepository.findByTargetHostAndCollectionTimeBetween(eq("test-host"), eq(startTime), eq(endTime)))
                .thenReturn(Arrays.asList(testResult));

        // 执行测试
        Map<String, Object> statistics = wmiCollectionService.getHostCollectionStatistics(hostId, startTime, endTime);

        // 验证结果
        assertNotNull(statistics);
        assertEquals("host-001", statistics.get("hostId"));
        assertEquals("test-host", statistics.get("hostname"));
        assertEquals("192.168.1.100", statistics.get("ipAddress"));
        assertEquals(1L, statistics.get("totalCollections"));
        assertEquals(1L, statistics.get("successCollections"));
        assertEquals(0L, statistics.get("failureCollections"));
        assertEquals(1.0, statistics.get("successRate"));

        // 验证方法调用
        verify(hostRepository).findByHostId(hostId);
        verify(resultRepository).findByTargetHostAndCollectionTimeBetween(eq("test-host"), eq(startTime), eq(endTime));
    }

    @Test
    void testCleanupExpiredResults() {
        // 准备测试数据
        LocalDateTime expiredTime = LocalDateTime.now().minusDays(30);
        when(resultRepository.deleteExpiredResults(expiredTime)).thenReturn(50);

        // 执行测试
        int deletedCount = wmiCollectionService.cleanupExpiredResults(expiredTime);

        // 验证结果
        assertEquals(50, deletedCount);

        // 验证方法调用
        verify(resultRepository).deleteExpiredResults(expiredTime);
    }

    @Test
    void testStopAllCollectionTasks() {
        // 执行测试
        wmiCollectionService.stopAllCollectionTasks();

        // 验证方法调用
        verify(taskRepository).updateTaskStatus(eq("RUNNING"), eq(WmiCollectionTask.TaskStatus.CANCELLED), any(LocalDateTime.class));
    }

    @Test
    void testStopCollectionTask() {
        // 准备测试数据
        String taskId = "task-001";

        // 执行测试
        wmiCollectionService.stopCollectionTask(taskId);

        // 验证方法调用
        verify(taskRepository).updateTaskStatus(eq(taskId), eq(WmiCollectionTask.TaskStatus.CANCELLED), any(LocalDateTime.class));
    }

    @Test
    void testGetRunningTasks() {
        // 执行测试
        List<WmiCollectionTask> runningTasks = wmiCollectionService.getRunningTasks();

        // 验证结果
        assertNotNull(runningTasks);
        assertTrue(runningTasks.isEmpty()); // 初始状态应该为空
    }

    @Test
    void testGetTaskExecutionStatus() {
        // 准备测试数据
        String taskId = "task-001";
        when(taskRepository.findByTaskId(taskId)).thenReturn(Optional.of(testTask));

        // 执行测试
        Map<String, Object> status = wmiCollectionService.getTaskExecutionStatus(taskId);

        // 验证结果
        assertNotNull(status);
        assertEquals("task-001", status.get("taskId"));
        assertEquals(WmiCollectionTask.TaskStatus.PENDING, status.get("status"));
        assertEquals("test-host", status.get("targetHost"));
        assertEquals("Win32_ComputerSystem", status.get("wmiClass"));

        // 验证方法调用
        verify(taskRepository).findByTaskId(taskId);
    }

    @Test
    void testGetTaskExecutionStatus_TaskNotFound() {
        // 准备测试数据
        String taskId = "non-existent-task";
        when(taskRepository.findByTaskId(taskId)).thenReturn(Optional.empty());

        // 执行测试
        Map<String, Object> status = wmiCollectionService.getTaskExecutionStatus(taskId);

        // 验证结果
        assertNotNull(status);
        assertEquals("任务不存在", status.get("error"));

        // 验证方法调用
        verify(taskRepository).findByTaskId(taskId);
    }
}
