package com.security.ailogsystem.service;

import com.security.ailogsystem.websocket.SimpleWebSocketMessage;

/**
 * 简化版WebSocket服务接口
 * 核心设计理念：功能聚焦、易于维护
 * 
 * @author AI Log System
 * @version 1.0
 */
public interface SimpleWebSocketService {
    
    /**
     * 广播消息给所有连接的客户端
     */
    void broadcastMessage(SimpleWebSocketMessage message);
    
    /**
     * 发送系统消息
     */
    void sendSystemMessage(String content);
    
    /**
     * 发送日志消息
     */
    void sendLogMessage(String content, Object data);
    
    /**
     * 发送预警消息
     */
    void sendAlertMessage(String content, Object data);
    
    /**
     * 发送心跳消息
     */
    void sendHeartbeat();
    
    /**
     * 发送自定义消息
     */
    void sendCustomMessage(String type, String content, Object data);
    
    /**
     * 获取当前连接数
     */
    int getConnectionCount();
}
