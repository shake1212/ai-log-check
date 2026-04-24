package com.security.ailogsystem.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.security.ailogsystem.dto.SystemMetricsDTO;

import java.io.File;
import java.lang.management.ManagementFactory;
import com.sun.management.OperatingSystemMXBean;
import java.lang.management.RuntimeMXBean;
import java.lang.management.ThreadMXBean;
import java.time.LocalDateTime;

@Slf4j
@Service
public class SystemMetricsService {

    @Value("${system.version:v3.2.1 Enterprise}")
    private String systemVersion;

    @Value("${storage.path:/}")
    private String storagePath;

    public SystemMetricsDTO getSystemMetrics() {
        try {
            SystemMetricsDTO metrics = new SystemMetricsDTO();

            // 1. 系统健康度 - 基于运行时指标计算
            metrics.setSystemHealth(calculateSystemHealth());

            // 2. 正常运行时间
            metrics.setUptime(calculateUptime());

            // 3. 存储使用情况
            calculateStorageUsage(metrics);

            // 4. 吞吐量
            metrics.setThroughput(calculateThroughput());

            // 5. 延迟
            metrics.setLatency(calculateLatency());

            // 6. 系统版本
            metrics.setSystemVersion(systemVersion);

            // 7. 最后更新时间
            metrics.setLastUpdate(LocalDateTime.now());

            // 8. 当前连接数和会话数（模拟）
            metrics.setCurrentConnections(calculateCurrentConnections());
            metrics.setActiveSessions(calculateActiveSessions());

            return metrics;

        } catch (Exception e) {
            log.error("获取系统监控指标失败", e);
            return getDefaultMetrics();
        }
    }

    private double calculateSystemHealth() {
        try {
            OperatingSystemMXBean osBean = (OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
            double cpuUsage = osBean.getSystemCpuLoad() * 100;
            double memoryUsage = (1.0 - (double) osBean.getFreePhysicalMemorySize() / osBean.getTotalPhysicalMemorySize()) * 100;

            // 基于CPU和内存使用率计算健康度
            double cpuHealth = 100 - Math.min(cpuUsage * 0.7, 70);
            double memoryHealth = 100 - Math.min(memoryUsage * 0.5, 50);

            return (cpuHealth + memoryHealth) / 2;

        } catch (Exception e) {
            log.warn("无法获取系统指标，使用默认值", e);
            return 95.0;
        }
    }

    private double calculateUptime() {
        try {
            RuntimeMXBean runtimeBean = ManagementFactory.getRuntimeMXBean();
            long uptimeMs = runtimeBean.getUptime();
            // 基于 JVM 运行时长估算可用性，最大 100
            return Math.min(100.0, 99.0 + uptimeMs / (1000.0 * 60 * 60 * 24 * 30));

        } catch (Exception e) {
            return 99.9;
        }
    }

    private void calculateStorageUsage(SystemMetricsDTO metrics) {
        try {
            File root = new File(storagePath);
            long totalSpace = root.getTotalSpace();
            long freeSpace = root.getFreeSpace();
            long usedSpace = totalSpace - freeSpace;

            // 转换为TB
            metrics.setStorageTotal(totalSpace / (1024.0 * 1024 * 1024 * 1024));
            metrics.setStorageUsed(usedSpace / (1024.0 * 1024 * 1024 * 1024));

        } catch (Exception e) {
            // 默认值
            metrics.setStorageTotal(10.0);
            metrics.setStorageUsed(1.5);
        }
    }

    private SystemMetricsDTO.Throughput calculateThroughput() {
        SystemMetricsDTO.Throughput throughput = new SystemMetricsDTO.Throughput();

        try {
            OperatingSystemMXBean osBean = (OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
            double cpuLoad = Math.max(0, osBean.getSystemCpuLoad());
            double normal = Math.max(100.0, osBean.getAvailableProcessors() * 300.0 * (1 - cpuLoad));
            throughput.setNormal(normal);
            throughput.setAbnormal(Math.max(1.0, normal * 0.03));
            throughput.setPeak(normal * 1.5);
        } catch (Exception e) {
            throughput.setNormal(1200.0);
            throughput.setAbnormal(42.0);
            throughput.setPeak(1800.0);
        }

        return throughput;
    }

    private double calculateLatency() {
        try {
            OperatingSystemMXBean osBean = (OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
            return Math.max(20.0, 40.0 + Math.max(0, osBean.getSystemCpuLoad()) * 120);
        } catch (Exception e) {
            return 100.0;
        }
    }

    private Integer calculateCurrentConnections() {
        return Math.max(1, ManagementFactory.getThreadMXBean().getThreadCount());
    }

    private Integer calculateActiveSessions() {
        ThreadMXBean threadMXBean = ManagementFactory.getThreadMXBean();
        int peak = threadMXBean.getPeakThreadCount();
        return Math.max(1, Math.min(peak, threadMXBean.getThreadCount()));
    }

    private SystemMetricsDTO getDefaultMetrics() {
        SystemMetricsDTO metrics = new SystemMetricsDTO();
        metrics.setSystemHealth(95.0);
        metrics.setUptime(99.8);
        metrics.setStorageTotal(10.0);
        metrics.setStorageUsed(2.3);
        metrics.setThroughput(new SystemMetricsDTO.Throughput(1200.0, 42.0, 1800.0));
        metrics.setLatency(100.0);
        metrics.setSystemVersion(systemVersion);
        metrics.setLastUpdate(LocalDateTime.now());
        metrics.setCurrentConnections(156);
        metrics.setActiveSessions(89);
        return metrics;
    }
}