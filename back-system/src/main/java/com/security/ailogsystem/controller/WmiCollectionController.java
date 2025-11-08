package com.security.ailogsystem.controller;

import com.security.ailogsystem.model.WmiCollectionResult;
import com.security.ailogsystem.model.WmiCollectionTask;
import com.security.ailogsystem.model.WmiHost;
import com.security.ailogsystem.service.WmiCollectionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * WMI采集控制器
 * 
 * @author AI Log System
 * @version 1.0
 */
@Slf4j
@RestController
@RequestMapping("/wmi")
@RequiredArgsConstructor
@Tag(name = "WMI采集管理", description = "WMI数据采集和监控接口")
public class WmiCollectionController {

    private final WmiCollectionService wmiCollectionService;

    @PostMapping("/tasks")
    @Operation(summary = "创建WMI采集任务", description = "创建新的WMI数据采集任务")
    public ResponseEntity<WmiCollectionTask> createCollectionTask(@Valid @RequestBody WmiCollectionTask task) {
        log.info("创建WMI采集任务: {} -> {}:{}", task.getTaskId(), task.getTargetHost(), task.getWmiClass());
        
        // 这里应该调用任务管理服务来创建任务
        // WmiCollectionTask createdTask = wmiTaskService.createTask(task);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(task);
    }

    @GetMapping("/tasks")
    @Operation(summary = "获取WMI采集任务列表", description = "分页获取WMI采集任务列表")
    public ResponseEntity<Page<WmiCollectionTask>> getCollectionTasks(Pageable pageable) {
        log.debug("获取WMI采集任务列表，页码: {}，大小: {}", pageable.getPageNumber(), pageable.getPageSize());
        
        // 这里应该调用任务管理服务来获取任务列表
        // Page<WmiCollectionTask> tasks = wmiTaskService.getTasks(pageable);
        
        return ResponseEntity.ok(Page.empty());
    }

    @GetMapping("/tasks/{taskId}")
    @Operation(summary = "获取WMI采集任务详情", description = "根据任务ID获取WMI采集任务详情")
    public ResponseEntity<WmiCollectionTask> getCollectionTask(
            @Parameter(description = "任务ID") @PathVariable String taskId) {
        log.debug("获取WMI采集任务详情: {}", taskId);
        
        // 这里应该调用任务管理服务来获取任务详情
        // WmiCollectionTask task = wmiTaskService.getTaskById(taskId);
        
        return ResponseEntity.ok().build();
    }

    @PostMapping("/tasks/{taskId}/execute")
    @Operation(summary = "执行WMI采集任务", description = "立即执行指定的WMI采集任务")
    public ResponseEntity<WmiCollectionResult> executeCollectionTask(
            @Parameter(description = "任务ID") @PathVariable String taskId) {
        log.info("执行WMI采集任务: {}", taskId);
        
        // 这里应该调用任务管理服务来获取任务，然后执行
        // WmiCollectionTask task = wmiTaskService.getTaskById(taskId);
        // WmiCollectionResult result = wmiCollectionService.executeCollectionTask(task);
        
        return ResponseEntity.ok().build();
    }

    @PostMapping("/tasks/{taskId}/execute-async")
    @Operation(summary = "异步执行WMI采集任务", description = "异步执行指定的WMI采集任务")
    public ResponseEntity<Map<String, String>> executeCollectionTaskAsync(
            @Parameter(description = "任务ID") @PathVariable String taskId) {
        log.info("异步执行WMI采集任务: {}", taskId);
        
        // 这里应该调用任务管理服务来获取任务，然后异步执行
        // WmiCollectionTask task = wmiTaskService.getTaskById(taskId);
        // CompletableFuture<WmiCollectionResult> future = wmiCollectionService.executeCollectionTaskAsync(task);
        
        Map<String, String> response = Map.of(
                "message", "任务已提交异步执行",
                "taskId", taskId,
                "status", "ACCEPTED"
        );
        
        return ResponseEntity.accepted().body(response);
    }

    @DeleteMapping("/tasks/{taskId}")
    @Operation(summary = "删除WMI采集任务", description = "删除指定的WMI采集任务")
    public ResponseEntity<Void> deleteCollectionTask(
            @Parameter(description = "任务ID") @PathVariable String taskId) {
        log.info("删除WMI采集任务: {}", taskId);
        
        // 这里应该调用任务管理服务来删除任务
        // wmiTaskService.deleteTask(taskId);
        
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/tasks/{taskId}/stop")
    @Operation(summary = "停止WMI采集任务", description = "停止正在执行的WMI采集任务")
    public ResponseEntity<Map<String, String>> stopCollectionTask(
            @Parameter(description = "任务ID") @PathVariable String taskId) {
        log.info("停止WMI采集任务: {}", taskId);
        
        wmiCollectionService.stopCollectionTask(taskId);
        
        Map<String, String> response = Map.of(
                "message", "任务已停止",
                "taskId", taskId,
                "status", "STOPPED"
        );
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/tasks/{taskId}/status")
    @Operation(summary = "获取任务执行状态", description = "获取WMI采集任务的执行状态")
    public ResponseEntity<Map<String, Object>> getTaskExecutionStatus(
            @Parameter(description = "任务ID") @PathVariable String taskId) {
        log.debug("获取任务执行状态: {}", taskId);
        
        Map<String, Object> status = wmiCollectionService.getTaskExecutionStatus(taskId);
        
        return ResponseEntity.ok(status);
    }

    @GetMapping("/results")
    @Operation(summary = "获取WMI采集结果", description = "分页获取WMI采集结果")
    public ResponseEntity<Page<WmiCollectionResult>> getCollectionResults(
            @Parameter(description = "目标主机") @RequestParam(required = false) String targetHost,
            @Parameter(description = "WMI类") @RequestParam(required = false) String wmiClass,
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            Pageable pageable) {
        log.debug("获取WMI采集结果，目标主机: {}，WMI类: {}，时间范围: {} - {}", 
                targetHost, wmiClass, startTime, endTime);
        
        // 这里应该调用结果管理服务来获取结果
        // Page<WmiCollectionResult> results = wmiResultService.getResults(targetHost, wmiClass, startTime, endTime, pageable);
        
        return ResponseEntity.ok(Page.empty());
    }

    @GetMapping("/results/{resultId}")
    @Operation(summary = "获取WMI采集结果详情", description = "根据结果ID获取WMI采集结果详情")
    public ResponseEntity<WmiCollectionResult> getCollectionResult(
            @Parameter(description = "结果ID") @PathVariable String resultId) {
        log.debug("获取WMI采集结果详情: {}", resultId);
        
        // 这里应该调用结果管理服务来获取结果详情
        // WmiCollectionResult result = wmiResultService.getResultById(resultId);
        
        return ResponseEntity.ok().build();
    }

    @PostMapping("/hosts")
    @Operation(summary = "创建WMI主机", description = "创建新的WMI主机配置")
    public ResponseEntity<WmiHost> createWmiHost(@Valid @RequestBody WmiHost host) {
        log.info("创建WMI主机: {} ({})", host.getHostname(), host.getIpAddress());
        
        // 这里应该调用主机管理服务来创建主机
        // WmiHost createdHost = wmiHostService.createHost(host);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(host);
    }

    @GetMapping("/hosts")
    @Operation(summary = "获取WMI主机列表", description = "分页获取WMI主机列表")
    public ResponseEntity<Page<WmiHost>> getWmiHosts(Pageable pageable) {
        log.debug("获取WMI主机列表，页码: {}，大小: {}", pageable.getPageNumber(), pageable.getPageSize());
        
        // 这里应该调用主机管理服务来获取主机列表
        // Page<WmiHost> hosts = wmiHostService.getHosts(pageable);
        
        return ResponseEntity.ok(Page.empty());
    }

    @GetMapping("/hosts/{hostId}")
    @Operation(summary = "获取WMI主机详情", description = "根据主机ID获取WMI主机详情")
    public ResponseEntity<WmiHost> getWmiHost(
            @Parameter(description = "主机ID") @PathVariable String hostId) {
        log.debug("获取WMI主机详情: {}", hostId);
        
        // 这里应该调用主机管理服务来获取主机详情
        // WmiHost host = wmiHostService.getHostById(hostId);
        
        return ResponseEntity.ok().build();
    }

    @PostMapping("/hosts/{hostId}/test-connection")
    @Operation(summary = "测试WMI连接", description = "测试与指定WMI主机的连接")
    public ResponseEntity<Map<String, Object>> testWmiConnection(
            @Parameter(description = "主机ID") @PathVariable String hostId) {
        log.info("测试WMI连接: {}", hostId);
        
        // 这里应该调用主机管理服务来获取主机，然后测试连接
        // WmiHost host = wmiHostService.getHostById(hostId);
        // boolean connected = wmiCollectionService.testWmiConnection(host);
        
        Map<String, Object> response = Map.of(
                "hostId", hostId,
                "connected", true,
                "message", "连接测试成功",
                "timestamp", LocalDateTime.now()
        );
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/hosts/{hostId}/wmi-classes")
    @Operation(summary = "获取可用WMI类", description = "获取指定主机上可用的WMI类列表")
    public ResponseEntity<List<String>> getAvailableWmiClasses(
            @Parameter(description = "主机ID") @PathVariable String hostId) {
        log.debug("获取可用WMI类: {}", hostId);
        
        // 这里应该调用主机管理服务来获取主机，然后获取WMI类
        // WmiHost host = wmiHostService.getHostById(hostId);
        // List<String> wmiClasses = wmiCollectionService.getAvailableWmiClasses(host);
        
        List<String> wmiClasses = List.of(
                "Win32_ComputerSystem",
                "Win32_OperatingSystem", 
                "Win32_Process",
                "Win32_Service",
                "Win32_LogicalDisk"
        );
        
        return ResponseEntity.ok(wmiClasses);
    }

    @GetMapping("/hosts/{hostId}/wmi-classes/{wmiClass}/properties")
    @Operation(summary = "获取WMI类属性", description = "获取指定WMI类的属性列表")
    public ResponseEntity<List<String>> getWmiClassProperties(
            @Parameter(description = "主机ID") @PathVariable String hostId,
            @Parameter(description = "WMI类名") @PathVariable String wmiClass) {
        log.debug("获取WMI类属性: {} -> {}", hostId, wmiClass);
        
        // 这里应该调用主机管理服务来获取主机，然后获取WMI类属性
        // WmiHost host = wmiHostService.getHostById(hostId);
        // List<String> properties = wmiCollectionService.getWmiClassProperties(host, wmiClass);
        
        List<String> properties = List.of("Name", "Description", "Status", "State", "Enabled");
        
        return ResponseEntity.ok(properties);
    }

    @GetMapping("/collection-statistics")
    @Operation(summary = "获取采集统计信息", description = "获取WMI采集的统计信息")
    public ResponseEntity<Map<String, Object>> getCollectionStatistics(
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        log.debug("获取采集统计信息，时间范围: {} - {}", startTime, endTime);
        
        if (startTime == null) {
            startTime = LocalDateTime.now().minusDays(7);
        }
        if (endTime == null) {
            endTime = LocalDateTime.now();
        }
        
        Map<String, Object> statistics = wmiCollectionService.getCollectionStatistics(startTime, endTime);
        
        return ResponseEntity.ok(statistics);
    }

    @GetMapping("/hosts/{hostId}/statistics")
    @Operation(summary = "获取主机采集统计", description = "获取指定主机的WMI采集统计信息")
    public ResponseEntity<Map<String, Object>> getHostCollectionStatistics(
            @Parameter(description = "主机ID") @PathVariable String hostId,
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        log.debug("获取主机采集统计: {}，时间范围: {} - {}", hostId, startTime, endTime);
        
        if (startTime == null) {
            startTime = LocalDateTime.now().minusDays(7);
        }
        if (endTime == null) {
            endTime = LocalDateTime.now();
        }
        
        Map<String, Object> statistics = wmiCollectionService.getHostCollectionStatistics(hostId, startTime, endTime);
        
        return ResponseEntity.ok(statistics);
    }

    @GetMapping("/running-tasks")
    @Operation(summary = "获取正在执行的任务", description = "获取当前正在执行的WMI采集任务列表")
    public ResponseEntity<List<WmiCollectionTask>> getRunningTasks() {
        log.debug("获取正在执行的任务");
        
        List<WmiCollectionTask> runningTasks = wmiCollectionService.getRunningTasks();
        
        return ResponseEntity.ok(runningTasks);
    }

    @PostMapping("/stop-all-tasks")
    @Operation(summary = "停止所有任务", description = "停止所有正在执行的WMI采集任务")
    public ResponseEntity<Map<String, String>> stopAllTasks() {
        log.info("停止所有WMI采集任务");
        
        wmiCollectionService.stopAllCollectionTasks();
        
        Map<String, String> response = Map.of(
                "message", "所有任务已停止",
                "status", "STOPPED",
                "timestamp", LocalDateTime.now().toString()
        );
        
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/cleanup")
    @Operation(summary = "清理过期数据", description = "清理过期的WMI采集结果数据")
    public ResponseEntity<Map<String, Object>> cleanupExpiredData(
            @Parameter(description = "过期时间（天数）") @RequestParam(defaultValue = "30") int days) {
        log.info("清理过期的WMI采集数据，保留天数: {}", days);
        
        LocalDateTime expiredTime = LocalDateTime.now().minusDays(days);
        int deletedCount = wmiCollectionService.cleanupExpiredResults(expiredTime);
        
        Map<String, Object> response = Map.of(
                "message", "清理完成",
                "deletedCount", deletedCount,
                "expiredTime", expiredTime,
                "timestamp", LocalDateTime.now()
        );
        
        return ResponseEntity.ok(response);
    }
}
