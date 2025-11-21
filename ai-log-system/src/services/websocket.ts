// src/services/websocketService.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { message } from 'antd';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';
import type { WebSocketMessage, SecurityLog, SecurityAlert, Statistics } from '@/types/log';

// WebSocket 配置
const WEBSOCKET_CONFIG = {
  // 获取 WebSocket 地址
  getWebSocketUrl: (): string => {
    return `${window.location.origin}/api/ws`;
  },
  
  maxRetries: 5,
  baseRetryInterval: 3000,
};

export const useWebSocket = () => {
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const stompClientRef = useRef<Client | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  const connect = useCallback(() => {
    // 如果组件已卸载，不进行连接
    if (!isMountedRef.current) return;

    // 如果已有连接，先关闭
    if (stompClientRef.current) {
      stompClientRef.current.deactivate();
      stompClientRef.current = null;
    }

    const wsUrl = WEBSOCKET_CONFIG.getWebSocketUrl();
    console.log(`尝试连接 WebSocket: ${wsUrl}`);
    
    try {
      // 创建 STOMP 客户端
      const stompClient = new Client({
        webSocketFactory: () => new SockJS(wsUrl),
        reconnectDelay: 0, // 禁用自动重连，我们手动控制
        heartbeatIncoming: 10000, // 10秒心跳
        heartbeatOutgoing: 10000, // 10秒心跳
        debug: (str) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('STOMP Debug:', str);
          }
        },
      });

      stompClient.onConnect = (frame) => {
        if (!isMountedRef.current) return;
        
        setConnected(true);
        setRetryCount(0);
        console.log('WebSocket 连接成功:', frame);
        
        // 订阅各种主题
        stompClient.subscribe('/topic/logs', (message: IMessage) => {
          handleWebSocketMessage(JSON.parse(message.body));
        });

        stompClient.subscribe('/topic/alerts', (message: IMessage) => {
          handleWebSocketMessage(JSON.parse(message.body));
        });

        stompClient.subscribe('/topic/stats', (message: IMessage) => {
          handleWebSocketMessage(JSON.parse(message.body));
        });

        stompClient.subscribe('/topic/notifications', (message: IMessage) => {
          handleWebSocketMessage(JSON.parse(message.body));
        });

        stompClient.subscribe('/topic/broadcast', (message: IMessage) => {
          handleWebSocketMessage(JSON.parse(message.body));
        });

        // 只在第一次连接成功时显示消息
        if (retryCount === 0) {
          message.success('实时连接已建立');
        }
      };

      stompClient.onStompError = (frame) => {
        if (!isMountedRef.current) return;
        
        console.error('STOMP 协议错误:', frame);
        setConnected(false);
      };

      stompClient.onWebSocketClose = (event) => {
        if (!isMountedRef.current) return;
        
        setConnected(false);
        console.log(`WebSocket 连接关闭: ${event.code} ${event.reason || '无原因'}`);
        
        handleReconnect();
      };

      stompClient.onWebSocketError = (event) => {
        if (!isMountedRef.current) return;
        
        console.error('WebSocket 错误:', event);
        setConnected(false);
      };

      stompClient.activate();
      stompClientRef.current = stompClient;
      
    } catch (error) {
      console.error('创建 WebSocket 连接失败:', error);
      if (isMountedRef.current) {
        setConnected(false);
        handleReconnect();
      }
    }
  }, [retryCount]);

  const handleReconnect = () => {
    // 清理现有的重连定时器
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    // 检查是否达到最大重试次数
    if (retryCount < WEBSOCKET_CONFIG.maxRetries) {
      const nextRetryCount = retryCount + 1;
      setRetryCount(nextRetryCount);
      
      // 指数退避策略：重试间隔逐渐增加
      const retryDelay = WEBSOCKET_CONFIG.baseRetryInterval * Math.pow(1.5, nextRetryCount - 1);
      console.log(`WebSocket 重连中... (${nextRetryCount}/${WEBSOCKET_CONFIG.maxRetries})，${retryDelay}ms后重试`);
      
      reconnectTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          connect();
        }
      }, retryDelay);
      
      // 只在第一次重试时显示消息
      if (nextRetryCount === 1) {
        message.warning(`连接断开，正在尝试重连... (${nextRetryCount}/${WEBSOCKET_CONFIG.maxRetries})`);
      }
    } else {
      console.error('WebSocket 重连次数已达上限，停止重连');
      message.error('实时连接失败，请刷新页面重试');
    }
  };

  const handleWebSocketMessage = useCallback((msg: any) => {
    if (!isMountedRef.current) return;
    
    console.log('收到 WebSocket 消息:', msg);

    if (msg.type === 'NEW_LOGS') {
      if (msg.logs && Array.isArray(msg.logs)) {
        setLogs(prev => [...msg.logs, ...prev.slice(0, 100)]); // 限制日志数量
      }
    } else if (msg.type === 'SINGLE_LOG') {
      if (msg.log) {
        setLogs(prev => [msg.log, ...prev.slice(0, 100)]);
      }
    } else if (msg.type === 'SECURITY_ALERT') {
      // @ts-ignore
      const alert: SecurityAlert = {
        id: msg.id || `alert_${Date.now()}`,
        alertLevel: msg.level,
        alertType: msg.alertType,
        description: msg.description,
        handled: false,
        createdTime: msg.timestamp || new Date().toISOString(),
        eventId: msg.eventId,
        source: msg.source,
        computerName: msg.computerName,
      };
      setAlerts(prev => [alert, ...prev.slice(0, 50)]); // 限制警报数量

      // 显示高危警报通知
      if (msg.level === 'CRITICAL' || msg.level === 'HIGH') {
        message.error(`安全警报: ${msg.description}`, 5);
      } else if (msg.level === 'MEDIUM') {
        message.warning(`安全警报: ${msg.description}`, 3);
      } else {
        message.info(`安全警报: ${msg.description}`, 2);
      }
    } else if (msg.type === 'STATISTICS') {
      if (msg.data) {
        setStatistics(msg.data);
      }
    } else if (msg.type === 'SYSTEM_NOTIFICATION') {
      const level = msg.level || 'info';
      const notificationMsg = msg.message || '系统通知';

      if (level === 'error') {
        message.error(notificationMsg);
      } else if (level === 'warning') {
        message.warning(notificationMsg);
      } else if (level === 'success') {
        message.success(notificationMsg);
      } else {
        message.info(notificationMsg);
      }
    } else if (msg.type === 'SYSTEM_INFO') {
      message.info(msg.content || '系统信息');
    } else if (msg.type === 'SYSTEM_ERROR') {
      message.error(msg.content || '系统错误');
    } else if (msg.type === 'TEST_MESSAGE') {
      console.log('收到测试消息:', msg);
      message.info(`测试消息: ${msg.content || msg.message}`);
    } else if (msg.type === 'HEARTBEAT') {// 心跳消息，可以用于监控连接状态
      console.log('收到心跳消息:', msg);
    } else {
      console.warn('未知的消息类型:', msg.type, msg);
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('主动断开 WebSocket 连接');
    
    // 清理重连定时器
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = undefined;
    }
    
    // 关闭 STOMP 客户端
    if (stompClientRef.current) {
      stompClientRef.current.deactivate();
      stompClientRef.current = null;
    }
    
    setConnected(false);
    setRetryCount(0);
  }, []);

  const reconnect = useCallback(() => {
    console.log('手动重连 WebSocket');
    disconnect(); // 先断开现有连接
    setRetryCount(0); // 重置重试计数
    setTimeout(() => connect(), 100); // 短暂延迟后重新连接
  }, [connect, disconnect]);

  // 发送消息到 WebSocket
  const sendMessage = useCallback((message: any) => {
    if (stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.publish({
        destination: '/app/message', // 根据后端配置调整
        body: JSON.stringify(message),
      });
      return true;
    } else {
      console.warn('WebSocket 未连接，无法发送消息');
      return false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    connect();
    
    return () => {
      console.log('清理 WebSocket 连接');
      isMountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connected,
    logs,
    alerts,
    statistics,
    retryCount,
    maxRetries: WEBSOCKET_CONFIG.maxRetries,
    disconnect,
    reconnect,
    sendMessage,
  };
};

// 导出 WebSocket 测试工具
export const webSocketTest = {
  // 测试连接
  testConnection: async (): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = new SockJS(WEBSOCKET_CONFIG.getWebSocketUrl());
      
      const timeout = setTimeout(() => {
        socket.close();
        resolve(false);
      }, 5000);
      
      socket.onopen = () => {
        clearTimeout(timeout);
        socket.close();
        resolve(true);
      };
      
      socket.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
    });
  },
  
  // 发送测试消息
  sendTestMessage: async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:8080/api/websocket/test');
      return response.ok;
    } catch (error) {
      console.error('发送测试消息失败:', error);
      return false;
    }
  },
  
  // 检查状态
  checkStatus: async (): Promise<any> => {
    try {
      const response = await fetch('http://localhost:8080/api/websocket/status');
      return await response.json();
    } catch (error) {
      console.error('检查状态失败:', error);
      // 类型断言确保 error 对象有 message 属性
      const errorMessage = (error as Error).message;
      return { status: 'error', error: errorMessage };
    }
  }
};