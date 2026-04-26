// src/pages/Alerts.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { history } from 'umi';
import { 
  Table, 
  Card, 
  Tag, 
  Button, 
  Space, 
  message, 
  Modal, 
  Input,
  Select,
  Row,
  Col,
  Badge,
  Empty,
  Alert,
  Tooltip,
  Typography,
  Statistic,
  Progress,
  Form,
  Descriptions,
  Divider,
  Segmented,
  Rate
} from 'antd';
import { 
  CheckOutlined, 
  ExclamationCircleOutlined, 
  SearchOutlined,
  WarningOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  FilterOutlined,
  MoreOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  LineChartOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  FireOutlined,
  SecurityScanOutlined,
  SettingOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  QuestionCircleOutlined,
  ShieldOutlined,
  UserOutlined,
  CloudServerOutlined,
  BellOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

// 导入统一 API 服务
import { api } from '@/services/api';
import type { SecurityAlert } from '@/types/alert';
import { getAlertSourceLabel, getAlertTypeLabel, getSeverity, getStatus, normalizeStatusValue } from '@/utils/enumLabels';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;

// 类型定义（如果需要）
interface AlertSearchParams {
  keyword?: string;
  alertLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | undefined;
  alertType?: string | undefined;
  handled?: boolean | undefined;
  status?: string | undefined;
  page?: number;
  size?: number;
}

interface AlertStatistics {
  totalAlerts: number;
  unhandledAlerts: number;
  alertsByLevel: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
}

// 带超时的 Promise 包装函数
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('请求超时')), timeoutMs)
    )
  ]);
};

// 颜色常量
const LEVEL_COLORS = {
  CRITICAL: '#ff4d4f',
  HIGH: '#fa8c16',
  MEDIUM: '#faad14',
  LOW: '#52c41a',
  ALL: '#1890ff'
};

const LEVEL_GRADIENTS = {
  CRITICAL: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
  HIGH: 'linear-gradient(135deg, #fa8c16 0%, #d48806 100%)',
  MEDIUM: 'linear-gradient(135deg, #faad14 0%, #d4a106 100%)',
  LOW: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
  HEALTHY: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
  WARNING: 'linear-gradient(135deg, #faad14 0%, #d4a106 100%)',
  CRITICAL_GRADIENT: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)'
};

const AlertsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [alertList, setAlertList] = useState<SecurityAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [statistics, setStatistics] = useState<AlertStatistics | null>(null);
  const [searchForm] = Form.useForm();
  const [searchParams, setSearchParams] = useState<AlertSearchParams>({
    keyword: '',
    alertLevel: undefined,
    alertType: undefined,
    handled: undefined,
    status: undefined,
    page: 0,
    size: 10
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);

  // 加载告警数据 - 修改后的版本
  const loadAlerts = useCallback(async (
    page = 1,
    pageSize = 10,
    overrideParams?: Partial<AlertSearchParams>
  ) => {
    setLoading(true);
    try {
      const effectiveSearchParams: AlertSearchParams = {
        ...searchParams,
        ...overrideParams,
      };
      console.log('加载告警，参数:', {
        page: page - 1, // 后端从0开始
        size: pageSize,
        ...effectiveSearchParams
      });
      
      // 构建查询参数（Ant Design 清空项常为 null，需与 undefined 一并剔除，否则会干扰 Spring 绑定）
      const params: any = {
        page: page - 1, // 后端从0开始
        size: pageSize,
        keyword: effectiveSearchParams.keyword || undefined,
        alertLevel: effectiveSearchParams.alertLevel || undefined,
        alertType: effectiveSearchParams.alertType || undefined,
        // 不再使用 handled 参数，统一用 status
        status: normalizeStatusValue(effectiveSearchParams.status) || undefined,
      };

      Object.keys(params).forEach(key => {
        if (params[key] === undefined || params[key] === null || params[key] === '') {
          delete params[key];
        }
      });
      
      // 使用统一的API服务
      const response = await withTimeout(
        api.alert.searchSecurityAlerts(params),
        10000 // 10秒超时
      );
      
      console.log('加载告警响应:', response);
      
      // ========== 修改这里 ==========
      // AlertController 直接返回 Page<AlertResponse>，没有外层的 {code: 200, data: ...} 包装
      // 所以我们需要直接处理 response，而不是 response.data
      
      const data = response; // 直接使用 response，不是 response.data
      
      if (data && typeof data === 'object') {
        // 检查是否是 Spring Data Page 格式
        if (data.content !== undefined) {
          // Spring Data Page 格式
          const sortedContent = [...(data.content || [])].sort((a: SecurityAlert, b: SecurityAlert) => a.id - b.id);
          setAlertList(sortedContent);
          setTotal(data.totalElements || 0);
          setPagination(prev => ({
            ...prev,
            current: page,
            pageSize,
            total: data.totalElements || 0
          }));
          
          console.log(`加载告警成功: 共 ${data.totalElements} 条，当前页 ${(data.content || []).length} 条`);
          
          // 如果没有数据，可以显示友好提示
          if (data.totalElements === 0) {
            console.log('数据库中没有告警数据');
            // 可以显示信息提示，但不一定是错误
            // message.info('暂无告警数据');
          }
        } else if (Array.isArray(data)) {
          // 直接数组格式
          const sortedList = [...data].sort((a: SecurityAlert, b: SecurityAlert) => a.id - b.id);
          setAlertList(sortedList);
          setTotal(data.length);
          setPagination(prev => ({
            ...prev,
            current: page,
            pageSize,
            total: data.length
          }));
          console.log(`加载告警成功: 直接数组格式，共 ${data.length} 条`);
        } else {
          // 尝试作为通用API响应处理（有些接口可能还是有包装的）
          if (data.code === 200) {
            const responseData = data.data;
            if (responseData && responseData.content !== undefined) {
              const sortedContent = [...(responseData.content || [])].sort((a: SecurityAlert, b: SecurityAlert) => a.id - b.id);
              setAlertList(sortedContent);
              setTotal(responseData.totalElements || 0);
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize,
                total: responseData.totalElements || 0
              }));
            } else if (Array.isArray(responseData)) {
              const sortedList = [...responseData].sort((a: SecurityAlert, b: SecurityAlert) => a.id - b.id);
              setAlertList(sortedList);
              setTotal(responseData.length);
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize,
                total: responseData.length
              }));
            }
          } else {
            console.warn('API返回格式异常:', data);
            message.warning('数据格式异常');
            setAlertList([]);
            setTotal(0);
          }
        }
      } else {
        console.error('API返回异常:', response);
        message.error('加载告警失败');
        setAlertList([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('加载告警失败:', error);
      message.error('加载告警失败: ' + (error.message || '未知错误'));
      setAlertList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // 搜索告警
  const handleSearch = useCallback(async () => {
    const values = searchForm.getFieldsValue();

    // 更新搜索参数
    const newSearchParams: AlertSearchParams = {
      ...searchParams,
      keyword: (values.keyword ?? '') as string,
      alertLevel: values.alertLevel ?? undefined,
      alertType: values.alertType ?? undefined,
      handled: undefined, // 不再使用 handled，统一用 status
      status: normalizeStatusValue(values.status) || undefined,
      page: 0
    };
    
    setSearchParams(newSearchParams);
    setPagination(prev => ({ ...prev, current: 1 }));
    
    // 执行搜索
    await loadAlerts(1, pagination.pageSize, newSearchParams);
  }, [searchForm, searchParams, pagination.pageSize, loadAlerts]);

  // 重置搜索
  const handleReset = useCallback(() => {
    searchForm.resetFields();
    const resetParams: AlertSearchParams = {
      keyword: '',
      alertLevel: undefined,
      alertType: undefined,
      handled: undefined,
      status: undefined,
      page: 0,
      size: 10
    };
    
    setSearchParams(resetParams);
    setPagination(prev => ({ ...prev, current: 1 }));
    
    // 重置后重新加载
    loadAlerts(1, pagination.pageSize, resetParams);
  }, [searchForm, loadAlerts, pagination.pageSize]);

  // 标记告警为已处理 - 修改后的版本
  const handleMarkAsHandled = useCallback(async (alert: SecurityAlert) => {
    confirm({
      title: '确认处理',
      icon: <ExclamationCircleOutlined />,
      content: `确定要将警报 "${getAlertTypeLabel(alert.alertType)}" 标记为已处理吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          
          // 使用统一 API 服务
          const response = await withTimeout(
            api.alert.updateAlertStatus(
              alert.id.toString(), 
              'RESOLVED',
              'system',
              '通过界面处理'
            ),
            5000
          );
          
          // ========== 修改这里 ==========
          // 根据AlertController的返回类型，updateAlertStatus返回的是ResponseEntity<Void>
          // 成功时返回200 OK，失败时返回404或400
          // 所以我们需要检查响应状态，而不是response.code
          
          console.log('更新状态响应:', response);
          
          // 如果响应是空的（204 No Content）或者请求成功
          if (response === undefined || response === null || response === '' ||
              (typeof response === 'object' && Object.keys(response).length === 0)) {
            message.success('告警已标记为已处理');
            // 更新本地状态
            setAlertList(prev => 
              prev.map(item => 
                item.id === alert.id 
                  ? { ...item, handled: true, status: 'RESOLVED' }
                  : item
              )
            );
          } else if (typeof response === 'object' && response.code === 200) {
            // 如果API还是有包装格式
            message.success('告警已标记为已处理');
            setAlertList(prev => 
              prev.map(item => 
                item.id === alert.id 
                  ? { ...item, handled: true, status: 'RESOLVED' }
                  : item
              )
            );
          } else {
            const errorMsg = (response as any)?.message || '操作失败';
            message.error(errorMsg);
          }
        } catch (error) {
          console.error('标记告警失败:', error);
          message.error('操作失败，请重试');
        } finally {
          setLoading(false);
        }
      },
    });
  }, []);

  // 删除告警 - 修改后的版本
  const handleDeleteAlert = useCallback(async (alert: SecurityAlert) => {
    confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除警报 "${getAlertTypeLabel(alert.alertType)}" 吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          
          // 使用统一 API 服务
          const response = await withTimeout(
            api.alert.deleteAlert(alert.id.toString()),
            5000
          );
          
          // ========== 修改这里 ==========
          // 根据AlertController的返回类型，deleteAlert返回的是ResponseEntity<Void>
          // 成功时返回200 OK，失败时返回404或400
          
          console.log('删除响应:', response);
          
          // 如果响应是空的（204 No Content）或者请求成功
          if (response === undefined || response === null || response === '' ||
              (typeof response === 'object' && Object.keys(response).length === 0)) {
            message.success('告警已删除');
            // 从列表中移除
            setAlertList(prev => prev.filter(item => item.id !== alert.id));
            setTotal(prev => prev - 1);
            setPagination(prev => ({ ...prev, total: prev.total - 1 }));
          } else if (typeof response === 'object' && response.code === 200) {
            // 如果API还是有包装格式
            message.success('告警已删除');
            setAlertList(prev => prev.filter(item => item.id !== alert.id));
            setTotal(prev => prev - 1);
            setPagination(prev => ({ ...prev, total: prev.total - 1 }));
          } else {
            const errorMsg = (response as any)?.message || '删除失败';
            message.error(errorMsg);
          }
        } catch (error) {
          console.error('删除告警失败:', error);
          message.error('删除失败，请重试');
        } finally {
          setLoading(false);
        }
      },
    });
  }, []);

  // 查看告警详情 - 修改后的版本
  const showAlertDetail = useCallback(async (alert: SecurityAlert) => {
    try {
      setDetailLoading(true);
      // 使用统一 API 服务
      const response = await withTimeout(
        api.alert.getAlertById(alert.id.toString()),
        5000
      );
      
      console.log('获取详情响应:', response);
      
      // ========== 修改这里 ==========
      // AlertController的getAlert返回ResponseEntity<AlertResponse>
      // 所以response直接就是AlertResponse对象
      
      let alertData;
      if (response && typeof response === 'object') {
        if (response.code === 200) {
          // 有包装格式
          alertData = response.data;
        } else {
          // 直接是AlertResponse
          alertData = response;
        }
      } else {
        message.error('获取告警详情失败');
        return;
      }
      
      if (alertData) {
        setSelectedAlert(alertData as SecurityAlert);
        setDetailVisible(true);
      } else {
        message.error('获取告警详情失败');
      }
    } catch (error) {
      console.error('获取告警详情错误:', error);
      message.error('获取告警详情失败');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // 加载统计信息 - 修改后的版本
  const loadStatistics = useCallback(async () => {
    try {
      setStatisticsLoading(true);
      console.log('加载统计信息...');
      
      const response = await withTimeout(
        api.alert.getAlertStatistics(),
        5000
      );
      
      console.log('统计信息响应:', response);
      
      // ========== 修改这里 ==========
      // AlertController的getStatistics返回ResponseEntity<Map<String, Object>>
      // 所以response直接就是Map对象
      
      let data;
      if (response && typeof response === 'object') {
        if (response.code === 200) {
          // 有包装格式
          data = response.data;
        } else {
          // 直接是统计数据对象
          data = response;
        }
      }
      
      if (data) {
        // 根据后端返回的数据结构调整
        const stats: AlertStatistics = {
          totalAlerts: data.totalAlerts || data.total || 0,
          unhandledAlerts: data.unhandledAlerts || 0,
          alertsByLevel: {
            CRITICAL: data.criticalCount || data.alertsByLevel?.CRITICAL || 0,
            HIGH: data.highCount || data.alertsByLevel?.HIGH || 0,
            MEDIUM: data.mediumCount || data.alertsByLevel?.MEDIUM || 0,
            LOW: data.lowCount || data.alertsByLevel?.LOW || 0
          }
        };
        
        setStatistics(stats);
        console.log('统计信息设置成功:', stats);
      } else {
        console.warn('统计API返回数据为空');
        // 不显示错误消息，使用本地计算
      }
    } catch (error) {
      console.error('加载统计信息失败:', error);
      // 静默失败，不影响主要功能
    } finally {
      setStatisticsLoading(false);
    }
  }, []);

  // 表格分页处理：必须带上当前筛选条件，否则闭包里的 searchParams 可能与表单不一致导致「翻页后筛选失效」
  const handleTableChange = (newPagination: any) => {
    if (!newPagination || newPagination.current == null) return;
    setPagination((prev) => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize ?? prev.pageSize,
      total: newPagination.total ?? prev.total,
    }));
    loadAlerts(newPagination.current, newPagination.pageSize ?? pagination.pageSize, searchParams);
  };

  // 组件加载时获取数据
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // 设置表单初始值
        searchForm.setFieldsValue({
          keyword: searchParams.keyword,
          alertLevel: searchParams.alertLevel,
          alertType: searchParams.alertType,
          status: searchParams.status
        });

        // 优先加载主要数据（告警列表）
        await loadAlerts(1, pagination.pageSize);
        
        // 设置加载完成
        setLoading(false);

        // 延迟加载统计和趋势数据（非关键数据）
        setTimeout(async () => {
          try {
            await loadStatistics();
          } catch (error) {
            console.error('加载统计数据失败:', error);
            // 不影响主要功能，静默失败
          }
        }, 300); // 延迟300ms加载，避免阻塞初始渲染
      } catch (error) {
        console.error('初始化数据错误:', error);
        // 如果主要API失败，尝试获取最近告警
        try {
          // 可以添加获取最近告警的备用方案
          message.error('加载告警数据失败，请检查网络连接');
        } finally {
          setLoading(false);
        }
      }
    };

    initData();
  }, []); // 只在组件加载时执行一次

  // 计算统计信息（如果API没有返回统计数据）
  const unhandledCount = alertList.filter(alert => !alert.handled).length;
  const criticalCount = alertList.filter(alert => alert.alertLevel === 'CRITICAL').length;
  
  // 使用API返回的统计数据或本地计算的数据
  const displayStats = statistics || {
    totalAlerts: total,
    unhandledAlerts: unhandledCount,
    alertsByLevel: {
      CRITICAL: criticalCount,
      HIGH: alertList.filter(alert => alert.alertLevel === 'HIGH').length,
      MEDIUM: alertList.filter(alert => alert.alertLevel === 'MEDIUM').length,
      LOW: alertList.filter(alert => alert.alertLevel === 'LOW').length
    }
  };

  // 表格列定义
  const columns: ColumnsType<SecurityAlert> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: '告警级别',
      dataIndex: 'alertLevel',
      key: 'alertLevel',
      width: 100,
      render: (level: SecurityAlert['alertLevel']) => {
        const colorMap = {
          CRITICAL: '#ff4d4f',
          HIGH: '#fa8c16',
          MEDIUM: '#faad14',
          LOW: '#52c41a'
        };
        const iconMap = {
          CRITICAL: <ExclamationCircleOutlined />,
          HIGH: <WarningOutlined />,
          MEDIUM: <WarningOutlined />,
          LOW: <CheckOutlined />
        };
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: colorMap[level] || '#1890ff',
              boxShadow: `0 0 8px ${colorMap[level] || '#1890ff'}`
            }} />
            {iconMap[level]}
            <span style={{ fontWeight: 500 }}>{getSeverity(level).label}</span>
          </div>
        );
      },
      filters: [
        { text: '严重', value: 'CRITICAL' },
        { text: '高危', value: 'HIGH' },
        { text: '中危', value: 'MEDIUM' },
        { text: '低危', value: 'LOW' },
      ],
      onFilter: (value, record) => record.alertLevel === value,
    },
    {
      title: '告警类型',
      dataIndex: 'alertType',
      key: 'alertType',
      width: 150,
      render: (text: string) => <Text strong style={{ fontSize: '13px' }}>{getAlertTypeLabel(text)}</Text>
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 220,
      render: (text) => (
        <Tooltip title={text}>
          <span style={{ fontSize: '12px' }}>{text && text.length > 60 ? `${text.substring(0, 60)}...` : text}</span>
        </Tooltip>
      )
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 120,
      align: 'left',
      render: (text: string) => (
        <Tag style={{ fontSize: '11px', padding: '1px', margin: 0, marginLeft: '-2px' }}>{getAlertSourceLabel(text)}</Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdTime',
      key: 'createdTime',
      width: 150,
      render: (time: string) => time ? (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500 }}>
            {dayjs(time).format('YYYY-MM-DD')}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {dayjs(time).format('HH:mm:ss')}
          </div>
        </div>
      ) : '-',
      sorter: (a, b) => new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime(),
    },
    {
      title: '状态',
      dataIndex: 'handled',
      key: 'handled',
      width: 100,
      render: (handled: boolean, record: SecurityAlert) => (
        <Space>
          <div style={{
            padding: '4px 12px',
            borderRadius: '20px',
            background: handled ? 'rgba(82, 196, 26, 0.1)' : 'rgba(255, 77, 79, 0.1)',
            border: `1px solid ${handled ? '#52c41a' : '#ff4d4f'}`,
            color: handled ? '#52c41a' : '#ff4d4f',
            fontSize: '12px',
            fontWeight: 500
          }}>
            {handled ? '已处理' : '未处理'}
          </div>
          {record.aiConfidence && (
            <Tooltip title={`AI置信度: ${Math.round(record.aiConfidence * 100)}%`}>
              <Progress 
                type="circle" 
                percent={Math.round(record.aiConfidence * 100)} 
                size={28}
                strokeColor={record.aiConfidence > 0.8 ? '#52c41a' : record.aiConfidence > 0.5 ? '#faad14' : '#ff4d4f'}
                format={percent => `${percent}%`}
              />
            </Tooltip>
          )}
        </Space>
      ),
      filters: [
        { text: '未处理', value: false },
        { text: '已处理', value: true },
      ],
      onFilter: (value, record) => record.handled === value,
    },
    {
      title: '关联信息',
      key: 'relatedInfo',
      width: 150,
      render: (_: any, record: SecurityAlert) => {
        // 优先显示关联事件
        if (record.unifiedEventId) {
          return (
            <Button
              type="link"
              size="small"
              style={{ padding: 0, fontSize: '12px' }}
              onClick={(e) => {
                e.stopPropagation();
                window.location.hash = `/events?eventId=${record.unifiedEventId}`;
              }}
            >
              事件 #{record.unifiedEventId}
            </Button>
          );
        }

        // 如果有指标值，显示指标信息
        if ((record as any).metricValue && (record as any).threshold) {
          return (
            <Tooltip title={`当前值: ${(record as any).metricValue}%, 阈值: ${(record as any).threshold}%`}>
              <div style={{ fontSize: '11px' }}>
                <div>当前: {(record as any).metricValue}%</div>
                <div style={{ color: '#999' }}>阈值: {(record as any).threshold}%</div>
              </div>
            </Tooltip>
          );
        }

        // 如果有日志ID，显示日志关联
        if (record.logEntryId) {
          return (
            <Button
              type="link"
              size="small"
              style={{ padding: 0, fontSize: '12px' }}
              onClick={(e) => {
                e.stopPropagation();
                message.info('查看日志详情功能开发中');
              }}
            >
              日志 #{record.logEntryId}
            </Button>
          );
        }

        return <span style={{ color: '#ccc', fontSize: '12px' }}>-</span>;
      },
    },
  ];

  // 计算处理率
  const handleRate = displayStats.totalAlerts > 0 
    ? ((displayStats.totalAlerts - displayStats.unhandledAlerts) / displayStats.totalAlerts * 100).toFixed(1)
    : 0;

  const todayAddedCount = alertList.filter((alert) => dayjs(alert.createdTime).isSame(dayjs(), 'day')).length;
  const yesterdayAddedCount = alertList.filter((alert) =>
    dayjs(alert.createdTime).isSame(dayjs().subtract(1, 'day'), 'day')
  ).length;
  const dayChangePercent = yesterdayAddedCount > 0
    ? (((todayAddedCount - yesterdayAddedCount) / yesterdayAddedCount) * 100).toFixed(1)
    : (todayAddedCount > 0 ? '100.0' : '0.0');

  const resolvedDurations = alertList
    .filter((alert) => alert.handled && alert.updatedTime && alert.createdTime)
    .map((alert) => dayjs(alert.updatedTime).diff(dayjs(alert.createdTime), 'minute'))
    .filter((minutes) => minutes >= 0);
  const avgHandleMinutes = resolvedDurations.length > 0
    ? Math.round(resolvedDurations.reduce((sum, value) => sum + value, 0) / resolvedDurations.length)
    : 0;

  const escalationRate = displayStats.totalAlerts > 0
    ? ((displayStats.alertsByLevel.CRITICAL / displayStats.totalAlerts) * 100).toFixed(1)
    : '0.0';

  const activeFilterItems = [
    searchParams.keyword ? `关键词: ${searchParams.keyword}` : null,
    searchParams.alertLevel ? `级别: ${getSeverity(searchParams.alertLevel).label}` : null,
    searchParams.alertType ? `类型: ${getAlertTypeLabel(searchParams.alertType)}` : null,
    searchParams.status ? `状态: ${getStatus(normalizeStatusValue(searchParams.status) || '').label}` : null,
  ].filter(Boolean) as string[];

  const applyFilterAndReload = useCallback(async (partial: Partial<AlertSearchParams>) => {
    const merged: AlertSearchParams = {
      ...searchParams,
      ...partial,
      handled: undefined, // 不再使用 handled
      page: 0,
    };
    setSearchParams(merged);
    setPagination(prev => ({ ...prev, current: 1 }));
    
    // 同步更新表单字段
    searchForm.setFieldsValue({
      keyword: merged.keyword || '',
      alertLevel: merged.alertLevel || undefined,
      alertType: merged.alertType || undefined,
      status: merged.status || undefined,
    });
    
    await loadAlerts(1, pagination.pageSize, merged);
  }, [searchParams, pagination.pageSize, searchForm, loadAlerts]);

  // 渲染顶部标题
  const renderDashboardHeader = () => (
    <div style={{
      marginBottom: '16px',
      padding: '18px 20px',
      background: 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)',
      borderRadius: '14px',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 6px 20px rgba(26, 41, 128, 0.18)'
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
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <SecurityScanOutlined style={{ fontSize: '24px' }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, color: 'white' }}>
              安全告警处置中心
            </Title>
            <Paragraph style={{ 
              margin: '4px 0 0 0', 
              color: 'rgba(255,255,255,0.9)',
              fontSize: '13px',
              maxWidth: '600px'
            }}>
              聚焦告警分拣与处置闭环，提供筛选、处理与追踪能力
            </Paragraph>
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: unhandledCount > 0 ? '#ff4d4f' : '#52c41a',
              boxShadow: `0 0 10px ${unhandledCount > 0 ? '#ff4d4f' : '#52c41a'}`
            }} />
            <Text style={{ color: 'white', fontSize: '13px', fontWeight: 500 }}>
              {unhandledCount > 0 ? `${unhandledCount} 个未处理告警` : '所有告警已处理'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
              • 最后更新: {new Date().toLocaleTimeString()}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染核心指标卡片
  const renderCoreMetrics = () => (
    <div style={{ marginBottom: '16px' }}>
      <Row gutter={16}>
        <Col span={4}>
          <Statistic title="总告警" value={displayStats.totalAlerts} valueStyle={{ color: '#1890ff' }} />
        </Col>
        <Col span={4}>
          <Statistic title="未处理" value={displayStats.unhandledAlerts} valueStyle={{ color: '#fa8c16' }} />
        </Col>
        <Col span={4}>
          <Statistic title="处理率" value={handleRate} suffix="%" valueStyle={{ color: '#52c41a' }} />
        </Col>
        <Col span={4}>
          <Statistic title="平均响应" value={avgHandleMinutes} suffix="min" />
        </Col>
        <Col span={4}>
          <Statistic title="今日新增" value={todayAddedCount} />
        </Col>
        <Col span={4}>
          <Statistic
            title="日变化"
            value={dayChangePercent}
            suffix="%"
            prefix={Number(dayChangePercent) >= 0 ? '+' : ''}
            valueStyle={{ color: Number(dayChangePercent) >= 0 ? '#52c41a' : '#ff4d4f' }}
          />
        </Col>
      </Row>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Tag color="#722ed1">严重 {displayStats.alertsByLevel.CRITICAL || 0}</Tag>
        <Tag color="#ff4d4f">高危 {displayStats.alertsByLevel.HIGH || 0}</Tag>
        <Tag color="#fa8c16">中危 {displayStats.alertsByLevel.MEDIUM || 0}</Tag>
        <Tag color="#52c41a">低危 {displayStats.alertsByLevel.LOW || 0}</Tag>
      </div>
    </div>
  );

  return (
    <div style={{ 
      padding: '16px',
      maxWidth: '1600px',
      margin: '0 auto',
      position: 'relative'
    }}>
      {renderDashboardHeader()}
      
      {/* 警告提示 */}
      {displayStats.unhandledAlerts > 10 && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text strong style={{ fontSize: '15px' }}>注意：有 {displayStats.unhandledAlerts} 个告警待处理</Text>
                <div style={{ fontSize: '13px', color: 'rgba(0,0,0,0.65)', marginTop: '2px' }}>
                  其中包含 {displayStats.alertsByLevel.CRITICAL} 个严重告警，建议优先处理
                </div>
              </div>
            </div>
          }
          style={{ 
            marginBottom: '12px', 
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, rgba(255, 251, 230, 0.9) 0%, rgba(255, 241, 204, 0.9) 100%)',
            boxShadow: '0 4px 20px rgba(250, 140, 22, 0.15)'
          }}
        />
      )}

      {renderCoreMetrics()}

      {/* 搜索和表格区域 */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SearchOutlined />
            <Text strong style={{ fontSize: '16px' }}>告警搜索与筛选</Text>
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
        bodyStyle={{ padding: '14px' }}
      >
        <div>
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
            <Text style={{ fontSize: '13px' }}>总告警: <Text strong>{displayStats.totalAlerts}</Text></Text>
            <Text style={{ fontSize: '13px' }}>匹配: <Text strong>{pagination.total}</Text></Text>
            <Text style={{ fontSize: '13px' }}>未处理: <Text strong style={{ color: '#ff4d4f' }}>{displayStats.unhandledAlerts}</Text></Text>
            <Text style={{ fontSize: '13px' }}>严重: <Text strong style={{ color: '#cf1322' }}>{displayStats.alertsByLevel.CRITICAL}</Text></Text>
            <Text style={{ fontSize: '13px' }}>处理率: <Text strong>{handleRate}%</Text></Text>
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
                    placeholder="搜索关键词（描述、来源等）..."
                    prefix={<SearchOutlined style={{ color: '#999' }} />}
                    onPressEnter={handleSearch}
                    style={{ height: '36px', borderRadius: '18px' }}
                    allowClear
                  />
                </Form.Item>
              </div>
              
              {/* 第二行：下拉框 */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <Form.Item name="alertLevel" style={{ marginBottom: 0, flex: '1 1 150px', minWidth: '120px' }}>
                  <Select 
                    placeholder="告警级别" 
                    style={{ width: '100%', borderRadius: '8px' }} 
                    allowClear 
                    onChange={() => setTimeout(() => handleSearch(), 0)}
                  >
                    <Option value="CRITICAL">严重</Option>
                    <Option value="HIGH">高危</Option>
                    <Option value="MEDIUM">中危</Option>
                    <Option value="LOW">低危</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="alertType" style={{ marginBottom: 0, flex: '1 1 180px', minWidth: '140px' }}>
                  <Select 
                    placeholder="告警类型" 
                    style={{ width: '100%', borderRadius: '8px' }} 
                    allowClear 
                    onChange={() => setTimeout(() => handleSearch(), 0)}
                  >
                    <Option value="LOGIN_FAILURE">登录失败</Option>
                    <Option value="LOGIN_SUCCESS">登录成功</Option>
                    <Option value="BRUTE_FORCE">暴力破解</Option>
                    <Option value="SUSPICIOUS_IP">可疑IP访问</Option>
                    <Option value="SUSPICIOUS_PROCESS">可疑进程</Option>
                    <Option value="UNAUTHORIZED_ACCESS">未授权访问</Option>
                    <Option value="PRIVILEGE_ESCALATION">权限提升</Option>
                    <Option value="SECURITY_ANOMALY">安全异常</Option>
                    <Option value="SYSTEM_ANOMALY">系统异常</Option>
                    <Option value="CPU_USAGE_HIGH">CPU使用率过高</Option>
                    <Option value="MEMORY_USAGE_HIGH">内存使用率过高</Option>
                    <Option value="DISK_USAGE_HIGH">磁盘使用率过高</Option>
                    <Option value="NETWORK_TRAFFIC_HIGH">网络流量异常</Option>
                    <Option value="HIGH_RESOURCE_PROCESS">进程资源过高</Option>
                    <Option value="THREAT_SIGNATURE_MATCH">威胁规则匹配</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="status" style={{ marginBottom: 0, flex: '1 1 150px', minWidth: '120px' }}>
                  <Select 
                    placeholder="处理状态" 
                    style={{ width: '100%', borderRadius: '8px' }} 
                    allowClear 
                    onChange={() => setTimeout(() => handleSearch(), 0)}
                  >
                    <Option value="PENDING">待处理</Option>
                    <Option value="PROCESSING">处理中</Option>
                    <Option value="RESOLVED">已解决</Option>
                    <Option value="FALSE_POSITIVE">误报</Option>
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
                    border: '1px solid #d9d9d9'
                  }} 
                  onClick={() => applyFilterAndReload({ status: 'PENDING' })}
                >待处理</Tag>
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
                  onClick={() => applyFilterAndReload({ alertLevel: 'CRITICAL' })}
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
                  onClick={() => applyFilterAndReload({ alertLevel: 'HIGH' })}
                >高危</Tag>
                <div style={{ flex: 1 }} />
                <Button 
                  size="small" 
                  type="text" 
                  style={{ color: '#999' }}
                  onClick={() => applyFilterAndReload({ alertLevel: undefined, alertType: undefined, status: undefined, keyword: '' })}
                >清空筛选</Button>
              </div>
            </Form>
          </div>
          
          <div style={{ minWidth: 0 }}>

            {/* 告警表格 */}
            <div style={{ 
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #f0f0f0'
            }}>
              <Table
                columns={columns}
                dataSource={alertList}
                rowKey="id"
                loading={loading}
                size="small"
                onRow={(record) => ({
                  onClick: () => showAlertDetail(record),
                  style: { cursor: 'pointer' },
                })}
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '20', '50', '100'],
                  showQuickJumper: true,
                  showTotal: (total, range) => 
                    <div style={{ fontSize: '13px' }}>
                      显示第 <Text strong>{range[0]}</Text> 到 <Text strong>{range[1]}</Text> 条，共 <Text strong>{total}</Text> 条告警
                    </div>,
                  style: { padding: '16px 24px', margin: 0 }
                }}
                onChange={handleTableChange}
                rowClassName={(record) => 
                  !record.handled ? 'unhandled-alert-row' : 'handled-alert-row'
                }
                locale={{
                  emptyText: alertList.length === 0 ? 
                    <Empty 
                      description={
                        <div>
                          <div style={{ fontSize: '16px', marginBottom: '8px' }}>暂无告警数据</div>
                          <Text type="secondary">系统运行良好，未检测到安全威胁</Text>
                        </div>
                      } 
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      style={{ padding: '40px 0' }}
                    /> : undefined,
                  // 排序提示文本中文化
                  triggerAsc: '点击升序',
                  triggerDesc: '点击降序',
                  cancelSort: '点击取消排序'
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 底部信息栏 */}
      <div style={{ 
        marginTop: '16px', 
        padding: '12px',
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
            <Text strong>数据时间范围</Text>
            <div>最近30天</div>
          </div>
          <div>
            <Text strong>告警数据库</Text>
            <div>PostgreSQL 14.6</div>
          </div>
          <div>
            <Text strong>处理团队</Text>
            <div>安全运营中心 (SOC)</div>
          </div>
          <div>
            <Text strong>系统状态</Text>
            <div>
              <Badge 
                status={loading ? "processing" : "success"} 
                text={loading ? '数据加载中' : '系统正常'} 
              />
            </div>
          </div>
        </div>
      </div>

      <Modal
        title="告警详情"
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setSelectedAlert(null);
        }}
        width={980}
        footer={[
          <Button
            key="handle"
            type="primary"
            icon={<CheckOutlined />}
            disabled={!selectedAlert || selectedAlert.handled || loading}
            onClick={() => {
              if (!selectedAlert) return;
              handleMarkAsHandled(selectedAlert);
              setDetailVisible(false);
            }}
          >
            标记已处理
          </Button>,
          <Button
            key="delete"
            danger
            icon={<DeleteOutlined />}
            disabled={!selectedAlert || loading}
            onClick={() => {
              if (!selectedAlert) return;
              handleDeleteAlert(selectedAlert);
              setDetailVisible(false);
            }}
          >
            删除告警
          </Button>,
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {detailLoading || !selectedAlert ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>加载中...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="ID">{selectedAlert.id}</Descriptions.Item>
              <Descriptions.Item label="告警ID">{selectedAlert.alertId || '-'}</Descriptions.Item>
              <Descriptions.Item label="来源">{getAlertSourceLabel(selectedAlert.source)}</Descriptions.Item>
              <Descriptions.Item label="类型">{getAlertTypeLabel(selectedAlert.alertType)}</Descriptions.Item>
              <Descriptions.Item label="级别">{getSeverity(selectedAlert.alertLevel).label}</Descriptions.Item>
              <Descriptions.Item label="处理状态">
                <Tag color={selectedAlert.handled ? 'green' : 'red'}>
                  {selectedAlert.handled ? '已处理' : '未处理'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="AI置信度">
                {selectedAlert.aiConfidence ? `${(selectedAlert.aiConfidence * 100).toFixed(1)}%` : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(selectedAlert.createdTime).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              {selectedAlert.unifiedEventId && (
                <Descriptions.Item label="关联事件">
                  <span
                    style={{ color: '#1890ff', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => {
                      setDetailVisible(false);
                      window.location.hash = `/events?eventId=${selectedAlert.unifiedEventId}`;
                    }}
                  >
                    事件 #{selectedAlert.unifiedEventId} →
                  </span>
                </Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ border: '1px solid #f0f0f0', borderRadius: '8px', padding: '10px' }}>
              <Text strong style={{ display: 'block', marginBottom: '6px' }}>描述</Text>
              <Paragraph style={{ marginBottom: '10px' }}>{selectedAlert.description || '-'}</Paragraph>
              {selectedAlert.assignee && <Text style={{ display: 'block' }}>处理人：{selectedAlert.assignee}</Text>}
              {selectedAlert.resolution && <Text style={{ display: 'block', marginTop: '6px' }}>处理结果：{selectedAlert.resolution}</Text>}
              {(selectedAlert as any).details && (
                <>
                  <Divider style={{ margin: '10px 0' }}>详细信息</Divider>
                  <Paragraph style={{ maxHeight: 260, overflow: 'auto', background: '#f6f8fa', padding: 10, marginBottom: 0 }}>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                      {JSON.stringify((selectedAlert as any).details, null, 2)}
                    </pre>
                  </Paragraph>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        .unhandled-alert-row {
          background: linear-gradient(90deg, rgba(255, 77, 79, 0.02) 0%, rgba(255, 255, 255, 0.1) 100%) !important;
          border-left: 4px solid #ff4d4f;
        }
        .unhandled-alert-row:hover {
          background: linear-gradient(90deg, rgba(255, 77, 79, 0.05) 0%, rgba(255, 77, 79, 0.02) 100%) !important;
        }
        .handled-alert-row {
          border-left: 4px solid #52c41a;
        }
        .ant-table-thead > tr > th {
          background: #fafafa !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          border-bottom: 2px solid #f0f0f0 !important;
        }
        .ant-table-tbody > tr > td {
          padding: 10px 8px !important;
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

export default AlertsPage;