package com.security.ailogsystem.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 简单WMI数据模型
 * 轻量级实现，适合大创项目
 * 
 * @author AI Log System
 * @version 1.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "simple_wmi_data")
public class SimpleWmiData {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * 主机名
     */
    @Column(nullable = false)
    private String hostname;
    
    /**
     * IP地址
     */
    @Column(nullable = false)
    private String ipAddress;
    
    /**
     * 数据类型
     */
    @Enumerated(EnumType.STRING)
    private DataType dataType;
    
    /**
     * 数据值
     */
    @Column(columnDefinition = "TEXT")
    private String dataValue;
    
    /**
     * 采集时间
     */
    private LocalDateTime collectTime;
    
    /**
     * 状态
     */
    @Enumerated(EnumType.STRING)
    private Status status;
    
    /**
     * 备注
     */
    private String remark;
    
    @PrePersist
    protected void onCreate() {
        collectTime = LocalDateTime.now();
        if (status == null) {
            status = Status.SUCCESS;
        }
    }
    
    /**
     * 数据类型枚举
     */
    public enum DataType {
        CPU_USAGE("CPU使用率"),
        MEMORY_USAGE("内存使用率"),
        DISK_USAGE("磁盘使用率"),
        NETWORK_TRAFFIC("网络流量"),
        PROCESS_COUNT("进程数量"),
        SERVICE_STATUS("服务状态"),
        SYSTEM_INFO("系统信息");
        
        private final String description;
        
        DataType(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
    
    /**
     * 状态枚举
     */
    public enum Status {
        SUCCESS("成功"),
        FAILED("失败"),
        PENDING("待处理");
        
        private final String description;
        
        Status(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
}
