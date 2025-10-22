package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.service.SimpleWebSocketService;
import com.security.ailogsystem.websocket.SimpleWebSocketHandler;
import com.security.ailogsystem.websocket.SimpleWebSocketMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * 简化版WebSocket服务实现
 * 核心设计理念：代码精简、易于维护
 * 
 * @author AI Log System
 * @version 1.0
 */
@Slf4j
@Service
public class SimpleWebSocketServiceImpl implements SimpleWebSocketService {

    @Autowired
    private SimpleWebSocketHandler webSocketHandler;

    @Override
    public void broadcastMessage(SimpleWebSocketMessage message) {
        try {
            webSocketHandler.broadcastMessage(message);
            log.debug("广播消息成功 - Type: {}", message.getType());
        } catch (Exception e) {
            log.error("广播消息失败 - Error: {}", e.getMessage(), e);
        }
    }

    @Override
    public void sendSystemMessage(String content) {
        SimpleWebSocketMessage message = SimpleWebSocketMessage.systemMessage(content);
        broadcastMessage(message);
    }

    @Override
    public void sendLogMessage(String content, Object data) {
        SimpleWebSocketMessage message = SimpleWebSocketMessage.logMessage(content, data);
        broadcastMessage(message);
    }

    @Override
    public void sendAlertMessage(String content, Object data) {
        SimpleWebSocketMessage message = SimpleWebSocketMessage.alertMessage(content, data);
        broadcastMessage(message);
    }

    @Override
    public void sendHeartbeat() {
        SimpleWebSocketMessage message = SimpleWebSocketMessage.heartbeat();
        broadcastMessage(message);
    }

    @Override
    public void sendCustomMessage(String type, String content, Object data) {
        SimpleWebSocketMessage message = SimpleWebSocketMessage.customMessage(type, content, data);
        broadcastMessage(message);
    }

    @Override
    public int getConnectionCount() {
        return webSocketHandler.getConnectionCount();
    }
}
