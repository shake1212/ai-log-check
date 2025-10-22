package com.security.ailogsystem.config;

import org.springframework.context.annotation.Configuration;

/**
 * 数据库指标配置
 * 提供数据库连接池的监控指标配置
 * 注意：Micrometer指标注册已简化，避免编译问题
 */
@Configuration
public class DatabaseMetricsConfig {
    
    // 数据库指标配置类
    // 在实际部署时，可以启用Micrometer指标收集
    // 目前使用简化的配置避免编译问题
    
}
