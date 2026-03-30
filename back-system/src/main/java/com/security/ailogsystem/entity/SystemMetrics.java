// entity/SystemMetrics.java
package com.security.ailogsystem.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "system_metrics", indexes = {
    @Index(name = "idx_timestamp", columnList = "timestamp"),
    @Index(name = "idx_hostname", columnList = "hostname"),
    @Index(name = "idx_created_at", columnList = "created_at")
})
public class SystemMetrics {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private LocalDateTime timestamp;
    
    @Column(length = 255)
    private String hostname;
    
    @Column(name = "ip_address", length = 45)
    private String ipAddress;
    
    // CPU Metrics
    @Column(name = "cpu_usage")
    private Double cpuUsage;
    
    @Column(name = "cpu_cores")
    private Integer cpuCores;
    
    @Column(name = "cpu_frequency")
    private Double cpuFrequency;
    
    // Memory Metrics
    @Column(name = "memory_usage")
    private Double memoryUsage;
    
    @Column(name = "memory_used")
    private Long memoryUsed;
    
    @Column(name = "memory_total")
    private Long memoryTotal;
    
    @Column(name = "memory_available")
    private Long memoryAvailable;
    
    // Disk Metrics
    @Column(name = "disk_usage")
    private Double diskUsage;
    
    @Column(name = "disk_used")
    private Long diskUsed;
    
    @Column(name = "disk_total")
    private Long diskTotal;
    
    // Network Metrics
    @Column(name = "network_sent")
    private Long networkSent;
    
    @Column(name = "network_received")
    private Long networkReceived;
    
    @Column(name = "network_sent_rate")
    private Double networkSentRate;
    
    @Column(name = "network_received_rate")
    private Double networkReceivedRate;
    
    // Process Metrics
    @Column(name = "total_processes")
    private Integer totalProcesses;
    
    @Column(name = "running_processes")
    private Integer runningProcesses;
    
    // System Metrics
    @Column(name = "system_load")
    private Double systemLoad;
    
    @Column(name = "uptime")
    private Long uptime;
    
    // Raw data for flexibility
    @Column(name = "raw_data", columnDefinition = "JSON")
    private String rawData;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    // Constructors
    public SystemMetrics() {
        this.createdAt = LocalDateTime.now();
    }
    
    public SystemMetrics(LocalDateTime timestamp) {
        this.timestamp = timestamp;
        this.createdAt = LocalDateTime.now();
    }
}
