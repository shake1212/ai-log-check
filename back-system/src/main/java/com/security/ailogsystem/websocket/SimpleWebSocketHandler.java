package com.security.ailogsystem.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 简化版WebSocket处理器
 * 继承TextWebSocketHandler，专门处理文本消息
 *
 * @author AI Log System
 * @version 1.0
 */
@Slf4j
@Component
public class SimpleWebSocketHandler extends TextWebSocketHandler {  // 继承TextWebSocketHandler

    private final ObjectMapper objectMapper = new ObjectMapper();

    // 存储所有WebSocket会话
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        sessions.put(sessionId, session);

        log.info("WebSocket连接建立 - SessionId: {}, 当前连接数: {}", sessionId, sessions.size());

        // 发送欢迎消息
        SimpleWebSocketMessage welcomeMessage = SimpleWebSocketMessage.systemMessage("WebSocket连接成功");
        sendMessage(session, welcomeMessage);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage textMessage) throws Exception {
        String sessionId = session.getId();
        log.debug("收到WebSocket消息 - SessionId: {}, Message: {}", sessionId, textMessage.getPayload());

        try {
            // 解析消息
            String payload = textMessage.getPayload();
            SimpleWebSocketMessage wsMessage = objectMapper.readValue(payload, SimpleWebSocketMessage.class);

            // 处理不同类型的消息
            handleMessageByType(session, wsMessage);

        } catch (Exception e) {
            log.error("处理WebSocket消息失败: {}", e.getMessage(), e);
            SimpleWebSocketMessage errorMessage = SimpleWebSocketMessage.systemMessage("消息处理失败: " + e.getMessage());
            sendMessage(session, errorMessage);
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        String sessionId = session.getId();
        log.error("WebSocket传输错误 - SessionId: {}, Error: {}", sessionId, exception.getMessage());
        cleanupSession(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
        String sessionId = session.getId();
        log.info("WebSocket连接关闭 - SessionId: {}, CloseStatus: {}, 当前连接数: {}",
                sessionId, closeStatus, sessions.size() - 1);
        cleanupSession(session);
    }

    /**
     * 发送消息给指定会话
     */
    public void sendMessage(WebSocketSession session, SimpleWebSocketMessage message) {
        if (session != null && session.isOpen()) {
            try {
                String jsonMessage = objectMapper.writeValueAsString(message);
                session.sendMessage(new TextMessage(jsonMessage));
                log.debug("发送WebSocket消息成功 - SessionId: {}, Type: {}", session.getId(), message.getType());
            } catch (IOException e) {
                log.error("发送WebSocket消息失败: {}", e.getMessage(), e);
            }
        }
    }

    /**
     * 广播消息给所有连接的客户端
     */
    public void broadcastMessage(SimpleWebSocketMessage message) {
        log.info("广播WebSocket消息 - Type: {}, 目标连接数: {}", message.getType(), sessions.size());

        sessions.values().parallelStream()
                .filter(WebSocketSession::isOpen)
                .forEach(session -> sendMessage(session, message));
    }

    /**
     * 获取当前连接数
     */
    public int getConnectionCount() {
        return sessions.size();
    }

    /**
     * 根据消息类型处理消息
     */
    private void handleMessageByType(WebSocketSession session, SimpleWebSocketMessage message) {
        String type = message.getType();

        switch (type) {
            case "heartbeat":
                // 响应心跳
                SimpleWebSocketMessage pongMessage = SimpleWebSocketMessage.builder()
                        .type("heartbeat")
                        .content("pong")
                        .timestamp(LocalDateTime.now())
                        .sender("system")
                        .build();
                sendMessage(session, pongMessage);
                break;

            case "ping":
                // 响应Ping
                SimpleWebSocketMessage pongResponse = SimpleWebSocketMessage.builder()
                        .type("pong")
                        .content("pong")
                        .timestamp(LocalDateTime.now())
                        .sender("system")
                        .build();
                sendMessage(session, pongResponse);
                break;

            case "custom":
                // 处理自定义消息
                log.info("收到自定义消息: {}", message.getContent());
                break;

            default:
                log.warn("未知的消息类型: {}", type);
                break;
        }
    }

    /**
     * 清理会话
     */
    private void cleanupSession(WebSocketSession session) {
        String sessionId = session.getId();
        sessions.remove(sessionId);
        log.debug("清理WebSocket会话 - SessionId: {}", sessionId);
    }
}