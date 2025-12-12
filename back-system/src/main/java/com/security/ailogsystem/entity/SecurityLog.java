// entity/SecurityLog.java
package com.security.ailogsystem.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "windows_security_logs")
public class SecurityLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Integer eventId;

    @Column(name = "event_time", nullable = false)
    private LocalDateTime eventTime;

    @Column(name = "computer_name")
    private String computerName;

    @Column(name = "source_name")
    private String sourceName;

    @Column(name = "user_sid")
    private String userSid;

    @Column(name = "user_name")
    private String userName;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "logon_type")
    private Integer logonType;

    @Column(name = "result_code")
    private Integer resultCode;

    @Column(name = "source")
    private String source;

    @Column(name = "raw_message", columnDefinition = "TEXT")
    private String rawMessage;

    @Column(name = "threat_level")
    private String threatLevel; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(name = "created_time")
    private LocalDateTime createdTime = LocalDateTime.now();

    // Constructors, Getters, Setters
    public SecurityLog() {}

    public SecurityLog(Integer eventId, LocalDateTime eventTime, String computerName,
                       String sourceName, String rawMessage) {
        this.eventId = eventId;
        this.eventTime = eventTime;
        this.computerName = computerName;
        this.sourceName = sourceName;
        this.rawMessage = rawMessage;
    }


}