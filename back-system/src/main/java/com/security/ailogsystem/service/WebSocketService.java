// service/WebSocketService.java
package com.security.ailogsystem.service;

import com.security.ailogsystem.entity.SecurityLog;
import com.security.ailogsystem.entity.SecurityAlert;
import com.security.ailogsystem.websocket.WebSocketMessage;

import java.util.List;
import java.util.Map;

/**
 * WebSocket服务接口
 */
public interface WebSocketService {

    /**
     * 广播新日志
     * @param logs 日志列表
     */
    void broadcastNewLogs(List<SecurityLog> logs);

    /**
     * 发送单个日志
     * @param log 安全日志
     */
    void sendLog(SecurityLog log);

    /**
     * 发送安全警报
     * @param alert 安全警报
     */
    void sendSecurityAlert(SecurityAlert alert);

    /**
     * 发送统计信息
     * @param stats 统计信息
     */
    void sendStatistics(Map<String, Object> stats);

    /**
     * 发送系统通知
     * @param message 通知消息
     * @param level 通知等级
     */
    void sendSystemNotification(String message, String level);

    /**
     * 获取连接状态
     * @return 连接状态信息
     */
    Map<String, Object> getConnectionStatus();

    /**
     * 断开指定连接
     * @param sessionId 会话ID
     */
    void disconnectSession(String sessionId);

    // 新增方法 - 修复缺失的方法

    /**
     * 获取连接数
     * @return 当前连接数
     */
    int getConnectionCount();

    /**
     * 获取在线用户数
     * @return 在线用户数
     */
    int getOnlineUserCount();

    /**
     * 广播消息
     * @param message WebSocket消息
     */
    void broadcastMessage(WebSocketMessage message);

    /**
     * 发送消息给指定用户
     * @param userId 用户ID
     * @param message WebSocket消息
     */
    void sendMessageToUser(String userId, WebSocketMessage message);

    /**
     * 发送系统信息
     * @param content 消息内容
     */
    void sendSystemInfo(String content);

    /**
     * 发送系统错误
     * @param content 错误内容
     */
    void sendSystemError(String content);
}