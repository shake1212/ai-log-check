import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  List,
  Tag,
  message,
  Alert,
} from 'antd';
import {
  PlayCircleOutlined,
  StopOutlined,
  SendOutlined,
  HeartOutlined,
  WifiOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { useSimpleWebSocket } from '../../hooks/useSimpleWebSocket';
import { SimpleWebSocketMessage } from '../../services/simpleWebSocketService';
import { request } from '../../utils/request';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

/**
 * 简化版WebSocket管理页面
 * 核心设计理念：功能聚焦、快速上手
 */
const SimpleWebSocketPage: React.FC = () => {
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState('system');
  const [messages, setMessages] = useState<SimpleWebSocketMessage[]>([]);
  const [connectionStats, setConnectionStats] = useState({
    connectionCount: 0,
    status: 'unknown',
  });

  const {
    isConnected,
    connectionState,
    connect,
    disconnect,
    sendMessage,
    onMessage,
    offMessage,
    sendHeartbeat,
    sendPing,
  } = useSimpleWebSocket({
    autoConnect: false,
    onConnect: () => {
      message.success('简化版WebSocket连接成功');
      loadConnectionStats();
    },
    onDisconnect: () => {
      message.warning('简化版WebSocket连接断开');
    },
    onError: (error) => {
      message.error('简化版WebSocket连接错误');
      console.error('WebSocket错误:', error);
    },
  });

  // 加载连接统计
  const loadConnectionStats = async () => {
    try {
      const response = await request('/api/simple-websocket/status');
      setConnectionStats(response.data);
    } catch (error) {
      console.error('加载连接统计失败:', error);
    }
  };

  // 注册消息处理器
  useEffect(() => {
    const handleMessage = (msg: SimpleWebSocketMessage) => {
      setMessages(prev => [msg, ...prev.slice(0, 49)]); // 保留最近50条消息
    };

    // 注册所有消息类型的处理器
    const messageTypes = ['system', 'log', 'alert', 'heartbeat', 'ping', 'pong', 'custom'];

    messageTypes.forEach(type => {
      onMessage(type, handleMessage);
    });

    return () => {
      messageTypes.forEach(type => {
        offMessage(type, handleMessage);
      });
    };
  }, [onMessage, offMessage]);

  // 定期更新连接统计
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(loadConnectionStats, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  // 发送消息
  const handleSendMessage = () => {
    if (!messageContent.trim()) {
      message.warning('请输入消息内容');
      return;
    }

    sendMessage({
      type: messageType,
      content: messageContent,
    });

    setMessageContent('');
    message.success('消息发送成功');
  };

  // 广播消息
  const handleBroadcastMessage = async () => {
    if (!messageContent.trim()) {
      message.warning('请输入消息内容');
      return;
    }

    try {
      const response = await request('/api/simple-websocket/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: new URLSearchParams({
          content: messageContent,
          type: messageType,
        }),
      });

      if (response.data.status === 'success') {
        message.success(`消息广播成功，目标连接数: ${response.data.targetCount}`);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('广播消息失败');
      console.error('广播消息错误:', error);
    }
  };

  // 发送系统消息
  const handleSendSystemMessage = async () => {
    if (!messageContent.trim()) {
      message.warning('请输入消息内容');
      return;
    }

    try {
      const response = await request('/api/simple-websocket/system-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: new URLSearchParams({
          content: messageContent,
        }),
      });

      if (response.data.status === 'success') {
        message.success(`系统消息发送成功，目标连接数: ${response.data.targetCount}`);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('发送系统消息失败');
      console.error('发送系统消息错误:', error);
    }
  };

  // 测试连接
  const handleTestConnection = async () => {
    try {
      const response = await request('/api/simple-websocket/test', {
        method: 'POST',
      });

      if (response.data.status === 'success') {
        message.success(`连接测试成功，连接数: ${response.data.connectionCount}`);
        loadConnectionStats();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('连接测试失败');
      console.error('连接测试错误:', error);
    }
  };

  // 获取连接状态文本
  const getConnectionStateText = () => {
    switch (connectionState) {
      case WebSocket.CONNECTING:
        return '连接中';
      case WebSocket.OPEN:
        return '已连接';
      case WebSocket.CLOSING:
        return '断开中';
      case WebSocket.CLOSED:
        return '已断开';
      default:
        return '未知状态';
    }
  };

  // 获取消息类型标签颜色
  const getMessageTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      'system': 'blue',
      'log': 'green',
      'alert': 'red',
      'heartbeat': 'cyan',
      'ping': 'purple',
      'pong': 'purple',
      'custom': 'default',
    };
    return colorMap[type] || 'default';
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>简化版WebSocket管理</Title>
      
      {/* 连接状态卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="连接状态"
              value={getConnectionStateText()}
              prefix={isConnected ? <WifiOutlined style={{ color: '#52c41a' }} /> : <DisconnectOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="当前连接数"
              value={connectionStats.connectionCount}
              prefix={<WifiOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="服务状态"
              value={connectionStats.status}
              prefix={<WifiOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 连接控制 */}
      <Card title="连接控制" style={{ marginBottom: '24px' }}>
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={connect}
            disabled={isConnected}
          >
            连接
          </Button>
          <Button
            icon={<StopOutlined />}
            onClick={disconnect}
            disabled={!isConnected}
          >
            断开
          </Button>
          <Button
            icon={<HeartOutlined />}
            onClick={sendHeartbeat}
            disabled={!isConnected}
          >
            发送心跳
          </Button>
          <Button
            icon={<SendOutlined />}
            onClick={sendPing}
            disabled={!isConnected}
          >
            发送Ping
          </Button>
          <Button onClick={handleTestConnection}>
            测试连接
          </Button>
        </Space>
      </Card>

      {/* 消息发送 */}
      <Card title="消息发送" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Text>消息类型:</Text>
              <Select
                value={messageType}
                onChange={setMessageType}
                style={{ width: '100%', marginTop: '8px' }}
              >
                <Option value="system">系统消息</Option>
                <Option value="log">日志消息</Option>
                <Option value="alert">预警消息</Option>
                <Option value="custom">自定义消息</Option>
              </Select>
            </Col>
          </Row>
          
          <Text>消息内容:</Text>
          <TextArea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="输入消息内容"
            rows={3}
          />
          
          <Space>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              disabled={!isConnected}
            >
              发送消息
            </Button>
            <Button
              onClick={handleBroadcastMessage}
              disabled={!isConnected}
            >
              广播消息
            </Button>
            <Button
              onClick={handleSendSystemMessage}
              disabled={!isConnected}
            >
              发送系统消息
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 消息列表 */}
      <Card title="消息列表">
        <List
          dataSource={messages}
          renderItem={(msg, index) => (
            <List.Item key={index}>
              <List.Item.Meta
                title={
                  <Space>
                    <Tag color={getMessageTypeColor(msg.type)}>{msg.type}</Tag>
                    <Text strong>{msg.sender}</Text>
                    <Text type="secondary">{new Date(msg.timestamp).toLocaleString()}</Text>
                  </Space>
                }
                description={
                  <div>
                    <Text>{msg.content}</Text>
                    {msg.data && (
                      <div style={{ marginTop: '8px' }}>
                        <Text type="secondary">数据: {JSON.stringify(msg.data)}</Text>
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
        {messages.length === 0 && (
          <Alert message="暂无消息" type="info" showIcon />
        )}
      </Card>
    </div>
  );
};

export default SimpleWebSocketPage;
