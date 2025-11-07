// service/impl/WebSocketServiceImpl.java
package com.security.ailogsystem.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.security.ailogsystem.entity.SecurityLog;
import com.security.ailogsystem.entity.SecurityAlert;
import com.security.ailogsystem.service.WebSocketService;
import com.security.ailogsystem.websocket.WebSocketMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class WebSocketServiceImpl implements WebSocketService {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketServiceImpl.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, String> activeSessions = new ConcurrentHashMap<>();
    private final Map<String, String> userSessions = new ConcurrentHashMap<>();
    private final AtomicInteger connectionCount = new AtomicInteger(0);
    private final AtomicInteger onlineUserCount = new AtomicInteger(0);

    @Override
    public void broadcastNewLogs(List<SecurityLog> logs) {
        if (logs == null || logs.isEmpty()) {
            return;
        }

        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", "NEW_LOGS");
            message.put("count", logs.size());
            message.put("logs", logs.subList(0, Math.min(logs.size(), 10))); // 只发送前10条
            message.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/logs", message);

            logger.debug("广播 {} 条新日志", logs.size());

        } catch (Exception e) {
            logger.error("广播日志失败", e);
        }
    }

    @Override
    public void sendLog(SecurityLog log) {
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", "SINGLE_LOG");
            message.put("log", log);
            message.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/logs", message);

        } catch (Exception e) {
            logger.error("发送单个日志失败", e);
        }
    }

    @Override
    public void sendSecurityAlert(SecurityAlert alert) {
        try {
            Map<String, Object> alertMessage = new HashMap<>();
            alertMessage.put("type", "SECURITY_ALERT");
            alertMessage.put("id", alert.getId());
            alertMessage.put("level", alert.getAlertLevel().toString());
            alertMessage.put("alertType", alert.getAlertType());
            alertMessage.put("description", alert.getDescription());
            alertMessage.put("timestamp", alert.getCreatedTime());

            if (alert.getSecurityLog() != null) {
                alertMessage.put("eventId", alert.getSecurityLog().getEventId());
                alertMessage.put("source", alert.getSecurityLog().getSourceName());
                alertMessage.put("computerName", alert.getSecurityLog().getComputerName());
            }

            messagingTemplate.convertAndSend("/topic/alerts", alertMessage);

            logger.info("发送安全警报: {} - {}", alert.getAlertLevel(), alert.getAlertType());

        } catch (Exception e) {
            logger.error("发送安全警报失败", e);
        }
    }

    @Override
    public void sendStatistics(Map<String, Object> stats) {
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", "STATISTICS");
            message.put("data", stats);
            message.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/stats", message);

            logger.debug("发送统计信息");

        } catch (Exception e) {
            logger.error("发送统计信息失败", e);
        }
    }

    @Override
    public void sendSystemNotification(String message, String level) {
        try {
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "SYSTEM_NOTIFICATION");
            notification.put("level", level);
            notification.put("message", message);
            notification.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSend("/topic/notifications", notification);

            logger.info("发送系统通知: {} - {}", level, message);

        } catch (Exception e) {
            logger.error("发送系统通知失败", e);
        }
    }

    @Override
    public Map<String, Object> getConnectionStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("activeConnections", connectionCount.get());
        status.put("onlineUsers", onlineUserCount.get());
        status.put("activeSessions", activeSessions.size());
        status.put("userSessions", userSessions.size());
        status.put("sessionDetails", new HashMap<>(activeSessions));
        status.put("lastUpdate", System.currentTimeMillis());

        return status;
    }

    @Override
    public void disconnectSession(String sessionId) {
        try {
            if (activeSessions.containsKey(sessionId)) {
                String userId = activeSessions.get(sessionId);
                activeSessions.remove(sessionId);
                userSessions.remove(userId);
                connectionCount.decrementAndGet();
                onlineUserCount.decrementAndGet();
                logger.info("断开WebSocket会话: {} - 用户: {}", sessionId, userId);
            }
        } catch (Exception e) {
            logger.error("断开会话失败: {}", sessionId, e);
        }
    }

    // 新增方法的实现

    @Override
    public int getConnectionCount() {
        return connectionCount.get();
    }

    @Override
    public int getOnlineUserCount() {
        return onlineUserCount.get();
    }

    @Override
    public void broadcastMessage(WebSocketMessage message) {
        try {
            messagingTemplate.convertAndSend("/topic/broadcast", message);
            logger.info("广播消息: {}", message.getContent());
        } catch (Exception e) {
            logger.error("广播消息失败", e);
        }
    }

    @Override
    public void sendMessageToUser(String userId, WebSocketMessage message) {
        try {
            messagingTemplate.convertAndSendToUser(userId, "/queue/messages", message);
            logger.info("发送消息给用户 {}: {}", userId, message.getContent());
        } catch (Exception e) {
            logger.error("发送消息给用户失败: {}", userId, e);
        }
    }

    @Override
    public void sendSystemInfo(String content) {
        try {
            WebSocketMessage message = WebSocketMessage.builder()
                    .type(WebSocketMessage.MessageType.SYSTEM_INFO)
                    .content(content)
                    .timestamp(LocalDateTime.now())
                    .sender("system")
                    .build();

            broadcastMessage(message);
            logger.info("发送系统信息: {}", content);
        } catch (Exception e) {
            logger.error("发送系统信息失败", e);
        }
    }

    @Override
    public void sendSystemError(String content) {
        try {
            WebSocketMessage message = WebSocketMessage.builder()
                    .type(WebSocketMessage.MessageType.SYSTEM_ERROR)
                    .content(content)
                    .timestamp(LocalDateTime.now())
                    .sender("system")
                    .build();

            broadcastMessage(message);
            logger.error("发送系统错误: {}", content);
        } catch (Exception e) {
            logger.error("发送系统错误失败", e);
        }
    }

    /**
     * 添加活动会话（由WebSocket处理器调用）
     */
    public void addActiveSession(String sessionId, String userInfo) {
        activeSessions.put(sessionId, userInfo);
        userSessions.put(userInfo, sessionId);
        connectionCount.incrementAndGet();
        onlineUserCount.incrementAndGet();
        logger.debug("新增WebSocket会话: {} - {}", sessionId, userInfo);
    }

    /**
     * 移除活动会话（由WebSocket处理器调用）
     */
    public void removeActiveSession(String sessionId) {
        if (activeSessions.containsKey(sessionId)) {
            String userInfo = activeSessions.get(sessionId);
            activeSessions.remove(sessionId);
            userSessions.remove(userInfo);
            connectionCount.decrementAndGet();
            onlineUserCount.decrementAndGet();
            logger.debug("移除WebSocket会话: {} - {}", sessionId, userInfo);
        }
    }

    /**
     * 获取用户会话ID
     */
    public String getUserSessionId(String userId) {
        return userSessions.get(userId);
    }

    /**
     * 检查用户是否在线
     */
    public boolean isUserOnline(String userId) {
        return userSessions.containsKey(userId);
    }
}