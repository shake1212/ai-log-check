/**
 * 简化版WebSocket服务
 * 核心设计理念：浏览器原生WebSocket API + React Hook
 * 消息格式：纯JSON文本，易于调试
 */

export interface SimpleWebSocketMessage {
  type: string;
  content: string;
  data?: any;
  timestamp: string;
  sender: string;
}

export type MessageHandler = (message: SimpleWebSocketMessage) => void;
export type ConnectionHandler = () => void;
export type ErrorHandler = (error: Event) => void;

class SimpleWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private connectionHandlers: ConnectionHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private isConnecting = false;

  constructor(url: string) {
    this.url = url;
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
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('简化版WebSocket连接成功');
          this.isConnecting = false;
          this.connectionHandlers.forEach(handler => handler());
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: SimpleWebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('解析WebSocket消息失败:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('简化版WebSocket连接关闭:', event.code, event.reason);
          this.isConnecting = false;
        };

        this.ws.onerror = (error) => {
          console.error('简化版WebSocket连接错误:', error);
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 发送消息
   */
  send(message: Partial<SimpleWebSocketMessage>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket未连接，无法发送消息');
      return;
    }

    const fullMessage: SimpleWebSocketMessage = {
      type: message.type || 'custom',
      content: message.content || '',
      data: message.data,
      timestamp: new Date().toISOString(),
      sender: message.sender || 'client',
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
      type: 'heartbeat',
      content: 'ping',
    });
  }

  /**
   * 发送Ping
   */
  sendPing(): void {
    this.send({
      type: 'ping',
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
  private handleMessage(message: SimpleWebSocketMessage): void {
    console.log('收到简化版WebSocket消息:', message);

    // 处理特定类型的消息
    switch (message.type) {
      case 'pong':
        console.log('收到Pong响应');
        break;
      case 'heartbeat':
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
}

// 创建默认的简化版WebSocket服务实例
const defaultUrl = `ws://${window.location.host}/ws/simple`;

export const simpleWebSocketService = new SimpleWebSocketService(defaultUrl);

export default SimpleWebSocketService;
