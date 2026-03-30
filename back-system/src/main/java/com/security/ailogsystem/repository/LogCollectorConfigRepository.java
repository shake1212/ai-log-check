package com.security.ailogsystem.repository;

import com.security.ailogsystem.entity.LogCollectorConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 日志采集器配置Repository
 * 
 * @author AI Log System
 */
@Repository
public interface LogCollectorConfigRepository extends JpaRepository<LogCollectorConfig, String> {
    
    /**
     * 根据名称查找配置
     * 
     * @param name 配置名称
     * @return 配置对象
     */
    Optional<LogCollectorConfig> findByName(String name);
    
    /**
     * 查找所有启用的配置
     * 
     * @return 启用的配置列表
     */
    java.util.List<LogCollectorConfig> findByEnabledTrue();
}
