package com.security.ailogsystem.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * 简化版WebSocket配置
 * 核心设计理念：功能聚焦、代码精简、易于维护、快速上手
 * 
 * @author AI Log System
 * @version 1.0
 */
@Configuration
@EnableWebSocket
public class SimpleWebSocketConfig implements WebSocketConfigurer {

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // 注册简化版WebSocket处理器
        registry.addHandler(new SimpleWebSocketHandler(), "/ws/simple")
                .setAllowedOrigins("*"); // 开发环境允许所有来源
    }
}
