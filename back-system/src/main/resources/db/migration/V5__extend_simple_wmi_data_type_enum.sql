-- 扩展 simple_wmi_data 表的 data_type ENUM，添加 MEMORY_INFO、DISK_INFO、PROCESS_INFO
-- 版本: V5
-- 描述: 同步数据库ENUM与Java枚举定义

ALTER TABLE simple_wmi_data
    MODIFY COLUMN data_type ENUM(
        'CPU_USAGE',
        'MEMORY_USAGE',
        'DISK_USAGE',
        'NETWORK_TRAFFIC',
        'PROCESS_COUNT',
        'SERVICE_STATUS',
        'SYSTEM_INFO',
        'SYSTEM_PERFORMANCE',
        'CPU_INFO',
        'SYSTEM_BASIC',
        'MEMORY_INFO',
        'DISK_INFO',
        'PROCESS_INFO'
    ) NOT NULL;
