-- 日志采集器配置表
CREATE TABLE IF NOT EXISTS log_collector_configs (
    id VARCHAR(50) PRIMARY KEY COMMENT '配置ID',
    name VARCHAR(100) NOT NULL COMMENT '配置名称',
    enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
    `interval` INT NOT NULL DEFAULT 300 COMMENT '采集间隔（秒）',
    data_sources JSON NOT NULL COMMENT '数据源列表',
    cpu_threshold INT NOT NULL DEFAULT 80 COMMENT 'CPU告警阈值（%）',
    memory_threshold INT NOT NULL DEFAULT 90 COMMENT '内存告警阈值（%）',
    disk_threshold INT NOT NULL DEFAULT 85 COMMENT '磁盘告警阈值（%）',
    error_rate_threshold INT NOT NULL DEFAULT 5 COMMENT '错误率告警阈值（%）',
    retention_days INT NOT NULL DEFAULT 7 COMMENT '数据保留天数',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='日志采集器配置表';

-- 插入默认配置
INSERT INTO log_collector_configs (
    id, 
    name, 
    enabled, 
    `interval`, 
    data_sources,
    cpu_threshold,
    memory_threshold,
    disk_threshold,
    error_rate_threshold,
    retention_days
) VALUES (
    'default',
    '安全日志采集器',
    TRUE,
    300,
    JSON_ARRAY('security', 'system', 'application', 'cpu', 'memory', 'disk', 'network', 'process'),
    80,
    90,
    85,
    5,
    7
) ON DUPLICATE KEY UPDATE 
    name = VALUES(name);
