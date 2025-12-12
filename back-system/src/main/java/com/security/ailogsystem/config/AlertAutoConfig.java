// AlertAutoConfig.java
package com.security.ailogsystem.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Data
@Component
@ConfigurationProperties(prefix = "alert.auto")
public class AlertAutoConfig {

    /**
     * 是否启用自动告警
     */
    private boolean enabled = true;

    /**
     * 告警检查间隔（分钟）
     */
    private PerformanceCheck performanceCheck = new PerformanceCheck();
    private ProcessCheck processCheck = new ProcessCheck();
    private NetworkCheck networkCheck = new NetworkCheck();

    /**
     * 自动创建告警的阈值配置
     */
    private Thresholds thresholds = new Thresholds();

    /**
     * 需要忽略的进程列表
     */
    private List<String> ignoredProcesses = List.of(
            "System", "Idle", "svchost.exe", "explorer.exe"
    );

    @Data
    public static class PerformanceCheck {
        private boolean enabled = true;
        private int intervalMinutes = 5;
    }

    @Data
    public static class ProcessCheck {
        private boolean enabled = true;
        private int intervalMinutes = 10;
        private int maxProcessesToCheck = 50;
    }

    @Data
    public static class NetworkCheck {
        private boolean enabled = true;
        private int intervalMinutes = 15;
    }

    @Data
    public static class Thresholds {
        private double cpuCritical = 90.0;
        private double cpuHigh = 80.0;
        private double memoryCritical = 95.0;
        private double memoryHigh = 90.0;
        private double networkTrafficHigh = 1000000; // 1MB/s
        private double processCpuHigh = 50.0;
        private double processMemoryHigh = 30.0;
    }
}