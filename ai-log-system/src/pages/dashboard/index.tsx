import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Button, Switch, Spin, Space, Tag, Progress, Badge, Tooltip, Typography } from 'antd';
import { 
  AlertOutlined, 
  CheckCircleOutlined, 
  SyncOutlined, 
  ExclamationCircleOutlined,
  SecurityScanOutlined,
  BugOutlined,
  ClockCircleOutlined,
  UserOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
// import { Line, Heatmap, Pie, Area, Column } from '@ant-design/charts';

const { Text } = Typography;

// 数据类型定义
interface LogDataItem {
  time: string;
  value: number;
  type: string;
  source: string;
  level: string;
}

// 模拟WebSocket连接
const useWebSocketData = () => {
  const [logData, setLogData] = useState<LogDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [statistics, setStatistics] = useState({
    totalLogs: 0,
    anomalyCount: 0,
    highRiskCount: 0,
    systemHealth: 'healthy',
    activeUsers: 0,
    responseTime: 0,
    throughput: 0
  });

  useEffect(() => {
    // 模拟初始数据加载
    setTimeout(() => {
      setLogData(generateMockData());
      setLoading(false);
    }, 1500);

    // 模拟WebSocket实时数据
    const interval = setInterval(() => {
      if (!paused) {
        setLogData(prev => {
          const newData = [...prev];
          // 移除最早的数据点
          if (newData.length > 100) {
            newData.shift();
          }
          // 添加新数据点
          newData.push({
            time: new Date().toISOString(),
            value: Math.floor(Math.random() * 100),
            type: Math.random() > 0.8 ? 'anomaly' : 'normal',
            source: ['Web服务器', '数据库', '防火墙', '应用服务器'][Math.floor(Math.random() * 4)] || '未知来源',
            level: Math.random() > 0.9 ? 'high' : Math.random() > 0.7 ? 'medium' : 'low',
          });
          return newData;
        });

        // 更新统计数据
        setStatistics(prev => ({
          ...prev,
          totalLogs: prev.totalLogs + Math.floor(Math.random() * 10) + 1,
          anomalyCount: Math.floor(Math.random() * 5),
          highRiskCount: Math.floor(Math.random() * 3),
          activeUsers: Math.floor(Math.random() * 50) + 20,
          responseTime: Math.floor(Math.random() * 200) + 100,
          throughput: Math.floor(Math.random() * 1000) + 500
        }));
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [paused]);

  return { logData, loading, paused, setPaused, statistics };
};

// 生成模拟数据
const generateMockData = (): LogDataItem[] => {
  const data: LogDataItem[] = [];
  const now = new Date();
  
  for (let i = 0; i < 100; i++) {
    const time = new Date(now.getTime() - (100 - i) * 30000);
    data.push({
      time: time.toISOString(),
      value: Math.floor(Math.random() * 100),
      type: Math.random() > 0.8 ? 'anomaly' : 'normal',
      source: ['Web服务器', '数据库', '防火墙', '应用服务器'][Math.floor(Math.random() * 4)] || '未知来源',
      level: Math.random() > 0.9 ? 'high' : Math.random() > 0.7 ? 'medium' : 'low',
    });
  }
  
  return data;
};

// 热力图数据转换
const transformToHeatmapData = (data: LogDataItem[]) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  
  const result: any[] = [];
  days.forEach(day => {
    hours.forEach(hour => {
      // 计算该时段的异常数量
      const anomalyCount = Math.floor(Math.random() * 10);
      result.push({
        day,
        hour: `${hour}:00`,
        anomalies: anomalyCount,
      });
    });
  });
  
  return result;
};

// 生成威胁类型分布数据
const generateThreatDistribution = () => {
  return [
    { type: 'SQL注入', value: 35, color: '#ff4d4f' },
    { type: 'XSS攻击', value: 25, color: '#ff7a45' },
    { type: '暴力破解', value: 20, color: '#ffa940' },
    { type: '异常登录', value: 15, color: '#52c41a' },
    { type: '其他', value: 5, color: '#1890ff' }
  ];
};

// 生成系统性能数据
const generatePerformanceData = () => {
  const data = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const time = new Date(now.getTime() - (24 - i) * 60 * 60 * 1000);
    data.push({
      time: time.toLocaleTimeString(),
      cpu: Math.floor(Math.random() * 40) + 30,
      memory: Math.floor(Math.random() * 30) + 50,
      disk: Math.floor(Math.random() * 20) + 60,
      network: Math.floor(Math.random() * 100) + 200
    });
  }
  return data;
};

const Dashboard = () => {
  const { logData, loading, paused, setPaused, statistics } = useWebSocketData();
  
  // 统计数据
  const anomalyCount = logData.filter(item => item.type === 'anomaly').length;
  const highRiskCount = logData.filter(item => item.level === 'high').length;
  
  // 表格列定义
  const columns = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      render: (text: string) => new Date(text).toLocaleTimeString(),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'anomaly' ? 'red' : 'green'}>
          {type === 'anomaly' ? '异常' : '正常'}
        </Tag>
      ),
    },
    {
      title: '风险等级',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => {
        const colors: Record<string, string> = {
          high: 'red',
          medium: 'orange',
          low: 'green',
        };
        return <Tag color={colors[level] || 'default'}>{level === 'high' ? '高' : level === 'medium' ? '中' : '低'}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: LogDataItem) => (
        <Space size="small">
          <Button type="link" size="small">查看详情</Button>
          {record.type === 'anomaly' && <Button type="link" size="small" danger>处理预警</Button>}
        </Space>
      ),
    },
  ];
  
  // 图表配置
  const lineConfig = {
    data: logData,
    xField: 'time',
    yField: 'value',
    seriesField: 'type',
    color: ({ type }: { type: string }) => {
      return type === 'anomaly' ? '#ff4d4f' : '#52c41a';
    },
    xAxis: {
      type: 'time',
    },
    animation: false,
  };
  
  const heatmapConfig = {
    data: transformToHeatmapData(logData),
    xField: 'hour',
    yField: 'day',
    colorField: 'anomalies',
    color: ['#174c83', '#7eb6d4', '#efefeb', '#efa759', '#9b4d16'],
    meta: {
      hour: {
        type: 'cat',
      },
      day: {
        type: 'cat',
      },
    },
  };
  
  return (
    <div>
      <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <h2>实时监控面板</h2>
        </Col>
        <Col>
          <Space>
            <span>实时数据流：</span>
            <Switch 
              checked={!paused} 
              onChange={(checked) => setPaused(!checked)} 
              checkedChildren="开启" 
              unCheckedChildren="暂停"
            />
          </Space>
        </Col>
      </Row>
      
      {/* 主要统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="系统状态" 
              value={statistics.systemHealth === 'healthy' ? "正常" : "异常"} 
              valueStyle={{ color: statistics.systemHealth === 'healthy' ? '#3f8600' : '#cf1322' }}
              prefix={statistics.systemHealth === 'healthy' ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
            />
            <Progress 
              percent={statistics.systemHealth === 'healthy' ? 95 : 60} 
              size="small" 
              strokeColor={statistics.systemHealth === 'healthy' ? '#52c41a' : '#ff4d4f'}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="今日日志总数" 
              value={statistics.totalLogs} 
              valueStyle={{ color: '#1890ff' }}
              prefix={<DatabaseOutlined />}
            />
            <div style={{ marginTop: 8 }}>
              <Badge status="processing" text="实时更新中" />
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="异常事件" 
              value={statistics.anomalyCount} 
              valueStyle={{ color: statistics.anomalyCount > 5 ? '#cf1322' : '#fa8c16' }}
              prefix={<BugOutlined />}
            />
            <div style={{ marginTop: 8 }}>
              <Tag color={statistics.anomalyCount > 5 ? 'red' : 'orange'}>
                {statistics.anomalyCount > 5 ? '高频率' : '正常范围'}
              </Tag>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="高风险预警" 
              value={statistics.highRiskCount} 
              valueStyle={{ color: statistics.highRiskCount > 0 ? '#cf1322' : '#3f8600' }}
              prefix={<WarningOutlined />}
            />
            <div style={{ marginTop: 8 }}>
              <Tag color={statistics.highRiskCount > 0 ? 'red' : 'green'}>
                {statistics.highRiskCount > 0 ? '需要关注' : '安全'}
              </Tag>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 系统性能统计 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="活跃用户" 
              value={statistics.activeUsers} 
              valueStyle={{ color: '#722ed1' }}
              prefix={<UserOutlined />}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">在线用户数</Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="响应时间" 
              value={statistics.responseTime} 
              suffix="ms"
              valueStyle={{ color: statistics.responseTime > 500 ? '#cf1322' : '#3f8600' }}
              prefix={<ThunderboltOutlined />}
            />
            <Progress 
              percent={Math.min((statistics.responseTime / 1000) * 100, 100)} 
              size="small" 
              strokeColor={statistics.responseTime > 500 ? '#ff4d4f' : '#52c41a'}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="吞吐量" 
              value={statistics.throughput} 
              suffix="req/s"
              valueStyle={{ color: '#1890ff' }}
              prefix={<SecurityScanOutlined />}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">每秒请求数</Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="AI检测准确率" 
              value={96.8} 
              suffix="%"
              valueStyle={{ color: '#3f8600' }}
              prefix={<InfoCircleOutlined />}
            />
            <Progress 
              percent={96.8} 
              size="small" 
              strokeColor="#52c41a"
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="实时日志流" extra={<SyncOutlined spin={!paused} />}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin />
              </div>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                <Text type="secondary">图表组件暂时禁用</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
      
      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="威胁类型分布" extra={<Tooltip title="基于最近7天的数据分析"><InfoCircleOutlined /></Tooltip>}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin />
              </div>
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                <Text type="secondary">饼图组件暂时禁用</Text>
              </div>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="系统性能监控" extra={<Button type="link">详细监控</Button>}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin />
              </div>
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                <Text type="secondary">柱状图组件暂时禁用</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="异常热力图">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin />
              </div>
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                <Text type="secondary">热力图组件暂时禁用</Text>
              </div>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="最近异常日志" extra={<Button type="link">查看全部</Button>}>
            <Table 
              dataSource={logData.filter(item => item.type === 'anomaly').slice(-5)} 
              columns={columns}
              rowKey="time"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard; 