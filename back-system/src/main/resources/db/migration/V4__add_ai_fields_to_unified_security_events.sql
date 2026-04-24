-- 安全添加AI分析字段到 unified_security_events 表
-- 版本: V4
-- 描述: 添加 ai_anomaly_score、ai_is_anomaly、combined_score 三列

DELIMITER $$

-- 添加 ai_anomaly_score 字段
DROP PROCEDURE IF EXISTS add_ai_anomaly_score_column$$
CREATE PROCEDURE add_ai_anomaly_score_column()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'unified_security_events'
        AND COLUMN_NAME = 'ai_anomaly_score'
    ) THEN
        ALTER TABLE unified_security_events
        ADD COLUMN ai_anomaly_score DOUBLE DEFAULT 0.0
        COMMENT 'AI异常检测分数';
    END IF;
END$$

-- 添加 ai_is_anomaly 字段
DROP PROCEDURE IF EXISTS add_ai_is_anomaly_column$$
CREATE PROCEDURE add_ai_is_anomaly_column()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'unified_security_events'
        AND COLUMN_NAME = 'ai_is_anomaly'
    ) THEN
        ALTER TABLE unified_security_events
        ADD COLUMN ai_is_anomaly BOOLEAN DEFAULT FALSE
        COMMENT 'AI是否判定为异常';
    END IF;
END$$

-- 添加 combined_score 字段
DROP PROCEDURE IF EXISTS add_combined_score_column$$
CREATE PROCEDURE add_combined_score_column()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'unified_security_events'
        AND COLUMN_NAME = 'combined_score'
    ) THEN
        ALTER TABLE unified_security_events
        ADD COLUMN combined_score DOUBLE DEFAULT 0.0
        COMMENT 'AI与规则引擎综合分数';
    END IF;
END$$

-- 添加 unified_event_id 字段到 alerts 表
DROP PROCEDURE IF EXISTS add_unified_event_id_to_alerts$$
CREATE PROCEDURE add_unified_event_id_to_alerts()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'alerts'
        AND COLUMN_NAME = 'unified_event_id'
    ) THEN
        ALTER TABLE alerts
        ADD COLUMN unified_event_id BIGINT DEFAULT NULL
        COMMENT '关联的统一安全事件ID';
    END IF;
END$$

DELIMITER ;

-- 执行存储过程
CALL add_ai_anomaly_score_column();
CALL add_ai_is_anomaly_column();
CALL add_combined_score_column();
CALL add_unified_event_id_to_alerts();

-- 清理存储过程
DROP PROCEDURE IF EXISTS add_ai_anomaly_score_column;
DROP PROCEDURE IF EXISTS add_ai_is_anomaly_column;
DROP PROCEDURE IF EXISTS add_combined_score_column;
DROP PROCEDURE IF EXISTS add_unified_event_id_to_alerts;
