// websocket/WebSocketEventListener.java
package com.security.ailogsystem.websocket;

import com.security.ailogsystem.service.impl.WebSocketServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.List;
import java.util.Map;

@Component
public class WebSocketEventListener {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketEventListener.class);

    @Autowired
    private SimpMessageSendingOperations messagingTemplate;

    @Autowired
    private WebSocketServiceImpl webSocketService;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        try {
            StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
            String sessionId = headerAccessor.getSessionId();
            String username = getUsernameFromHeaders(headerAccessor);

            logger.info("WebSocket连接建立 - 会话ID: {}, 用户: {}", sessionId, username);

            // 确保sessionId不为null
            if (sessionId != null) {
                webSocketService.addActiveSession(sessionId, username);

                // 发送连接成功消息
                WebSocketMessage message = WebSocketMessage.builder()
                        .type(WebSocketMessage.MessageType.SYSTEM_INFO)
                        .content("WebSocket连接成功")
                        .sender("system")
                        .receiver(username)
                        .build();

                // 只有当username有效时才发送用户特定的消息
                if (username != null && !"anonymous".equals(username)) {
                    messagingTemplate.convertAndSendToUser(username, "/queue/connection", message);
                }

                // 同时广播到公共频道
                messagingTemplate.convertAndSend("/topic/connections",
                        WebSocketMessage.builder()
                                .type(WebSocketMessage.MessageType.SYSTEM_INFO)
                                .content("用户 " + username + " 已连接")
                                .sender("system")
                                .build());
            }
        } catch (Exception e) {
            logger.error("处理WebSocket连接事件时发生异常", e);
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        try {
            StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
            String sessionId = headerAccessor.getSessionId();
            String username = getUsernameFromHeaders(headerAccessor);

            logger.info("WebSocket连接断开 - 会话ID: {}, 用户: {}", sessionId, username);

            // 从活动会话中移除
            if (sessionId != null) {
                webSocketService.removeActiveSession(sessionId);
            }

            // 发送断开连接通知
            if (username != null && !"anonymous".equals(username)) {
                WebSocketMessage message = WebSocketMessage.builder()
                        .type(WebSocketMessage.MessageType.SYSTEM_INFO)
                        .content("WebSocket连接已断开")
                        .sender("system")
                        .receiver(username)
                        .build();

                messagingTemplate.convertAndSendToUser(username, "/queue/connection", message);
            }

            // 广播断开连接消息
            messagingTemplate.convertAndSend("/topic/connections",
                    WebSocketMessage.builder()
                            .type(WebSocketMessage.MessageType.SYSTEM_INFO)
                            .content("用户 " + username + " 已断开连接")
                            .sender("system")
                            .build());

        } catch (Exception e) {
            logger.error("处理WebSocket断开事件时发生异常", e);
        }
    }

    /**
     * 从STOMP头信息中提取用户名 - 安全版本
     */
    private String getUsernameFromHeaders(StompHeaderAccessor headerAccessor) {
        if (headerAccessor == null) {
            return "anonymous";
        }

        try {
            // 方法1: 从session attributes获取
            Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
            if (sessionAttributes != null) {
                Object userObj = sessionAttributes.get("username");
                if (userObj != null) {
                    String username = userObj.toString();
                    if (!username.trim().isEmpty()) {
                        return username.trim();
                    }
                }
            }

            // 方法2: 从native headers获取
            List<String> usernameHeaders = headerAccessor.getNativeHeader("username");
            if (usernameHeaders != null && !usernameHeaders.isEmpty()) {
                String username = usernameHeaders.get(0);
                if (username != null && !username.trim().isEmpty()) {
                    return username.trim();
                }
            }

            // 方法3: 从Spring Security认证信息获取（如果配置了安全）
            java.security.Principal principal = headerAccessor.getUser();
            if (principal != null) {
                String username = principal.getName();
                if (username != null && !username.trim().isEmpty()) {
                    return username.trim();
                }
            }

            // 方法4: 从登录头信息获取
            List<String> loginHeaders = headerAccessor.getNativeHeader("login");
            if (loginHeaders != null && !loginHeaders.isEmpty()) {
                String login = loginHeaders.get(0);
                if (login != null && !login.trim().isEmpty()) {
                    return login.trim();
                }
            }

        } catch (Exception e) {
            logger.warn("获取用户名时发生异常，使用匿名用户", e);
        }

        // 默认返回匿名用户
        return "anonymous";
    }

    /**
     * 获取用户IP地址（可选功能）
     */
    private String getUserIp(StompHeaderAccessor headerAccessor) {
        try {
            // 尝试从native headers获取IP
            List<String> ipHeaders = headerAccessor.getNativeHeader("X-Forwarded-For");
            if (ipHeaders != null && !ipHeaders.isEmpty()) {
                return ipHeaders.get(0);
            }

            // 其他可能的IP头
            ipHeaders = headerAccessor.getNativeHeader("X-Real-IP");
            if (ipHeaders != null && !ipHeaders.isEmpty()) {
                return ipHeaders.get(0);
            }

        } catch (Exception e) {
            logger.debug("获取用户IP时发生异常", e);
        }

        return "unknown";
    }
}