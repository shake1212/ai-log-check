// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Alert, Tag, Button, Space, message } from 'antd';
import { Line, Pie, Column } from '@ant-design/charts';
import { useWebSocket } from '@/services/websocket';
import { logApi } from '@/services/api';
import type { Statistics, SecurityLog, SecurityAlert } from '@/types/log';

const Dashboard: React.FC = () => {
  const { connected, logs, alerts, statistics } = useWebSocket();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const data = await logApi.getStatistics();
      setStats(data);
    } catch (error) {
      message.error('加载统计信息失败');
    }
  };

  const handleCollectLogs = async () => {
    setLoading(true);
    try {
      const result = await logApi.collectLogs();
      message.success(result.message);
      await loadStatistics(); // 刷新统计信息
    } catch (error) {
      message.error('采集日志失败');
    } finally {
      setLoading(false);
    }
  };

  // 事件类型统计图表配置
  const eventTypeConfig = {
    data: stats?.eventCounts?.map((item: any) => ({
      type: `事件 ${item[0]}`,
      value: item[1],
    })) || [],
    angleField: 'value',
    colorField: 'type',
    label: {
      text: 'value',
      style: {
        fontWeight: 'bold',
      },
    },
    legend: {
      color: {
        title: false,
        position: 'right',
        rowPadding: 5,
      },
    },
  };

  // 每日日志趋势图表配置
  const dailyTrendConfig = {
    data: stats?.dailyCounts?.map((item: any) => ({
      date: item[0],
      count: item[1],
    })) || [],
    xField: 'date',
    yField: 'count',
    point: {
      shape: 'circle',
      size: 4,
    },
    interactions: [{ type: 'marker-active' }],
  };

  // 威胁等级统计图表配置
  const threatLevelConfig = {
    data: [
      { level: '低', value: stats?.threatLevels?.LOW || 0 },
      { level: '中', value: stats?.threatLevels?.MEDIUM || 0 },
      { level: '高', value: stats?.threatLevels?.HIGH || 0 },
      { level: '严重', value: stats?.threatLevels?.CRITICAL || 0 },
    ],
    xField: 'level',
    yField: 'value',
    color: ['#52c41a', '#faad14', '#fa8c16', '#f5222d'],
    label: {
      style: {
        fill: '#fff',
      },
    },
  };

  const criticalAlerts = alerts.filter((alert: SecurityAlert) => 
    alert.alertLevel === 'CRITICAL' || alert.alertLevel === 'HIGH'
  );

  return (
    <div style={{ padding: '24px' }}>
      {/* 状态栏 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={4}>
            <Statistic 
              title="WebSocket状态" 
              value={connected ? '已连接' : '断开'} 
              suffix={
                <Tag color={connected ? 'success' : 'error'}>
                  {connected ? '正常' : '异常'}
                </Tag>
              }
            />
          </Col>
          <Col span={4}>
            <Statistic title="总日志数" value={stats?.totalLogs || 0} />
          </Col>
          <Col span={4}>
            <Statistic title="安全事件" value={stats?.securityEvents || 0} />
          </Col>
          <Col span={4}>
            <Statistic title="未处理警报" value={stats?.unhandledAlerts || 0} />
          </Col>
          <Col span={4}>
            <Statistic title="高危警报" value={criticalAlerts.length} />
          </Col>
          <Col span={4}>
            <Statistic title="在线用户" value={statistics?.onlineUsers || 0} />
          </Col>
        </Row>
        
        <Space style={{ marginTop: 16 }}>
          <Button 
            type="primary" 
            loading={loading}
            onClick={handleCollectLogs}
          >
            立即采集日志
          </Button>
          <Button onClick={loadStatistics}>
            刷新统计
          </Button>
        </Space>
      </Card>

      {/* 高危警报 */}
      {criticalAlerts.length > 0 && (
        <Alert
          message={`有 ${criticalAlerts.length} 个高危警报需要处理`}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
          action={
            <Button size="small" type="text" href="#/alerts">
              查看详情
            </Button>
          }
        />
      )}

      {/* 图表区域 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card title="事件类型分布" bordered={false}>
            <Pie {...eventTypeConfig} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="日志趋势" bordered={false}>
            <Line {...dailyTrendConfig} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="威胁等级分布" bordered={false}>
            <Column {...threatLevelConfig} />
          </Card>
        </Col>
      </Row>

      {/* 实时数据 */}
      <Row gutter={16}>
        <Col span={12}>
          <Card title="实时日志流" style={{ height: 400 }}>
            <div style={{ height: 300, overflow: 'auto' }}>
              {logs.slice(0, 20).map((log: SecurityLog, index: number) => (
                <div
                  key={log.id || index}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #f0f0f0',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
                  }}
                >
                  <Tag color={
                    log.threatLevel === 'CRITICAL' ? 'red' :
                    log.threatLevel === 'HIGH' ? 'orange' :
                    log.threatLevel === 'MEDIUM' ? 'yellow' : 'green'
                  }>
                    {log.threatLevel}
                  </Tag>
                  <span style={{ marginLeft: 8, color: '#666' }}>
                    [{new Date(log.eventTime).toLocaleTimeString()}]
                  </span>
                  <span style={{ marginLeft: 8, fontWeight: 'bold' }}>
                    事件 {log.eventId}
                  </span>
                  <span style={{ marginLeft: 8, color: '#1890ff' }}>
                    {log.computerName}
                  </span>
                  {log.userName && (
                    <Tag color="blue" style={{ marginLeft: 8 }}>{log.userName}</Tag>
                  )}
                  {log.ipAddress && (
                    <Tag color="purple" style={{ marginLeft: 8 }}>{log.ipAddress}</Tag>
                  )}
                </div>
              ))}
              {logs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  暂无实时日志数据
                </div>
              )}
            </div>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title="实时警报" style={{ height: 400 }}>
            <div style={{ height: 300, overflow: 'auto' }}>
              {alerts.slice(0, 10).map((alert: SecurityAlert, index: number) => (
                <div
                  key={alert.id || index}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Tag color={
                        alert.alertLevel === 'CRITICAL' ? 'red' :
                        alert.alertLevel === 'HIGH' ? 'orange' :
                        alert.alertLevel === 'MEDIUM' ? 'yellow' : 'green'
                      }>
                        {alert.alertLevel}
                      </Tag>
                      <span style={{ fontWeight: 'bold', marginLeft: 8 }}>
                        {alert.alertType}
                      </span>
                    </div>
                    <span style={{ color: '#666', fontSize: '12px' }}>
                      {new Date(alert.createdTime).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
                    {alert.description}
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  暂无实时警报数据
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;