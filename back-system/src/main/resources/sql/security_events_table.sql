-- 安全事件表创建脚本

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS ai_log_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ai_log_system;

-- 创建安全事件表
CREATE TABLE IF NOT EXISTS security_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    source VARCHAR(255) NOT NULL,
    event_id INT,
    event_type VARCHAR(50),
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    raw_data JSON,
    host_ip VARCHAR(45),
    host_name VARCHAR(255),
    process_id INT,
    thread_id INT,
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    is_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
    anomaly_score DOUBLE,
    anomaly_reason TEXT,
    category VARCHAR(50),
    threat_level VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'NEW',
    assigned_to VARCHAR(100),
    resolution_notes TEXT,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 创建索引
    INDEX idx_security_event_timestamp (timestamp),
    INDEX idx_security_event_level (level),
    INDEX idx_security_event_source (source),
    INDEX idx_security_event_host (host_ip),
    INDEX idx_security_event_user (user_id),
    INDEX idx_security_event_anomaly (is_anomaly),
    INDEX idx_security_event_status (status),
    INDEX idx_security_event_type (event_type),
    INDEX idx_security_event_threat_level (threat_level),
    INDEX idx_security_event_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入一些测试数据
INSERT INTO security_events (timestamp, source, event_id, event_type, level, message, host_ip, host_name, user_id, category, threat_level, status, is_anomaly) VALUES
(NOW() - INTERVAL 1 HOUR, 'Windows Security', 4624, 'LOGIN_SUCCESS', 'INFO', 'User login successful', '192.168.1.100', 'WORKSTATION-01', 'S-1-5-21-1234567890-1234567890-1234567890-1001', 'AUTHENTICATION', 'LOW', 'NEW', FALSE),
(NOW() - INTERVAL 30 MINUTE, 'Windows Security', 4625, 'LOGIN_FAILURE', 'WARNING', 'Failed login attempt', '192.168.1.100', 'WORKSTATION-01', 'admin', 'AUTHENTICATION', 'MEDIUM', 'NEW', TRUE),
(NOW() - INTERVAL 10 MINUTE, 'System', 1074, 'SYSTEM_SHUTDOWN', 'INFO', 'System shutdown initiated by user', '192.168.1.101', 'SERVER-01', 'administrator', 'SYSTEM', 'LOW', 'NEW', FALSE),
(NOW() - INTERVAL 5 MINUTE, 'Windows Security', 4625, 'LOGIN_FAILURE', 'ERROR', 'Multiple failed login attempts', '192.168.1.102', 'WORKSTATION-02', 'guest', 'AUTHENTICATION', 'HIGH', 'NEW', TRUE),
(NOW() - INTERVAL 2 MINUTE, 'Application', 1001, 'SUSPICIOUS_ACTIVITY', 'WARNING', 'Unusual file access pattern detected', '192.168.1.103', 'WORKSTATION-03', 'user1', 'SECURITY', 'MEDIUM', 'NEW', TRUE);

-- 显示创建的表结构
DESCRIBE security_events;

-- 显示插入的测试数据
SELECT * FROM security_events ORDER BY timestamp DESC LIMIT 5;
