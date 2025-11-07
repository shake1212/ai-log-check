// src/services/websocketService.ts
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';
import { message } from 'antd';

export interface WebSocketMessage {
  type: string;
  content: string;
  data?: any;
  timestamp: string;
  sender: string;
  receiver?: string;
  attributes?: Record<string, any>;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export type MessageHandler = (message: WebSocketMessage) => void;
export type ConnectionHandler = () => void;
export type ErrorHandler = (error: Event) => void;

class WebSocketService {
  private stompClient: Client | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private connectionHandlers: ConnectionHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private subscriptions: { [topic: string]: any } = {};

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  /**
   * 连接WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || (this.stompClient && this.stompClient.connected)) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        this.stompClient = new Client({
          webSocketFactory: () => {
            // 添加 SockJS 配置选项，解决 CORS 问题
            return new SockJS(this.config.url, null, {
              transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
              timeout: 5000,
            });
          },
          reconnectDelay: 0, // 禁用自动重连，我们手动控制
          heartbeatIncoming: this.config.heartbeatInterval,
          heartbeatOutgoing: this.config.heartbeatInterval,
          debug: (str) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('STOMP Debug:', str);
            }
          },
          // 添加连接头
          connectHeaders: {},
        });

        this.stompClient.onConnect = (frame) => {
          console.log('STOMP连接成功:', frame);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          // 订阅默认主题
          this.subscribeToTopics();
          
          this.connectionHandlers.forEach(handler => handler());
          message.success('WebSocket 连接成功');
          resolve();
        };

        this.stompClient.onStompError = (frame) => {
          console.error('STOMP协议错误:', frame);
          this.isConnecting = false;
          this.errorHandlers.forEach(handler => handler(new Event('STOMP_ERROR')));
          message.error('STOMP协议错误');
          reject(new Error('STOMP协议错误'));
        };

        this.stompClient.onWebSocketClose = (event) => {
          console.log('WebSocket连接关闭:', event.code, event.reason);
          this.isConnecting = false;
          this.handleReconnect();
        };

        this.stompClient.onWebSocketError = (event) => {
          console.error('WebSocket连接错误:', event);
          this.isConnecting = false;
          this.errorHandlers.forEach(handler => handler(event));
          // 不在这里 reject，因为可能是网络波动，让重连机制处理
        };

        this.stompClient.activate();

      } catch (error) {
        this.isConnecting = false;
        console.error('创建WebSocket客户端失败:', error);
        message.error('创建WebSocket连接失败');
        reject(error);
      }
    });
  }

  /**
   * 订阅主题
   */
  private subscribeToTopics(): void {
    if (!this.stompClient || !this.stompClient.connected) return;

    // 订阅通用主题
    const topics = [
      '/topic/logs',
      '/topic/alerts',
      '/topic/stats',
      '/topic/notifications',
      '/topic/broadcast'
    ];

    topics.forEach(topic => {
      try {
        const subscription = this.stompClient!.subscribe(topic, (message: IMessage) => {
          try {
            const parsedMessage: WebSocketMessage = JSON.parse(message.body);
            this.handleMessage(parsedMessage);
          } catch (error) {
            console.error('解析STOMP消息失败:', error, message.body);
          }
        });
        
        // 保存订阅引用，以便后续取消订阅
        this.subscriptions[topic] = subscription;
        
      } catch (error) {
        console.error(`订阅主题 ${topic} 失败:`, error);
      }
    });
  }

  /**
   * 断开WebSocket连接
   */
  disconnect(): void {
    this.stopReconnect();
    
    // 取消所有订阅
    Object.values(this.subscriptions).forEach(subscription => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.error('取消订阅失败:', error);
      }
    });
    this.subscriptions = {};
    
    if (this.stompClient) {
      try {
        this.stompClient.deactivate();
      } catch (error) {
        console.error('断开WebSocket连接失败:', error);
      }
      this.stompClient = null;
    }
    
    this.isConnecting = false;
    console.log('WebSocket连接已断开');
  }

  /**
   * 发送消息
   */
  send(message: Partial<WebSocketMessage>, destination: string = '/app/message'): boolean {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn('WebSocket未连接，无法发送消息');
      return false;
    }

    const fullMessage: WebSocketMessage = {
      type: message.type || 'CUSTOM',
      content: message.content || '',
      data: message.data,
      timestamp: new Date().toISOString(),
      sender: message.sender || 'client',
      receiver: message.receiver,
      attributes: message.attributes,
    };

    try {
      this.stompClient.publish({
        destination,
        body: JSON.stringify(fullMessage),
      });
      return true;
    } catch (error) {
      console.error('发送STOMP消息失败:', error);
      return false;
    }
  }

  /**
   * 发送心跳
   */
  sendHeartbeat(): boolean {
    return this.send({
      type: 'HEARTBEAT',
      content: 'heartbeat',
    });
  }

  /**
   * 注册消息处理器
   */
  onMessage(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  /**
   * 移除消息处理器
   */
  offMessage(type: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 注册连接处理器
   */
  onConnect(handler: ConnectionHandler): void {
    this.connectionHandlers.push(handler);
  }

  /**
   * 移除连接处理器
   */
  offConnect(handler: ConnectionHandler): void {
    const index = this.connectionHandlers.indexOf(handler);
    if (index > -1) {
      this.connectionHandlers.splice(index, 1);
    }
  }

  /**
   * 注册错误处理器
   */
  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * 移除错误处理器
   */
  offError(handler: ErrorHandler): void {
    const index = this.errorHandlers.indexOf(handler);
    if (index > -1) {
      this.errorHandlers.splice(index, 1);
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionState(): string {
    if (!this.stompClient) return 'CLOSED';
    return this.stompClient.connected ? 'OPEN' : 'CLOSED';
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.stompClient ? this.stompClient.connected : false;
  }

  /**
   * 处理消息
   */
  private handleMessage(message: WebSocketMessage): void {
    console.log('收到WebSocket消息:', message);

    // 调用注册的处理器
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('消息处理器执行失败:', error);
        }
      });
    }

    // 处理未知类型的消息
    if (!handlers || handlers.length === 0) {
      console.warn('未处理的消息类型:', message.type);
    }
  }

  /**
   * 处理重连
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      console.error('WebSocket重连次数已达上限，停止重连');
      message.error('WebSocket连接失败，请刷新页面重试');
      return;
    }

    this.reconnectAttempts++;
    const retryDelay = this.config.reconnectInterval! * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`WebSocket重连中... (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})，${retryDelay}ms后重试`);

    if (this.reconnectAttempts === 1) {
      message.warning(`连接断开，正在尝试重连... (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('WebSocket重连失败:', error);
      });
    }, retryDelay);
  }

  /**
   * 停止重连
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 手动重连
   */
  reconnect(): void {
    console.log('手动重连WebSocket');
    this.stopReconnect();
    this.reconnectAttempts = 0;
    this.disconnect(); // 先完全断开
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('手动重连失败:', error);
        message.error('重连失败，请检查网络连接');
      });
    }, 100);
  }

  /**
   * 获取重试次数
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * 获取最大重试次数
   */
  getMaxReconnectAttempts(): number {
    return this.config.maxReconnectAttempts!;
  }

  /**
   * 自定义订阅主题
   */
  subscribe(topic: string, callback: (message: any) => void): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn('WebSocket未连接，无法订阅主题');
      return;
    }

    try {
      const subscription = this.stompClient.subscribe(topic, (message: IMessage) => {
        try {
          const parsedMessage = JSON.parse(message.body);
          callback(parsedMessage);
        } catch (error) {
          console.error('解析订阅消息失败:', error);
        }
      });
      
      this.subscriptions[topic] = subscription;
      console.log(`已订阅主题: ${topic}`);
      
    } catch (error) {
      console.error(`订阅主题 ${topic} 失败:`, error);
    }
  }

  /**
   * 取消订阅
   */
  unsubscribe(topic: string): void {
    if (this.subscriptions[topic]) {
      try {
        this.subscriptions[topic].unsubscribe();
        delete this.subscriptions[topic];
        console.log(`已取消订阅主题: ${topic}`);
      } catch (error) {
        console.error(`取消订阅主题 ${topic} 失败:`, error);
      }
    }
  }
}

// 创建默认的WebSocket服务实例
const defaultConfig: WebSocketConfig = {
  url: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:8080/api/ws' 
    : `${window.location.origin}/api/ws`,
};

export const websocketService = new WebSocketService(defaultConfig);

export default WebSocketService;