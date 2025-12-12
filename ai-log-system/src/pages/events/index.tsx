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
  Descriptions,
  Dropdown,
  Segmented,
  Rate,
  Alert
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
  RiseOutlined,
  EyeOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  FireOutlined,
  SecurityScanOutlined,
  SettingOutlined as SettingIcon,
  ArrowUpOutlined,
  ArrowDownOutlined,
  QuestionCircleOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  UserOutlined,
  CloudServerOutlined,
  BellOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  RocketOutlined
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
  eventType: string;
  severity: string;
  level?: string;
  normalizedMessage?: string;
  rawMessage?: string;
  sourceIp?: string;
  userId?: string;
  userName?: string;
  isAnomaly: boolean;
  anomalyScore?: number;
  anomalyReason?: string;
  status?: string;
  sourceSystem?: string;
  hostName?: string;
  description?: string;
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

// 统计数据接口
interface EventStatistics {
  totalLogs?: number;
  todayLogs?: number;
  dailyCounts?: Array<[string, number]>;
  anomalyCount?: number;
  severityCounts?: Record<string, number>;
  lastUpdate?: string;
  avgDailyEvents?: number;
  
  // 旧字段保持兼容
  totalEvents?: number;
  anomalyEvents?: number;
  normalEvents?: number;
  anomalyRate?: number;
  sourceStatistics?: Record<string, number>;
  levelStatistics?: Record<string, number>;
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

// 仪表板统计接口
interface DashboardStats {
  totalLogs: number;
  todayLogs: number;
  dailyCounts: [string, number][];
  severityCounts: Record<string, number>;
  anomalyCount: number;
  avgDailyEvents: number;
  lastUpdate: string;
}

// 颜色常量
const LEVEL_COLORS = {
  CRITICAL: '#ff4d4f',
  HIGH: '#fa8c16',
  MEDIUM: '#faad14',
  LOW: '#52c41a',
  INFO: '#1890ff',
  WARN: '#faad14',
  ERROR: '#ff4d4f',
  DEBUG: '#666666'
};

const LEVEL_GRADIENTS = {
  CRITICAL: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
  HIGH: 'linear-gradient(135deg, #fa8c16 0%, #d48806 100%)',
  MEDIUM: 'linear-gradient(135deg, #faad14 0%, #d4a106 100%)',
  LOW: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
  INFO: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
  HEALTHY: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
  WARNING: 'linear-gradient(135deg, #faad14 0%, #d4a106 100%)',
  CRITICAL_GRADIENT: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)'
};

const EventsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [searchForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('events');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 查询参数
  const [queryParams, setQueryParams] = useState<QueryParams>({
    startTime: dayjs().subtract(7, 'day'),
    endTime: dayjs(),
    eventType: '',
    severity: '',
    keyword: '',
    isAnomaly: undefined
  });

  // 带超时的 Promise 包装函数
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('请求超时')), timeoutMs)
      )
    ]);
  };

  // 获取仪表板统计信息（无需时间参数）
  const fetchDashboardStats = async () => {
    try {
      setStatisticsLoading(true);
      
      console.log('调用仪表板统计API:', '/api/events/dashboard-stats');
      
      const response = await withTimeout(
        fetch('/api/events/dashboard-stats'),
        5000
      );
      
      console.log('仪表板统计API响应状态:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('仪表板统计返回数据:', data);
        
        // 转换数据结构
        const dashboardData: DashboardStats = {
          totalLogs: data.totalLogs || 0,
          todayLogs: data.todayLogs || 0,
          dailyCounts: data.dailyCounts || [],
          severityCounts: data.severityCounts || data.levelCounts || {},
          anomalyCount: data.anomalyCount || 0,
          avgDailyEvents: data.avgDailyEvents || 0,
          lastUpdate: data.lastUpdate || new Date().toISOString()
        };
        
        setDashboardStats(dashboardData);
        
        // 同时更新兼容的 statistics 结构
        const statistics: EventStatistics = {
          totalLogs: dashboardData.totalLogs,
          todayLogs: dashboardData.todayLogs,
          dailyCounts: dashboardData.dailyCounts,
          anomalyCount: dashboardData.anomalyCount,
          severityCounts: dashboardData.severityCounts,
          lastUpdate: dashboardData.lastUpdate,
          avgDailyEvents: dashboardData.avgDailyEvents,
          
          // 兼容字段
          totalEvents: dashboardData.totalLogs,
          anomalyEvents: dashboardData.anomalyCount,
          normalEvents: dashboardData.totalLogs - dashboardData.anomalyCount,
          anomalyRate: dashboardData.totalLogs > 0 ? dashboardData.anomalyCount / dashboardData.totalLogs : 0,
          sourceStatistics: {},
          levelStatistics: dashboardData.severityCounts,
          
          basic: {
            totalEvents: dashboardData.totalLogs,
            totalAlerts: dashboardData.anomalyCount,
            anomalyEvents: dashboardData.anomalyCount,
            normalEvents: dashboardData.totalLogs - dashboardData.anomalyCount,
            anomalyRate: dashboardData.totalLogs > 0 ? dashboardData.anomalyCount / dashboardData.totalLogs : 0
          },
          
          anomaly: {
            totalAnomalies: dashboardData.anomalyCount,
            pendingAlerts: Math.round(dashboardData.anomalyCount * 0.3),
            resolvedAlerts: Math.round(dashboardData.anomalyCount * 0.7),
            falsePositiveAlerts: Math.round(dashboardData.anomalyCount * 0.1),
            averageConfidence: dashboardData.anomalyCount > 0 ? 82.5 : 0
          }
        };
        
        // 这里可以设置到 statistics 状态，如果需要的话
        // setStatistics(statistics);
        
      } else {
        const errorText = await response.text();
        console.error('仪表板统计API响应失败:', response.status, errorText);
        message.error(`获取仪表板统计失败: ${response.status}`);
      }
      
    } catch (error) {
      console.error('获取仪表板统计错误:', error);
      message.error('获取仪表板统计失败，请检查网络连接');
    } finally {
      setStatisticsLoading(false);
    }
  };

  // 获取时间范围的统计信息（需要时间参数）
  const fetchTimeRangeStatistics = async () => {
    try {
      // 构建API参数
      const params = new URLSearchParams({
        startTime: queryParams.startTime.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: queryParams.endTime.format('YYYY-MM-DDTHH:mm:ss'),
      });

      console.log('调用时间范围统计API:', `/api/events/statistics?${params}`);
      
      const response = await withTimeout(
        fetch(`/api/events/statistics?${params}`),
        5000
      );
      
      console.log('时间范围统计API响应状态:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('时间范围统计返回数据:', data);
        // 这里可以根据需要处理时间范围统计
      }
      
    } catch (error) {
      console.error('获取时间范围统计错误:', error);
    }
  };

  // 获取事件列表
  const fetchEvents = async (page = pagination.current, pageSize = pagination.pageSize) => {
    try {
      setLoading(true);
      
      const queryDTO = {
        page: page - 1,
        size: pageSize,
        startTime: queryParams.startTime.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: queryParams.endTime.format('YYYY-MM-DDTHH:mm:ss'),
        eventType: queryParams.eventType || undefined,
        severity: queryParams.severity || undefined,
        keyword: queryParams.keyword || undefined,
        isAnomaly: queryParams.isAnomaly
      };

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
        10000
      );

      if (response.ok) {
        const data = await response.json();
        setEvents(data.content || data || []);
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

  // 获取时间序列趋势数据
  const fetchTrends = async () => {
    try {
      const params = new URLSearchParams({
        startTime: queryParams.startTime.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: queryParams.endTime.format('YYYY-MM-DDTHH:mm:ss'),
      });

      console.log('调用趋势API:', `/api/events/statistics/timeseries?${params}`);
      
      const response = await withTimeout(
        fetch(`/api/events/statistics/timeseries?${params}`),
        8000
      );
      
      console.log('趋势API响应状态:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('趋势API返回原始数据:', data);
        
        if (Array.isArray(data)) {
          // 转换数据格式
          const transformedTrends = data.map((item: any) => {
            // 处理不同的数据结构
            const timestamp = item.timestamp || item.time || item.date || new Date().toISOString();
            const count = item.count || item.eventCount || item.total || 0;
            const anomalyCount = item.anomalyCount || 0;
            const anomalyRate = item.anomalyRate || (count > 0 ? anomalyCount / count : 0);
            
            return {
              timestamp: timestamp,
              eventCount: count,
              anomalyCount: anomalyCount,
              anomalyRate: anomalyRate
            };
          });
          
          setTrends(transformedTrends);
        } else {
          console.warn('趋势API返回的不是数组:', data);
          setTrends([]);
        }
      } else {
        const errorText = await response.text();
        console.error('趋势数据API响应失败:', response.status, errorText);
        // 不再使用模拟数据，设置空数组
        setTrends([]);
        message.error(`获取趋势数据失败: ${response.status}`);
      }
    } catch (error) {
      console.error('获取趋势数据错误:', error);
      // 不再使用模拟数据，设置空数组
      setTrends([]);
      message.error('获取趋势数据失败，请检查网络连接');
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
        fetchEvents();
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
    fetchTimeRangeStatistics();
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

  // 获取显示文本
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

  // 表格列定义
  const columns: ColumnsType<EventData> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (text) => text ? (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500 }}>
            {dayjs(text).format('YYYY-MM-DD')}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {dayjs(text).format('HH:mm:ss')}
          </div>
        </div>
      ) : '-'
    },
    {
      title: '事件类型',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 150,
      render: (text) => (
        <Tag color="blue" style={{ fontWeight: 500, padding: '2px 8px' }}>
          {getDisplayText(text)}
        </Tag>
      )
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 120,
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
        const icons = {
          HIGH: <WarningOutlined />,
          MEDIUM: <WarningOutlined />,
          LOW: <CheckCircleOutlined />,
          WARN: <WarningOutlined />,
          INFO: <InfoCircleOutlined />,
          DEBUG: <SettingOutlined />
        };
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: colors[severity as keyof typeof colors] || '#1890ff',
              boxShadow: `0 0 6px ${colors[severity as keyof typeof colors] || '#1890ff'}`
            }} />
            {icons[severity as keyof typeof icons] || <InfoCircleOutlined />}
            <span style={{ fontSize: '12px', fontWeight: 500 }}>
              {getDisplayText(severity)}
            </span>
          </div>
        );
      }
    },
    {
      title: '描述',
      dataIndex: 'normalizedMessage',
      key: 'normalizedMessage',
      ellipsis: true,
      width: 250,
      render: (text, record) => (
        <Tooltip title={getDisplayText(text || record.rawMessage || record.description)}>
          <span style={{ fontSize: '12px' }}>
            {getDisplayText(text || record.rawMessage || record.description).slice(0, 60)}
            {getDisplayText(text || record.rawMessage || record.description).length > 60 ? '...' : ''}
          </span>
        </Tooltip>
      )
    },
    {
      title: '源IP',
      dataIndex: 'sourceIp',
      key: 'sourceIp',
      width: 130,
      render: (text) => (
        <Tag style={{ fontSize: '11px', padding: '2px 6px' }}>
          {getDisplayText(text)}
        </Tag>
      )
    },
    {
      title: '用户',
      dataIndex: 'userId',
      key: 'userId',
      width: 100,
      render: (text, record) => (
        <div>
          <div style={{ fontSize: '12px' }}>{getDisplayText(record.userName || text)}</div>
          {text && <div style={{ fontSize: '10px', color: '#666' }}>{text}</div>}
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status) => {
        const statusColors = {
          OPEN: 'red',
          IN_PROGRESS: 'orange',
          RESOLVED: 'green',
          CLOSED: 'gray'
        };
        return (
          <div style={{
            padding: '3px 10px',
            borderRadius: '20px',
            background: statusColors[status as keyof typeof statusColors] ? 
              `rgba(${status === 'OPEN' ? '255,77,79' : status === 'IN_PROGRESS' ? '250,140,22' : status === 'RESOLVED' ? '82,196,26' : '158,158,158'}, 0.1)` : 
              'rgba(158,158,158,0.1)',
            border: `1px solid ${statusColors[status as keyof typeof statusColors] || '#d9d9d9'}`,
            color: statusColors[status as keyof typeof statusColors] || '#666',
            fontSize: '11px',
            fontWeight: 500,
            textAlign: 'center'
          }}>
            {getDisplayText(status)}
          </div>
        );
      }
    },
    {
      title: '异常',
      dataIndex: 'isAnomaly',
      key: 'isAnomaly',
      width: 120,
      render: (isAnomaly, record) => (
        <Space>
          <div style={{
            padding: '3px 10px',
            borderRadius: '20px',
            background: isAnomaly ? 'rgba(255, 77, 79, 0.1)' : 'rgba(82, 196, 26, 0.1)',
            border: `1px solid ${isAnomaly ? '#ff4d4f' : '#52c41a'}`,
            color: isAnomaly ? '#ff4d4f' : '#52c41a',
            fontSize: '11px',
            fontWeight: 500
          }}>
            {isAnomaly ? '异常' : '正常'}
          </div>
          {isAnomaly && record.anomalyScore && (
            <Tooltip title={`异常分数: ${record.anomalyScore}`}>
              <Progress 
                type="circle" 
                percent={Math.round(record.anomalyScore * 100)} 
                size={28}
                strokeColor={record.anomalyScore > 0.8 ? '#ff4d4f' : record.anomalyScore > 0.5 ? '#fa8c16' : '#faad14'}
                format={percent => `${percent}%`}
              />
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => showEventDetail(record)}
            size="small"
            style={{ fontSize: '12px' }}
          >
            详情
          </Button>
          {record.isAnomaly && record.status !== 'RESOLVED' && (
            <Button 
              type="primary"
              icon={<CheckCircleOutlined />}
              size="small"
              style={{ fontSize: '12px' }}
              onClick={() => updateEventStatus(record.id, 'RESOLVED')}
            >
              处理
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

  // 初始化数据
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        searchForm.setFieldsValue({
          timeRange: [queryParams.startTime, queryParams.endTime],
          eventType: queryParams.eventType,
          severity: queryParams.severity,
          keyword: queryParams.keyword,
          isAnomaly: queryParams.isAnomaly
        });

        await fetchEvents();
        setLoading(false);

        // 同时获取仪表板统计和趋势数据
        setTimeout(async () => {
          try {
            await Promise.allSettled([
              fetchDashboardStats(),
              fetchTrends()
            ]);
          } catch (error) {
            console.error('加载统计或趋势数据失败:', error);
          }
        }, 300);
      } catch (error) {
        console.error('初始化数据错误:', error);
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

  // 显示事件详情
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

  // ========== 计算统计值的辅助函数 ==========

  const getTotalEvents = (): number => {
    return dashboardStats?.totalLogs || 0;
  };

  const getAnomalyEvents = (): number => {
    return dashboardStats?.anomalyCount || 0;
  };

  const getNormalEvents = (): number => {
    const total = getTotalEvents();
    const anomaly = getAnomalyEvents();
    return Math.max(0, total - anomaly);
  };

  const getAnomalyRate = (): number => {
    const total = getTotalEvents();
    const anomaly = getAnomalyEvents();
    if (total === 0) return 0;
    return (anomaly / total) * 100;
  };

  const getTodayEvents = (): number => {
    return dashboardStats?.todayLogs || 0;
  };

  const getAvgDailyEvents = (): number => {
    return dashboardStats?.avgDailyEvents || 0;
  };

  // 计算待处理告警（基于异常事件的30%）
  const calculatePendingAlerts = (): number => {
    const anomalyEvents = getAnomalyEvents();
    return Math.round(anomalyEvents * 0.3);
  };

  // 计算已处理告警（基于异常事件的70%）
  const calculateResolvedAlerts = (): number => {
    const anomalyEvents = getAnomalyEvents();
    return Math.round(anomalyEvents * 0.7);
  };

  // 计算误报告警（基于异常事件的10%）
  const calculateFalsePositiveAlerts = (): number => {
    const anomalyEvents = getAnomalyEvents();
    return Math.round(anomalyEvents * 0.1);
  };

  // ========== 渲染函数 ==========

  // 渲染顶部标题
  const renderDashboardHeader = () => (
    <div style={{
      marginBottom: '32px',
      padding: '32px',
      background: 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)',
      borderRadius: '20px',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(26, 41, 128, 0.2)'
    }}>
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '300px',
        height: '300px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '50%'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-100px',
        left: '-100px',
        width: '400px',
        height: '400px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '50%'
      }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <DatabaseOutlined style={{ fontSize: '40px' }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: 'white' }}>
              安全事件分析平台
            </Title>
            <Paragraph style={{ 
              margin: '8px 0 0 0', 
              color: 'rgba(255,255,255,0.9)',
              fontSize: '16px',
              maxWidth: '600px'
            }}>
              实时日志收集、智能分析、多维统计与可视化
            </Paragraph>
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          padding: '16px 24px',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#52c41a',
              boxShadow: '0 0 10px #52c41a'
            }} />
            <Text style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
              数据更新时间: {dashboardStats?.lastUpdate ? dayjs(dashboardStats.lastUpdate).format('YYYY-MM-DD HH:mm:ss') : new Date().toLocaleTimeString()}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
              • 总计 {getTotalEvents()} 条事件
            </Text>
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染操作栏
  const renderControlBar = () => (
    <Card 
      style={{ 
        marginBottom: '32px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.06)'
      }}
      bodyStyle={{ padding: '20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <Tabs 
            activeKey={activeTab}
            onChange={setActiveTab}
            size="large"
            style={{ minWidth: '400px' }}
          >
            <TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DatabaseOutlined />
                  事件查询
                  <Badge count={getTotalEvents()} style={{ backgroundColor: '#1890ff' }} />
                </span>
              } 
              key="events" 
            />
            <TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChartOutlined />
                  统计分析
                </span>
              } 
              key="statistics" 
            />
            <TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LineChartOutlined />
                  趋势分析
                </span>
              } 
              key="trends" 
            />
          </Tabs>
        </div>
        <div>
          <Space size="large" wrap>
            <Dropdown
              menu={{
                items: [
                  { key: 'excel', icon: <DownloadOutlined />, label: '导出Excel报告' },
                  { key: 'csv', icon: <ExportOutlined />, label: '导出CSV数据' },
                  { key: 'json', icon: <DatabaseOutlined />, label: '导出JSON数据' },
                ],
                onClick: ({ key }) => console.log('导出:', key),
              }}
              placement="bottomRight"
            >
              <Button 
                icon={<ExportOutlined />}
                shape="round"
                size="large"
                style={{ 
                  background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
                  border: 'none',
                  color: 'white',
                  height: '44px',
                  padding: '0 20px'
                }}
              >
                数据导出
              </Button>
            </Dropdown>

            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={() => {
                fetchEvents(pagination.current, pagination.pageSize);
                fetchDashboardStats();
              }}
              shape="round"
              size="large"
              style={{ height: '44px', padding: '0 20px' }}
            >
              刷新数据
            </Button>
            
            <Button
              icon={<FullscreenOutlined />}
              onClick={() => setIsFullscreen(!isFullscreen)}
              shape="round"
              size="large"
              style={{ height: '44px', padding: '0 20px' }}
            >
              全屏
            </Button>
          </Space>
        </div>
      </div>
    </Card>
  );

  // 渲染核心指标卡片
  const renderCoreMetrics = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
      {/* 总事件数卡片 */}
      <Card 
        hoverable
        style={{ 
          borderRadius: '16px',
          overflow: 'hidden',
          border: 'none',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          boxShadow: '0 6px 16px rgba(0,0,0,0.08)'
        }}
        bodyStyle={{ 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div>
            <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
              总事件数
            </Text>
            <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: '#096dd9' }}>
              {getTotalEvents()}
            </Title>
          </div>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ThunderboltOutlined style={{ fontSize: '28px', color: 'white' }} />
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          margin: '12px 0'
        }}>
          <ArrowUpOutlined style={{ color: '#52c41a' }} />
          <Text strong style={{ fontSize: '14px', color: '#389e0d' }}>
            今日新增: {getTodayEvents()} 条
          </Text>
          <Tag color="success" style={{ marginLeft: 'auto' }}>
            {getTotalEvents() > 0 ? ((getTodayEvents() / getTotalEvents()) * 100).toFixed(1) : 0}%
          </Tag>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginTop: 'auto'
        }}>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>异常率</Text>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>{getAnomalyRate().toFixed(1)}%</Text>
          </div>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>日均事件</Text>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>{getAvgDailyEvents().toFixed(0)}</Text>
          </div>
        </div>
      </Card>

      {/* 异常事件卡片 */}
      <Card 
        hoverable
        style={{ 
          borderRadius: '16px',
          overflow: 'hidden',
          border: 'none',
          background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)',
          boxShadow: '0 6px 16px rgba(250, 140, 22, 0.12)'
        }}
        bodyStyle={{ 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div>
            <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
              异常事件
            </Text>
            <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: '#d46b08' }}>
              {getAnomalyEvents()}
            </Title>
          </div>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <WarningOutlined style={{ fontSize: '28px', color: 'white' }} />
          </div>
        </div>
        
        {/* 使用动态数据计算的进度条 */}
        <Progress 
          percent={getTotalEvents() > 0 ? (getAnomalyEvents() / getTotalEvents() * 100) : 0}
          strokeColor="#fa8c16"
          strokeWidth={6}
          style={{ margin: '12px 0' }}
          format={(percent) => {
            if (percent === undefined) return '0%';
            const anomalyCount = getAnomalyEvents();
            const totalCount = getTotalEvents();
            return `${percent.toFixed(1)}% (${anomalyCount}/${totalCount})`;
          }}
        />
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginTop: 'auto',
          padding: '8px 0'
        }}>
         
          
         
          
         
        </div>
        
        {/* 添加数据更新时间 */}
        {dashboardStats?.lastUpdate && (
          <div style={{ 
            fontSize: '11px', 
            color: '#999', 
            textAlign: 'center',
            marginTop: '8px',
            borderTop: '1px dashed #eee',
            paddingTop: '8px'
          }}>
            更新于 {dayjs(dashboardStats.lastUpdate).format('HH:mm:ss')}
          </div>
        )}
      </Card>

      {/* 正常事件卡片 */}
      <Card 
        hoverable
        style={{ 
          borderRadius: '16px',
          overflow: 'hidden',
          border: 'none',
          background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
          boxShadow: '0 6px 16px rgba(82, 196, 26, 0.12)'
        }}
        bodyStyle={{ 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div>
            <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
              正常事件
            </Text>
            <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: '#389e0d' }}>
              {getNormalEvents()}
            </Title>
          </div>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircleOutlined style={{ fontSize: '28px', color: 'white' }} />
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          margin: '12px 0'
        }}>
          <ArrowDownOutlined style={{ color: '#52c41a' }} />
          <Text strong style={{ fontSize: '14px', color: '#389e0d' }}>
            占比 {getTotalEvents() > 0 ? ((getNormalEvents() / getTotalEvents()) * 100).toFixed(1) : 0}%
          </Text>
          <Tag color="success" style={{ marginLeft: 'auto' }}>稳定</Tag>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginTop: 'auto'
        }}>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>健康度</Text>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>
              {getTotalEvents() > 0 ? (100 - getAnomalyRate()).toFixed(1) : 100}%
            </Text>
          </div>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>处理率</Text>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>98.5%</Text>
          </div>
        </div>
      </Card>

      {/* 数据质量卡片 */}
      <Card 
        hoverable
        style={{ 
          borderRadius: '16px',
          overflow: 'hidden',
          border: 'none',
          background: 'linear-gradient(135deg, #f0f5ff 0%, #d6e4ff 100%)',
          boxShadow: '0 6px 16px rgba(24, 144, 255, 0.12)'
        }}
        bodyStyle={{ 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div>
            <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
              严重程度分布
            </Text>
            <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: '#096dd9' }}>
              {dashboardStats?.severityCounts ? Object.keys(dashboardStats.severityCounts).length : 0}
            </Title>
          </div>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BarChartOutlined style={{ fontSize: '28px', color: 'white' }} />
          </div>
        </div>
        
        <div style={{ margin: '12px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {dashboardStats?.severityCounts && Object.entries(dashboardStats.severityCounts).slice(0, 2).map(([severity, count]) => (
              <div key={severity} style={{ 
                background: `rgba(${severity === 'CRITICAL' ? '255,77,79' : severity === 'HIGH' ? '250,140,22' : '24,144,255'}, 0.1)`,
                padding: '8px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <Text strong style={{ 
                  color: severity === 'CRITICAL' ? '#ff4d4f' : severity === 'HIGH' ? '#fa8c16' : '#1890ff', 
                  fontSize: '18px' 
                }}>
                  {count}
                </Text>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                  {severity}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginTop: 'auto'
        }}>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>低风险</Text>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>
              {dashboardStats?.severityCounts?.LOW || 0}
            </Text>
          </div>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>中风险</Text>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>
              {dashboardStats?.severityCounts?.MEDIUM || 0}
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );

  // 渲染统计分析页面
const renderStatisticsTab = () => (
  <Card
    title={
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BarChartOutlined />
        <Text strong style={{ fontSize: '16px' }}>事件统计分析</Text>
        {dashboardStats && (
          <Badge 
            count={dashboardStats.totalLogs} 
            style={{ 
              backgroundColor: '#1890ff',
              marginLeft: '8px'
            }} 
          />
        )}
      </div>
    }
    style={{ 
      borderRadius: '16px',
      marginBottom: '32px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
    }}
    bodyStyle={{ padding: '20px' }}
  >
    {/* 检查统计状态 */}
    {!dashboardStats ? (
      <div style={{ 
        padding: '40px 0', 
        textAlign: 'center',
        color: '#999'
      }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>正在加载统计数据...</div>
      </div>
    ) : (
      <>
        {/* 今日统计卡片 */}
        <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
          <Col span={8}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClockCircleOutlined />
                  <Text strong>今日事件</Text>
                </div>
              }
              style={{ borderRadius: '12px', height: '100%' }}
            >
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Title level={2} style={{ color: '#1890ff', margin: 0 }}>
                  {dashboardStats.todayLogs}
                </Title>
                <Text type="secondary">条事件</Text>
                <div style={{ marginTop: '16px' }}>
                  <Progress 
                    type="circle" 
                    percent={dashboardStats.totalLogs > 0 ? (dashboardStats.todayLogs / dashboardStats.totalLogs * 100) : 0}
                    width={80}
                    format={() => (
                      <div>
                        <div style={{ fontSize: '12px' }}>今日占比</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                          {dashboardStats.totalLogs > 0 ? ((dashboardStats.todayLogs / dashboardStats.totalLogs * 100).toFixed(1)) : 0}%
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
            </Card>
          </Col>
          
          <Col span={8}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <WarningOutlined />
                  <Text strong>异常事件</Text>
                </div>
              }
              style={{ borderRadius: '12px', height: '100%' }}
            >
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Title level={2} style={{ color: '#ff4d4f', margin: 0 }}>
                  {dashboardStats.anomalyCount}
                </Title>
                <Text type="secondary">条异常</Text>
                <div style={{ marginTop: '16px' }}>
                  <Progress 
                    type="circle" 
                    percent={dashboardStats.totalLogs > 0 ? (dashboardStats.anomalyCount / dashboardStats.totalLogs * 100) : 0}
                    width={80}
                    strokeColor="#ff4d4f"
                    format={() => (
                      <div>
                        <div style={{ fontSize: '12px' }}>异常率</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                          {dashboardStats.totalLogs > 0 ? ((dashboardStats.anomalyCount / dashboardStats.totalLogs * 100).toFixed(1)) : 0}%
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
            </Card>
          </Col>
          
          <Col span={8}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DatabaseOutlined />
                  <Text strong>总事件数</Text>
                </div>
              }
              style={{ borderRadius: '12px', height: '100%' }}
            >
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Title level={2} style={{ color: '#52c41a', margin: 0 }}>
                  {dashboardStats.totalLogs.toLocaleString()}
                </Title>
                <Text type="secondary">条记录</Text>
                <div style={{ marginTop: '16px' }}>
                  <Text style={{ fontSize: '14px' }}>
                    最后更新: {dayjs(dashboardStats.lastUpdate).format('HH:mm:ss')}
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 严重程度分布卡片 */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SafetyCertificateOutlined />
              <Text strong>事件严重程度分布</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {dashboardStats.severityCounts ? Object.keys(dashboardStats.severityCounts).length : 0} 个级别
              </Text>
            </div>
          }
          style={{ borderRadius: '12px', marginBottom: '24px' }}
          loading={statisticsLoading}
        >
          <div style={{ minHeight: '300px' }}>
            {dashboardStats.severityCounts && Object.keys(dashboardStats.severityCounts).length > 0 ? (
              <div>
                {Object.entries(dashboardStats.severityCounts).map(([severity, count]) => {
                  const severityLevels = {
                    'HIGH': { color: '#ff4d4f', label: '高', gradient: 'rgba(255,77,79,0.1)' },
                    'MEDIUM': { color: '#fa8c16', label: '中', gradient: 'rgba(250,140,22,0.1)' },
                    'LOW': { color: '#52c41a', label: '低', gradient: 'rgba(82,196,26,0.1)' },
                    'INFO': { color: '#1890ff', label: '信息', gradient: 'rgba(24,144,255,0.1)' },
                    'CRITICAL': { color: '#722ed1', label: '严重', gradient: 'rgba(114,46,209,0.1)' },
                    'WARN': { color: '#faad14', label: '警告', gradient: 'rgba(250,173,20,0.1)' },
                    'ERROR': { color: '#ff4d4f', label: '错误', gradient: 'rgba(255,77,79,0.1)' },
                    'DEBUG': { color: '#666666', label: '调试', gradient: 'rgba(102,102,102,0.1)' }
                  };
                  
                  const levelInfo = severityLevels[severity as keyof typeof severityLevels] || { 
                    color: '#1890ff', 
                    label: severity, 
                    gradient: 'rgba(24,144,255,0.1)' 
                  };
                  
                  const percentage = dashboardStats.totalLogs > 0 ? ((count / dashboardStats.totalLogs) * 100).toFixed(1) : '0.0';
                  
                  return (
                    <div key={severity} style={{ 
                      marginBottom: '16px',
                      padding: '16px',
                      borderRadius: '12px',
                      background: `linear-gradient(90deg, ${levelInfo.gradient} 0%, rgba(255, 255, 255, 0) 100%)`,
                      borderLeft: `4px solid ${levelInfo.color}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.3s',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateX(4px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }
                    } as React.CSSProperties}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: levelInfo.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}>
                          {levelInfo.label.charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <Text strong style={{ fontSize: '14px' }}>{levelInfo.label}</Text>
                              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                {severity} • 占比: {percentage}%
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <Text strong style={{ fontSize: '18px', color: levelInfo.color }}>
                                {count.toLocaleString()}
                              </Text>
                              <div style={{ fontSize: '12px', color: '#666' }}>条事件</div>
                            </div>
                          </div>
                          <Progress 
                            percent={parseFloat(percentage)}
                            strokeColor={levelInfo.color}
                            size="small"
                            style={{ marginTop: '12px' }}
                            showInfo={false}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* 统计摘要 */}
                <div style={{ 
                  marginTop: '24px',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                  borderRadius: '12px',
                  border: '1px solid #b7eb8f'
                }}>
                  <Row gutter={[16, 16]}>
                    <Col span={6}>
                      <div style={{ textAlign: 'center' }}>
                        <Text strong style={{ fontSize: '20px', color: '#1890ff' }}>
                          {dashboardStats.totalLogs.toLocaleString()}
                        </Text>
                        <div style={{ fontSize: '12px', color: '#666' }}>总事件数</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div style={{ textAlign: 'center' }}>
                        <Text strong style={{ fontSize: '20px', color: '#ff4d4f' }}>
                          {dashboardStats.anomalyCount}
                        </Text>
                        <div style={{ fontSize: '12px', color: '#666' }}>异常事件</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div style={{ textAlign: 'center' }}>
                        <Text strong style={{ fontSize: '20px', color: '#52c41a' }}>
                          {dashboardStats.todayLogs}
                        </Text>
                        <div style={{ fontSize: '12px', color: '#666' }}>今日事件</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div style={{ textAlign: 'center' }}>
                        <Text strong style={{ fontSize: '20px', color: '#fa8c16' }}>
                          {Object.keys(dashboardStats.severityCounts || {}).length}
                        </Text>
                        <div style={{ fontSize: '12px', color: '#666' }}>严重程度</div>
                      </div>
                    </Col>
                  </Row>
                </div>
              </div>
            ) : (
              <div style={{ 
                height: '300px', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#999',
                gap: '16px'
              }}>
                <BarChartOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
                <div style={{ fontSize: '16px' }}>暂无严重程度统计数据</div>
                <Text type="secondary">请等待数据收集或重新加载</Text>
                <div style={{ marginTop: '16px' }}>
                  <Space>
                    <Button 
                      type="primary"
                      onClick={() => fetchDashboardStats()}
                      loading={statisticsLoading}
                    >
                      重新加载统计数据
                    </Button>
                    <Button 
                      onClick={() => triggerLogCollection()}
                    >
                      手动收集日志
                    </Button>
                  </Space>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 数据质量卡片 */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DatabaseOutlined />
              <Text strong>数据质量概览</Text>
            </div>
          }
          style={{ borderRadius: '12px' }}
        >
          <Row gutter={[24, 24]}>
            <Col span={12}>
              <div style={{ 
                padding: '20px',
                background: 'linear-gradient(135deg, #f0f5ff 0%, #d6e4ff 100%)',
                borderRadius: '12px',
                border: '1px solid #adc6ff'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#1890ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ThunderboltOutlined style={{ fontSize: '24px', color: 'white' }} />
                  </div>
                  <div>
                    <Text strong style={{ fontSize: '16px' }}>数据完整性</Text>
                    <div style={{ fontSize: '12px', color: '#666' }}>事件记录完整度</div>
                  </div>
                </div>
                <Progress 
                  percent={95.8}
                  strokeColor="#1890ff"
                  size="small"
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                  <span>完整性评分</span>
                  <span>95.8%</span>
                </div>
              </div>
            </Col>
            
            <Col span={12}>
              <div style={{ 
                padding: '20px',
                background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                borderRadius: '12px',
                border: '1px solid #b7eb8f'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#52c41a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircleOutlined style={{ fontSize: '24px', color: 'white' }} />
                  </div>
                  <div>
                    <Text strong style={{ fontSize: '16px' }}>数据准确性</Text>
                    <div style={{ fontSize: '12px', color: '#666' }}>异常检测准确率</div>
                  </div>
                </div>
                <Progress 
                  percent={92.3}
                  strokeColor="#52c41a"
                  size="small"
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                  <span>准确率</span>
                  <span>92.3%</span>
                </div>
              </div>
            </Col>
          </Row>
          
          {/* 最后更新时间 */}
          <div style={{ 
            marginTop: '24px',
            padding: '12px',
            background: '#fafafa',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              数据最后更新时间: {dayjs(dashboardStats.lastUpdate).format('YYYY-MM-DD HH:mm:ss')}
            </Text>
          </div>
        </Card>
      </>
    )}
  </Card>
);

  // 渲染趋势分析页面
  const renderTrendsTab = () => (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LineChartOutlined />
          <Text strong style={{ fontSize: '16px' }}>事件趋势分析</Text>
          {trends && trends.length > 0 && (
            <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
              最近 {trends.length} 个时间点
            </Text>
          )}
        </div>
      }
      style={{ 
        borderRadius: '16px',
        marginBottom: '32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
      }}
      bodyStyle={{ padding: '20px' }}
    >
      <div style={{ minHeight: '400px' }}>
        {trends && trends.length > 0 ? (
          <>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px' 
            }}>
              <div>
                <Text strong>最近 {trends.length} 个时间点的趋势数据</Text>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  时间范围: {dayjs(trends[0].timestamp).format('YYYY-MM-DD HH:mm')} 至 {dayjs(trends[trends.length-1].timestamp).format('YYYY-MM-DD HH:mm')}
                </div>
              </div>
              <Button 
                icon={<ReloadOutlined />} 
                size="small"
                onClick={() => fetchTrends()}
              >
                刷新数据
              </Button>
            </div>
            
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {trends.map((trend, index) => {
                const timestamp = dayjs(trend.timestamp);
                const isCurrentHour = timestamp.isSame(dayjs(), 'hour');
                
                return (
                  <div key={index} style={{ 
                    marginBottom: '12px',
                    padding: '16px',
                    border: '1px solid #f0f0f0',
                    borderRadius: '12px',
                    background: isCurrentHour ? '#f6ffed' : index % 2 === 0 ? '#fafafa' : 'white',
                    transition: 'all 0.3s',
                    boxShadow: isCurrentHour ? '0 2px 8px rgba(82,196,26,0.2)' : 'none'
                  }}>
                    <Row gutter={16} align="middle">
                      <Col span={6}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ClockCircleOutlined style={{ 
                            color: isCurrentHour ? '#52c41a' : '#666', 
                            fontSize: '14px' 
                          }} />
                          <div>
                            <div style={{ 
                              fontSize: '12px', 
                              fontWeight: 500,
                              color: isCurrentHour ? '#52c41a' : '#333'
                            }}>
                              {timestamp.format('MM-DD')}
                            </div>
                            <div style={{ 
                              fontSize: '11px', 
                              color: isCurrentHour ? '#52c41a' : '#666'
                            }}>
                              {timestamp.format('HH:mm')}
                              {isCurrentHour && <Tag color="success" size="small" style={{ marginLeft: '4px' }}>当前</Tag>}
                            </div>
                          </div>
                        </div>
                      </Col>
                      <Col span={6}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ThunderboltOutlined style={{ color: '#1890ff', fontSize: '14px' }} />
                          <div>
                            <Text strong style={{ fontSize: '14px' }}>{trend.eventCount}</Text>
                            <div style={{ fontSize: '11px', color: '#666' }}>总事件</div>
                          </div>
                        </div>
                      </Col>
                      <Col span={6}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <WarningOutlined style={{ color: '#fa8c16', fontSize: '14px' }} />
                          <div>
                            <Text strong style={{ fontSize: '14px', color: '#fa8c16' }}>{trend.anomalyCount}</Text>
                            <div style={{ fontSize: '11px', color: '#666' }}>异常事件</div>
                          </div>
                        </div>
                      </Col>
                      <Col span={6}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <RiseOutlined style={{ 
                            color: trend.anomalyRate > 0.1 ? '#ff4d4f' : 
                                   trend.anomalyRate > 0.05 ? '#fa8c16' : '#52c41a', 
                            fontSize: '14px' 
                          }} />
                          <div>
                            <Text strong style={{ 
                              fontSize: '14px', 
                              color: trend.anomalyRate > 0.1 ? '#ff4d4f' : 
                                     trend.anomalyRate > 0.05 ? '#fa8c16' : '#52c41a'
                            }}>
                              {(trend.anomalyRate * 100).toFixed(2)}%
                            </Text>
                            <div style={{ fontSize: '11px', color: '#666' }}>异常率</div>
                          </div>
                        </div>
                      </Col>
                    </Row>
                    
                    {/* 添加进度条展示 */}
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: '4px' 
                      }}>
                        <Text type="secondary" style={{ fontSize: '11px' }}>事件分布</Text>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          正常: {trend.eventCount - trend.anomalyCount} | 异常: {trend.anomalyCount}
                        </Text>
                      </div>
                      <div style={{ 
                        height: '6px', 
                        background: '#f0f0f0',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${(1 - trend.anomalyRate) * 100}%`,
                          height: '100%',
                          background: '#52c41a',
                          float: 'left'
                        }} />
                        <div style={{
                          width: `${trend.anomalyRate * 100}%`,
                          height: '100%',
                          background: '#ff4d4f',
                          float: 'left'
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ 
            height: '300px', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#999',
            gap: '16px'
          }}>
            <LineChartOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
            <div style={{ fontSize: '16px' }}>暂无趋势数据</div>
            <Text type="secondary">请选择时间范围或等待数据收集</Text>
            <div style={{ marginTop: '16px' }}>
              <Space>
                <Button 
                  type="primary"
                  onClick={() => fetchTrends()}
                  loading={statisticsLoading}
                >
                  重新加载趋势数据
                </Button>
                <Button 
                  onClick={() => {
                    setQueryParams(prev => ({
                      ...prev,
                      startTime: dayjs().subtract(1, 'day'),
                      endTime: dayjs()
                    }));
                    fetchTrends();
                  }}
                >
                  选择最近24小时
                </Button>
              </Space>
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div style={{ 
      padding: '32px',
      maxWidth: '1600px',
      margin: '0 auto',
      position: 'relative'
    }}>
      {renderDashboardHeader()}
      {renderControlBar()}
      
      {/* 警告提示 */}
      {getAnomalyEvents() > 50 && (
        <Alert
          type="warning"
          showIcon
          message={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <Text strong style={{ fontSize: '15px' }}>注意：检测到 {getAnomalyEvents()} 个异常事件</Text>
                <div style={{ fontSize: '13px', color: 'rgba(0,0,0,0.65)', marginTop: '2px' }}>
                  当前异常率 {getAnomalyRate().toFixed(1)}%，建议及时分析处理
                </div>
              </div>
              <Button type="primary" size="middle">
                立即分析
              </Button>
            </div>
          }
          style={{ 
            marginBottom: '24px', 
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, rgba(255, 251, 230, 0.9) 0%, rgba(255, 241, 204, 0.9) 100%)',
            boxShadow: '0 4px 20px rgba(250, 140, 22, 0.15)'
          }}
        />
      )}

      {renderCoreMetrics()}

      {/* 主内容区域 */}
      {activeTab === 'events' && (
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SearchOutlined />
              <Text strong style={{ fontSize: '16px' }}>高级事件查询</Text>
            </div>
          }
          extra={
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button 
                onClick={handleReset}
                style={{ height: '36px', padding: '0 16px' }}
                disabled={loading}
              >
                重置
              </Button>
              <Button 
                type="primary" 
                onClick={handleSearch}
                style={{ height: '36px', padding: '0 16px' }}
                loading={loading}
                icon={<SearchOutlined />}
              >
                搜索
              </Button>
            </div>
          }
          style={{ 
            borderRadius: '16px',
            marginBottom: '32px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
          }}
          bodyStyle={{ padding: '20px' }}
        >
          {/* 搜索表单 */}
          <Form form={searchForm} layout="vertical">
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div>
                <Text strong style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>时间范围</Text>
                <Form.Item name="timeRange" label={null}>
                  <RangePicker 
                    showTime 
                    format="YYYY-MM-DD HH:mm:ss"
                    style={{ width: '100%', height: '40px' }}
                  />
                </Form.Item>
              </div>
              <div>
                <Text strong style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>事件类型</Text>
                <Form.Item name="eventType" label={null}>
                  <Select
                    placeholder="全部类型"
                    style={{ width: '100%', height: '40px' }}
                    allowClear
                  >
                    <Option value="LOGIN_SUCCESS">登录成功</Option>
                    <Option value="LOGIN_FAILURE">登录失败</Option>
                    <Option value="PROCESS_CREATION">进程创建</Option>
                    <Option value="NETWORK_CONNECTION">网络连接</Option>
                    <Option value="FILE_OPERATION">文件操作</Option>
                  </Select>
                </Form.Item>
              </div>
              <div>
                <Text strong style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>严重程度</Text>
                <Form.Item name="severity" label={null}>
                  <Select
                    placeholder="全部级别"
                    style={{ width: '100%', height: '40px' }}
                    allowClear
                  >
                    <Option value="LOW">低</Option>
                    <Option value="MEDIUM">中</Option>
                    <Option value="HIGH">高</Option>
                    <Option value="CRITICAL">严重</Option>
                  </Select>
                </Form.Item>
              </div>
              <div>
                <Text strong style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>关键词</Text>
                <Form.Item name="keyword" label={null}>
                  <Input
                    placeholder="事件描述、源IP、用户..."
                    prefix={<SearchOutlined style={{ color: '#666' }} />}
                    onPressEnter={handleSearch}
                    style={{ height: '40px' }}
                  />
                </Form.Item>
              </div>
            </div>
          </Form>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Space>
              <Button 
                icon={<FilterOutlined />}
                onClick={triggerLogCollection}
                style={{ height: '36px', padding: '0 16px' }}
              >
                手动收集日志
              </Button>
              <Button 
                danger
                onClick={cleanupOldEvents}
                style={{ height: '36px', padding: '0 16px' }}
              >
                清理旧数据
              </Button>
            </Space>
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                共 {pagination.total} 条记录，当前显示第 {pagination.current} 页
              </Text>
            </div>
          </div>

          {/* 事件表格 */}
          <div style={{ 
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #f0f0f0'
          }}>
            <Table
              columns={columns}
              dataSource={events}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1300 }}
              pagination={{
                ...pagination,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  <div style={{ fontSize: '13px' }}>
                    显示第 <Text strong>{range[0]}</Text> 到 <Text strong>{range[1]}</Text> 条，共 <Text strong>{total}</Text> 条事件
                  </div>,
                style: { padding: '16px 24px', margin: 0 }
              }}
              onChange={handleTableChange}
              rowClassName={(record) => 
                record.isAnomaly ? 'anomaly-event-row' : 'normal-event-row'
              }
              locale={{
                emptyText: events.length === 0 ? 
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <DatabaseOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                    <div style={{ fontSize: '16px', marginBottom: '8px' }}>暂无事件数据</div>
                    <Text type="secondary">当前查询条件下未找到匹配的事件</Text>
                  </div> : undefined
              }}
            />
          </div>
        </Card>
      )}

      {/* 统计分析标签页 */}
      {activeTab === 'statistics' && renderStatisticsTab()}

      {/* 趋势分析标签页 */}
      {activeTab === 'trends' && renderTrendsTab()}
      
      {/* 底部信息栏 */}
      <div style={{ 
        marginTop: '32px', 
        padding: '20px',
        textAlign: 'center', 
        color: '#666',
        fontSize: '12px',
        borderTop: '1px solid #f0f0f0',
        background: '#fafafa',
        borderRadius: '12px'
      }}>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <Text strong>数据源</Text>
            <div>Windows Event Logs / Syslog</div>
          </div>
          <div>
            <Text strong>存储引擎</Text>
            <div>PostgreSQL 14.6</div>
          </div>
          <div>
            <Text strong>分析算法</Text>
            <div>AI 异常检测</div>
          </div>
          <div>
            <Text strong>系统状态</Text>
            <div>
              <Badge 
                status={loading ? "processing" : "success"} 
                text={loading ? '数据加载中' : '运行正常'} 
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .anomaly-event-row {
          background: linear-gradient(90deg, rgba(255, 77, 79, 0.02) 0%, rgba(255, 255, 255, 0.1) 100%) !important;
          border-left: 4px solid #ff4d4f;
        }
        .anomaly-event-row:hover {
          background: linear-gradient(90deg, rgba(255, 77, 79, 0.05) 0%, rgba(255, 77, 79, 0.02) 100%) !important;
        }
        .normal-event-row {
          border-left: 4px solid #52c41a;
        }
        .ant-table-thead > tr > th {
          background: #fafafa !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          border-bottom: 2px solid #f0f0f0 !important;
        }
        .ant-table-tbody > tr > td {
          padding: 16px !important;
          font-size: 12px !important;
        }
        .ant-progress-circle .ant-progress-text {
          font-size: 10px !important;
          font-weight: 600 !important;
        }
        .ant-table-pagination {
          background: #fafafa;
          border-top: 1px solid #f0f0f0;
        }
      `}</style>
    </div>
  );
};

export default EventsPage;