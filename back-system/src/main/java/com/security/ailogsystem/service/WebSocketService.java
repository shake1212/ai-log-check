package com.security.ailogsystem.service;

import com.security.ailogsystem.entity.SecurityLog;
import com.security.ailogsystem.entity.SecurityAlert;

import java.util.List;
import java.util.Map;

public interface WebSocketService {

    void sendLog(SecurityLog log);

    void broadcastNewLogs(List<SecurityLog> logs);

    void sendAlert(SecurityAlert alert);

    void sendStats(Map<String, Object> stats);

    void sendProcessInfo(Map<String, Object> processInfo);

    void sendNotification(String message, String level);

    void broadcastMessage(String type, Map<String, Object> data);

    void sendMessageToUser(String userId, String type, Map<String, Object> data);

    Map<String, Object> getConnectionStatus();

    void disconnectSession(String sessionId);

    int getConnectionCount();

    int getOnlineUserCount();

    boolean isUserOnline(String userId);
}