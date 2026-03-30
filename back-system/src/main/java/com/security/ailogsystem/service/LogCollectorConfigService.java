package com.security.ailogsystem.service;

import com.security.ailogsystem.entity.LogCollectorConfig;

import java.util.List;
import java.util.Optional;

/**
 * 日志采集器配置服务接口
 * 
 * @author AI Log System
 */
public interface LogCollectorConfigService {
    
    /**
     * 根据ID获取配置
     * 
     * @param id 配置ID
     * @return 配置对象
     */
    Optional<LogCollectorConfig> getConfigById(String id);
    
    /**
     * 获取所有配置
     * 
     * @return 配置列表
     */
    List<LogCollectorConfig> getAllConfigs();
    
    /**
     * 保存或更新配置
     * 
     * @param config 配置对象
     * @return 保存后的配置
     */
    LogCollectorConfig saveConfig(LogCollectorConfig config);
    
    /**
     * 删除配置
     * 
     * @param id 配置ID
     */
    void deleteConfig(String id);
    
    /**
     * 检查配置是否存在
     * 
     * @param id 配置ID
     * @return 是否存在
     */
    boolean existsById(String id);
    
    /**
     * 初始化默认配置（如果不存在）
     */
    void initializeDefaultConfig();
}
