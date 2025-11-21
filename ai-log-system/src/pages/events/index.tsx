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
  Divider,
  Descriptions
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
  InfoCircleOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  RiseOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;

// 修正的事件数据接口 - 根据实际数据库字段调整
interface EventData {
  id: number;
  timestamp: string;
  eventType: string;        // 对应 event_type
  severity: string;         // 对应 severity
  level?: string;           // 对应 level
  normalizedMessage?: string; // 对应 normalized_message
  rawMessage?: string;      // 对应 raw_message
  sourceIp?: string;        // 对应 source_ip
  userId?: string;          // 对应 user_id
  userName?: string;        // 对应 user_name
  isAnomaly: boolean;       // 对应 is_anomaly
  anomalyScore?: number;    // 对应 anomaly_score
  anomalyReason?: string;   // 对应 anomaly_reason
  status?: string;          // 对应 status
  sourceSystem?: string;    // 对应 source_system
  hostName?: string;        // 对应 host_name
  // 添加可能存在的其他字段
  description?: string;     // 可能对应 normalized_message 或 raw_message
}

// 查询参数接口
interface QueryParams {
  startTime: dayjs.Dayjs;
  endTime: dayjs.Dayjs;
  eventType: string;
  severity: string;
  keyword: string;
  isAnomaly: boolean | undefined;
}

// 统计数据接口 - 简化版本，根据实际返回调整
interface EventStatistics {
  totalEvents?: number;
  anomalyEvents?: number;
  normalEvents?: number;
  anomalyRate?: number;
  todayEvents?: number;
  yesterdayEvents?: number;
  thisWeekEvents?: number;
  lastWeekEvents?: number;
  thisMonthEvents?: number;
  lastMonthEvents?: number;
  sourceStatistics?: Record<string, number>;
  levelStatistics?: Record<string, number>;
  // 基本统计字段
  basic?: {
    totalEvents: number;
    totalAlerts: number;
    anomalyEvents: number;
    normalEvents: number;
    anomalyRate: number;
  };
  anomaly?: {
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
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [statistics, setStatistics] = useState<EventStatistics | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [searchForm] = Form.useForm();

  // 带超时的 Promise 包装函数
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('请求超时')), timeoutMs)
      )
    ]);
  };

  // 查询参数
  const [queryParams, setQueryParams] = useState<QueryParams>({
    startTime: dayjs().subtract(7, 'day'),
    endTime: dayjs(),
    eventType: '',
    severity: '',
    keyword: '',
    isAnomaly: undefined
  });

  // 获取统计信息 - 使用正确的API路径，添加超时处理
  const fetchStatistics = async () => {
    try {
      setStatisticsLoading(true);
      const params = new URLSearchParams({
        startTime: queryParams.startTime.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: queryParams.endTime.format('YYYY-MM-DDTHH:mm:ss'),
      });

      const response = await withTimeout(
        fetch(`/api/events/statistics?${params}`),
        8000
      );
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      } else {
        console.error('统计API响应失败:', response.status, response.statusText);
        // 不显示错误消息，因为统计信息不是主要功能
      }
    } catch (error) {
      console.error('获取统计信息错误:', error);
      // 静默失败，不影响主要功能
    } finally {
      setStatisticsLoading(false);
    }
  };

  // 获取事件列表 - 使用POST请求，添加错误处理和超时
  const fetchEvents = async (page = pagination.current, pageSize = pagination.pageSize) => {
    try {
      setLoading(true);
      
      const queryDTO = {
        page: page - 1, // 后端从0开始
        size: pageSize,
        startTime: queryParams.startTime.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: queryParams.endTime.format('YYYY-MM-DDTHH:mm:ss'),
        eventType: queryParams.eventType || undefined,
        severity: queryParams.severity || undefined,
        keyword: queryParams.keyword || undefined,
        isAnomaly: queryParams.isAnomaly
      };

      // 清理undefined值
      Object.keys(queryDTO).forEach(key => {
        if (queryDTO[key as keyof typeof queryDTO] === undefined) {
          delete queryDTO[key as keyof typeof queryDTO];
        }
      });

      const response = await withTimeout(
        fetch('/api/events/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(queryDTO)
        }),
        10000 // 10秒超时
      );

      if (response.ok) {
        const data = await response.json();
        setEvents(data.content || data || []); // 兼容不同返回格式
        setPagination(prev => ({
          ...prev,
          current: page,
          pageSize,
          total: data.totalElements || data.total || 0
        }));
      } else {
        console.error('事件搜索API响应失败:', response.status, response.statusText);
        message.error('获取事件列表失败');
      }
    } catch (error) {
      console.error('获取事件列表错误:', error);
      message.error('获取事件列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取趋势数据 - 使用正确的API路径，添加超时处理
  const fetchTrends = async () => {
    try {
      const params = new URLSearchParams({
        startTime: queryParams.startTime.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: queryParams.endTime.format('YYYY-MM-DDTHH:mm:ss'),
      });

      const response = await withTimeout(
        fetch(`/api/events/statistics/timeseries?${params}`),
        8000
      );
      if (response.ok) {
        const data = await response.json();
        setTrends(data);
      } else {
        console.error('趋势数据API响应失败:', response.status, response.statusText);
        // 不显示错误消息，因为趋势数据不是主要功能
      }
    } catch (error) {
      console.error('获取趋势数据错误:', error);
      // 静默失败，不影响主要功能
    }
  };

  // 获取最近事件（备用方案）
  const fetchRecentEvents = async () => {
    try {
      const response = await fetch('/api/events/recent?limit=50');
      if (response.ok) {
        const data = await response.json();
        setEvents(data || []);
        setPagination(prev => ({
          ...prev,
          total: data.length || 0
        }));
      }
    } catch (error) {
      console.error('获取最近事件错误:', error);
    }
  };

  // 手动触发日志收集
  const triggerLogCollection = async () => {
    try {
      const response = await fetch('/api/events/collect', {
        method: 'POST'
      });
      if (response.ok) {
        message.success('日志收集任务已启动');
      } else {
        message.error('触发日志收集失败');
      }
    } catch (error) {
      message.error('触发日志收集失败');
    }
  };

  // 清理旧数据
  const cleanupOldEvents = async () => {
    try {
      const response = await fetch('/api/events/cleanup?daysToKeep=30', {
        method: 'POST'
      });
      if (response.ok) {
        message.success('已清理30天前的旧数据');
      } else {
        message.error('清理旧数据失败');
      }
    } catch (error) {
      message.error('清理旧数据失败');
    }
  };

  // 更新事件状态
  const updateEventStatus = async (id: number, status: string) => {
    try {
      const response = await fetch(`/api/events/${id}/status?status=${status}`, {
        method: 'PUT'
      });
      if (response.ok) {
        message.success('事件状态更新成功');
        fetchEvents(); // 刷新列表
      } else {
        message.error('更新事件状态失败');
      }
    } catch (error) {
      message.error('更新事件状态失败');
    }
  };

  // 搜索处理
  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    setQueryParams(prev => ({
      ...prev,
      startTime: values.timeRange?.[0] || prev.startTime,
      endTime: values.timeRange?.[1] || prev.endTime,
      eventType: values.eventType || '',
      severity: values.severity || '',
      keyword: values.keyword || '',
      isAnomaly: values.isAnomaly
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchEvents(1);
    fetchTrends();
    fetchStatistics();
  };

  // 重置查询
  const handleReset = () => {
    searchForm.resetFields();
    setQueryParams({
      startTime: dayjs().subtract(7, 'day'),
      endTime: dayjs(),
      eventType: '',
      severity: '',
      keyword: '',
      isAnomaly: undefined
    });
  };

  // 获取显示文本 - 处理可能的空值
  const getDisplayText = (text: string | undefined): string => {
    return text || '-';
  };

  const formatJsonContent = (content: any): string => {
    if (!content) {
      return '-';
    }
    if (typeof content === 'string') {
      try {
        return JSON.stringify(JSON.parse(content), null, 2);
      } catch {
        return content;
      }
    }
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  };

  // 表格列定义 - 根据实际字段调整
  const columns: ColumnsType<EventData> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '事件类型',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 150,
      render: (text) => <Tag color="blue">{getDisplayText(text)}</Tag>
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity) => {
        const colors = {
          LOW: 'green',
          MEDIUM: 'orange',
          HIGH: 'red',
          CRITICAL: 'purple',
          INFO: 'blue',
          WARN: 'orange',
          ERROR: 'red',
          DEBUG: 'gray'
        };
        return <Tag color={colors[severity as keyof typeof colors] || 'default'}>
          {getDisplayText(severity)}
        </Tag>;
      }
    },
    {
      title: '描述',
      dataIndex: 'normalizedMessage',
      key: 'normalizedMessage',
      ellipsis: true,
      render: (text, record) => getDisplayText(text || record.rawMessage || record.description)
    },
    {
      title: '源IP',
      dataIndex: 'sourceIp',
      key: 'sourceIp',
      width: 120,
      render: (text) => getDisplayText(text)
    },
    {
      title: '用户',
      dataIndex: 'userId',
      key: 'userId',
      width: 100,
      render: (text) => getDisplayText(text)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusColors = {
          OPEN: 'red',
          IN_PROGRESS: 'orange',
          RESOLVED: 'green',
          CLOSED: 'gray'
        };
        return <Tag color={statusColors[status as keyof typeof statusColors] || 'default'}>
          {getDisplayText(status)}
        </Tag>;
      }
    },
    {
      title: '异常',
      dataIndex: 'isAnomaly',
      key: 'isAnomaly',
      width: 100,
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
      width: 180,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => showEventDetail(record)}>详情</Button>
          {record.isAnomaly && record.status !== 'RESOLVED' && (
            <Button 
              type="link" 
              size="small" 
              danger
              onClick={() => updateEventStatus(record.id, 'RESOLVED')}
            >
              标记为已处理
            </Button>
          )}
        </Space>
      )
    }
  ];

  // 表格分页处理
  const handleTableChange = (newPagination: any) => {
    setPagination(newPagination);
    fetchEvents(newPagination.current, newPagination.pageSize);
  };

  // 初始化数据 - 优化加载策略
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // 设置表单初始值
        searchForm.setFieldsValue({
          timeRange: [queryParams.startTime, queryParams.endTime],
          eventType: queryParams.eventType,
          severity: queryParams.severity,
          keyword: queryParams.keyword,
          isAnomaly: queryParams.isAnomaly
        });

        // 第一阶段：优先加载主要数据（事件列表）
        await fetchEvents();
        
        // 设置加载完成，让用户先看到事件列表
        setLoading(false);

        // 第二阶段：延迟加载统计和趋势数据（非关键数据）
        setTimeout(async () => {
          try {
            await Promise.allSettled([
              fetchStatistics(),
              fetchTrends()
            ]);
          } catch (error) {
            console.error('加载统计或趋势数据失败:', error);
            // 不影响主要功能，静默失败
          }
        }, 300); // 延迟300ms加载，避免阻塞初始渲染
      } catch (error) {
        console.error('初始化数据错误:', error);
        // 如果主要API失败，尝试获取最近事件
        try {
          await fetchRecentEvents();
        } catch (e) {
          console.error('获取最近事件也失败:', e);
        } finally {
          setLoading(false);
        }
      }
    };

    initData();
  }, []);

  // 计算统计显示值
  const getStatisticValue = (value: number | undefined): number => {
    return value || 0;
  };

  const getAnomalyRate = (): number => {
    if (statistics?.anomalyRate) return statistics.anomalyRate * 100;
    if (statistics?.basic?.anomalyRate) return statistics.basic.anomalyRate * 100;
    return 0;
  };

  // 添加显示事件详情的函数
  const showEventDetail = async (record: EventData) => {
    try {
      const response = await fetch(`/api/events/${record.id}`);
      if (response.ok) {
        const eventData = await response.json();
        Modal.info({
          title: '事件详情',
          width: '60%',
          content: (
            <div>
              <Descriptions column={1} bordered>
                <Descriptions.Item label="ID">{eventData.id}</Descriptions.Item>
                <Descriptions.Item label="时间">{eventData.timestamp ? dayjs(eventData.timestamp).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
                <Descriptions.Item label="事件类型">{getDisplayText(eventData.eventType)}</Descriptions.Item>
                <Descriptions.Item label="严重程度">{getDisplayText(eventData.severity)}</Descriptions.Item>
                <Descriptions.Item label="标准化消息">{getDisplayText(eventData.normalizedMessage)}</Descriptions.Item>
                <Descriptions.Item label="原始消息">{getDisplayText(eventData.rawMessage)}</Descriptions.Item>
                <Descriptions.Item label="源IP">{getDisplayText(eventData.sourceIp)}</Descriptions.Item>
                <Descriptions.Item label="用户ID">{getDisplayText(eventData.userId)}</Descriptions.Item>
                <Descriptions.Item label="用户名">{getDisplayText(eventData.userName)}</Descriptions.Item>
                <Descriptions.Item label="主机名">{getDisplayText(eventData.hostName)}</Descriptions.Item>
                <Descriptions.Item label="状态">{getDisplayText(eventData.status)}</Descriptions.Item>
                <Descriptions.Item label="是否异常">{eventData.isAnomaly ? '是' : '否'}</Descriptions.Item>
                {eventData.isAnomaly && (
                  <>
                    <Descriptions.Item label="异常分数">{eventData.anomalyScore}</Descriptions.Item>
                    <Descriptions.Item label="异常原因">{getDisplayText(eventData.anomalyReason)}</Descriptions.Item>
                  </>
                )}
                <Descriptions.Item label="创建时间">{eventData.createdAt ? dayjs(eventData.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{eventData.updatedAt ? dayjs(eventData.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
              </Descriptions>
                {(eventData.rawData || eventData.eventData) && (
                  <>
                    <Divider>原始数据</Divider>
                    <Paragraph style={{ maxHeight: 320, overflow: 'auto', background: '#f6f8fa', padding: 12 }}>
                      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                        {formatJsonContent(eventData.rawData || eventData.eventData)}
                      </pre>
                    </Paragraph>
                  </>
                )}
            </div>
          ),
          onOk() {},
        });
      } else {
        message.error('获取事件详情失败');
      }
    } catch (error) {
      console.error('获取事件详情错误:', error);
      message.error('获取事件详情失败');
    }
  };

  return (
    <div style={{ padding: '24px', minHeight: 'calc(100vh - 200px)', overflow: 'visible' }}>
      <Title level={2}>安全事件查询和统计</Title>
      
      {/* 主要内容 */}
      <Card>
        <Tabs defaultActiveKey="events" items={[
          {
            key: 'events',
            label: '事件列表',
            children: (
              <div>
                {/* 搜索和过滤区域 */}
                <Card style={{ marginBottom: '24px' }}>
                  <Form form={searchForm} layout="vertical">
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item label="时间范围" name="timeRange">
                          <RangePicker 
                            showTime 
                            format="YYYY-MM-DD HH:mm:ss"
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item label="事件类型" name="eventType">
                          <Select allowClear placeholder="请选择事件类型">
                            <Option value="LOGIN_SUCCESS">登录成功</Option>
                            <Option value="LOGIN_FAILURE">登录失败</Option>
                            <Option value="PROCESS_CREATION">进程创建</Option>
                            <Option value="NETWORK_CONNECTION">网络连接</Option>
                            <Option value="FILE_OPERATION">文件操作</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item label="严重程度" name="severity">
                          <Select allowClear placeholder="请选择严重程度">
                            <Option value="LOW">低</Option>
                            <Option value="MEDIUM">中</Option>
                            <Option value="HIGH">高</Option>
                            <Option value="CRITICAL">严重</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item label="关键字" name="keyword">
                          <Input placeholder="请输入关键字" />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item label="&nbsp;">
                          <Space>
                            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                              搜索
                            </Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>
                              重置
                            </Button>
                          </Space>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Card>
                
                {/* 操作按钮区域 */}
                <div style={{ marginBottom: '16px' }}>
                  <Space>
                    <Button 
                      icon={<ReloadOutlined />}
                      onClick={() => fetchEvents(pagination.current, pagination.pageSize)}
                    >
                      刷新
                    </Button>
                    <Button 
                      icon={<FilterOutlined />}
                      onClick={triggerLogCollection}
                    >
                      手动收集日志
                    </Button>
                    <Button 
                      danger
                      onClick={cleanupOldEvents}
                    >
                      清理旧数据
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
                  locale={{ emptyText: '暂无数据' }}
                />
              </div>
            )
          },
          {
            key: 'statistics',
            label: '统计分析',
            children: (
              <div>
                {/* 统计卡片 */}
                <Row gutter={16} style={{ marginBottom: '24px' }}>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="总事件数"
                        value={getStatisticValue(statistics?.totalEvents || statistics?.basic?.totalEvents)}
                        prefix={<ThunderboltOutlined />}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="异常事件"
                        value={getStatisticValue(statistics?.anomalyEvents || statistics?.basic?.anomalyEvents)}
                        prefix={<WarningOutlined />}
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="正常事件"
                        value={getStatisticValue(statistics?.normalEvents || statistics?.basic?.normalEvents)}
                        prefix={<CheckCircleOutlined />}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="异常率"
                        value={getAnomalyRate()}
                        prefix={<RiseOutlined />}
                        suffix="%"
                        valueStyle={{ color: getAnomalyRate() > 10 ? '#ff4d4f' : '#1890ff' }}
                      />
                    </Card>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Card title="来源统计" size="small" loading={loading && !statistics}>
                      <div style={{ minHeight: '300px', overflowY: 'auto' }}>
                        {statistics?.sourceStatistics ? (
                          <div>
                            {Object.entries(statistics.sourceStatistics).map(([source, count]) => (
                              <div key={source} style={{ marginBottom: '8px' }}>
                                <Text strong>{source}:</Text> {count} 条
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ 
                            height: '100%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: '#999'
                          }}>
                            暂无来源统计数据
                          </div>
                        )}
                      </div>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="级别统计" size="small" loading={loading && !statistics}>
                      <div style={{ minHeight: '300px', overflowY: 'auto' }}>
                        {statistics?.levelStatistics ? (
                          <div>
                            {Object.entries(statistics.levelStatistics).map(([level, count]) => (
                              <div key={level} style={{ marginBottom: '8px' }}>
                                <Tag color={
                                  level === 'CRITICAL' ? 'purple' : 
                                  level === 'HIGH' ? 'red' : 
                                  level === 'MEDIUM' ? 'orange' : 
                                  level === 'LOW' ? 'green' : 'blue'
                                }>
                                  {level}
                                </Tag>
                                <Text strong>{count}</Text> 条
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ 
                            height: '100%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: '#999'
                          }}>
                            暂无级别统计数据
                          </div>
                        )}
                      </div>
                    </Card>
                  </Col>
                </Row>
              </div>
            )
          },
          {
            key: 'trends',
            label: '趋势分析',
            children: (
              <Card title="事件趋势" loading={loading && trends.length === 0}>
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
            )
          }
        ]} />
      </Card>
    </div>
  );
};

export default EventsPage;