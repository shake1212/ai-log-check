// src/services/websocket.ts — STOMP 实时消息（与后端 WebSocketMessage / 推送 JSON 对齐）
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

const API_BASE = '/api';

/**
 * 将后端/历史别名归一为前端分支使用的规范类型。
 * 规范类型：LOGS_BATCH | LOG_SINGLE | ALERT_SECURITY | STATS_UPDATE | NOTIFY_SYSTEM |
 * SYSTEM_INFO | SYSTEM_ERROR | HEARTBEAT | CUSTOM | TEST_MESSAGE | PING | PONG
 */
const normalizeMessageType = (rawType?: string): string => {
  const t = (rawType || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  switch (t) {
    case 'NEW_LOGS':
    case 'LOG_UPDATE':
    case 'LOGS_BATCH':
      return 'LOGS_BATCH';
    case 'SINGLE_LOG':
    case 'LOG_SINGLE':
      return 'LOG_SINGLE';
    case 'SECURITY_ALERT':
    case 'ALERT_SECURITY':
      return 'ALERT_SECURITY';
    case 'STATISTICS':
    case 'STATISTICS_UPDATE':
    case 'STATS_UPDATE':
      return 'STATS_UPDATE';
    case 'SYSTEM_INFO':
      return 'SYSTEM_INFO';
    case 'SYSTEM_ERROR':
      return 'SYSTEM_ERROR';
    case 'SYSTEM_NOTIFICATION':
    case 'NOTIFY_SYSTEM':
      return 'NOTIFY_SYSTEM';
    case 'HEARTBEAT':
      return 'HEARTBEAT';
    case 'PING':
      return 'PING';
    case 'PONG':
      return 'PONG';
    case 'CUSTOM':
      return 'CUSTOM';
    case 'TEST_MESSAGE':
    case 'TEST':
      return 'TEST_MESSAGE';
    default:
      return t;
  }
};

// 消息节流配置：批量累积消息后统一更新状态，避免每条消息触发一次重渲染
const BATCH_INTERVAL = 100; // 100ms 批量更新间隔
const MAX_BATCH_SIZE = 50;  // 单次批量最大消息数
// 告警通知节流：避免高频告警堆满屏幕
const ALERT_NOTIFY_INTERVAL = 2000; // 2秒内最多显示1条告警通知

export const useWebSocket = () => {
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const stompClientRef = useRef<Client | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0); // 用 ref 避免闭包捕获旧值

  // 批量消息缓冲区
  const batchLogsRef = useRef<SecurityLog[]>([]);
  const batchAlertsRef = useRef<SecurityAlert[]>([]);
  const batchStatsRef = useRef<Statistics | null>(null);
  const batchTimerRef = useRef<NodeJS.Timeout>();
  const batchCountRef = useRef(0);

  // 告警通知节流
  const lastAlertNotifyRef = useRef(0);
  const pendingAlertCountRef = useRef(0);

  // 用 ref 存储 handleWebSocketMessage 和 handleReconnect，避免 connect 闭包捕获旧引用
  const handleMessageRef = useRef<(msg: any) => void>(() => {});
  const handleReconnectRef = useRef<() => void>(() => {});

  // 统一的连接状态通知，使用固定 key 保证只显示一条
  const showConnectionMessage = useCallback((type: 'success' | 'warning' | 'error', content: string) => {
    message.open({ key: 'ws-connection-status', type, content, duration: type === 'success' ? 3 : 0 });
  }, []);

  const connect = useCallback(() => {
    // 如果组件已卸载，不进行连接
    if (!isMountedRef.current) return;

    // 如果已有连接，先关闭
    if (stompClientRef.current) {
      stompClientRef.current.deactivate();
      stompClientRef.current = null;
    }

    const wsUrl = WEBSOCKET_CONFIG.getWebSocketUrl();
    
    try {
      // 创建 STOMP 客户端
      const stompClient = new Client({
        // Disable iframe transport to avoid 404 on /api/ws/iframe.html
        webSocketFactory: () => new SockJS(wsUrl, null, { transports: ['websocket', 'xhr-streaming', 'xhr-polling'] }),
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
        retryCountRef.current = 0;
        
        // 订阅各种主题
        stompClient.subscribe('/topic/logs', (message: IMessage) => {
          handleMessageRef.current(JSON.parse(message.body));
        });

        stompClient.subscribe('/topic/alerts', (message: IMessage) => {
          handleMessageRef.current(JSON.parse(message.body));
        });

        stompClient.subscribe('/topic/stats', (message: IMessage) => {
          handleMessageRef.current(JSON.parse(message.body));
        });

        stompClient.subscribe('/topic/notifications', (message: IMessage) => {
          handleMessageRef.current(JSON.parse(message.body));
        });

        stompClient.subscribe('/topic/broadcast', (message: IMessage) => {
          handleMessageRef.current(JSON.parse(message.body));
        });

        // 只在第一次连接成功时显示消息
        if (retryCountRef.current === 0) {
          message.open({ key: 'ws-connection-status', type: 'success', content: '实时连接已建立', duration: 3 });
        } else {
          showConnectionMessage('success', '实时连接已恢复');
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
        
        handleReconnectRef.current();
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
        handleReconnectRef.current();
      }
    }
  }, [showConnectionMessage]);

  const handleReconnect = () => {
    // 清理现有的重连定时器
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    // 使用 ref 读取最新的重试次数，避免闭包问题
    const currentRetry = retryCountRef.current;

    // 检查是否达到最大重试次数
    if (currentRetry < WEBSOCKET_CONFIG.maxRetries) {
      const nextRetryCount = currentRetry + 1;
      retryCountRef.current = nextRetryCount;
      setRetryCount(nextRetryCount);
      
      // 指数退避策略：重试间隔逐渐增加
      const retryDelay = WEBSOCKET_CONFIG.baseRetryInterval * Math.pow(1.5, nextRetryCount - 1);
      
      reconnectTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          connect();
        }
      }, retryDelay);
      
      // 始终更新同一条通知（通过固定 key 覆盖），不会堆积
      showConnectionMessage('warning', `连接断开，正在尝试重连... (${nextRetryCount}/${WEBSOCKET_CONFIG.maxRetries})`);
    } else {
      console.error('WebSocket 重连次数已达上限，停止重连');
      showConnectionMessage('error', '实时连接失败，请刷新页面重试');
    }
  };

  // 将最新的 handleReconnect 赋值给 ref
  handleReconnectRef.current = handleReconnect;

  // 批量刷新缓冲区到 React 状态
  const flushBatch = useCallback(() => {
    if (!isMountedRef.current) return;

    const pendingLogs = batchLogsRef.current;
    const pendingAlerts = batchAlertsRef.current;
    const pendingStats = batchStatsRef.current;

    if (pendingLogs.length > 0) {
      setLogs(prev => [...pendingLogs, ...prev.slice(0, 100)]);
      batchLogsRef.current = [];
    }
    if (pendingAlerts.length > 0) {
      setAlerts(prev => [...pendingAlerts, ...prev.slice(0, 50)]);
      batchAlertsRef.current = [];
    }
    if (pendingStats) {
      setStatistics(pendingStats);
      batchStatsRef.current = null;
    }

    batchCountRef.current = 0;
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = undefined;
    }
  }, []);

  // 节流告警通知：2秒内最多显示1条，多余告警计数
  const throttledAlertNotify = useCallback((level: string, description: string) => {
    const now = Date.now();
    pendingAlertCountRef.current += 1;

    if (now - lastAlertNotifyRef.current >= ALERT_NOTIFY_INTERVAL) {
      lastAlertNotifyRef.current = now;
      const count = pendingAlertCountRef.current;
      pendingAlertCountRef.current = 0;

      const suffix = count > 1 ? ` (及另外 ${count - 1} 条告警)` : '';
      if (level === 'CRITICAL' || level === 'HIGH') {
        message.error(`安全警报: ${description}${suffix}`, 5);
      } else if (level === 'MEDIUM') {
        message.warning(`安全警报: ${description}${suffix}`, 3);
      } else {
        message.info(`安全警报: ${description}${suffix}`, 2);
      }
    }
  }, []);

  const handleWebSocketMessage = useCallback((msg: any) => {
    if (!isMountedRef.current) return;

    const messageType = normalizeMessageType(msg.type);
    if (messageType === 'LOGS_BATCH') {
      if (msg.logs && Array.isArray(msg.logs)) {
        batchLogsRef.current.push(...msg.logs);
      }
    } else if (messageType === 'LOG_SINGLE') {
      if (msg.log) {
        batchLogsRef.current.push(msg.log);
      }
    } else if (messageType === 'ALERT_SECURITY') {
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
      batchAlertsRef.current.push(alert);

      // 节流告警通知
      throttledAlertNotify(msg.level, msg.description);
    } else if (messageType === 'STATS_UPDATE') {
      if (msg.data) {
        batchStatsRef.current = msg.data;
      }
    } else if (messageType === 'SYSTEM_INFO') {
      const notificationMsg = msg.content || msg.message || '系统信息';
      message.info(notificationMsg);
    } else if (messageType === 'SYSTEM_ERROR') {
      const notificationMsg = msg.content || msg.message || '系统错误';
      message.error(notificationMsg);
    } else if (messageType === 'NOTIFY_SYSTEM') {
      const level = msg.level || 'info';
      const notificationMsg = msg.message || msg.content || '系统通知';

      if (level === 'error') {
        message.error(notificationMsg);
      } else if (level === 'warning') {
        message.warning(notificationMsg);
      } else if (level === 'success') {
        message.success(notificationMsg);
      } else {
        message.info(notificationMsg);
      }
    } else if (messageType === 'CUSTOM') {
      // 自定义消息静默处理
    } else if (messageType === 'TEST_MESSAGE') {
      const text = msg.content || msg.message || '测试消息';
      message.info(`测试消息: ${text}`);
    } else if (messageType === 'PING' || messageType === 'PONG') {
      // 静默处理
    } else if (messageType === 'HEARTBEAT') {
      // 心跳消息，静默处理
    }

    // 批量刷新：达到最大批量数或启动定时器
    batchCountRef.current += 1;
    if (batchCountRef.current >= MAX_BATCH_SIZE) {
      flushBatch();
    } else if (!batchTimerRef.current) {
      batchTimerRef.current = setTimeout(flushBatch, BATCH_INTERVAL);
    }
  }, [flushBatch, throttledAlertNotify]);

  // 将最新的 handler 赋值给 ref，供 connect 闭包使用
  handleMessageRef.current = handleWebSocketMessage;

  const disconnect = useCallback(() => {
    
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
      isMountedRef.current = false;
      
      // 清理批量刷新定时器
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
        batchTimerRef.current = undefined;
      }
      
      // 清理重连定时器
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = undefined;
      }
      
      // 关闭 STOMP 客户端
      if (stompClientRef.current) {
        try {
          stompClientRef.current.deactivate();
        } catch (e) {
          // 忽略已关闭的错误
        }
        stompClientRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const response = await fetch(`${API_BASE}/websocket/test-connection`, { method: 'POST' });
      return response.ok;
    } catch (error) {
      console.error('发送测试消息失败:', error);
      return false;
    }
  },
  
  // 检查状态
  checkStatus: async (): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE}/websocket/status`);
      return await response.json();
    } catch (error) {
      console.error('检查状态失败:', error);
      // 类型断言确保 error 对象有 message 属性
      const errorMessage = (error as Error).message;
      return { status: 'error', error: errorMessage };
    }
  }
};