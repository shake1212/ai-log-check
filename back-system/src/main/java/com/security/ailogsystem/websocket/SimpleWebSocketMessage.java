package com.security.ailogsystem.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 简化版WebSocket消息
 * 核心设计理念：纯JSON文本，易于调试
 * 
 * @author AI Log System
 * @version 1.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimpleWebSocketMessage {
    
    /**
     * 消息类型
     */
    private String type;
    
    /**
     * 消息内容
     */
    private String content;
    
    /**
     * 消息数据
     */
    private Object data;
    
    /**
     * 时间戳
     */
    private LocalDateTime timestamp;
    
    /**
     * 发送者
     */
    private String sender;
    
    /**
     * 创建系统消息
     */
    public static SimpleWebSocketMessage systemMessage(String content) {
        return SimpleWebSocketMessage.builder()
                .type("system")
                .content(content)
                .timestamp(LocalDateTime.now())
                .sender("system")
                .build();
    }
    
    /**
     * 创建日志消息
     */
    public static SimpleWebSocketMessage logMessage(String content, Object data) {
        return SimpleWebSocketMessage.builder()
                .type("log")
                .content(content)
                .data(data)
                .timestamp(LocalDateTime.now())
                .sender("system")
                .build();
    }
    
    /**
     * 创建预警消息
     */
    public static SimpleWebSocketMessage alertMessage(String content, Object data) {
        return SimpleWebSocketMessage.builder()
                .type("alert")
                .content(content)
                .data(data)
                .timestamp(LocalDateTime.now())
                .sender("system")
                .build();
    }
    
    /**
     * 创建心跳消息
     */
    public static SimpleWebSocketMessage heartbeat() {
        return SimpleWebSocketMessage.builder()
                .type("heartbeat")
                .content("ping")
                .timestamp(LocalDateTime.now())
                .sender("system")
                .build();
    }
    
    /**
     * 创建自定义消息
     */
    public static SimpleWebSocketMessage customMessage(String type, String content, Object data) {
        return SimpleWebSocketMessage.builder()
                .type(type)
                .content(content)
                .data(data)
                .timestamp(LocalDateTime.now())
                .sender("client")
                .build();
    }
}
