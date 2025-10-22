import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  DatePicker,
  Select,
  Input,
  Row,
  Col,
  Statistic,
  Tabs,
  Tag,
  Modal,
  Form,
  message,
  Spin,
  Progress,
  Tooltip,
  Badge,
  Typography,
  Divider
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  ExportOutlined,
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text } = Typography;

// 事件数据接口
interface EventData {
  id: string;
  timestamp: string;
  source: string;
  level: string;
  content: string;
  ipAddress?: string;
  userId?: string;
  action?: string;
  isAnomaly: boolean;
  anomalyScore?: number;
  anomalyReason?: string;
}

// 统计数据接口
interface EventStatistics {
  basic: {
    totalEvents: number;
    totalAlerts: number;
    anomalyEvents: number;
    normalEvents: number;
    anomalyRate: number;
  };
  timeRange: {
    todayEvents: number;
    yesterdayEvents: number;
    thisWeekEvents: number;
    lastWeekEvents: number;
    thisMonthEvents: number;
    lastMonthEvents: number;
  };
  sourceStatistics: Record<string, number>;
  levelStatistics: Record<string, number>;
  anomaly: {
    totalAnomalies: number;
    pendingAlerts: number;
    resolvedAlerts: number;
    falsePositiveAlerts: number;
    averageConfidence: number;
  };
}

// 趋势数据接口
interface TrendData {
  timestamp: string;
  eventCount: number;
  anomalyCount: number;
  anomalyRate: number;
}

const EventsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<EventStatistics | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  // 查询参数
  const [queryParams, setQueryParams] = useState({
    startTime: dayjs().subtract(7, 'day'),
    endTime: dayjs(),
    source: '',
    level: '',
    keyword: '',
    isAnomaly: undefined as boolean | undefined
  });

  // 获取综合统计
  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/events/statistics/comprehensive');
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      message.error('获取统计信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取事件列表
  const fetchEvents = async (params = {}) => {
    try {
      setLoading(true);
      const searchParams = new URLSearchParams({
        page: (pagination.current - 1).toString(),
        size: pagination.pageSize.toString(),
        ...queryParams,
        startTime: queryParams.startTime?.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: queryParams.endTime?.format('YYYY-MM-DDTHH:mm:ss'),
        ...params
      });

      const response = await fetch(`/api/events/search/advanced?${searchParams}`);
      const data = await response.json();
      
      setEvents(data.content || []);
      setPagination(prev => ({
        ...prev,
        total: data.totalElements || 0
      }));
    } catch (error) {
      message.error('获取事件列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取趋势数据
  const fetchTrends = async () => {
    try {
      const params = new URLSearchParams({
        startTime: queryParams.startTime?.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: queryParams.endTime?.format('YYYY-MM-DDTHH:mm:ss'),
        granularity: 'hour'
      });

      const response = await fetch(`/api/events/trends?${params}`);
      const data = await response.json();
      setTrends(data);
    } catch (error) {
      message.error('获取趋势数据失败');
    }
  };

  // 搜索处理
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchEvents();
    fetchTrends();
  };

  // 重置查询
  const handleReset = () => {
    setQueryParams({
      startTime: dayjs().subtract(7, 'day'),
      endTime: dayjs(),
      source: '',
      level: '',
      keyword: '',
      isAnomaly: undefined
    });
  };

  // 表格列定义
  const columns: ColumnsType<EventData> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level) => {
        const colors = {
          INFO: 'blue',
          WARN: 'orange',
          ERROR: 'red',
          DEBUG: 'gray'
        };
        return <Tag color={colors[level as keyof typeof colors]}>{level}</Tag>;
      }
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 120
    },
    {
      title: '用户',
      dataIndex: 'userId',
      key: 'userId',
      width: 100
    },
    {
      title: '异常',
      dataIndex: 'isAnomaly',
      key: 'isAnomaly',
      width: 80,
      render: (isAnomaly, record) => (
        <Space>
          <Badge 
            status={isAnomaly ? 'error' : 'success'} 
            text={isAnomaly ? '异常' : '正常'} 
          />
          {isAnomaly && record.anomalyScore && (
            <Tooltip title={`异常分数: ${record.anomalyScore}`}>
              <Tag color="red">{Math.round(record.anomalyScore * 100)}%</Tag>
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small">详情</Button>
          {record.isAnomaly && (
            <Button type="link" size="small" danger>处理</Button>
          )}
        </Space>
      )
    }
  ];

  // 表格分页处理
  const handleTableChange = (pagination: any) => {
    setPagination(pagination);
    fetchEvents();
  };

  useEffect(() => {
    fetchStatistics();
    fetchEvents();
    fetchTrends();
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>事件查询和统计</Title>
      
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总事件数"
              value={statistics?.basic?.totalEvents || 0}
              prefix={<BarChartOutlined />}
              loading={!statistics}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="异常事件"
              value={statistics?.basic?.anomalyEvents || 0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<InfoCircleOutlined />}
              loading={!statistics}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="异常率"
              value={statistics?.basic?.anomalyRate ? statistics.basic.anomalyRate * 100 : 0}
              precision={2}
              suffix="%"
              valueStyle={{ color: '#cf1322' }}
              loading={!statistics}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理告警"
              value={statistics?.anomaly?.pendingAlerts || 0}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<InfoCircleOutlined />}
              loading={!statistics}
            />
          </Card>
        </Col>
      </Row>

      {/* 查询条件 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Text strong>时间范围：</Text>
            <RangePicker
              value={[queryParams.startTime, queryParams.endTime]}
              onChange={(dates) => {
                setQueryParams(prev => ({
                  ...prev,
                  startTime: dates?.[0],
                  endTime: dates?.[1]
                }));
              }}
              showTime
            />
          </Col>
          <Col span={4}>
            <Text strong>来源：</Text>
            <Select
              placeholder="选择来源"
              value={queryParams.source}
              onChange={(value) => setQueryParams(prev => ({ ...prev, source: value }))}
              allowClear
            >
              <Option value="web-server">Web服务器</Option>
              <Option value="database">数据库</Option>
              <Option value="api-gateway">API网关</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Text strong>级别：</Text>
            <Select
              placeholder="选择级别"
              value={queryParams.level}
              onChange={(value) => setQueryParams(prev => ({ ...prev, level: value }))}
              allowClear
            >
              <Option value="INFO">INFO</Option>
              <Option value="WARN">WARN</Option>
              <Option value="ERROR">ERROR</Option>
              <Option value="DEBUG">DEBUG</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Text strong>异常：</Text>
            <Select
              placeholder="选择类型"
              value={queryParams.isAnomaly}
              onChange={(value) => setQueryParams(prev => ({ ...prev, isAnomaly: value }))}
              allowClear
            >
              <Option value={true}>异常</Option>
              <Option value={false}>正常</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Space>
              <Input
                placeholder="关键字搜索"
                value={queryParams.keyword}
                onChange={(e) => setQueryParams(prev => ({ ...prev, keyword: e.target.value }))}
                onPressEnter={handleSearch}
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主要内容 */}
      <Card>
        <Tabs defaultActiveKey="list">
          <TabPane tab="事件列表" key="list">
            <div style={{ marginBottom: '16px' }}>
              <Space>
                <Button icon={<DownloadOutlined />}>导出</Button>
                <Button icon={<FilterOutlined />}>高级筛选</Button>
                <Button icon={<ReloadOutlined />} onClick={() => fetchEvents()}>
                  刷新
                </Button>
              </Space>
            </div>
            
            <Table
              columns={columns}
              dataSource={events}
              rowKey="id"
              loading={loading}
              pagination={{
                ...pagination,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `第 ${range[0]}-${range[1]} 条/共 ${total} 条`
              }}
              onChange={handleTableChange}
              scroll={{ x: 1200 }}
            />
          </TabPane>
          
          <TabPane tab="统计分析" key="statistics">
            <Row gutter={16}>
              <Col span={12}>
                <Card title="来源统计" size="small" loading={!statistics}>
                  <div style={{ height: '300px' }}>
                    {statistics?.sourceStatistics ? (
                      <div>
                        {Object.entries(statistics.sourceStatistics).map(([source, count]) => (
                          <div key={source} style={{ marginBottom: '8px' }}>
                            <Text strong>{source}:</Text> {count} 条
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div>暂无数据</div>
                    )}
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="级别统计" size="small" loading={!statistics}>
                  <div style={{ height: '300px' }}>
                    {statistics?.levelStatistics ? (
                      <div>
                        {Object.entries(statistics.levelStatistics).map(([level, count]) => (
                          <div key={level} style={{ marginBottom: '8px' }}>
                            <Tag color={level === 'ERROR' ? 'red' : level === 'WARN' ? 'orange' : 'blue'}>
                              {level}
                            </Tag>
                            <Text strong>{count}</Text> 条
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div>暂无数据</div>
                    )}
                  </div>
                </Card>
              </Col>
            </Row>
          </TabPane>
          
          <TabPane tab="趋势分析" key="trends">
            <Card title="事件趋势" loading={!trends || trends.length === 0}>
              <div style={{ height: '400px' }}>
                {trends && trends.length > 0 ? (
                  <div>
                    <div style={{ marginBottom: '16px' }}>
                      <Text strong>最近 {trends.length} 个时间点的趋势数据：</Text>
                    </div>
                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                      {trends.map((trend, index) => (
                        <div key={index} style={{ 
                          marginBottom: '8px', 
                          padding: '8px', 
                          border: '1px solid #f0f0f0',
                          borderRadius: '4px'
                        }}>
                          <Row gutter={16}>
                            <Col span={6}>
                              <Text type="secondary">
                                {dayjs(trend.timestamp).format('MM-DD HH:mm')}
                              </Text>
                            </Col>
                            <Col span={6}>
                              <Text>事件: {trend.eventCount}</Text>
                            </Col>
                            <Col span={6}>
                              <Text type="danger">异常: {trend.anomalyCount}</Text>
                            </Col>
                            <Col span={6}>
                              <Text type="warning">
                                异常率: {(trend.anomalyRate * 100).toFixed(2)}%
                              </Text>
                            </Col>
                          </Row>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#999'
                  }}>
                    暂无趋势数据
                  </div>
                )}
              </div>
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default EventsPage;
