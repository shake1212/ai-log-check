package com.security.ailogsystem.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket消息处理器
 * 处理WebSocket连接、消息接收和发送
 * 
 * @author AI Log System
 * @version 1.0
 */
@Slf4j
@Component
public class WebSocketHandler implements org.springframework.web.socket.WebSocketHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();
    
    // 存储所有WebSocket会话
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    
    // 存储用户ID与会话的映射
    private final Map<String, String> userSessionMap = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        sessions.put(sessionId, session);
        
        // 从属性中获取用户信息
        String userId = (String) session.getAttributes().get("userId");
        if (userId != null) {
            userSessionMap.put(userId, sessionId);
        }
        
        log.info("WebSocket连接建立 - SessionId: {}, UserId: {}, 当前连接数: {}", 
                sessionId, userId, sessions.size());
        
        // 发送欢迎消息
        WebSocketMessage welcomeMessage = WebSocketMessage.systemInfo("WebSocket连接成功");
        sendMessage(session, welcomeMessage);
    }

    @Override
    public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) throws Exception {
        String sessionId = session.getId();
        log.debug("收到WebSocket消息 - SessionId: {}, MessageType: {}, Content: {}", 
                sessionId, message.getType(), message.getContent());
        
        try {
            // 根据消息类型处理不同的消息
            switch (message.getType()) {
                case PING:
                    // 响应Ping消息
                    WebSocketMessage pongMessage = WebSocketMessage.pong();
                    sendMessage(session, pongMessage);
                    break;
                    
                case HEARTBEAT:
                    // 处理心跳消息
                    handleHeartbeat(session, message);
                    break;
                    
                case CUSTOM:
                    // 处理自定义消息
                    handleCustomMessage(session, message);
                    break;
                    
                default:
                    log.warn("未知的消息类型: {}", message.getType());
                    break;
            }
        } catch (Exception e) {
            log.error("处理WebSocket消息失败: {}", e.getMessage(), e);
            WebSocketMessage errorMessage = WebSocketMessage.systemError("消息处理失败: " + e.getMessage());
            sendMessage(session, errorMessage);
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        String sessionId = session.getId();
        log.error("WebSocket传输错误 - SessionId: {}, Error: {}", sessionId, exception.getMessage(), exception);
        
        // 清理会话
        cleanupSession(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
        String sessionId = session.getId();
        log.info("WebSocket连接关闭 - SessionId: {}, CloseStatus: {}, 当前连接数: {}", 
                sessionId, closeStatus, sessions.size() - 1);
        
        // 清理会话
        cleanupSession(session);
    }

    @Override
    public boolean supportsPartialMessages() {
        return false;
    }
    
    /**
     * 发送消息给指定会话
     */
    public void sendMessage(WebSocketSession session, WebSocketMessage message) {
        if (session != null && session.isOpen()) {
            try {
                String jsonMessage = objectMapper.writeValueAsString(message);
                session.sendMessage(new TextMessage(jsonMessage));
                log.debug("发送WebSocket消息成功 - SessionId: {}, MessageType: {}", 
                        session.getId(), message.getType());
            } catch (IOException e) {
                log.error("发送WebSocket消息失败: {}", e.getMessage(), e);
            }
        }
    }
    
    /**
     * 发送消息给指定用户
     */
    public void sendMessageToUser(String userId, WebSocketMessage message) {
        String sessionId = userSessionMap.get(userId);
        if (sessionId != null) {
            WebSocketSession session = sessions.get(sessionId);
            if (session != null && session.isOpen()) {
                sendMessage(session, message);
            } else {
                // 清理无效的用户会话映射
                userSessionMap.remove(userId);
            }
        }
    }
    
    /**
     * 广播消息给所有连接的客户端
     */
    public void broadcastMessage(WebSocketMessage message) {
        log.info("广播WebSocket消息 - MessageType: {}, 目标连接数: {}", message.getType(), sessions.size());
        
        sessions.values().parallelStream()
                .filter(WebSocketSession::isOpen)
                .forEach(session -> sendMessage(session, message));
    }
    
    /**
     * 广播消息给指定类型的用户
     */
    public void broadcastMessageToUsers(String userType, WebSocketMessage message) {
        // 这里可以根据用户类型进行过滤广播
        // 例如：管理员、普通用户等
        broadcastMessage(message);
    }
    
    /**
     * 获取当前连接数
     */
    public int getConnectionCount() {
        return sessions.size();
    }
    
    /**
     * 获取在线用户数
     */
    public int getOnlineUserCount() {
        return userSessionMap.size();
    }
    
    /**
     * 处理心跳消息
     */
    private void handleHeartbeat(WebSocketSession session, WebSocketMessage message) {
        // 更新最后心跳时间
        session.getAttributes().put("lastHeartbeat", LocalDateTime.now());
        
        // 响应心跳
        WebSocketMessage heartbeatResponse = WebSocketMessage.heartbeat();
        sendMessage(session, heartbeatResponse);
    }
    
    /**
     * 处理自定义消息
     */
    private void handleCustomMessage(WebSocketSession session, WebSocketMessage message) {
        // 这里可以处理业务相关的自定义消息
        log.info("处理自定义消息 - SessionId: {}, Content: {}", session.getId(), message.getContent());
        
        // 可以在这里添加具体的业务逻辑
        // 例如：订阅特定频道、请求特定数据等
    }
    
    /**
     * 清理会话
     */
    private void cleanupSession(WebSocketSession session) {
        String sessionId = session.getId();
        
        // 从会话映射中移除
        sessions.remove(sessionId);
        
        // 从用户会话映射中移除
        userSessionMap.entrySet().removeIf(entry -> entry.getValue().equals(sessionId));
        
        log.debug("清理WebSocket会话 - SessionId: {}", sessionId);
    }
}
