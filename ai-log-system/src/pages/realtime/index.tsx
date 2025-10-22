import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  List, 
  Tag, 
  Row, 
  Col, 
  Statistic, 
  Button, 
  Switch, 
  Space, 
  Badge, 
  Tooltip, 
  Typography, 
  Progress,
  Alert,
  Divider,
  Timeline,
  Avatar
} from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  ReloadOutlined, 
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  FilterOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

// 事件类型定义
interface SecurityEvent {
  id: string;
  timestamp: string;
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  source: string;
  type: string;
  message: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  confidence: number;
  status: 'NEW' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  tags: string[];
}

// 生成模拟安全事件
const generateMockEvents = (count: number = 10): SecurityEvent[] => {
  const eventTypes = [
    'SQL注入攻击', 'XSS攻击', '暴力破解', '异常登录', '权限提升',
    '数据泄露', '恶意扫描', 'DDoS攻击', '文件上传漏洞', 'CSRF攻击'
  ];
  const sources = ['WAF', 'IDS', 'IPS', '应用服务器', '数据库', '防火墙', '用户认证系统'];
  const levels: SecurityEvent['level'][] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  const statuses: SecurityEvent['status'][] = ['NEW', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'];
  
  return Array.from({ length: count }, (_, i) => {
    const now = new Date();
    const timestamp = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
    
    return {
      id: `EVENT-${Date.now()}-${i}`,
      timestamp: timestamp.toISOString(),
      level: levels[Math.floor(Math.random() * levels.length)] as SecurityEvent['level'],
      source: sources[Math.floor(Math.random() * sources.length)] || '未知来源',
      type: eventTypes[Math.floor(Math.random() * eventTypes.length)] || '未知类型',
      message: `检测到${eventTypes[Math.floor(Math.random() * eventTypes.length)]}尝试`,
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      userId: Math.random() > 0.7 ? `user_${Math.floor(Math.random() * 1000)}` : '',
      confidence: Math.floor(Math.random() * 40) + 60,
      status: statuses[Math.floor(Math.random() * statuses.length)] as SecurityEvent['status'],
      tags: ['安全', '异常', '需要关注'].slice(0, Math.floor(Math.random() * 3) + 1)
    };
  });
};

export default function RealtimeMonitor() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout>();

  // 初始化数据
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setEvents(generateMockEvents(20));
      setLoading(false);
    }, 1000);
  }, []);

  // 实时数据更新
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const newEvent = generateMockEvents(1)[0];
        if (newEvent) {
          setEvents(prev => [newEvent, ...prev.slice(0, 49)]); // 保持最多50条记录
        }
      }, Math.random() * 3000 + 1000); // 1-4秒随机间隔
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying]);

  // 统计数据
  const stats = {
    total: events.length,
    critical: events.filter(e => e.level === 'CRITICAL').length,
    high: events.filter(e => e.level === 'HIGH').length,
    new: events.filter(e => e.status === 'NEW').length,
    investigating: events.filter(e => e.status === 'INVESTIGATING').length
  };

  // 级别标签渲染
  const renderLevelTag = (level: SecurityEvent['level']) => {
    const config = {
      CRITICAL: { color: 'red', text: '严重', icon: <ExclamationCircleOutlined /> },
      HIGH: { color: 'orange', text: '高', icon: <WarningOutlined /> },
      MEDIUM: { color: 'gold', text: '中', icon: <InfoCircleOutlined /> },
      LOW: { color: 'blue', text: '低', icon: <CheckCircleOutlined /> },
      INFO: { color: 'default', text: '信息', icon: <InfoCircleOutlined /> }
    };
    
    const { color, text, icon } = config[level];
    return <Tag color={color} icon={icon}>{text}</Tag>;
  };

  // 状态标签渲染
  const renderStatusTag = (status: SecurityEvent['status']) => {
    const config = {
      NEW: { color: 'red', text: '新事件' },
      INVESTIGATING: { color: 'processing', text: '调查中' },
      RESOLVED: { color: 'success', text: '已解决' },
      FALSE_POSITIVE: { color: 'default', text: '误报' }
    };
    
    const { color, text } = config[status];
    return <Tag color={color}>{text}</Tag>;
  };

  // 过滤事件
  const filteredEvents = events.filter(event => {
    if (filter === 'ALL') return true;
    return event.level === filter;
  });

  return (
    <div>
      <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Title level={2}>实时安全事件监控</Title>
          <Text type="secondary">实时监控系统安全事件，及时发现和响应威胁</Text>
        </Col>
        <Col>
          <Space>
            <Switch
              checked={isPlaying}
              onChange={setIsPlaying}
              checkedChildren={<PlayCircleOutlined />}
              unCheckedChildren={<PauseCircleOutlined />}
            />
            <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
              刷新
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="总事件数"
              value={stats.total}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="严重事件"
              value={stats.critical}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="高优先级"
              value={stats.high}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="新事件"
              value={stats.new}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="调查中"
              value={stats.investigating}
              prefix={<EyeOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="系统状态"
              value={stats.critical > 5 ? "告警" : "正常"}
              prefix={stats.critical > 5 ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />}
              valueStyle={{ color: stats.critical > 5 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 系统状态警告 */}
      {stats.critical > 5 && (
        <Alert
          message="系统安全告警"
          description={`检测到${stats.critical}个严重安全事件，请立即处理！`}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" danger>
              立即处理
            </Button>
          }
        />
      )}

      {/* 过滤器 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Text strong>事件级别过滤：</Text>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(level => (
            <Button
              key={level}
              type={filter === level ? 'primary' : 'default'}
              size="small"
              onClick={() => setFilter(level)}
            >
              {level === 'ALL' ? '全部' : level}
            </Button>
          ))}
        </Space>
      </Card>

      {/* 事件列表 */}
      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card 
            title={`实时事件流 (${filteredEvents.length} 条)`}
            extra={
              <Space>
                <Badge status={isPlaying ? 'processing' : 'default'} text={isPlaying ? '实时更新中' : '已暂停'} />
                <Button icon={<FilterOutlined />} size="small">高级过滤</Button>
              </Space>
            }
          >
            <List
              loading={loading}
              dataSource={filteredEvents}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条事件`
              }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button type="link" size="small">查看详情</Button>,
                    <Button type="link" size="small">处理</Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        style={{ 
                          backgroundColor: item.level === 'CRITICAL' ? '#ff4d4f' : 
                                          item.level === 'HIGH' ? '#fa8c16' : '#1890ff' 
                        }}
                        icon={
                          item.level === 'CRITICAL' ? <ExclamationCircleOutlined /> :
                          item.level === 'HIGH' ? <WarningOutlined /> : <InfoCircleOutlined />
                        }
                      />
                    }
                    title={
                      <Space>
                        {renderLevelTag(item.level)}
                        <Text strong>{item.type}</Text>
                        <Text type="secondary">来自 {item.source}</Text>
                      </Space>
                    }
                    description={
                      <div>
                        <div style={{ marginBottom: 4 }}>
                          <Text>{item.message}</Text>
                        </div>
                        <Space size="small">
                          <Text type="secondary">{new Date(item.timestamp).toLocaleString()}</Text>
                          {item.ipAddress && <Text type="secondary">IP: {item.ipAddress}</Text>}
                          <Text type="secondary">置信度: {item.confidence}%</Text>
                          {renderStatusTag(item.status)}
                          {item.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}
                        </Space>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        
        <Col span={8}>
          <Card title="事件时间线" style={{ marginBottom: 16 }}>
            <Timeline
              items={filteredEvents.slice(0, 5).map(event => ({
                dot: event.level === 'CRITICAL' ? <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> :
                     event.level === 'HIGH' ? <WarningOutlined style={{ color: '#fa8c16' }} /> :
                     <InfoCircleOutlined style={{ color: '#1890ff' }} />,
                children: (
                  <div>
                    <Text strong>{event.type}</Text>
                    <br />
                    <Text type="secondary">{new Date(event.timestamp).toLocaleTimeString()}</Text>
                  </div>
                )
              }))}
            />
          </Card>

          <Card title="系统健康状态">
            <div style={{ marginBottom: 16 }}>
              <Text>事件处理效率</Text>
              <Progress percent={85} strokeColor="#52c41a" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text>AI检测准确率</Text>
              <Progress percent={96} strokeColor="#1890ff" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text>系统响应时间</Text>
              <Progress percent={78} strokeColor="#fa8c16" />
            </div>
            <Divider />
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>最近活动</Text>
              <Text type="secondary">• 新增安全规则 2 条</Text>
              <Text type="secondary">• 处理高风险事件 5 个</Text>
              <Text type="secondary">• 系统自动响应 12 次</Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}


