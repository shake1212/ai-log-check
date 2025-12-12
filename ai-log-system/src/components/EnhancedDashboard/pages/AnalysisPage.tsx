import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Button, Badge, Progress, List, Empty, Spin } from 'antd';
import { RadarChartOutlined, BugOutlined, DatabaseOutlined, ApiOutlined, DownloadOutlined, SyncOutlined } from '@ant-design/icons';
import { analysisApi } from '@/services/api';
import { SecurityAnalysisItem } from '../types/dashboard';

const { Text, Title, Paragraph } = Typography;

interface AnalysisPageProps {
  isPaused: boolean;
}

const AnalysisPage: React.FC<AnalysisPageProps> = ({ isPaused }) => {
  const [securityAnalysisData, setSecurityAnalysisData] = useState<SecurityAnalysisItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);

  const loadSecurityAnalysisData = useCallback(async () => {
    if (isPaused) return;
    
    setLoading(true);
    try {
      const response = await analysisApi.getSecurityAnalyses();
      const data = response?.data || response || [];
      setSecurityAnalysisData(data as SecurityAnalysisItem[]);
    } catch (error) {
      console.error('加载安全分析数据失败', error);
      // 模拟数据
      setSecurityAnalysisData([
        {
          id: '1',
          category: 'anomaly_detection',
          name: '异常登录检测',
          description: '检测异常登录行为，包括时间、地点、设备异常',
          riskScore: 85,
          findings: ['发现3个异常登录IP', '检测到2个未知设备登录'],
          recommendations: ['加强密码策略', '启用多因素认证'],
          lastRun: new Date().toISOString(),
          nextRun: new Date(Date.now() + 3600000).toISOString(),
          status: 'completed'
        },
        {
          id: '2',
          category: 'threat_hunting',
          name: '内部威胁检测',
          description: '检测内部人员的异常行为和潜在威胁',
          riskScore: 62,
          findings: ['发现1个内部账号异常操作'],
          recommendations: ['加强权限管理', '审计关键操作'],
          lastRun: new Date().toISOString(),
          nextRun: new Date(Date.now() + 7200000).toISOString(),
          status: 'running'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [isPaused]);

  useEffect(() => {
    loadSecurityAnalysisData();
    
    if (!isPaused) {
      const interval = setInterval(loadSecurityAnalysisData, 30000);
      return () => clearInterval(interval);
    }
  }, [loadSecurityAnalysisData, isPaused]);

  const analysisStats = {
    total: securityAnalysisData.length,
    completed: securityAnalysisData.filter(item => item.status === 'completed').length,
    running: securityAnalysisData.filter(item => item.status === 'running').length,
    highRisk: securityAnalysisData.filter(item => item.riskScore >= 80).length,
    avgRiskScore: securityAnalysisData.length > 0 
      ? Math.round(securityAnalysisData.reduce((sum, item) => sum + item.riskScore, 0) / securityAnalysisData.length)
      : 0,
  };

  return (
    <div>
      {/* 分析概览卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <Card hoverable style={{ borderRadius: '12px', textAlign: 'center' }}>
          <Title level={3} style={{ color: '#1890ff', margin: '8px 0' }}>{analysisStats.total}</Title>
          <Text type="secondary">分析任务</Text>
        </Card>
        <Card hoverable style={{ borderRadius: '12px', textAlign: 'center' }}>
          <Title level={3} style={{ color: '#52c41a', margin: '8px 0' }}>{analysisStats.completed}</Title>
          <Text type="secondary">已完成</Text>
        </Card>
        <Card hoverable style={{ borderRadius: '12px', textAlign: 'center' }}>
          <Title level={3} style={{ color: '#fa8c16', margin: '8px 0' }}>{analysisStats.running}</Title>
          <Text type="secondary">进行中</Text>
        </Card>
        <Card hoverable style={{ borderRadius: '12px', textAlign: 'center' }}>
          <Title level={3} style={{ color: '#ff4d4f', margin: '8px 0' }}>{analysisStats.highRisk}</Title>
          <Text type="secondary">高风险</Text>
        </Card>
        <Card hoverable style={{ borderRadius: '12px', textAlign: 'center' }}>
          <Title level={3} style={{ color: '#722ed1', margin: '8px 0' }}>{analysisStats.avgRiskScore}</Title>
          <Text type="secondary">平均风险分</Text>
        </Card>
      </div>

      {/* 分析任务列表 */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RadarChartOutlined />
            <Text strong>安全分析任务</Text>
          </div>
        }
        extra={
          <Button 
            type="primary" 
            icon={<SyncOutlined />} 
            onClick={loadSecurityAnalysisData}
            loading={loading}
          >
            刷新数据
          </Button>
        }
        style={{ marginBottom: '32px', borderRadius: '16px' }}
      >
        <Spin spinning={loading}>
          {securityAnalysisData.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {securityAnalysisData.map((item) => (
                <Card
                  key={item.id}
                  hoverable
                  style={{
                    border: selectedAnalysis === item.id ? '2px solid #1890ff' : undefined,
                    borderRadius: '12px'
                  }}
                  onClick={() => setSelectedAnalysis(item.id === selectedAnalysis ? null : item.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <Text strong>{item.name}</Text>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        {item.category === 'anomaly_detection' ? '异常检测' : 
                         item.category === 'threat_hunting' ? '威胁狩猎' : 
                         item.category === 'risk_assessment' ? '风险评估' : '合规检查'}
                      </div>
                    </div>
                    <Badge 
                      status={
                        item.status === 'completed' ? 'success' :
                        item.status === 'running' ? 'processing' :
                        item.status === 'failed' ? 'error' : 'default'
                      }
                      text={
                        item.status === 'completed' ? '已完成' :
                        item.status === 'running' ? '进行中' :
                        item.status === 'failed' ? '失败' : '待执行'
                      }
                    />
                  </div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <Progress 
                      percent={item.riskScore} 
                      status={item.riskScore >= 80 ? 'exception' : item.riskScore >= 60 ? 'active' : 'normal'}
                      size="small"
                    />
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      风险评分: {item.riskScore}
                    </div>
                  </div>
                  
                  <Paragraph ellipsis={{ rows: 2 }} style={{ fontSize: '13px', marginBottom: '12px' }}>
                    {item.description}
                  </Paragraph>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                    <span>上次运行: {new Date(item.lastRun).toLocaleDateString()}</span>
                    <span>下次运行: {new Date(item.nextRun).toLocaleDateString()}</span>
                  </div>
                  
                  {selectedAnalysis === item.id && (
                    <div style={{ marginTop: '16px', padding: '12px', background: '#f6f6f6', borderRadius: '8px' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <Text strong>发现的问题:</Text>
                        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                          {item.findings.slice(0, 3).map((finding, idx) => (
                            <li key={idx} style={{ fontSize: '12px' }}>{finding}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <Text strong>建议措施:</Text>
                        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                          {item.recommendations.slice(0, 2).map((rec, idx) => (
                            <li key={idx} style={{ fontSize: '12px' }}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Empty description="暂无安全分析数据" />
          )}
        </Spin>
      </Card>

      {/* 运行分析控制台 */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BugOutlined />
            <Text strong>分析控制台</Text>
          </div>
        }
        style={{ borderRadius: '16px' }}
      >
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Button type="primary" icon={<RadarChartOutlined />}>
            运行威胁狩猎
          </Button>
          <Button >
            执行合规扫描
          </Button>
          <Button icon={<DatabaseOutlined />}>
            数据模式分析
          </Button>
          <Button icon={<ApiOutlined />}>
            API安全检测
          </Button>
          <Button style={{ marginLeft: 'auto' }} icon={<DownloadOutlined />}>
            生成分析报告
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AnalysisPage;