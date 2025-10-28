-- ============================================================
-- ⚠️  重要提示：此文件已过时，请勿使用！
-- ============================================================
-- 
-- 说明：
-- 1. 此init.sql只包含3个简化表，与实际数据库不完全匹配
-- 2. 实际数据库由JPA的ddl-auto:update自动管理
-- 3. 实际数据库包含21个表（已删除system_configs_backup多余表）
--
-- 实际数据库表列表：
-- - users, alerts, log_entries, security_events
-- - system_configs, threat_alerts, threat_rules
-- - simple_wmi_data, config_change_logs
-- - wmi_hosts, wmi_collection_tasks, wmi_collection_results
-- - log_entry_features, wmi_host_properties, wmi_result_metrics,
--   wmi_result_properties, wmi_task_parameters
-- - 视图: log_summary, alert_summary, log_statistics, alert_statistics
--
-- 如需重建数据库，请使用：
-- 1. 直接启动应用，JPA会自动创建表结构
-- 2. 或从现有数据库导出完整结构
--
-- ============================================================

-- AI日志异常检测与预警系统数据库初始化脚本
-- 创建时间: 2024-01-15
-- 版本: 1.0.0 (已过时)

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `ai_log_system` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `ai_log_system`;

-- 1. 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` varchar(50) NOT NULL COMMENT '用户名',
  `email` varchar(100) NOT NULL COMMENT '邮箱',
  `password_hash` varchar(255) NOT NULL COMMENT '密码（明文存储）',
  `role` enum('ADMIN','USER','OPERATOR','VIEWER') NOT NULL DEFAULT 'USER' COMMENT '用户角色',
  `status` enum('ACTIVE','INACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE' COMMENT '用户状态',
  `last_login` datetime DEFAULT NULL COMMENT '最后登录时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_role` (`role`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2. 日志条目表
CREATE TABLE IF NOT EXISTS `log_entries` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `timestamp` datetime NOT NULL COMMENT '时间戳',
  `source` varchar(100) NOT NULL COMMENT '数据源',
  `level` enum('DEBUG','INFO','WARN','ERROR','FATAL') NOT NULL COMMENT '日志级别',
  `message` text NOT NULL COMMENT '日志消息',
  `details` json DEFAULT NULL COMMENT '详细信息',
  `metadata` json DEFAULT NULL COMMENT '元数据',
  `tags` json DEFAULT NULL COMMENT '标签',
  `user_id` varchar(100) DEFAULT NULL COMMENT '用户ID',
  `ip_address` varchar(45) DEFAULT NULL COMMENT 'IP地址',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_source` (`source`),
  KEY `idx_level` (`level`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_ip_address` (`ip_address`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日志条目表';

-- 3. 告警表
CREATE TABLE IF NOT EXISTS `alerts` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '告警ID',
  `type` enum('WARNING','CRITICAL','INFO') NOT NULL COMMENT '告警类型',
  `title` varchar(255) NOT NULL COMMENT '告警标题',
  `message` text NOT NULL COMMENT '告警消息',
  `source` varchar(100) DEFAULT NULL COMMENT '告警来源',
  `level` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL COMMENT '严重程度',
  `status` enum('NEW','ACKNOWLEDGED','RESOLVED','CLOSED') NOT NULL DEFAULT 'NEW' COMMENT '告警状态',
  `assignee` varchar(100) DEFAULT NULL COMMENT '处理人',
  `resolution` text DEFAULT NULL COMMENT '解决方案',
  `ai_confidence` decimal(3,2) DEFAULT NULL COMMENT 'AI置信度',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_level` (`level`),
  KEY `idx_status` (`status`),
  KEY `idx_assignee` (`assignee`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='告警表';

-- 插入默认用户（明文密码）
INSERT INTO `users` (`username`, `email`, `password_hash`, `role`, `status`) VALUES
('admin', 'admin@example.com', '123456', 'ADMIN', 'ACTIVE'),
('operator', 'operator@example.com', '123456', 'OPERATOR', 'ACTIVE');

-- 插入示例日志数据
INSERT INTO `log_entries` (`timestamp`, `source`, `level`, `message`, `user_id`, `ip_address`) VALUES
('2024-01-15 10:00:00', 'auth', 'INFO', 'User login successful', 'admin', '192.168.1.100'),
('2024-01-15 10:01:00', 'system', 'WARN', 'High memory usage detected', NULL, '192.168.1.1'),
('2024-01-15 10:02:00', 'security', 'ERROR', 'Failed login attempt', 'user1', '192.168.1.200'),
('2024-01-15 10:03:00', 'database', 'INFO', 'Database connection established', NULL, '192.168.1.1'),
('2024-01-15 10:04:00', 'application', 'DEBUG', 'Request processed successfully', 'admin', '192.168.1.100');

-- 插入示例告警数据
INSERT INTO `alerts` (`type`, `title`, `message`, `source`, `level`, `status`, `ai_confidence`) VALUES
('WARNING', 'High Memory Usage', 'Memory usage has exceeded 80%', 'system', 'MEDIUM', 'NEW', 0.85),
('CRITICAL', 'Database Connection Failed', 'Unable to connect to database', 'database', 'CRITICAL', 'NEW', 0.95),
('INFO', 'System Startup', 'System has started successfully', 'system', 'LOW', 'RESOLVED', 1.00);

-- 创建索引优化查询性能
CREATE INDEX `idx_log_entries_composite` ON `log_entries` (`timestamp`, `source`, `level`);
CREATE INDEX `idx_alerts_composite` ON `alerts` (`status`, `level`, `created_at`);

-- 创建视图
CREATE VIEW `log_summary` AS
SELECT 
    DATE(`timestamp`) as log_date,
    `source`,
    `level`,
    COUNT(*) as log_count
FROM `log_entries`
GROUP BY DATE(`timestamp`), `source`, `level`;

CREATE VIEW `alert_summary` AS
SELECT 
    `type`,
    `level`,
    `status`,
    COUNT(*) as alert_count
FROM `alerts`
GROUP BY `type`, `level`, `status`;

-- 创建存储过程
DELIMITER //

CREATE PROCEDURE `GetLogStats`(IN days INT)
BEGIN
    SELECT 
        `source`,
        `level`,
        COUNT(*) as count,
        MAX(`timestamp`) as last_log
    FROM `log_entries`
    WHERE `timestamp` >= DATE_SUB(NOW(), INTERVAL days DAY)
    GROUP BY `source`, `level`
    ORDER BY count DESC;
END //

CREATE PROCEDURE `GetAlertStats`(IN days INT)
BEGIN
    SELECT 
        `type`,
        `level`,
        `status`,
        COUNT(*) as count
    FROM `alerts`
    WHERE `created_at` >= DATE_SUB(NOW(), INTERVAL days DAY)
    GROUP BY `type`, `level`, `status`
    ORDER BY count DESC;
END //

DELIMITER ;

-- 创建触发器
DELIMITER //

CREATE TRIGGER `update_user_last_login`
AFTER UPDATE ON `users`
FOR EACH ROW
BEGIN
    IF NEW.last_login IS NOT NULL AND OLD.last_login IS NULL THEN
        INSERT INTO `log_entries` (`timestamp`, `source`, `level`, `message`, `user_id`)
        VALUES (NOW(), 'auth', 'INFO', CONCAT('User ', NEW.username, ' logged in'), NEW.username);
    END IF;
END //

DELIMITER ;

-- 创建定时任务（需要开启事件调度器）
-- SET GLOBAL event_scheduler = ON;

-- 创建自动清理过期数据的定时任务
DELIMITER //

CREATE EVENT IF NOT EXISTS `cleanup_old_logs`
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    -- 删除30天前的日志
    DELETE FROM `log_entries` WHERE `created_at` < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    -- 删除已解决的过期告警
    DELETE FROM `alerts` WHERE `status` = 'RESOLVED' AND `updated_at` < DATE_SUB(NOW(), INTERVAL 7 DAY);
END //

DELIMITER ;