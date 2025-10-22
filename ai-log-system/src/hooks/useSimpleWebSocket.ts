import { useEffect, useRef, useState, useCallback } from 'react';
import { simpleWebSocketService, SimpleWebSocketMessage, MessageHandler } from '../services/simpleWebSocketService';

export interface UseSimpleWebSocketOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export interface UseSimpleWebSocketReturn {
  isConnected: boolean;
  connectionState: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: Partial<SimpleWebSocketMessage>) => void;
  onMessage: (type: string, handler: MessageHandler) => void;
  offMessage: (type: string, handler: MessageHandler) => void;
  sendHeartbeat: () => void;
  sendPing: () => void;
}

/**
 * 简化版WebSocket Hook
 * 核心设计理念：快速上手、易于维护
 */
export const useSimpleWebSocket = (options: UseSimpleWebSocketOptions = {}): UseSimpleWebSocketReturn => {
  const {
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState(WebSocket.CLOSED);
  const handlersRef = useRef<Map<string, MessageHandler[]>>(new Map());

  // 更新连接状态
  const updateConnectionState = useCallback(() => {
    const connected = simpleWebSocketService.isConnected();
    const state = simpleWebSocketService.getConnectionState();
    setIsConnected(connected);
    setConnectionState(state);
  }, []);

  // 连接WebSocket
  const connect = useCallback(async () => {
    try {
      await simpleWebSocketService.connect();
      updateConnectionState();
      onConnect?.();
    } catch (error) {
      console.error('简化版WebSocket连接失败:', error);
      onError?.(error as Event);
    }
  }, [onConnect, onError, updateConnectionState]);

  // 断开WebSocket连接
  const disconnect = useCallback(() => {
    simpleWebSocketService.disconnect();
    updateConnectionState();
    onDisconnect?.();
  }, [onDisconnect, updateConnectionState]);

  // 发送消息
  const sendMessage = useCallback((message: Partial<SimpleWebSocketMessage>) => {
    simpleWebSocketService.send(message);
  }, []);

  // 注册消息处理器
  const onMessage = useCallback((type: string, handler: MessageHandler) => {
    simpleWebSocketService.onMessage(type, handler);
    
    // 保存处理器引用，用于清理
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, []);
    }
    handlersRef.current.get(type)!.push(handler);
  }, []);

  // 移除消息处理器
  const offMessage = useCallback((type: string, handler: MessageHandler) => {
    simpleWebSocketService.offMessage(type, handler);
    
    // 从引用中移除
    const handlers = handlersRef.current.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }, []);

  // 发送心跳
  const sendHeartbeat = useCallback(() => {
    simpleWebSocketService.sendHeartbeat();
  }, []);

  // 发送Ping
  const sendPing = useCallback(() => {
    simpleWebSocketService.sendPing();
  }, []);

  // 初始化连接状态
  useEffect(() => {
    updateConnectionState();
  }, [updateConnectionState]);

  // 自动连接
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // 清理函数
    return () => {
      // 清理所有注册的处理器
      handlersRef.current.forEach((handlers, type) => {
        handlers.forEach(handler => {
          simpleWebSocketService.offMessage(type, handler);
        });
      });
      handlersRef.current.clear();
    };
  }, [autoConnect, connect]);

  return {
    isConnected,
    connectionState,
    connect,
    disconnect,
    sendMessage,
    onMessage,
    offMessage,
    sendHeartbeat,
    sendPing,
  };
};

export default useSimpleWebSocket;
