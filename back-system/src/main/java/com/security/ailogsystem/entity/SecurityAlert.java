// entity/SecurityAlert.java
package com.security.ailogsystem.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "security_alerts")
public class SecurityAlert {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_level", nullable = false)
    private AlertLevel alertLevel;

    @Column(name = "alert_type", nullable = false)
    private String alertType;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "event_data", columnDefinition = "JSON")
    private String eventData;

    @Column(name = "handled")
    private Boolean handled = false;

    @Column(name = "created_time")
    private LocalDateTime createdTime = LocalDateTime.now();

    @ManyToOne
    @JoinColumn(name = "log_id")
    private SecurityLog securityLog;

    public enum AlertLevel {
        LOW, MEDIUM, HIGH, CRITICAL
    }


    public SecurityAlert() {}

    public SecurityAlert(AlertLevel alertLevel, String alertType, String description) {
        this.alertLevel = alertLevel;
        this.alertType = alertType;
        this.description = description;
    }


}