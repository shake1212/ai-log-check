-- 安全添加规则引擎配置字段（兼容已存在的情况）
-- 版本: 1.0.6
-- 描述: 使用存储过程安全添加列，避免重复添加错误

DELIMITER $$

-- 添加规则引擎启用开关字段
DROP PROCEDURE IF EXISTS add_enable_rule_engine_column$$
CREATE PROCEDURE add_enable_rule_engine_column()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'log_collector_configs' 
        AND COLUMN_NAME = 'enable_rule_engine'
    ) THEN
        ALTER TABLE log_collector_configs 
        ADD COLUMN enable_rule_engine BOOLEAN NOT NULL DEFAULT TRUE 
        COMMENT '是否启用规则引擎分析';
    END IF;
END$$

-- 添加规则引擎超时配置字段
DROP PROCEDURE IF EXISTS add_rule_engine_timeout_column$$
CREATE PROCEDURE add_rule_engine_timeout_column()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'log_collector_configs' 
        AND COLUMN_NAME = 'rule_engine_timeout'
    ) THEN
        ALTER TABLE log_collector_configs 
        ADD COLUMN rule_engine_timeout INT DEFAULT 10 
        COMMENT '规则引擎超时时间（秒）';
    END IF;
END$$

DELIMITER ;

-- 执行存储过程
CALL add_enable_rule_engine_column();
CALL add_rule_engine_timeout_column();

-- 清理存储过程
DROP PROCEDURE IF EXISTS add_enable_rule_engine_column;
DROP PROCEDURE IF EXISTS add_rule_engine_timeout_column;
