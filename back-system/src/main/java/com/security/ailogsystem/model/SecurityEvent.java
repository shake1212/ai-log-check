package com.security.ailogsystem.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 安全事件实体类
 * 用于存储和分析安全相关的日志事件
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "security_events", indexes = {
    @Index(name = "idx_security_event_timestamp", columnList = "timestamp"),
    @Index(name = "idx_security_event_level", columnList = "level"),
    @Index(name = "idx_security_event_source", columnList = "source"),
    @Index(name = "idx_security_event_host", columnList = "host_ip"),
    @Index(name = "idx_security_event_user", columnList = "user_id"),
    @Index(name = "idx_security_event_anomaly", columnList = "is_anomaly")
})
public class SecurityEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 事件时间戳
     */
    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    /**
     * 事件来源
     */
    @Column(name = "source", length = 255, nullable = false)
    private String source;

    /**
     * Windows事件ID
     */
    @Column(name = "event_id")
    private Integer eventId;

    /**
     * 事件类型
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", length = 50)
    private EventType eventType;

    /**
     * 日志级别
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "level", length = 20, nullable = false)
    private LogLevel level;

    /**
     * 事件消息
     */
    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    /**
     * 原始数据（JSON格式）
     */
    @Column(name = "raw_data", columnDefinition = "JSON")
    private String rawData;

    /**
     * 主机IP地址
     */
    @Column(name = "host_ip", length = 45)
    private String hostIp;

    /**
     * 主机名
     */
    @Column(name = "host_name", length = 255)
    private String hostName;

    /**
     * 进程ID
     */
    @Column(name = "process_id")
    private Integer processId;

    /**
     * 线程ID
     */
    @Column(name = "thread_id")
    private Integer threadId;

    /**
     * 用户ID（SID或用户名）
     */
    @Column(name = "user_id", length = 255)
    private String userId;

    /**
     * 会话ID
     */
    @Column(name = "session_id", length = 255)
    private String sessionId;

    /**
     * 是否为异常事件
     */
    @Builder.Default
    @Column(name = "is_anomaly", nullable = false)
    private Boolean isAnomaly = false;

    /**
     * 异常评分（0-100）
     */
    @Column(name = "anomaly_score")
    private Double anomalyScore;

    /**
     * 异常原因
     */
    @Column(name = "anomaly_reason", columnDefinition = "TEXT")
    private String anomalyReason;

    /**
     * 事件分类
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 50)
    private EventCategory category;

    /**
     * 威胁等级
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "threat_level", length = 20)
    private ThreatLevel threatLevel;

    /**
     * 处理状态
     */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private EventStatus status = EventStatus.NEW;

    /**
     * 处理人
     */
    @Column(name = "assigned_to", length = 100)
    private String assignedTo;

    /**
     * 处理备注
     */
    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    /**
     * 处理时间
     */
    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

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
     * 事件类型枚举
     */
    public enum EventType {
        LOGIN_SUCCESS("登录成功"),
        LOGIN_FAILURE("登录失败"),
        LOGOUT("登出"),
        PERMISSION_DENIED("权限拒绝"),
        FILE_ACCESS("文件访问"),
        NETWORK_CONNECTION("网络连接"),
        SYSTEM_STARTUP("系统启动"),
        SYSTEM_SHUTDOWN("系统关闭"),
        PROCESS_CREATION("进程创建"),
        PROCESS_TERMINATION("进程终止"),
        SERVICE_START("服务启动"),
        SERVICE_STOP("服务停止"),
        CONFIGURATION_CHANGE("配置变更"),
        SECURITY_POLICY_CHANGE("安全策略变更"),
        MALWARE_DETECTED("恶意软件检测"),
        SUSPICIOUS_ACTIVITY("可疑活动"),
        DATA_ACCESS("数据访问"),
        PRIVILEGE_ESCALATION("权限提升"),
        BRUTE_FORCE_ATTACK("暴力破解攻击"),
        UNKNOWN("未知类型");

        private final String description;

        EventType(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }

    /**
     * 日志级别枚举
     */
    public enum LogLevel {
        DEBUG("调试"),
        INFO("信息"),
        WARNING("警告"),
        ERROR("错误"),
        CRITICAL("严重"),
        AUDIT_SUCCESS("审计成功"),
        AUDIT_FAILURE("审计失败");

        private final String description;

        LogLevel(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }

    /**
     * 事件分类枚举
     */
    public enum EventCategory {
        AUTHENTICATION("认证"),
        AUTHORIZATION("授权"),
        SYSTEM("系统"),
        NETWORK("网络"),
        APPLICATION("应用"),
        SECURITY("安全"),
        COMPLIANCE("合规"),
        MONITORING("监控"),
        INCIDENT("事件"),
        OTHER("其他");

        private final String description;

        EventCategory(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }

    /**
     * 威胁等级枚举
     */
    public enum ThreatLevel {
        LOW("低"),
        MEDIUM("中"),
        HIGH("高"),
        CRITICAL("严重"),
        UNKNOWN("未知");

        private final String description;

        ThreatLevel(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }

    /**
     * 事件状态枚举
     */
    public enum EventStatus {
        NEW("新建"),
        IN_PROGRESS("处理中"),
        RESOLVED("已解决"),
        FALSE_POSITIVE("误报"),
        ESCALATED("升级"),
        CLOSED("已关闭");

        private final String description;

        EventStatus(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
