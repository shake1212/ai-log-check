-- 系统指标表
CREATE TABLE IF NOT EXISTS system_metrics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    timestamp DATETIME NOT NULL COMMENT '指标时间戳',
    hostname VARCHAR(255) COMMENT '主机名',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    
    -- CPU指标
    cpu_usage DOUBLE COMMENT 'CPU使用率（%）',
    cpu_cores INT COMMENT 'CPU核心数',
    cpu_frequency DOUBLE COMMENT 'CPU频率（MHz）',
    
    -- 内存指标
    memory_usage DOUBLE COMMENT '内存使用率（%）',
    memory_used BIGINT COMMENT '已使用内存（字节）',
    memory_total BIGINT COMMENT '总内存（字节）',
    memory_available BIGINT COMMENT '可用内存（字节）',
    
    -- 磁盘指标
    disk_usage DOUBLE COMMENT '磁盘使用率（%）',
    disk_used BIGINT COMMENT '已使用磁盘空间（字节）',
    disk_total BIGINT COMMENT '总磁盘空间（字节）',
    
    -- 网络指标
    network_sent BIGINT COMMENT '网络发送字节数',
    network_received BIGINT COMMENT '网络接收字节数',
    network_sent_rate DOUBLE COMMENT '网络发送速率（字节/秒）',
    network_received_rate DOUBLE COMMENT '网络接收速率（字节/秒）',
    
    -- 进程指标
    total_processes INT COMMENT '总进程数',
    running_processes INT COMMENT '运行中进程数',
    
    -- 系统指标
    system_load DOUBLE COMMENT '系统负载',
    uptime BIGINT COMMENT '系统运行时间（秒）',
    
    -- 原始数据
    raw_data JSON COMMENT '原始JSON数据',
    
    created_at DATETIME NOT NULL COMMENT '创建时间',
    
    INDEX idx_timestamp (timestamp),
    INDEX idx_hostname (hostname),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统性能指标表';
