package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.entity.SecurityLog;
import com.security.ailogsystem.entity.SecurityAlert;
import com.security.ailogsystem.repository.UnifiedEventRepository;
import com.security.ailogsystem.repository.AlertRepository;
import com.security.ailogsystem.service.WebSocketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class WebSocketServiceImpl implements WebSocketService {

    private static final Logger log = LoggerFactory.getLogger(WebSocketServiceImpl.class);
    private static final String TOPIC = "/topic/events";

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private UnifiedEventRepository eventRepository;

    @Autowired
    private AlertRepository alertRepository;

    private final Map<String, String> activeSessions = new ConcurrentHashMap<>();
    private final Map<String, String> userSessions = new ConcurrentHashMap<>();
    private final AtomicInteger connectionCount = new AtomicInteger(0);
    private final AtomicInteger onlineUserCount = new AtomicInteger(0);

    private void publish(String type, Map<String, Object> data) {
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("id", java.util.UUID.randomUUID().toString());
            message.put("type", type);
            message.put("data", data);
            message.put("ts", System.currentTimeMillis());
            messagingTemplate.convertAndSend(TOPIC, message);
            log.debug("[WS] 发布 type={}, topic={}", type, TOPIC);
        } catch (Exception e) {
            log.error("[WS] 发布失败 type={}: {}", type, e.getMessage());
        }
    }

    @Override
    public void sendLog(SecurityLog logEntry) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("log", logEntry);
            publish("LOG", data);
        } catch (Exception e) {
            log.error("[WS] sendLog失败: {}", e.getMessage());
        }
    }

    @Override
    public void broadcastNewLogs(List<SecurityLog> logs) {
        if (logs == null || logs.isEmpty()) return;
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("count", logs.size());
            data.put("logs", logs.subList(0, Math.min(logs.size(), 10)));
            publish("LOG", data);
            log.info("[WS] 广播 {} 条新日志", logs.size());
            pushStatsSnapshot();
        } catch (Exception e) {
            log.error("[WS] broadcastNewLogs失败: {}", e.getMessage());
        }
    }

    @Override
    public void sendAlert(SecurityAlert alert) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("id", alert.getId());
            data.put("alertLevel", alert.getAlertLevel().toString());
            data.put("alertType", alert.getAlertType());
            data.put("description", alert.getDescription());
            data.put("createdTime", alert.getCreatedTime());
            if (alert.getSecurityLog() != null) {
                data.put("eventId", alert.getSecurityLog().getEventId());
                data.put("source", alert.getSecurityLog().getSourceName());
                data.put("computerName", alert.getSecurityLog().getComputerName());
            }
            publish("ALERT", data);
            log.info("[WS] 告警: {} - {}", alert.getAlertLevel(), alert.getAlertType());
        } catch (Exception e) {
            log.error("[WS] sendAlert失败: {}", e.getMessage());
        }
    }

    @Override
    public void sendStats(Map<String, Object> stats) {
        try {
            publish("STATS", stats);
            log.debug("[WS] sendStats");
        } catch (Exception e) {
            log.error("[WS] sendStats失败: {}", e.getMessage());
        }
    }

    @Override
    public void sendProcessInfo(Map<String, Object> processInfo) {
        try {
            publish("PROCESS", processInfo);
            log.debug("[WS] sendProcessInfo: {} processes",
                    processInfo.getOrDefault("total", "?"));
        } catch (Exception e) {
            log.error("[WS] sendProcessInfo失败: {}", e.getMessage());
        }
    }

    @Override
    public void sendNotification(String message, String level) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("level", level);
            data.put("message", message);
            publish("NOTIFICATION", data);
            log.info("[WS] 通知: {} - {}", level, message);
        } catch (Exception e) {
            log.error("[WS] sendNotification失败: {}", e.getMessage());
        }
    }

    @Override
    public void broadcastMessage(String type, Map<String, Object> data) {
        publish(type, data);
    }

    @Override
    public void sendMessageToUser(String userId, String type, Map<String, Object> data) {
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("id", java.util.UUID.randomUUID().toString());
            message.put("type", type);
            message.put("data", data);
            message.put("ts", System.currentTimeMillis());
            messagingTemplate.convertAndSendToUser(userId, "/queue/events", message);
            log.debug("[WS] 定向发送 userId={}, type={}", userId, type);
        } catch (Exception e) {
            log.error("[WS] sendMessageToUser失败: {}", e.getMessage());
        }
    }

    @Override
    public Map<String, Object> getConnectionStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("activeConnections", connectionCount.get());
        status.put("onlineUsers", onlineUserCount.get());
        status.put("activeSessions", activeSessions.size());
        status.put("userSessions", userSessions.size());
        status.put("lastUpdate", System.currentTimeMillis());
        return status;
    }

    @Override
    public void disconnectSession(String sessionId) {
        String userId = activeSessions.remove(sessionId);
        if (userId != null) {
            userSessions.remove(userId);
            connectionCount.decrementAndGet();
            onlineUserCount.decrementAndGet();
            log.info("[WS] 断开会话: {} - {}", sessionId, userId);
        }
    }

    @Override
    public int getConnectionCount() {
        return connectionCount.get();
    }

    @Override
    public int getOnlineUserCount() {
        return onlineUserCount.get();
    }

    @Override
    public boolean isUserOnline(String userId) {
        return userSessions.containsKey(userId);
    }

    public void addActiveSession(String sessionId, String userInfo) {
        activeSessions.put(sessionId, userInfo);
        userSessions.put(userInfo, sessionId);
        connectionCount.incrementAndGet();
        onlineUserCount.incrementAndGet();
        log.debug("[WS] 新增会话: {} - {}", sessionId, userInfo);
    }

    public void removeActiveSession(String sessionId) {
        String userInfo = activeSessions.remove(sessionId);
        if (userInfo != null) {
            userSessions.remove(userInfo);
            connectionCount.decrementAndGet();
            onlineUserCount.decrementAndGet();
        }
    }

    private void pushStatsSnapshot() {
        try {
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalEvents", eventRepository.count());
            stats.put("anomalyCount", eventRepository.countByIsAnomalyTrue());
            stats.put("totalAlerts", alertRepository.count());
            stats.put("unhandledAlerts", alertRepository.countByHandledFalse());
            publish("STATS", stats);
        } catch (Exception e) {
            log.warn("[WS] 推送统计快照失败: {}", e.getMessage());
        }
    }
}
