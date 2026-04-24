-- V6: 添加关键索引和修复alerts.confidence类型
-- 解决unified_security_events缺少索引导致查询慢的问题
-- 解决alerts.confidence精度不足的问题

-- =============================================
-- 1. unified_security_events 关键索引
-- =============================================
CREATE PROCEDURE IF NOT EXISTS add_index_if_not_exists()
BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
    
    -- timestamp 索引（时间范围查询最常用）
    ALTER TABLE unified_security_events ADD INDEX idx_use_timestamp (timestamp);
    
    -- severity 索引（按严重程度筛选）
    ALTER TABLE unified_security_events ADD INDEX idx_use_severity (severity);
    
    -- category 索引（按分类筛选）
    ALTER TABLE unified_security_events ADD INDEX idx_use_category (category);
    
    -- source_system 索引（按来源系统筛选）
    ALTER TABLE unified_security_events ADD INDEX idx_use_source_system (source_system);
    
    -- event_type 索引（按事件类型筛选）
    ALTER TABLE unified_security_events ADD INDEX idx_use_event_type (event_type);
    
    -- is_anomaly 索引（异常事件筛选）
    ALTER TABLE unified_security_events ADD INDEX idx_use_is_anomaly (is_anomaly);
    
    -- threat_level 索引（按威胁等级筛选）
    ALTER TABLE unified_security_events ADD INDEX idx_use_threat_level (threat_level);
    
    -- source_ip 索引（按源IP筛选）
    ALTER TABLE unified_security_events ADD INDEX idx_use_source_ip (source_ip);
    
    -- =============================================
    -- 2. alerts 关键索引
    -- =============================================
    ALTER TABLE alerts ADD INDEX idx_alert_level (alert_level);
    ALTER TABLE alerts ADD INDEX idx_alert_status (status);
    ALTER TABLE alerts ADD INDEX idx_alert_handled (handled);
    ALTER TABLE alerts ADD INDEX idx_alert_created_time (created_time);
    ALTER TABLE alerts ADD INDEX idx_alert_type (alert_type);
    
    -- =============================================
    -- 3. 修复 alerts.confidence 类型
    -- =============================================
    ALTER TABLE alerts MODIFY COLUMN confidence DOUBLE DEFAULT NULL;
END;

CALL add_index_if_not_exists();
DROP PROCEDURE IF EXISTS add_index_if_not_exists;
