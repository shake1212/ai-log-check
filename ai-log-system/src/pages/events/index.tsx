import React, { useState, useEffect, useRef } from 'react';
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
  Segmented,
  Rate,
  Alert
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  RiseOutlined,
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
  UserOutlined,
  CloudServerOutlined,
  BellOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  RocketOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { getSeverity, getStatus, translate, EVENT_TYPE_MAP } from '../../utils/enumLabels';
import request from '@/utils/request';
import { handleError, logError } from '@/utils/errorHandler';

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
  // 新增 AI 字段
  aiAnomalyScore?: number;   // AI异常分数 (0-1)
  aiIsAnomaly?: boolean;     // AI是否判定异常
  combinedScore?: number;    // 综合分数 (0-1)
}

// 查询参数接口（时间可为 null 表示不限时间，仅按其它条件筛选）
interface QueryParams {
  startTime: dayjs.Dayjs | null;
  endTime: dayjs.Dayjs | null;
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
  LOW: '#52c41a'
};

const LEVEL_GRADIENTS = {
  CRITICAL: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
  HIGH: 'linear-gradient(135deg, #fa8c16 0%, #d48806 100%)',
  MEDIUM: 'linear-gradient(135deg, #faad14 0%, #d4a106 100%)',
  LOW: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
  HEALTHY: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
  CRITICAL_GRADIENT: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)'
};

const EventsPage: React.FC<{ initialEventId?: number }> = ({ initialEventId }) => {
  const [loading, setLoading] = useState(false);
  const [highlightEventId, setHighlightEventId] = useState<number | null>(initialEventId ?? null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('events');

  
  // Add mounted ref to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // 查询参数
  const [queryParams, setQueryParams] = useState<QueryParams>({
    startTime: dayjs().subtract(7, 'day'),
    endTime: dayjs(),
    eventType: '',
    severity: '',
    keyword: '',
    isAnomaly: undefined
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState<any>(null);

  // 获取仪表板统计信息（无需时间参数）
  const fetchDashboardStats = async () => {
    try {
      if (!isMountedRef.current) return;
      setStatisticsLoading(true);
      
      console.log('调用仪表板统计API:', '/api/events/dashboard-stats');
      
      const data = await request.get('/api/events/dashboard-stats', {
        timeout: 5000
      });
      
      console.log('仪表板统计返回数据:', data);
      
      if (!isMountedRef.current) return;
      
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
        }
      };
      
      // 这里可以设置到 statistics 状态，如果需要的话
      // setStatistics(statistics);
      
    } catch (error: any) {
      if (isMountedRef.current) {
        handleError(error, '获取仪表板统计');
      }
    } finally {
      if (isMountedRef.current) {
        setStatisticsLoading(false);
      }
    }
  };

  /** 图表/统计用时间：未选时间时用最近 30 天，避免请求无时间参数 */
  const chartTimeRange = (q: QueryParams) => ({
    start: q.startTime ?? dayjs().subtract(30, 'day'),
    end: q.endTime ?? dayjs(),
  });

  const normalizeEventList = (payload: any): EventData[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.content)) return payload.content;
    if (Array.isArray(payload?.records)) return payload.records;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data?.content)) return payload.data.content;
    if (Array.isArray(payload?.data?.records)) return payload.data.records;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  const hasActiveFilter = (q: QueryParams): boolean =>
    Boolean(
      q.eventType ||
      q.severity ||
      q.keyword ||
      q.isAnomaly !== undefined ||
      (q.startTime && q.endTime)
    );

  const eventMatchesQuery = (event: EventData, q: QueryParams): boolean => {
    if (q.eventType && event.eventType !== q.eventType) return false;
    if (q.severity && event.severity !== q.severity) return false;
    if (q.isAnomaly !== undefined && event.isAnomaly !== q.isAnomaly) return false;
    if (q.keyword) {
      const kw = q.keyword.toLowerCase();
      const text = [
        event.rawMessage,
        event.normalizedMessage,
        event.anomalyReason,
        event.sourceIp,
        event.userId,
        event.userName,
        event.hostName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!text.includes(kw)) return false;
    }
    if (q.startTime && q.endTime) {
      const ts = dayjs(event.timestamp);
      if (ts.isValid() && (ts.isBefore(q.startTime) || ts.isAfter(q.endTime))) {
        return false;
      }
    }
    return true;
  };

  // 获取时间范围的统计信息（需要时间参数）
  const fetchTimeRangeStatistics = async (overrideQuery?: Partial<QueryParams>) => {
    try {
      const effectiveQuery = { ...queryParams, ...overrideQuery };
      const { start, end } = chartTimeRange(effectiveQuery);
      const params = new URLSearchParams({
        startTime: start.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: end.format('YYYY-MM-DDTHH:mm:ss'),
      });

      console.log('调用时间范围统计API:', `/api/events/statistics?${params}`);
      
      const data = await request.get(`/api/events/statistics?${params}`, {
        timeout: 5000
      });
      
      console.log('时间范围统计返回数据:', data);
      // 这里可以根据需要处理时间范围统计
      
    } catch (error: any) {
      logError(error, '获取时间范围统计');
    }
  };

  // 获取事件列表
  const fetchEvents = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    overrideQuery?: Partial<QueryParams>,
    skipClientFilter = false
  ) => {
    try {
      if (!isMountedRef.current) return;
      setLoading(true);
      const effectiveQuery = { ...queryParams, ...overrideQuery };

      const queryDTO: Record<string, unknown> = {
        page: page - 1,
        size: pageSize,
        eventType: effectiveQuery.eventType || undefined,
        severity: effectiveQuery.severity || undefined,
        keyword: effectiveQuery.keyword || undefined,
        isAnomaly:
          effectiveQuery.isAnomaly === null || effectiveQuery.isAnomaly === undefined
            ? undefined
            : effectiveQuery.isAnomaly,
      };

      if (effectiveQuery.startTime && effectiveQuery.endTime) {
        queryDTO.startTime = effectiveQuery.startTime.format('YYYY-MM-DDTHH:mm:ss');
        queryDTO.endTime = effectiveQuery.endTime.format('YYYY-MM-DDTHH:mm:ss');
      }

      Object.keys(queryDTO).forEach((key) => {
        const v = queryDTO[key];
        if (v === undefined || v === null || v === '') {
          delete queryDTO[key];
        }
      });

      const data = await request.post('/api/events/search', queryDTO, {
        timeout: 10000
      });

      if (!isMountedRef.current) return;

      const serverEvents = normalizeEventList(data);
      const displayEvents = (!skipClientFilter && hasActiveFilter(effectiveQuery))
        ? serverEvents.filter((event) => eventMatchesQuery(event, effectiveQuery))
        : serverEvents;
      setEvents(displayEvents);
      setPagination(prev => ({
        ...prev,
        current: page,
        pageSize,
        total:
          (!skipClientFilter && hasActiveFilter(effectiveQuery)) && displayEvents.length !== serverEvents.length
            ? displayEvents.length
            : data.totalElements || data.total || displayEvents.length
      }));
      if (!skipClientFilter && displayEvents.length === 0 && hasActiveFilter(effectiveQuery)) {
        message.info('未找到匹配数据');
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        setEvents([]);
        setPagination(prev => ({ ...prev, current: page, pageSize, total: 0 }));
        handleError(error, '获取事件列表');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // 获取时间序列趋势数据
  const fetchTrends = async (overrideQuery?: Partial<QueryParams>) => {
    try {
      if (!isMountedRef.current) return;
      const effectiveQuery = { ...queryParams, ...overrideQuery };
      const { start, end } = chartTimeRange(effectiveQuery);
      const params = new URLSearchParams({
        startTime: start.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: end.format('YYYY-MM-DDTHH:mm:ss'),
      });

      console.log('调用趋势API:', `/api/events/statistics/timeseries?${params}`);
      
      const data = await request.get(`/api/events/statistics/timeseries?${params}`, {
        timeout: 8000
      });
      
      console.log('趋势API返回原始数据:', data);
      
      if (!isMountedRef.current) return;
      
      if (Array.isArray(data)) {
        // 转换数据格式
        const transformedTrends = data.map((item: any) => {
          const timestamp = item.timestamp || item.time || item.date || new Date().toISOString();
          const eventCount = item.eventCount || item.count || item.total || 0;
          const anomalyCount = item.anomalyCount || 0;
          const anomalyRate = item.anomalyRate != null ? item.anomalyRate : (eventCount > 0 ? anomalyCount / eventCount : 0);
          
          return {
            timestamp: timestamp,
            eventCount: eventCount,
            anomalyCount: anomalyCount,
            anomalyRate: anomalyRate
          };
        });
        
        setTrends(transformedTrends);
      } else {
        console.warn('趋势API返回的不是数组:', data);
        setTrends([]);
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        setTrends([]);
        handleError(error, '获取趋势数据');
      }
    }
  };

  // 获取最近事件（备用方案）
  const fetchRecentEvents = async () => {
    try {
      if (!isMountedRef.current) return;
      
      const data = await request.get('/api/events/recent?limit=50');
      
      if (!isMountedRef.current) return;
      
      setEvents(data || []);
      setPagination(prev => ({
        ...prev,
        total: data.length || 0
      }));
    } catch (error: any) {
      logError(error, '获取最近事件');
    }
  };

  // 手动触发日志收集
  const triggerLogCollection = async () => {
    try {
      await request.post('/api/events/collect');
      if (!isMountedRef.current) return;
      message.success('日志收集任务已启动');
    } catch (error: any) {
      if (isMountedRef.current) {
        handleError(error, '触发日志收集');
      }
    }
  };

  // 清理旧数据
  const cleanupOldEvents = async () => {
    try {
      await request.post('/api/events/cleanup?daysToKeep=30');
      if (!isMountedRef.current) return;
      message.success('已清理30天前的旧数据');
    } catch (error: any) {
      if (isMountedRef.current) {
        handleError(error, '清理旧数据');
      }
    }
  };

  // 更新事件状态
  const updateEventStatus = async (id: number, status: string) => {
    try {
      await request.put(`/api/events/${id}/status`, null, { params: { status } });
      if (!isMountedRef.current) return;
      message.success('事件状态更新成功');
      fetchEvents();
    } catch (error: any) {
      if (isMountedRef.current) {
        handleError(error, '更新事件状态');
      }
    }
  };

  // 搜索处理（任意条件即可筛选；未选时间则不限时间；快速筛选的 isAnomaly 无表单项时从 queryParams 保留）
  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    const tr = values.timeRange as [dayjs.Dayjs, dayjs.Dayjs] | null | undefined;
    let startTime: dayjs.Dayjs | null;
    let endTime: dayjs.Dayjs | null;
    if (Array.isArray(tr) && tr[0] && tr[1]) {
      startTime = tr[0];
      endTime = tr[1];
    } else if (tr === null) {
      startTime = null;
      endTime = null;
    } else {
      startTime = queryParams.startTime;
      endTime = queryParams.endTime;
    }
    const newQuery: QueryParams = {
      startTime,
      endTime,
      eventType: values.eventType ?? '',
      severity: values.severity ?? '',
      keyword: values.keyword ?? '',
      isAnomaly:
        typeof values.isAnomaly === 'boolean'
          ? values.isAnomaly
          : queryParams.isAnomaly,
    };
    setQueryParams(newQuery);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchEvents(1, pagination.pageSize, newQuery);
    fetchTrends(newQuery);
    fetchTimeRangeStatistics(newQuery);
  };

  // 重置查询
  const handleReset = () => {
    const resetQuery: QueryParams = {
      startTime: dayjs().subtract(7, 'day'),
      endTime: dayjs(),
      eventType: '',
      severity: '',
      keyword: '',
      isAnomaly: undefined
    };
    searchForm.setFieldsValue({
      timeRange: [resetQuery.startTime, resetQuery.endTime],
      eventType: '',
      severity: '',
      keyword: '',
      isAnomaly: undefined
    });
    setQueryParams(resetQuery);
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchEvents(1, pagination.pageSize, resetQuery);
    fetchTrends(resetQuery);
    fetchTimeRangeStatistics(resetQuery);
  };

  const handleRestoreRecent7Days = () => {
    const recentQuery: QueryParams = {
      ...queryParams,
      startTime: dayjs().subtract(7, 'day'),
      endTime: dayjs(),
    };
    searchForm.setFieldsValue({
      ...searchForm.getFieldsValue(),
      timeRange: [recentQuery.startTime, recentQuery.endTime],
    });
    setQueryParams(recentQuery);
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchEvents(1, pagination.pageSize, recentQuery);
    fetchTrends(recentQuery);
    fetchTimeRangeStatistics(recentQuery);
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
      width: 140,
      fixed: 'left',
      render: (text) => text ? (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500 }}>
            {dayjs(text).format('MM-DD HH:mm')}
          </div>
          <div style={{ fontSize: '10px', color: '#999' }}>
            {dayjs(text).format('ss')}s
          </div>
        </div>
      ) : '-'
    },
    {
      title: '类型',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 120,
      render: (text) => (
        <Tooltip title={translate(EVENT_TYPE_MAP, text) || getDisplayText(text)}>
          <Tag color="blue" style={{ fontWeight: 500, padding: '2px 6px', fontSize: '11px' }}>
            {getDisplayText(translate(EVENT_TYPE_MAP, text) || text, 10)}
          </Tag>
        </Tooltip>
      )
    },
    {
      title: '级别',
      dataIndex: 'severity',
      key: 'severity',
      width: 80,
      render: (severity) => {
        const { label, color } = getSeverity(severity);
        const colorHex: Record<string, string> = {
          red: '#ff4d4f', orange: '#fa8c16', gold: '#faad14',
          green: '#52c41a', blue: '#1890ff', default: '#d9d9d9'
        };
        const hex = colorHex[color] || '#1890ff';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: hex, boxShadow: `0 0 4px ${hex}`
            }} />
            <span style={{ fontSize: '11px', fontWeight: 500 }}>{label}</span>
          </div>
        );
      }
    },
    {
      title: '描述',
      dataIndex: 'normalizedMessage',
      key: 'normalizedMessage',
      ellipsis: true,
      width: 200,
      render: (text, record) => (
        <Tooltip title={getDisplayText(text || record.rawMessage || record.description)}>
          <span style={{ fontSize: '11px' }}>
            {getDisplayText(text || record.rawMessage || record.description, 40)}
          </span>
        </Tooltip>
      )
    },
    {
      title: '源IP',
      dataIndex: 'sourceIp',
      key: 'sourceIp',
      width: 110,
      render: (text) => (
        <Tooltip title={text}>
          <Tag style={{ fontSize: '10px', padding: '1px 4px' }}>
            {getDisplayText(text, 12)}
          </Tag>
        </Tooltip>
      )
    },
    {
      title: '用户',
      dataIndex: 'userId',
      key: 'userId',
      width: 80,
      render: (text, record) => (
        <Tooltip title={record.userName || text}>
          <span style={{ fontSize: '11px' }}>
            {getDisplayText(record.userName || text, 8)}
          </span>
        </Tooltip>
      )
    },
    {
      title: '异常',
      dataIndex: 'isAnomaly',
      key: 'isAnomaly',
      width: 70,
      render: (isAnomaly) => (
        <div style={{
          padding: '2px 6px',
          borderRadius: '12px',
          background: isAnomaly ? 'rgba(255, 77, 79, 0.1)' : 'rgba(82, 196, 26, 0.1)',
          border: `1px solid ${isAnomaly ? '#ff4d4f' : '#52c41a'}`,
          color: isAnomaly ? '#ff4d4f' : '#52c41a',
          fontSize: '10px',
          fontWeight: 500,
          textAlign: 'center'
        }}>
          {isAnomaly ? '异常' : '正常'}
        </div>
      )
    },
    {
      title: 'AI',
      dataIndex: 'aiIsAnomaly',
      key: 'aiIsAnomaly',
      width: 60,
      render: (aiIsAnomaly) => (
        <Tag
          color={aiIsAnomaly === true ? 'error' : aiIsAnomaly === false ? 'success' : 'default'}
          style={{ fontSize: '10px', padding: '1px 4px' }}
        >
          {aiIsAnomaly === undefined ? '-' : (aiIsAnomaly ? '异' : '正')}
        </Tag>
      ),
      sorter: true,
    },
    {
      title: '分数',
      dataIndex: 'aiAnomalyScore',
      key: 'aiAnomalyScore',
      width: 80,
      render: (score, record) => {
        if (score === undefined && record.combinedScore === undefined) return '-';
        const displayScore = score || record.combinedScore || 0;
        return (
          <Tooltip title={`AI: ${(score * 100 || 0).toFixed(1)}%, 综合: ${(record.combinedScore * 100 || 0).toFixed(1)}%`}>
            <div style={{ fontSize: '11px', fontWeight: 500 }}>
              {Math.round(displayScore * 100)}%
            </div>
          </Tooltip>
        );
      },
      sorter: true,
    },
  ];

  // 表格分页：显式带上当前 queryParams，避免仅依赖闭包导致与表单筛选不一致
  const handleTableChange = (newPagination: any) => {
    if (!newPagination || newPagination.current == null) return;
    setPagination((prev) => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize ?? prev.pageSize,
      total: newPagination.total ?? prev.total,
    }));
    fetchEvents(
      newPagination.current,
      newPagination.pageSize ?? pagination.pageSize,
      queryParams,
    );
  };

  // 初始化数据
  useEffect(() => {
    isMountedRef.current = true;
    let statsTimer: ReturnType<typeof setTimeout> | null = null;

    // 若有 initialEventId，设置高亮
    if (initialEventId) {
      setHighlightEventId(initialEventId);
    }

    const initData = async () => {
      if (!isMountedRef.current) return;
      setLoading(true);
      try {
        // 若有 initialEventId，先获取事件详情，直接定位到该事件
        if (initialEventId) {
          try {
            const eventData = await request.get(`/api/events/${initialEventId}`);
            if (isMountedRef.current && eventData) {
              setEvents([eventData]);
              setPagination(prev => ({ ...prev, current: 1, pageSize: 10, total: 1 }));
              setLoading(false);

              if (eventData.timestamp) {
                const eventTime = dayjs(eventData.timestamp);
                const newQuery: Partial<QueryParams> = {
                  startTime: eventTime.subtract(1, 'hour'),
                  endTime: eventTime.add(1, 'hour'),
                };
                setQueryParams(prev => ({ ...prev, ...newQuery }));
                searchForm.setFieldsValue({ timeRange: [newQuery.startTime, newQuery.endTime] });
              }

              setTimeout(() => {
                const highlightedRow = document.querySelector('.highlighted-event-row');
                if (highlightedRow) {
                  highlightedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 300);

              setSelectedEventDetail(eventData);
              setDetailVisible(true);

              // 并行加载统计数据
              Promise.allSettled([fetchDashboardStats(), fetchTrends()]).catch(() => {});
              return;
            }
          } catch (e: any) {
            logError(e, '获取关联事件详情');
          }
        }

        // 无 initialEventId 时的正常初始化流程
        searchForm.setFieldsValue({
          timeRange:
            queryParams.startTime && queryParams.endTime
              ? [queryParams.startTime, queryParams.endTime]
              : null,
          eventType: queryParams.eventType,
          severity: queryParams.severity,
          keyword: queryParams.keyword,
          isAnomaly: queryParams.isAnomaly
        });

        // 并行加载事件列表、仪表板统计和趋势数据
        const [, statsResult, trendsResult] = await Promise.allSettled([
          fetchEvents(),
          fetchDashboardStats(),
          fetchTrends(),
        ]);

        if (statsResult.status === 'rejected') {
          logError(statsResult.reason, '加载统计数据');
        }
        if (trendsResult.status === 'rejected') {
          logError(trendsResult.reason, '加载趋势数据');
        }

        if (!isMountedRef.current) return;
        setLoading(false);
      } catch (error: any) {
        logError(error, '初始化数据');
        try {
          await fetchRecentEvents();
        } catch (e: any) {
          logError(e, '获取最近事件也失败');
        } finally {
          if (isMountedRef.current) setLoading(false);
        }
      }
    };

    initData();

    return () => {
      isMountedRef.current = false;
      if (statsTimer) clearTimeout(statsTimer);
    };
  }, [initialEventId]);

  // 显示事件详情
  const showEventDetail = async (record: EventData) => {
    try {
      setDetailLoading(true);
      const eventData = await request.get(`/api/events/${record.id}`);
      if (!isMountedRef.current) return;
      setSelectedEventDetail(eventData);
      setDetailVisible(true);
    } catch (error: any) {
      if (isMountedRef.current) {
        handleError(error, '获取事件详情');
      }
    } finally {
      if (isMountedRef.current) {
        setDetailLoading(false);
      }
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

  // 基于真实事件状态计算待处理异常
  const calculatePendingAlerts = (): number => {
    return events.filter((event) => event.isAnomaly && event.status !== 'RESOLVED').length;
  };

  // 基于真实事件状态计算已处理异常
  const calculateResolvedAlerts = (): number => {
    return events.filter((event) => event.isAnomaly && event.status === 'RESOLVED').length;
  };

  // 基于真实状态计算误报
  const calculateFalsePositiveAlerts = (): number => {
    return events.filter((event) => event.status === 'FALSE_POSITIVE').length;
  };

  // 数据完整性评分（关键字段非空比例）
  const calculateDataIntegrity = (): number => {
    if (events.length === 0) return 0;
    const requiredFields = ['timestamp', 'eventType', 'severity', 'status'] as const;
    const completeCount = events.filter((event) =>
      requiredFields.every((field) => Boolean((event as any)[field]))
    ).length;
    return Number(((completeCount / events.length) * 100).toFixed(1));
  };

  // 数据准确性评分（优先使用AI置信度，否则使用异常分数）
  const calculateDataAccuracy = (): number => {
    const scores = events
      .map((event) => event.aiAnomalyScore ?? event.anomalyScore)
      .filter((score): score is number => typeof score === 'number');
    if (scores.length === 0) return 0;
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Number((avgScore * 100).toFixed(1));
  };

  const calculateProcessingRate = (): number => {
    const anomalyEvents = getAnomalyEvents();
    if (anomalyEvents === 0) return 100;
    return Number(((calculateResolvedAlerts() / anomalyEvents) * 100).toFixed(1));
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
              聚焦事件检索、关联分析与趋势统计，支撑溯源研判
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
      styles={{ body: { padding: '20px' } }}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '11px' }}>总事件</Text>
              <div><Text strong style={{ fontSize: '18px', color: '#096dd9' }}>{getTotalEvents()}</Text></div>
            </div>
            <div style={{ width: 1, background: '#f0f0f0', alignSelf: 'stretch' }} />
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '11px' }}>异常</Text>
              <div><Text strong style={{ fontSize: '18px', color: '#d46b08' }}>{getAnomalyEvents()}</Text></div>
            </div>
            <div style={{ width: 1, background: '#f0f0f0', alignSelf: 'stretch' }} />
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '11px' }}>正常</Text>
              <div><Text strong style={{ fontSize: '18px', color: '#389e0d' }}>{getNormalEvents()}</Text></div>
            </div>
            <div style={{ width: 1, background: '#f0f0f0', alignSelf: 'stretch' }} />
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '11px' }}>异常率</Text>
              <div><Text strong style={{ fontSize: '18px', color: getAnomalyRate() > 10 ? '#ff4d4f' : '#52c41a' }}>{getAnomalyRate().toFixed(1)}%</Text></div>
            </div>
          </div>
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
        </div>
      </div>
    </Card>
  );

  // 渲染统计分析页面
  const renderStatisticsTab = () => (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChartOutlined />
          <Text strong>事件统计分析</Text>
        </div>
      }
      style={{ borderRadius: '12px', marginBottom: '24px' }}
    >
      {!dashboardStats ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#999' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>正在加载统计数据...</div>
        </div>
      ) : (
        <>
          {/* 今日事件 + 严重程度分布 */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'stretch' }}>
            <div style={{
              flex: '0 0 140px',
              background: 'linear-gradient(135deg, #f6ffed 0%, #e6f7e3 100%)',
              borderRadius: 12,
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              border: '1px solid #b7eb8f',
            }}>
              <Text type="secondary" style={{ fontSize: 12 }}>今日事件</Text>
              <Text strong style={{ fontSize: 32, color: '#389e0d', lineHeight: 1.2 }}>{dashboardStats.todayLogs}</Text>
              <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>日均 {dashboardStats.avgDailyEvents?.toFixed(0) || '-'}</Text>
            </div>

            {dashboardStats.severityCounts && Object.keys(dashboardStats.severityCounts).length > 0 ? (
              <div style={{
                flex: 1,
                background: '#fafafa',
                borderRadius: 12,
                padding: '14px 20px',
                border: '1px solid #f0f0f0',
              }}>
                <Text strong style={{ fontSize: 13, marginBottom: 10, display: 'block' }}>严重程度分布</Text>
                <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end', height: 80 }}>
                  {Object.entries(dashboardStats.severityCounts)
                    .sort(([a], [b]) => {
                      const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                      return (order[a] ?? 9) - (order[b] ?? 9);
                    })
                    .map(([severity, count]) => {
                      const severityConfig: Record<string, { color: string; label: string; bg: string }> = {
                        CRITICAL: { color: '#722ed1', label: '严重', bg: 'rgba(114,46,209,0.1)' },
                        HIGH: { color: '#ff4d4f', label: '高危', bg: 'rgba(255,77,79,0.1)' },
                        MEDIUM: { color: '#fa8c16', label: '中危', bg: 'rgba(250,140,22,0.1)' },
                        LOW: { color: '#52c41a', label: '低危', bg: 'rgba(82,196,26,0.1)' },
                      };
                      const info = severityConfig[severity] || { color: '#1890ff', label: severity, bg: 'rgba(24,144,255,0.1)' };
                      const maxCount = Math.max(...Object.values(dashboardStats.severityCounts).map(Number), 1);
                      const heightPct = (Number(count) / maxCount) * 100;
                      const pct = dashboardStats.totalLogs > 0 ? ((Number(count) / dashboardStats.totalLogs) * 100).toFixed(1) : '0.0';
                      return (
                        <div key={severity} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <Text strong style={{ fontSize: 13, color: info.color }}>{Number(count).toLocaleString()}</Text>
                          <div style={{
                            width: '60%',
                            height: `${heightPct}%`,
                            minHeight: 4,
                            background: info.color,
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.3s',
                          }} />
                          <Tag color={info.color} style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>{info.label}</Tag>
                          <Text type="secondary" style={{ fontSize: 10 }}>{pct}%</Text>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div style={{
                flex: 1,
                background: '#fafafa',
                borderRadius: 12,
                padding: '40px 0',
                border: '1px solid #f0f0f0',
                textAlign: 'center',
                color: '#999',
              }}>
                <BarChartOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                <div style={{ marginTop: 8 }}>暂无严重程度统计数据</div>
                <Button type="primary" size="small" onClick={() => fetchDashboardStats()} loading={statisticsLoading} style={{ marginTop: 12 }}>
                  重新加载
                </Button>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              最后更新: {dayjs(dashboardStats.lastUpdate).format('YYYY-MM-DD HH:mm:ss')}
            </Text>
          </div>
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
          <Text strong>事件趋势分析</Text>
          {trends && trends.length > 0 && (
            <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
              最近 {trends.length} 个时间点
            </Text>
          )}
        </div>
      }
      extra={trends && trends.length > 0 && (
        <Button icon={<ReloadOutlined />} size="small" onClick={() => fetchTrends()}>刷新</Button>
      )}
      style={{ borderRadius: '12px', marginBottom: '24px' }}
    >
      {trends && trends.length > 0 ? (
        <Table
          dataSource={[...trends].reverse().map((t, i) => ({ ...t, key: i }))}
          size="small"
          pagination={false}
          scroll={{ y: 400 }}
          columns={[
            {
              title: '时间',
              dataIndex: 'timestamp',
              width: 160,
              render: (ts: string) => {
                const isCurrent = dayjs(ts).isSame(dayjs(), 'hour');
                return (
                  <span>
                    {dayjs(ts).format('MM-DD HH:mm')}
                    {isCurrent && <Tag color="success" style={{ marginLeft: 4 }}>当前</Tag>}
                  </span>
                );
              }
            },
            {
              title: '总事件',
              dataIndex: 'eventCount',
              width: 100,
              render: (v: number) => <Text strong>{v}</Text>
            },
            {
              title: '异常事件',
              dataIndex: 'anomalyCount',
              width: 100,
              render: (v: number) => <Text strong style={{ color: v > 0 ? '#ff4d4f' : undefined }}>{v}</Text>
            },
            {
              title: '异常率',
              dataIndex: 'anomalyRate',
              width: 100,
              render: (v: number) => {
                const pct = (v * 100).toFixed(1);
                const color = v > 0.1 ? '#ff4d4f' : v > 0.05 ? '#fa8c16' : '#52c41a';
                return <Text strong style={{ color }}>{pct}%</Text>;
              }
            },
            {
              title: '分布',
              key: 'bar',
              render: (_: any, r: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ flex: 1, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(1 - r.anomalyRate) * 100}%`, height: '100%', background: '#52c41a' }} />
                    <div style={{ width: `${r.anomalyRate * 100}%`, height: '100%', background: '#ff4d4f' }} />
                  </div>
                </div>
              )
            }
          ]}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          <LineChartOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
          <div style={{ marginTop: 8 }}>暂无趋势数据</div>
          <Space style={{ marginTop: 12 }}>
            <Button type="primary" size="small" onClick={() => fetchTrends()} loading={statisticsLoading}>重新加载</Button>
            <Button size="small" onClick={() => { setQueryParams(prev => ({ ...prev, startTime: dayjs().subtract(1, 'day'), endTime: dayjs() })); fetchTrends(); }}>最近24小时</Button>
          </Space>
        </div>
      )}
    </Card>
  );

  const activeFilterItems = [
    queryParams.startTime && queryParams.endTime
      ? `时间: ${queryParams.startTime.format('MM-DD HH:mm')} ~ ${queryParams.endTime.format('MM-DD HH:mm')}`
      : '时间: 不限',
    queryParams.eventType ? `事件类型: ${translate(EVENT_TYPE_MAP, queryParams.eventType)}` : null,
    queryParams.severity ? `严重程度: ${getSeverity(queryParams.severity).label}` : null,
    queryParams.keyword ? `关键词: ${queryParams.keyword}` : null,
    queryParams.isAnomaly === undefined ? null : `异常类型: ${queryParams.isAnomaly ? '仅异常' : '仅正常'}`,
  ].filter(Boolean) as string[];

  return (
    <div style={{ 
      padding: '16px',
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
            <div>
              <Text strong style={{ fontSize: '15px' }}>注意：检测到 {getAnomalyEvents()} 个异常事件</Text>
              <div style={{ fontSize: '13px', color: 'rgba(0,0,0,0.65)', marginTop: '2px' }}>
                当前异常率 {getAnomalyRate().toFixed(1)}%，建议及时分析处理
              </div>
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

      {/* 主内容区域 */}
      {activeTab === 'events' && (
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SearchOutlined />
              <Text strong style={{ fontSize: '16px' }}>事件查询与统计</Text>
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
            borderRadius: '12px',
            marginBottom: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
          }}
          styles={{ body: { padding: '14px' } }}
        >
          {/* 统计数字区 */}
          <div style={{ 
            marginBottom: '12px',
            padding: '10px 16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            flexWrap: 'wrap'
          }}>
            <Text style={{ fontSize: '13px' }}>总事件: <Text strong>{pagination.total}</Text></Text>
            <Text style={{ fontSize: '13px' }}>异常: <Text strong style={{ color: '#ff4d4f' }}>{getAnomalyEvents()}</Text></Text>
            <Text style={{ fontSize: '13px' }}>已解决: <Text strong style={{ color: '#52c41a' }}>{events.filter((event) => event.status === 'RESOLVED').length}</Text></Text>
            <Text style={{ fontSize: '13px' }}>异常率: <Text strong>{getAnomalyRate().toFixed(1)}%</Text></Text>
          </div>

          {/* 筛选区 */}
          <div style={{ 
            border: '1px solid #e8e8e8', 
            borderRadius: '16px', 
            padding: '16px', 
            background: '#fafafa',
            marginBottom: '12px'
          }}>
            <Form form={searchForm} layout="vertical">
              {/* 第一行：关键词 */}
              <div style={{ marginBottom: '12px' }}>
                <Form.Item name="keyword" style={{ marginBottom: 0 }}>
                  <Input
                    placeholder="搜索关键词（事件描述、源IP、用户等）..."
                    prefix={<SearchOutlined style={{ color: '#999' }} />}
                    onPressEnter={handleSearch}
                    style={{ height: '36px', borderRadius: '18px' }}
                    allowClear
                  />
                </Form.Item>
              </div>
              
              {/* 第二行：下拉框 */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <Form.Item name="timeRange" style={{ marginBottom: 0, flex: '0 0 auto', minWidth: '320px' }}>
                  <RangePicker
                    allowClear
                    showTime
                    format="YYYY-MM-DD HH:mm:ss"
                    style={{ width: '100%', borderRadius: '8px' }}
                    placeholder={['开始时间', '结束时间']}
                    onChange={() => {
                      setTimeout(() => handleSearch(), 0);
                    }}
                  />
                </Form.Item>
                <Form.Item name="eventType" style={{ marginBottom: 0, flex: '1 1 160px', minWidth: '160px' }}>
                  <Select
                    placeholder="事件类型"
                    style={{ width: '100%', borderRadius: '8px' }}
                    allowClear
                    onChange={() => {
                      setTimeout(() => handleSearch(), 0);
                    }}
                  >
                    <Option value="LOGIN_SUCCESS">登录成功</Option>
                    <Option value="LOGIN_FAILURE">登录失败</Option>
                    <Option value="LOGOUT">注销</Option>
                    <Option value="PERMISSION_DENIED">权限拒绝</Option>
                    <Option value="FILE_ACCESS">文件访问</Option>
                    <Option value="NETWORK_CONNECTION">网络连接</Option>
                    <Option value="SYSTEM_STARTUP">系统启动</Option>
                    <Option value="SYSTEM_SHUTDOWN">系统关闭</Option>
                    <Option value="PROCESS_CREATION">进程创建</Option>
                    <Option value="PROCESS_TERMINATION">进程终止</Option>
                    <Option value="SERVICE_START">服务启动</Option>
                    <Option value="SERVICE_STOP">服务停止</Option>
                    <Option value="CONFIGURATION_CHANGE">配置变更</Option>
                    <Option value="SECURITY_POLICY_CHANGE">安全策略变更</Option>
                    <Option value="MALWARE_DETECTED">恶意软件检测</Option>
                    <Option value="SUSPICIOUS_ACTIVITY">可疑活动</Option>
                    <Option value="DATA_ACCESS">数据访问</Option>
                    <Option value="PRIVILEGE_ESCALATION">权限提升</Option>
                    <Option value="BRUTE_FORCE_ATTACK">暴力破解</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="severity" style={{ marginBottom: 0, flex: '1 1 130px', minWidth: '130px' }}>
                  <Select
                    placeholder="严重程度"
                    style={{ width: '100%', borderRadius: '8px' }}
                    allowClear
                    onChange={() => {
                      setTimeout(() => handleSearch(), 0);
                    }}
                  >
                    <Option value="CRITICAL">严重</Option>
                    <Option value="HIGH">高危</Option>
                    <Option value="MEDIUM">中危</Option>
                    <Option value="LOW">低危</Option>
                  </Select>
                </Form.Item>
              </div>
              
              {/* 第三行：快捷标签 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>快捷:</Text>
                <Tag 
                  style={{ 
                    margin: 0, 
                    padding: '2px 12px', 
                    borderRadius: '12px', 
                    cursor: 'pointer',
                    background: '#fff',
                    border: '1px solid #ff4d4f',
                    color: '#ff4d4f'
                  }} 
                  onClick={() => {
                    const q = { ...queryParams, isAnomaly: true };
                    setQueryParams(q);
                    searchForm.setFieldsValue({ isAnomaly: true });
                    fetchEvents(1, pagination.pageSize, q);
                  }}
                >异常</Tag>
                <Tag 
                  style={{ 
                    margin: 0, 
                    padding: '2px 12px', 
                    borderRadius: '12px', 
                    cursor: 'pointer',
                    background: '#fff',
                    border: '1px solid #cf1322',
                    color: '#cf1322'
                  }} 
                  onClick={() => {
                    const q = { ...queryParams, severity: 'CRITICAL' };
                    setQueryParams(q);
                    searchForm.setFieldsValue({ severity: 'CRITICAL' });
                    fetchEvents(1, pagination.pageSize, q);
                  }}
                >严重</Tag>
                <Tag 
                  style={{ 
                    margin: 0, 
                    padding: '2px 12px', 
                    borderRadius: '12px', 
                    cursor: 'pointer',
                    background: '#fff',
                    border: '1px solid #fa8c16',
                    color: '#fa8c16'
                  }} 
                  onClick={() => {
                    const q = { ...queryParams, severity: 'HIGH' };
                    setQueryParams(q);
                    searchForm.setFieldsValue({ severity: 'HIGH' });
                    fetchEvents(1, pagination.pageSize, q);
                  }}
                >高危</Tag>
                <div style={{ flex: 1 }} />
                <Button 
                  size="small" 
                  type="text" 
                  style={{ color: '#999' }}
                  onClick={() => handleReset()}
                >清空筛选</Button>
              </div>
            </Form>
          </div>

          {/* 事件表格 */}
          <div style={{ 
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #f0f0f0'
          }}>
            <Table
              columns={columns}
              dataSource={events}
              rowKey="id"
              loading={loading}
              size="small"
              scroll={{ x: 940, y: 600 }}
              rowClassName={(record) => {
                if (record.id === highlightEventId) return 'highlighted-event-row';
                if (record.isAnomaly) return 'anomaly-event-row';
                return 'normal-event-row';
              }}
              onRow={(record) => ({
                onClick: () => showEventDetail(record),
                style: { cursor: 'pointer' },
              })}
              pagination={{
                ...pagination,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showQuickJumper: true,
                showTotal: (total, range) =>
                  <div style={{ fontSize: '13px' }}>
                    显示第 <Text strong>{range[0]}</Text> 到 <Text strong>{range[1]}</Text> 条，共 <Text strong>{total}</Text> 条事件
                  </div>,
                style: { padding: '16px 24px', margin: 0 }
              }}
              onChange={handleTableChange}
              locale={{
                emptyText: events.length === 0 ?
                  <div style={{ padding: '40px 0', textAlign: 'center' }}>
                    <DatabaseOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                    <div style={{ fontSize: '16px', marginBottom: '8px' }}>暂无事件数据</div>
                    <Text type="secondary">当前查询条件下未找到匹配的事件</Text>
                    <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <Button size="small" onClick={handleReset}>清空筛选</Button>
                      <Button size="small" type="primary" onClick={handleRestoreRecent7Days}>恢复最近7天</Button>
                    </div>
                  </div> : undefined,
                // 排序提示文本中文化
                triggerAsc: '点击升序',
                triggerDesc: '点击降序',
                cancelSort: '点击取消排序'
              }}
            />
          </div>
        </Card>
      )}

      <Modal
        title="事件详情"
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setSelectedEventDetail(null);
        }}
        width={720}
        footer={null}
      >
        {detailLoading || !selectedEventDetail ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <Text type="secondary">加载中...</Text>
          </div>
        ) : (
          <div>
            {/* 基本信息 */}
            <Descriptions column={2} bordered size="small" style={{ marginBottom: '16px' }}>
              <Descriptions.Item label="事件ID" span={2}>
                <Text copyable style={{ fontFamily: 'monospace' }}>{selectedEventDetail.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="时间">
                {selectedEventDetail.timestamp ? dayjs(selectedEventDetail.timestamp).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="事件类型">
                <Tag color="blue">{translate(EVENT_TYPE_MAP, selectedEventDetail.eventType)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="严重程度">
                <Tag color={getSeverity(selectedEventDetail.severity).color}>{getSeverity(selectedEventDetail.severity).label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatus(selectedEventDetail.status).color}>{getStatus(selectedEventDetail.status).label}</Tag>
              </Descriptions.Item>
              {selectedEventDetail.sourceIp && (
                <Descriptions.Item label="源IP">{selectedEventDetail.sourceIp}</Descriptions.Item>
              )}
              {selectedEventDetail.userName && (
                <Descriptions.Item label="用户">{selectedEventDetail.userName}</Descriptions.Item>
              )}
              {selectedEventDetail.hostName && (
                <Descriptions.Item label="主机名">{selectedEventDetail.hostName}</Descriptions.Item>
              )}
              <Descriptions.Item label="是否异常">
                <Tag color={selectedEventDetail.isAnomaly ? 'red' : 'green'}>
                  {selectedEventDetail.isAnomaly ? '异常' : '正常'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {/* 事件描述 */}
            <div style={{ 
              padding: '12px 16px', 
              background: '#fafafa', 
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>事件描述</Text>
              <Paragraph style={{ margin: 0, color: '#333' }}>
                {getDisplayText(selectedEventDetail.normalizedMessage || selectedEventDetail.rawMessage || selectedEventDetail.description)}
              </Paragraph>
            </div>

            {/* 异常分数（仅异常事件显示） */}
            {selectedEventDetail.isAnomaly && (
              <div style={{ 
                display: 'flex', 
                gap: '16px', 
                padding: '12px 16px', 
                background: '#fff2f0', 
                borderRadius: '8px',
                border: '1px solid #ffccc7'
              }}>
                {selectedEventDetail.anomalyScore !== undefined && (
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>异常分数</Text>
                    <div><Text strong style={{ color: '#ff4d4f' }}>{selectedEventDetail.anomalyScore}</Text></div>
                  </div>
                )}
                {selectedEventDetail.aiAnomalyScore !== undefined && (
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>AI异常分数</Text>
                    <div><Text strong style={{ color: '#ff4d4f' }}>{(selectedEventDetail.aiAnomalyScore * 100).toFixed(1)}%</Text></div>
                  </div>
                )}
                {selectedEventDetail.combinedScore !== undefined && (
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>综合分数</Text>
                    <div><Text strong style={{ color: '#ff4d4f' }}>{(selectedEventDetail.combinedScore * 100).toFixed(1)}%</Text></div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

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
        .highlighted-event-row {
          background: rgba(24, 144, 255, 0.12) !important;
          border-left: 4px solid #1890ff !important;
          box-shadow: inset 0 0 0 1px rgba(24, 144, 255, 0.3) !important;
          animation: highlightPulse 2s ease-in-out 3;
        }
        @keyframes highlightPulse {
          0%   { background: rgba(24, 144, 255, 0.25) !important; }
          50%  { background: rgba(24, 144, 255, 0.06) !important; }
          100% { background: rgba(24, 144, 255, 0.12) !important; }
        }
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