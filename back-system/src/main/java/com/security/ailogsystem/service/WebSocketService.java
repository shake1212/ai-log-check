package com.security.ailogsystem.service;

import com.security.ailogsystem.websocket.WebSocketMessage;

/**
 * WebSocket服务接口
 * 提供WebSocket消息推送服务
 * 
 * @author AI Log System
 * @version 1.0
 */
public interface WebSocketService {
    
    /**
     * 发送消息给指定用户
     * 
     * @param userId 用户ID
     * @param message 消息内容
     */
    void sendMessageToUser(String userId, WebSocketMessage message);
    
    /**
     * 广播消息给所有连接的客户端
     * 
     * @param message 消息内容
     */
    void broadcastMessage(WebSocketMessage message);
    
    /**
     * 广播消息给指定类型的用户
     * 
     * @param userType 用户类型
     * @param message 消息内容
     */
    void broadcastMessageToUsers(String userType, WebSocketMessage message);
    
    /**
     * 发送系统信息
     * 
     * @param content 信息内容
     */
    void sendSystemInfo(String content);
    
    /**
     * 发送系统错误
     * 
     * @param content 错误内容
     */
    void sendSystemError(String content);
    
    /**
     * 发送日志更新通知
     * 
     * @param data 日志数据
     */
    void sendLogUpdate(Object data);
    
    /**
     * 发送异常日志通知
     * 
     * @param data 异常日志数据
     */
    void sendLogAnomaly(Object data);
    
    /**
     * 发送新预警通知
     * 
     * @param data 预警数据
     */
    void sendNewAlert(Object data);
    
    /**
     * 发送预警更新通知
     * 
     * @param data 预警数据
     */
    void sendAlertUpdate(Object data);
    
    /**
     * 发送预警解决通知
     * 
     * @param data 预警数据
     */
    void sendAlertResolved(Object data);
    
    /**
     * 发送监控数据
     * 
     * @param monitorType 监控类型
     * @param data 监控数据
     */
    void sendMonitorData(String monitorType, Object data);
    
    /**
     * 获取当前连接数
     * 
     * @return 连接数
     */
    int getConnectionCount();
    
    /**
     * 获取在线用户数
     * 
     * @return 在线用户数
     */
    int getOnlineUserCount();
}
