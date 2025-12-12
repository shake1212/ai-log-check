package com.security.ailogsystem.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * RestTemplate 配置类，显式声明 Bean 供依赖注入
 */
@Configuration
public class RestTemplateConfig {

    /**
     * 定义 RestTemplate Bean，使 Spring 容器可以管理并注入到其他类中
     */
    @Bean
    public RestTemplate restTemplate() {
        // 可根据需要定制 RestTemplate（如添加超时、拦截器等），基础版本直接返回新实例即可
        return new RestTemplate();
    }
}