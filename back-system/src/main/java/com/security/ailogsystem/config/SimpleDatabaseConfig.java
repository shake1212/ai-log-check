package com.security.ailogsystem.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * 简化的数据库配置
 * 使用Spring Boot自动配置，避免MBean冲突
 */
@Configuration
@Primary
@ConditionalOnProperty(name = "spring.datasource.hikari.register-mbeans", havingValue = "false", matchIfMissing = true)
public class SimpleDatabaseConfig {
    
    // 使用Spring Boot的自动配置
    // 通过application.yml配置HikariCP
    // 避免手动配置导致的MBean冲突
    
}
