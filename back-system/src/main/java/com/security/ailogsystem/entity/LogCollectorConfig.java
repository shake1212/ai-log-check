package com.security.ailogsystem.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 日志采集器配置实体
 * 
 * @author AI Log System
 */
@Entity
@Table(name = "log_collector_configs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LogCollectorConfig {
    
    /**
     * 配置ID
     */
    @Id
    @Column(length = 50)
    private String id;
    
    /**
     * 配置名称
     */
    @Column(nullable = false, length = 100)
    private String name;
    
    /**
     * 是否启用
     */
    @Column(nullable = false)
    private Boolean enabled;
    
    /**
     * 采集间隔（秒）
     */
    @Column(name = "`interval`", nullable = false)
    private Integer interval;
    
    /**
     * 数据源列表（JSON格式）
     */
    @Column(name = "data_sources", nullable = false, columnDefinition = "JSON")
    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> dataSources;
    
    /**
     * CPU告警阈值（%）
     */
    @Column(name = "cpu_threshold", nullable = false)
    private Integer cpuThreshold;
    
    /**
     * 内存告警阈值（%）
     */
    @Column(name = "memory_threshold", nullable = false)
    private Integer memoryThreshold;
    
    /**
     * 磁盘告警阈值（%）
     */
    @Column(name = "disk_threshold", nullable = false)
    private Integer diskThreshold;
    
    /**
     * 错误率告警阈值（%）
     */
    @Column(name = "error_rate_threshold", nullable = false)
    private Integer errorRateThreshold;
    
    /**
     * 数据保留天数
     */
    @Column(name = "retention_days", nullable = false)
    private Integer retentionDays;
    
    /**
     * 是否启用规则引擎分析
     */
    @Column(name = "enable_rule_engine", nullable = false)
    private Boolean enableRuleEngine = true;
    
    /**
     * 规则引擎超时时间（秒）
     */
    @Column(name = "rule_engine_timeout")
    private Integer ruleEngineTimeout = 10;
    
    /**
     * 创建时间
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    /**
     * 更新时间
     */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    /**
     * 保存前自动设置时间
     */
    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }
    
    /**
     * 更新前自动设置更新时间
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
