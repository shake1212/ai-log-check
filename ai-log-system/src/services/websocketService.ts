/**
 * WebSocket服务
 * 提供WebSocket连接管理和消息处理功能
 */

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
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private connectionHandlers: ConnectionHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private isConnecting = false;

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
      if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('WebSocket连接成功');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.connectionHandlers.forEach(handler => handler());
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('解析WebSocket消息失败:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket连接关闭:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.handleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket连接错误:', error);
          this.isConnecting = false;
          this.errorHandlers.forEach(handler => handler(error));
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * 断开WebSocket连接
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.stopReconnect();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 发送消息
   */
  send(message: Partial<WebSocketMessage>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket未连接，无法发送消息');
      return;
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
      this.ws.send(JSON.stringify(fullMessage));
    } catch (error) {
      console.error('发送WebSocket消息失败:', error);
    }
  }

  /**
   * 发送心跳
   */
  sendHeartbeat(): void {
    this.send({
      type: 'HEARTBEAT',
      content: 'heartbeat',
    });
  }

  /**
   * 发送Ping
   */
  sendPing(): void {
    this.send({
      type: 'PING',
      content: 'ping',
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
   * 注册错误处理器
   */
  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * 获取连接状态
   */
  getConnectionState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.ws ? this.ws.readyState === WebSocket.OPEN : false;
  }

  /**
   * 处理消息
   */
  private handleMessage(message: WebSocketMessage): void {
    console.log('收到WebSocket消息:', message);

    // 处理特定类型的消息
    switch (message.type) {
      case 'PONG':
        console.log('收到Pong响应');
        break;
      case 'HEARTBEAT':
        console.log('收到心跳响应');
        break;
      default:
        // 调用注册的处理器
        const handlers = this.messageHandlers.get(message.type);
        if (handlers) {
          handlers.forEach(handler => handler(message));
        }
        break;
    }
  }

  /**
   * 处理重连
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      console.error('WebSocket重连次数已达上限，停止重连');
      return;
    }

    this.reconnectAttempts++;
    console.log(`WebSocket重连中... (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('WebSocket重连失败:', error);
      });
    }, this.config.reconnectInterval);
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
   * 开始心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

// 创建默认的WebSocket服务实例
const defaultConfig: WebSocketConfig = {
  url: `ws://${window.location.host}/ws`,
};

export const websocketService = new WebSocketService(defaultConfig);

export default WebSocketService;
