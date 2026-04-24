import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tag, Space, Button, message, Spin } from 'antd';
import { Pie, Column } from '@ant-design/charts';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  FireOutlined,
  ShieldOutlined,
} from '@ant-design/icons';
import ruleEngineApi, { RuleStatistics } from '@/services/ruleEngineApi';
import './RuleStatisticsDashboard.less';
import { SEVERITY_MAP, getThreatCategory } from '@/utils/enumLabels';

interface RuleStatisticsDashboardProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const RuleStatisticsDashboard: React.FC<RuleStatisticsDashboardProps> = ({
  autoRefresh = false,
  refreshInterval = 60000,
}) => {
  const [statistics, setStatistics] = useState<RuleStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 加载统计数据
  const loadStatistics = async () => {
    setLoading(true);
    try {
      const data = await ruleEngineApi.getStatistics();
      setStatistics(data);
    } catch (error) {
      console.error('加载规则统计失败:', error);
      message.error('加载规则统计失败');
    } finally {
      setLoading(false);
    }
  };

  // 刷新规则缓存
  const handleRefreshRules = async () => {
    setRefreshing(true);
    try {
      const result = await ruleEngineApi.refreshRules();
      message.success(`规则刷新成功，加载了 ${result.rulesLoaded} 条规则`);
      await loadStatistics();
    } catch (error) {
      console.error('刷新规则失败:', error);
      message.error('刷新规则失败');
    } finally {
      setRefreshing(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadStatistics();
  }, []);

  // 自动刷新
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadStatistics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // 格式化时间
  const formatTime = (time: string) => {
    try {
      const date = new Date(time);
      return date.toLocaleString('zh-CN');
    } catch {
      return time;
    }
  };

  // 分类统计图表配置
  const categoryChartConfig = {
    data: statistics
      ? Object.entries(statistics.categoryStats).map(([category, count]) => ({
          category: getThreatCategory(category),
          count,
        }))
      : [],
    angleField: 'count',
    colorField: 'category',
    label: {
      text: 'count',
      style: {
        fontWeight: 'bold',
      },
    },
    legend: {
      color: {
        title: false,
        position: 'right' as const,
        rowPadding: 5,
      },
    },
  };

  // 严重程度统计图表配置
  const severityChartConfig = {
    data: [
      { severity: 'LOW', count: statistics?.severityStats?.LOW || 0, color: '#52c41a' },
      { severity: 'MEDIUM', count: statistics?.severityStats?.MEDIUM || 0, color: '#faad14' },
      { severity: 'HIGH', count: statistics?.severityStats?.HIGH || 0, color: '#ff7a45' },
      { severity: 'CRITICAL', count: statistics?.severityStats?.CRITICAL || 0, color: '#ff4d4f' },
    ],
    xField: 'severity',
    yField: 'count',
    seriesField: 'severity',
    color: ({ severity }: any) => {
      const colorMap: Record<string, string> = {
        LOW: '#52c41a',
        MEDIUM: '#faad14',
        HIGH: '#ff7a45',
        CRITICAL: '#ff4d4f',
      };
      return colorMap[severity] || '#1890ff';
    },
    label: {
      position: 'top' as const,
      style: {
        fill: '#000',
        opacity: 0.6,
      },
    },
    xAxis: {
      label: {
        autoHide: false,
        autoRotate: false,
      },
    },
  };

  return (
    <div className="rule-statistics-dashboard">
      <Spin spinning={loading}>
        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="规则总数"
                value={statistics?.totalRules || 0}
                prefix={<ShieldOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="严重规则"
                value={statistics?.severityStats?.CRITICAL || 0}
                prefix={<FireOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="高危规则"
                value={statistics?.severityStats?.HIGH || 0}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#ff7a45' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="规则分类"
                value={Object.keys(statistics?.categoryStats || {}).length}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 操作栏 */}
        <Card style={{ marginBottom: 16 }}>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadStatistics}
              loading={loading}
            >
              刷新统计
            </Button>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleRefreshRules}
              loading={refreshing}
            >
              刷新规则缓存
            </Button>
            {statistics?.lastLoadTime && (
              <Tag color="blue">
                最后加载: {formatTime(statistics.lastLoadTime)}
              </Tag>
            )}
          </Space>
        </Card>

        {/* 图表区域 */}
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="规则分类分布" bordered={false}>
              {statistics && Object.keys(statistics.categoryStats).length > 0 ? (
                <Pie {...categoryChartConfig} />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                  暂无数据
                </div>
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="规则严重程度分布" bordered={false}>
              {statistics && Object.keys(statistics.severityStats).length > 0 ? (
                <Column {...severityChartConfig} />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                  暂无数据
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 详细统计 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Card title="分类详情" bordered={false}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {statistics &&
                  Object.entries(statistics.categoryStats)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, count]) => (
                      <div
                        key={category}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 0',
                          borderBottom: '1px solid #f0f0f0',
                        }}
                      >
                        <Tag color="blue">{getThreatCategory(category)}</Tag>
                        <span style={{ fontWeight: 'bold' }}>{count} 条</span>
                      </div>
                    ))}
              </Space>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="严重程度详情" bordered={false}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((key) => {
                  const { label, color } = SEVERITY_MAP[key];
                  return (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: '1px solid #f0f0f0',
                      }}
                    >
                      <Tag color={color}>{label}</Tag>
                      <span style={{ fontWeight: 'bold' }}>
                        {statistics?.severityStats?.[key] || 0} 条
                      </span>
                    </div>
                  );
                })}
              </Space>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default RuleStatisticsDashboard;
