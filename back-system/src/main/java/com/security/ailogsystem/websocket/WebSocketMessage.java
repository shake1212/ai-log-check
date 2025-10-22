package com.security.ailogsystem.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * WebSocket消息实体
 * 
 * @author AI Log System
 * @version 1.0
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketMessage {
    
    /**
     * 消息类型
     */
    private MessageType type;
    
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
     * 接收者（可选）
     */
    private String receiver;
    
    /**
     * 额外属性
     */
    private Map<String, Object> attributes;
    
    /**
     * 消息类型枚举
     */
    public enum MessageType {
        // 系统消息
        SYSTEM_INFO("系统信息"),
        SYSTEM_ERROR("系统错误"),
        SYSTEM_WARNING("系统警告"),
        
        // 日志相关
        LOG_UPDATE("日志更新"),
        LOG_ANOMALY("异常日志"),
        LOG_STATISTICS("日志统计"),
        
        // 预警相关
        ALERT_NEW("新预警"),
        ALERT_UPDATE("预警更新"),
        ALERT_RESOLVED("预警解决"),
        
        // 实时监控
        MONITOR_CPU("CPU监控"),
        MONITOR_MEMORY("内存监控"),
        MONITOR_DISK("磁盘监控"),
        MONITOR_NETWORK("网络监控"),
        
        // 用户操作
        USER_LOGIN("用户登录"),
        USER_LOGOUT("用户登出"),
        USER_ACTION("用户操作"),
        
        // 心跳
        HEARTBEAT("心跳"),
        PING("Ping"),
        PONG("Pong"),
        
        // 自定义消息
        CUSTOM("自定义消息");
        
        private final String description;
        
        MessageType(String description) {
            this.description = description;
        }
        
        public String getDescription() {
            return description;
        }
    }
    
    /**
     * 创建系统信息消息
     */
    public static WebSocketMessage systemInfo(String content) {
        return WebSocketMessage.builder()
                .type(MessageType.SYSTEM_INFO)
                .content(content)
                .timestamp(LocalDateTime.now())
                .sender("system")
                .build();
    }
    
    /**
     * 创建系统错误消息
     */
    public static WebSocketMessage systemError(String content) {
        return WebSocketMessage.builder()
                .type(MessageType.SYSTEM_ERROR)
                .content(content)
                .timestamp(LocalDateTime.now())
                .sender("system")
                .build();
    }
    
    /**
     * 创建日志更新消息
     */
    public static WebSocketMessage logUpdate(Object data) {
        return WebSocketMessage.builder()
                .type(MessageType.LOG_UPDATE)
                .content("日志数据更新")
                .data(data)
                .timestamp(LocalDateTime.now())
                .sender("system")
                .build();
    }
    
    /**
     * 创建异常日志消息
     */
    public static WebSocketMessage logAnomaly(Object data) {
        return WebSocketMessage.builder()
                .type(MessageType.LOG_ANOMALY)
                .content("检测到异常日志")
                .data(data)
                .timestamp(LocalDateTime.now())
                .sender("system")
                .build();
    }
    
    /**
     * 创建新预警消息
     */
    public static WebSocketMessage newAlert(Object data) {
        return WebSocketMessage.builder()
                .type(MessageType.ALERT_NEW)
                .content("新预警产生")
                .data(data)
                .timestamp(LocalDateTime.now())
                .sender("system")
                .build();
    }
    
    /**
     * 创建心跳消息
     */
    public static WebSocketMessage heartbeat() {
        return WebSocketMessage.builder()
                .type(MessageType.HEARTBEAT)
                .content("heartbeat")
                .timestamp(LocalDateTime.now())
                .sender("system")
                .build();
    }
    
    /**
     * 创建Ping消息
     */
    public static WebSocketMessage ping() {
        return WebSocketMessage.builder()
                .type(MessageType.PING)
                .content("ping")
                .timestamp(LocalDateTime.now())
                .sender("system")
                .build();
    }
    
    /**
     * 创建Pong消息
     */
    public static WebSocketMessage pong() {
        return WebSocketMessage.builder()
                .type(MessageType.PONG)
                .content("pong")
                .timestamp(LocalDateTime.now())
                .sender("system")
                .build();
    }
}
