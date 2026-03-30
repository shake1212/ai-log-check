package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.entity.LogCollectorConfig;
import com.security.ailogsystem.repository.LogCollectorConfigRepository;
import com.security.ailogsystem.service.LogCollectorConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * 日志采集器配置服务实现
 * 
 * @author AI Log System
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LogCollectorConfigServiceImpl implements LogCollectorConfigService {
    
    private final LogCollectorConfigRepository repository;
    
    /**
     * 服务启动时初始化默认配置
     */
    @PostConstruct
    public void init() {
        initializeDefaultConfig();
    }
    
    @Override
    public Optional<LogCollectorConfig> getConfigById(String id) {
        log.debug("获取配置: {}", id);
        return repository.findById(id);
    }
    
    @Override
    public List<LogCollectorConfig> getAllConfigs() {
        log.debug("获取所有配置");
        return repository.findAll();
    }
    
    @Override
    @Transactional
    public LogCollectorConfig saveConfig(LogCollectorConfig config) {
        log.info("保存配置: {}", config.getId());
        
        // 如果是更新操作，保留创建时间
        if (config.getId() != null) {
            repository.findById(config.getId()).ifPresent(existing -> {
                config.setCreatedAt(existing.getCreatedAt());
            });
        }
        
        return repository.save(config);
    }
    
    @Override
    @Transactional
    public void deleteConfig(String id) {
        log.info("删除配置: {}", id);
        repository.deleteById(id);
    }
    
    @Override
    public boolean existsById(String id) {
        return repository.existsById(id);
    }
    
    @Override
    @Transactional
    public void initializeDefaultConfig() {
        String defaultId = "default";
        
        if (!repository.existsById(defaultId)) {
            log.info("初始化默认配置");
            
            LogCollectorConfig defaultConfig = new LogCollectorConfig();
            defaultConfig.setId(defaultId);
            defaultConfig.setName("安全日志采集器");
            defaultConfig.setEnabled(true);
            defaultConfig.setInterval(300);
            
            // 设置所有8种数据源
            defaultConfig.setDataSources(Arrays.asList(
                "security", "system", "application",
                "cpu", "memory", "disk", "network", "process"
            ));
            
            // 设置默认告警阈值
            defaultConfig.setCpuThreshold(80);
            defaultConfig.setMemoryThreshold(90);
            defaultConfig.setDiskThreshold(85);
            defaultConfig.setErrorRateThreshold(5);
            
            // 设置数据保留天数
            defaultConfig.setRetentionDays(7);
            
            // 设置时间
            LocalDateTime now = LocalDateTime.now();
            defaultConfig.setCreatedAt(now);
            defaultConfig.setUpdatedAt(now);
            
            repository.save(defaultConfig);
            log.info("默认配置初始化完成");
        } else {
            log.debug("默认配置已存在，跳过初始化");
        }
    }
}
