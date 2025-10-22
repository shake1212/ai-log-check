package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.service.WebSocketService;
import com.security.ailogsystem.websocket.WebSocketHandler;
import com.security.ailogsystem.websocket.WebSocketMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * WebSocket服务实现类
 * 
 * @author AI Log System
 * @version 1.0
 */
@Slf4j
@Service
public class WebSocketServiceImpl implements WebSocketService {

    @Autowired
    private WebSocketHandler webSocketHandler;

    @Override
    public void sendMessageToUser(String userId, WebSocketMessage message) {
        try {
            webSocketHandler.sendMessageToUser(userId, message);
            log.debug("发送消息给用户成功 - UserId: {}, MessageType: {}", userId, message.getType());
        } catch (Exception e) {
            log.error("发送消息给用户失败 - UserId: {}, Error: {}", userId, e.getMessage(), e);
        }
    }

    @Override
    public void broadcastMessage(WebSocketMessage message) {
        try {
            webSocketHandler.broadcastMessage(message);
            log.debug("广播消息成功 - MessageType: {}", message.getType());
        } catch (Exception e) {
            log.error("广播消息失败 - Error: {}", e.getMessage(), e);
        }
    }

    @Override
    public void broadcastMessageToUsers(String userType, WebSocketMessage message) {
        try {
            webSocketHandler.broadcastMessageToUsers(userType, message);
            log.debug("广播消息给用户类型成功 - UserType: {}, MessageType: {}", userType, message.getType());
        } catch (Exception e) {
            log.error("广播消息给用户类型失败 - UserType: {}, Error: {}", userType, e.getMessage(), e);
        }
    }

    @Override
    public void sendSystemInfo(String content) {
        WebSocketMessage message = WebSocketMessage.systemInfo(content);
        broadcastMessage(message);
    }

    @Override
    public void sendSystemError(String content) {
        WebSocketMessage message = WebSocketMessage.systemError(content);
        broadcastMessage(message);
    }

    @Override
    public void sendLogUpdate(Object data) {
        WebSocketMessage message = WebSocketMessage.logUpdate(data);
        broadcastMessage(message);
    }

    @Override
    public void sendLogAnomaly(Object data) {
        WebSocketMessage message = WebSocketMessage.logAnomaly(data);
        broadcastMessage(message);
    }

    @Override
    public void sendNewAlert(Object data) {
        WebSocketMessage message = WebSocketMessage.newAlert(data);
        broadcastMessage(message);
    }

    @Override
    public void sendAlertUpdate(Object data) {
        WebSocketMessage message = WebSocketMessage.builder()
                .type(WebSocketMessage.MessageType.ALERT_UPDATE)
                .content("预警状态更新")
                .data(data)
                .timestamp(java.time.LocalDateTime.now())
                .sender("system")
                .build();
        broadcastMessage(message);
    }

    @Override
    public void sendAlertResolved(Object data) {
        WebSocketMessage message = WebSocketMessage.builder()
                .type(WebSocketMessage.MessageType.ALERT_RESOLVED)
                .content("预警已解决")
                .data(data)
                .timestamp(java.time.LocalDateTime.now())
                .sender("system")
                .build();
        broadcastMessage(message);
    }

    @Override
    public void sendMonitorData(String monitorType, Object data) {
        WebSocketMessage.MessageType messageType;
        String content;
        
        switch (monitorType.toLowerCase()) {
            case "cpu":
                messageType = WebSocketMessage.MessageType.MONITOR_CPU;
                content = "CPU监控数据";
                break;
            case "memory":
                messageType = WebSocketMessage.MessageType.MONITOR_MEMORY;
                content = "内存监控数据";
                break;
            case "disk":
                messageType = WebSocketMessage.MessageType.MONITOR_DISK;
                content = "磁盘监控数据";
                break;
            case "network":
                messageType = WebSocketMessage.MessageType.MONITOR_NETWORK;
                content = "网络监控数据";
                break;
            default:
                messageType = WebSocketMessage.MessageType.CUSTOM;
                content = "监控数据: " + monitorType;
                break;
        }
        
        WebSocketMessage message = WebSocketMessage.builder()
                .type(messageType)
                .content(content)
                .data(data)
                .timestamp(java.time.LocalDateTime.now())
                .sender("system")
                .build();
        broadcastMessage(message);
    }

    @Override
    public int getConnectionCount() {
        return webSocketHandler.getConnectionCount();
    }

    @Override
    public int getOnlineUserCount() {
        return webSocketHandler.getOnlineUserCount();
    }
}
