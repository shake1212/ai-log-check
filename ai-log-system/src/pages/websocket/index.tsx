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
  Alert,
  List,
  Tag,
  Divider,
  message,
} from 'antd';
import {
  PlayCircleOutlined,
  StopOutlined,
  SendOutlined,
  HeartOutlined,
  WifiOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { useWebSocket } from '../../hooks/useWebSocket';
import { WebSocketMessage } from '../../services/websocketService';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

/**
 * WebSocket管理页面
 */
const WebSocketPage: React.FC = () => {
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState('CUSTOM');
  const [targetUser, setTargetUser] = useState('');
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [connectionStats, setConnectionStats] = useState({
    connectionCount: 0,
    onlineUserCount: 0,
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
  } = useWebSocket({
    autoConnect: false,
    onConnect: () => {
      message.success('WebSocket连接成功');
      loadConnectionStats();
    },
    onDisconnect: () => {
      message.warning('WebSocket连接断开');
    },
    onError: (error) => {
      message.error('WebSocket连接错误');
      console.error('WebSocket错误:', error);
    },
  });

  // 加载连接统计
  const loadConnectionStats = async () => {
    try {
      const response = await fetch('/api/websocket/status');
      const data = await response.json();
      setConnectionStats(data);
    } catch (error) {
      console.error('加载连接统计失败:', error);
    }
  };

  // 注册消息处理器
  useEffect(() => {
    const handleMessage = (msg: WebSocketMessage) => {
      setMessages(prev => [msg, ...prev.slice(0, 99)]); // 保留最近100条消息
    };

    // 注册所有消息类型的处理器
    const messageTypes = [
      'SYSTEM_INFO', 'SYSTEM_ERROR', 'SYSTEM_WARNING',
      'LOG_UPDATE', 'LOG_ANOMALY', 'LOG_STATISTICS',
      'ALERT_NEW', 'ALERT_UPDATE', 'ALERT_RESOLVED',
      'MONITOR_CPU', 'MONITOR_MEMORY', 'MONITOR_DISK', 'MONITOR_NETWORK',
      'USER_LOGIN', 'USER_LOGOUT', 'USER_ACTION',
      'HEARTBEAT', 'PING', 'PONG', 'CUSTOM'
    ];

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
      receiver: targetUser || undefined,
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
      const response = await fetch('/api/websocket/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `content=${encodeURIComponent(messageContent)}&messageType=${messageType}`,
      });

      const result = await response.json();
      if (result.status === 'success') {
        message.success(`消息广播成功，目标连接数: ${result.targetCount}`);
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('广播消息失败');
      console.error('广播消息错误:', error);
    }
  };

  // 发送给指定用户
  const handleSendToUser = async () => {
    if (!messageContent.trim() || !targetUser.trim()) {
      message.warning('请输入消息内容和目标用户');
      return;
    }

    try {
      const response = await fetch('/api/websocket/send-to-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `userId=${encodeURIComponent(targetUser)}&content=${encodeURIComponent(messageContent)}&messageType=${messageType}`,
      });

      const result = await response.json();
      if (result.status === 'success') {
        message.success(`消息发送给用户 ${result.targetUser} 成功`);
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('发送消息失败');
      console.error('发送消息错误:', error);
    }
  };

  // 测试连接
  const handleTestConnection = async () => {
    try {
      const response = await fetch('/api/websocket/test-connection', {
        method: 'POST',
      });

      const result = await response.json();
      if (result.status === 'success') {
        message.success(`连接测试成功，连接数: ${result.connectionCount}`);
        loadConnectionStats();
      } else {
        message.error(result.message);
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
      'SYSTEM_INFO': 'blue',
      'SYSTEM_ERROR': 'red',
      'SYSTEM_WARNING': 'orange',
      'LOG_UPDATE': 'green',
      'LOG_ANOMALY': 'red',
      'ALERT_NEW': 'red',
      'ALERT_UPDATE': 'orange',
      'ALERT_RESOLVED': 'green',
      'HEARTBEAT': 'cyan',
      'PING': 'purple',
      'PONG': 'purple',
      'CUSTOM': 'default',
    };
    return colorMap[type] || 'default';
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>WebSocket管理</Title>
      
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
              title="在线用户数"
              value={connectionStats.onlineUserCount}
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
                <Option value="CUSTOM">自定义消息</Option>
                <Option value="SYSTEM_INFO">系统信息</Option>
                <Option value="SYSTEM_ERROR">系统错误</Option>
                <Option value="SYSTEM_WARNING">系统警告</Option>
                <Option value="LOG_UPDATE">日志更新</Option>
                <Option value="LOG_ANOMALY">异常日志</Option>
                <Option value="ALERT_NEW">新预警</Option>
                <Option value="ALERT_UPDATE">预警更新</Option>
                <Option value="ALERT_RESOLVED">预警解决</Option>
              </Select>
            </Col>
            <Col span={12}>
              <Text>目标用户 (可选):</Text>
              <Input
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                placeholder="输入用户ID，留空则广播"
                style={{ marginTop: '8px' }}
              />
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
              onClick={handleSendToUser}
              disabled={!isConnected || !targetUser.trim()}
            >
              发送给用户
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 消息列表 */}
      <Card title="消息列表" style={{ marginBottom: '24px' }}>
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

export default WebSocketPage;
