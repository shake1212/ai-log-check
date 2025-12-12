import React from 'react';
import { Row, Col, Card, Alert, Button, Typography, Spin, Badge } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

// 导入卡片组件
import SystemHealthCard from '../cards/SystemHealthCard';
import TotalLogsCard from '../cards/TotalLogsCard';
import SecurityEventsCard from '../cards/SecurityEventsCard';
import ActiveUsersCard from '../cards/ActiveUsersCard';

// 导入图表组件
import RealTimeLogChart from '../charts/RealTimeLogChart';
import ThreatDistributionChart from '../charts/ThreatDistributionChart';

// 导入类型定义
import { SecurityEvent, EVENT_LEVELS, LEVEL_COLORS } from '../types/dashboard';

const { Title, Text, Paragraph } = Typography;

interface OverviewPageProps {
  isPaused: boolean;
  hasCriticalAlert: boolean;
  eventStats: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    newEvents: number;
    investigating: number;
  };
  events: SecurityEvent[];
  eventLoading: boolean;
  eventFilter: string;
  setEventFilter: (filter: string) => void;
  loadInitialData: () => void;
  reconnect: () => void;
  fetchError: string | null;
}

const OverviewPage: React.FC<OverviewPageProps> = ({
  isPaused,
  hasCriticalAlert,
  eventStats,
  events,
  eventLoading,
  eventFilter,
  setEventFilter,
  loadInitialData,
  reconnect,
  fetchError
}) => {
  // 准备威胁分布数据
  const threatDistributionData = [
    { name: '严重', value: eventStats.critical, color: LEVEL_COLORS.CRITICAL },
    { name: '高危', value: eventStats.high, color: LEVEL_COLORS.HIGH },
    { name: '中危', value: eventStats.medium, color: LEVEL_COLORS.MEDIUM },
    { name: '低危', value: eventStats.low, color: LEVEL_COLORS.LOW },
  ];

  // 准备实时日志图表数据
  const realTimeChartData = events.slice(0, 50).map(event => ({
    time: event.timestamp,
    value: (() => {
      // 根据事件级别生成不同数值
      switch (event.level) {
        case 'CRITICAL': return 90 + Math.random() * 10;
        case 'HIGH': return 70 + Math.random() * 20;
        case 'MEDIUM': return 40 + Math.random() * 30;
        case 'LOW': return 10 + Math.random() * 30;
        default: return Math.random() * 100;
      }
    })(),
    type: event.level === 'LOW' ? 'normal' : 'anomaly'
  }));

  if (fetchError) {
    return (
      <Alert
        message="系统连接异常"
        description={fetchError}
        type="error"
        showIcon
        action={
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button size="middle" onClick={loadInitialData}>
              重试
            </Button>
            <Button size="middle" type="primary" onClick={reconnect}>
              重新连接
            </Button>
          </div>
        }
        style={{ 
          marginBottom: '32px', 
          borderRadius: '12px',
          border: 'none',
          boxShadow: '0 4px 12px rgba(255, 77, 79, 0.15)'
        }}
      />
    );
  }

  if (hasCriticalAlert) {
    return (
      <Alert
        type="error"
        showIcon
        icon={<ExclamationCircleOutlined />}
        message={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <Text strong style={{ fontSize: '16px' }}>
                检测到 {eventStats.critical} 个严重安全威胁
              </Text>
              <div style={{ fontSize: '14px', color: 'rgba(0,0,0,0.65)', marginTop: '4px' }}>
                系统正在面临高风险攻击，建议立即采取防护措施
              </div>
            </div>
            <Button type="primary" danger size="large">
              启动应急预案
            </Button>
          </div>
        }
        style={{ 
          marginBottom: '32px', 
          borderRadius: '12px',
          border: 'none',
          background: 'linear-gradient(135deg, rgba(255,77,79,0.1) 0%, rgba(207,19,34,0.05) 100%)',
          boxShadow: '0 4px 20px rgba(255, 77, 79, 0.15)'
        }}
      />
    );
  }

  return (
    <div className="overview-page" style={{ maxWidth: '1600px', margin: '0 auto' }}>
      {/* 顶部警告提示 */}
      {isPaused && (
        <Alert
          message="数据更新已暂停"
          description="当前处于暂停状态，数据不会自动更新"
          type="warning"
          showIcon
          closable
          style={{ 
            marginBottom: '24px', 
            borderRadius: '12px',
            width: '100%'
          }}
        />
      )}

     {/* // 核心指标卡片区域 - 4个卡片大小一致 */}
<div style={{ marginBottom: '32px' }}>
  <Title level={4} style={{ marginBottom: '20px', color: '#1f1f1f' }}>
    核心指标概览
  </Title>
  <Row gutter={[24, 24]} style={{ display: 'flex', flexWrap: 'wrap' }}>
    <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <SystemHealthCard 
            isPaused={isPaused}
            autoRefresh={true}
            refreshInterval={15000}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          />
        </div>
      </div>
    </Col>
    <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TotalLogsCard 
            isPaused={isPaused}
            autoRefresh={true}
            refreshInterval={30000}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          />
        </div>
      </div>
    </Col>
    <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <SecurityEventsCard 
            isPaused={isPaused}
            autoRefresh={true}
            refreshInterval={10000}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          />
        </div>
      </div>
    </Col>
    <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ActiveUsersCard 
            isPaused={isPaused}
            autoRefresh={true}
            refreshInterval={20000}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          />
        </div>
      </div>
    </Col>
  </Row>
</div>

      {/* 图表区域 - 2个图表卡片大小一致 */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={4} style={{ marginBottom: '20px', color: '#1f1f1f' }}>
          实时监控图表
        </Title>
        <Row gutter={[24, 24]} style={{ display: 'flex', flexWrap: 'wrap' }}>
          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📈</span>
                  <Text strong>实时日志流量监控</Text>
                </div>
              }
              extra={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag color="processing">实时更新中</Tag>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {isPaused ? '已暂停' : '自动更新'}
                  </Text>
                </div>
              }
              style={{ 
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
              }}
              bodyStyle={{ 
                padding: 0,
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <RealTimeLogChart 
                  data={realTimeChartData}
                  title="实时日志流量"
                  isPaused={isPaused}
                  refreshInterval={10000}
                  height={280}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🛡️</span>
                  <Text strong>威胁等级分布</Text>
                </div>
              }
              style={{ 
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
              }}
              bodyStyle={{ 
                padding: 0,
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <ThreatDistributionChart 
                  data={threatDistributionData}
                  title="威胁等级分布"
                  height={350}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* 安全事件卡片 - 单独一行 */}
      <div style={{ marginBottom: '32px' }}>
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔍</span>
              <Text strong>最近安全事件</Text>
              <Badge count={eventStats.newEvents} style={{ backgroundColor: '#ff4d4f' }} />
            </div>
          }
          extra={
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {EVENT_LEVELS.map(level => (
                <Button
                  key={level}
                  type={eventFilter === level ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setEventFilter(level as any)}
                  style={{
                    background: eventFilter === level ? LEVEL_COLORS[level] : 'transparent',
                    borderColor: LEVEL_COLORS[level],
                    fontSize: '11px',
                    padding: '0 8px',
                    height: '24px'
                  }}
                >
                  {level === 'ALL' ? '全部' : 
                   level === 'CRITICAL' ? '严重' :
                   level === 'HIGH' ? '高危' :
                   level === 'MEDIUM' ? '中危' : '低危'}
                </Button>
              ))}
            </div>
          }
          style={{ 
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            width: '100%'
          }}
          bodyStyle={{ 
            padding: '16px'
          }}
        >
          <Spin spinning={eventLoading}>
            {events.length > 0 ? (
              <div style={{ 
                height: '400px',
                overflowY: 'auto',
                paddingRight: '8px'
              }}>
                {events
                  .filter(event => eventFilter === 'ALL' || event.level === eventFilter)
                  .slice(0, 15)
                  .map((event, index) => (
                    <div
                      key={event.id}
                      style={{
                        padding: '12px',
                        background: index % 2 === 0 ? '#fafafa' : 'white',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        border: '1px solid #f0f0f0',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: LEVEL_COLORS[event.level] || '#ccc'
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'flex-start'
                          }}>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                              <Text strong style={{ fontSize: '13px' }}>
                                {event.type || '未知类型'}
                              </Text>
                            </div>
                            <Text type="secondary" style={{ 
                              fontSize: '11px', 
                              whiteSpace: 'nowrap',
                              marginLeft: '8px'
                            }}>
                              {new Date(event.timestamp).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </Text>
                          </div>
                          <Paragraph 
                            style={{ 
                              margin: '6px 0 0 0', 
                              fontSize: '12px',
                              lineHeight: 1.4
                            }}
                            ellipsis={{ rows: 2 }}
                          >
                            {event.message}
                          </Paragraph>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '8px'
                          }}>
                            <Tag color={
                              event.status === 'NEW' ? 'red' :
                              event.status === 'INVESTIGATING' ? 'processing' :
                              event.status === 'RESOLVED' ? 'success' : 'default'
                            } size="small" style={{ fontSize: '10px' }}>
                              {event.status === 'NEW' ? '新事件' :
                               event.status === 'INVESTIGATING' ? '调查中' :
                               event.status === 'RESOLVED' ? '已解决' : '状态未知'}
                            </Tag>
                            <Button 
                              type="link" 
                              size="small" 
                              style={{ 
                                padding: 0, 
                                fontSize: '11px',
                                height: 'auto'
                              }}
                            >
                              详情
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 0',
                height: '200px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>
                  📊
                </div>
                <Text type="secondary">暂无安全事件</Text>
              </div>
            )}
          </Spin>
        </Card>
      </div>
    </div>
  );
};

export default OverviewPage;