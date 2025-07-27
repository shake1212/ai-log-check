import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Button, Switch, Spin, Space, Tag } from 'antd';
import { AlertOutlined, CheckCircleOutlined, SyncOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Line, Heatmap } from '@ant-design/charts';

// 模拟WebSocket连接
const useWebSocketData = () => {
  const [logData, setLogData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);

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
            source: ['Web服务器', '数据库', '防火墙', '应用服务器'][Math.floor(Math.random() * 4)],
            level: Math.random() > 0.9 ? 'high' : Math.random() > 0.7 ? 'medium' : 'low',
          });
          return newData;
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [paused]);

  return { logData, loading, paused, setPaused };
};

// 生成模拟数据
const generateMockData = () => {
  const data = [];
  const now = new Date();
  
  for (let i = 0; i < 100; i++) {
    const time = new Date(now.getTime() - (100 - i) * 30000);
    data.push({
      time: time.toISOString(),
      value: Math.floor(Math.random() * 100),
      type: Math.random() > 0.8 ? 'anomaly' : 'normal',
      source: ['Web服务器', '数据库', '防火墙', '应用服务器'][Math.floor(Math.random() * 4)],
      level: Math.random() > 0.9 ? 'high' : Math.random() > 0.7 ? 'medium' : 'low',
    });
  }
  
  return data;
};

// 热力图数据转换
const transformToHeatmapData = (data) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  
  const result = [];
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

const Dashboard = () => {
  const { logData, loading, paused, setPaused } = useWebSocketData();
  
  // 统计数据
  const anomalyCount = logData.filter(item => item.type === 'anomaly').length;
  const highRiskCount = logData.filter(item => item.level === 'high').length;
  
  // 表格列定义
  const columns = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      render: (text) => new Date(text).toLocaleTimeString(),
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
      render: (type) => (
        <Tag color={type === 'anomaly' ? 'red' : 'green'}>
          {type === 'anomaly' ? '异常' : '正常'}
        </Tag>
      ),
    },
    {
      title: '风险等级',
      dataIndex: 'level',
      key: 'level',
      render: (level) => {
        const colors = {
          high: 'red',
          medium: 'orange',
          low: 'green',
        };
        return <Tag color={colors[level]}>{level === 'high' ? '高' : level === 'medium' ? '中' : '低'}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
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
    color: ({ type }) => {
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
      
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card>
            <Statistic 
              title="系统状态" 
              value={highRiskCount > 5 ? "异常" : "正常"} 
              valueStyle={{ color: highRiskCount > 5 ? '#cf1322' : '#3f8600' }}
              prefix={highRiskCount > 5 ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title="异常日志数量" 
              value={anomalyCount} 
              valueStyle={{ color: anomalyCount > 10 ? '#cf1322' : '#3f8600' }}
              prefix={<AlertOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title="高风险预警" 
              value={highRiskCount} 
              valueStyle={{ color: highRiskCount > 0 ? '#cf1322' : '#3f8600' }}
              prefix={<ExclamationCircleOutlined />}
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
              <Line {...lineConfig} height={200} />
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
              <Heatmap {...heatmapConfig} height={300} />
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