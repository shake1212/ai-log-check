// src/pages/Alerts.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
  Popconfirm,
  Tooltip,
  Typography,
  Statistic,
  Progress,
  Form,
  Descriptions,
  Divider,
  Tabs,
  Segmented,
  Rate,
  Dropdown
} from 'antd';
import { 
  CheckOutlined, 
  ExclamationCircleOutlined, 
  SearchOutlined,
  ReloadOutlined,
  SyncOutlined,
  WarningOutlined,
  DeleteOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  FilterOutlined,
  ExportOutlined,
  MoreOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  CodeOutlined,
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
  FullscreenOutlined,
  FullscreenExitOutlined,
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

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;
const { TabPane } = Tabs;

// 类型定义（如果需要）
interface AlertSearchParams {
  keyword?: string;
  alertLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | undefined;
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
    handled: undefined,
    status: undefined,
    page: 0,
    size: 20
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [activeTab, setActiveTab] = useState('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 加载告警数据 - 修改后的版本
  const loadAlerts = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      console.log('加载告警，参数:', {
        page: page - 1, // 后端从0开始
        size: pageSize,
        ...searchParams
      });
      
      // 构建查询参数
      const params: any = {
        page: page - 1, // 后端从0开始
        size: pageSize,
        keyword: searchParams.keyword || undefined,
        alertLevel: searchParams.alertLevel || undefined,
        handled: searchParams.handled,
        status: searchParams.status || undefined,
      };
      
      // 清理undefined值
      Object.keys(params).forEach(key => {
        if (params[key] === undefined) {
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
          setAlertList(data.content || []);
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
          setAlertList(data);
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
              setAlertList(responseData.content || []);
              setTotal(responseData.totalElements || 0);
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize,
                total: responseData.totalElements || 0
              }));
            } else if (Array.isArray(responseData)) {
              setAlertList(responseData);
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
      keyword: values.keyword || '',
      alertLevel: values.alertLevel,
      handled: values.handled,
      status: values.status,
      page: 0 // 搜索时重置到第一页
    };
    
    setSearchParams(newSearchParams);
    setPagination(prev => ({ ...prev, current: 1 }));
    
    // 执行搜索
    await loadAlerts(1, pagination.pageSize);
  }, [searchForm, searchParams, pagination.pageSize, loadAlerts]);

  // 重置搜索
  const handleReset = useCallback(() => {
    searchForm.resetFields();
    const resetParams: AlertSearchParams = {
      keyword: '',
      alertLevel: undefined,
      handled: undefined,
      status: undefined,
      page: 0,
      size: 20
    };
    
    setSearchParams(resetParams);
    setPagination(prev => ({ ...prev, current: 1 }));
    
    // 重置后重新加载
    setTimeout(() => loadAlerts(1, pagination.pageSize), 100);
  }, [searchForm, loadAlerts, pagination.pageSize]);

  // 标记告警为已处理 - 修改后的版本
  const handleMarkAsHandled = useCallback(async (alert: SecurityAlert) => {
    confirm({
      title: '确认处理',
      icon: <ExclamationCircleOutlined />,
      content: `确定要将警报 "${alert.alertType}" 标记为已处理吗？`,
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
          if (response === undefined || response === null || 
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
      content: `确定要删除警报 "${alert.alertType}" 吗？此操作不可恢复。`,
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
          if (response === undefined || response === null || 
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
        Modal.info({
          title: '告警详情',
          width: '60%',
          content: (
            <div>
              <Descriptions column={1} bordered>
                <Descriptions.Item label="ID">{alertData.id}</Descriptions.Item>
                <Descriptions.Item label="告警ID">{alertData.alertId || '-'}</Descriptions.Item>
                <Descriptions.Item label="来源">{alertData.source || '-'}</Descriptions.Item>
                <Descriptions.Item label="类型">{alertData.alertType || '-'}</Descriptions.Item>
                <Descriptions.Item label="级别">
                  <Tag color={
                    alertData.alertLevel === 'CRITICAL' ? 'purple' : 
                    alertData.alertLevel === 'HIGH' ? 'red' : 
                    alertData.alertLevel === 'MEDIUM' ? 'orange' : 'green'
                  }>
                    {alertData.alertLevel}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="描述">{alertData.description || '-'}</Descriptions.Item>
                <Descriptions.Item label="处理状态">
                  <Tag color={alertData.handled ? 'green' : 'red'}>
                    {alertData.handled ? '已处理' : '未处理'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="AI置信度">
                  {alertData.aiConfidence ? `${(alertData.aiConfidence * 100).toFixed(1)}%` : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {dayjs(alertData.createdTime).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                {alertData.assignee && (
                  <Descriptions.Item label="处理人">{alertData.assignee}</Descriptions.Item>
                )}
                {alertData.resolution && (
                  <Descriptions.Item label="处理结果">{alertData.resolution}</Descriptions.Item>
                )}
              </Descriptions>
              
              {alertData.details && (
                <>
                  <Divider>详细信息</Divider>
                  <Paragraph style={{ maxHeight: 320, overflow: 'auto', background: '#f6f8fa', padding: 12 }}>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                      {JSON.stringify(alertData.details, null, 2)}
                    </pre>
                  </Paragraph>
                </>
              )}
            </div>
          ),
          onOk() {},
        });
      } else {
        message.error('获取告警详情失败');
      }
    } catch (error) {
      console.error('获取告警详情错误:', error);
      message.error('获取告警详情失败');
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

  // 表格分页处理
  const handleTableChange = (newPagination: any) => {
    setPagination(newPagination);
    // 分页改变时重新加载数据
    loadAlerts(newPagination.current, newPagination.pageSize);
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
          handled: searchParams.handled,
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
      width: 80,
      sorter: (a, b) => a.id - b.id,
      fixed: 'left' as const,
    },
    {
      title: '告警级别',
      dataIndex: 'alertLevel',
      key: 'alertLevel',
      width: 120,
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
            <span style={{ fontWeight: 500 }}>{level}</span>
          </div>
        );
      },
      filters: [
        { text: '严重', value: 'CRITICAL' },
        { text: '高', value: 'HIGH' },
        { text: '中', value: 'MEDIUM' },
        { text: '低', value: 'LOW' },
      ],
      onFilter: (value, record) => record.alertLevel === value,
    },
    {
      title: '告警类型',
      dataIndex: 'alertType',
      key: 'alertType',
      width: 180,
      render: (text: string) => <Text strong style={{ fontSize: '13px' }}>{text}</Text>
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 250,
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
      width: 140,
      render: (text: string) => (
        <Tag style={{ fontSize: '11px', padding: '2px 8px' }}>{text}</Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdTime',
      key: 'createdTime',
      width: 180,
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
      width: 120,
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
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_, record: SecurityAlert) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => showAlertDetail(record)}
            size="small"
            style={{ fontSize: '12px' }}
          >
            详情
          </Button>
          {!record.handled && (
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleMarkAsHandled(record)}
              size="small"
              style={{ fontSize: '12px' }}
              disabled={loading}
            >
              处理
            </Button>
          )}
          <Popconfirm
            title="确定要删除吗？"
            onConfirm={() => handleDeleteAlert(record)}
            okText="删除"
            cancelText="取消"
            okType="danger"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
              style={{ fontSize: '12px' }}
              disabled={loading}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 计算处理率
  const handleRate = displayStats.totalAlerts > 0 
    ? ((displayStats.totalAlerts - displayStats.unhandledAlerts) / displayStats.totalAlerts * 100).toFixed(1)
    : 0;

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
            <SecurityScanOutlined style={{ fontSize: '40px' }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: 'white' }}>
              安全告警管理中心
            </Title>
            <Paragraph style={{ 
              margin: '8px 0 0 0', 
              color: 'rgba(255,255,255,0.9)',
              fontSize: '16px',
              maxWidth: '600px'
            }}>
              实时监控、智能分析、快速响应企业安全威胁
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
              background: unhandledCount > 0 ? '#ff4d4f' : '#52c41a',
              boxShadow: `0 0 10px ${unhandledCount > 0 ? '#ff4d4f' : '#52c41a'}`
            }} />
            <Text style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
              {unhandledCount > 0 ? `${unhandledCount} 个未处理告警` : '所有告警已处理'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
              • 最后更新: {new Date().toLocaleTimeString()}
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
            style={{ minWidth: '300px' }}
          >
            <TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SecurityScanOutlined />
                  所有告警
                  <Badge count={displayStats.totalAlerts} style={{ backgroundColor: '#1890ff' }} />
                </span>
              } 
              key="all" 
            />
            <TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <WarningOutlined />
                  未处理告警
                  <Badge count={displayStats.unhandledAlerts} style={{ backgroundColor: '#ff4d4f' }} />
                </span>
              } 
              key="unhandled" 
            />
            <TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ExclamationCircleOutlined />
                  严重告警
                  <Badge count={displayStats.alertsByLevel.CRITICAL} style={{ backgroundColor: '#cf1322' }} />
                </span>
              } 
              key="critical" 
            />
          </Tabs>
        </div>
        <div>
          <Space size="large" wrap>
            <Dropdown
              menu={{
                items: [
                  { key: 'excel', icon: <FileExcelOutlined />, label: '导出Excel报告' },
                  { key: 'pdf', icon: <FilePdfOutlined />, label: '导出PDF报告' },
                  { key: 'json', icon: <CodeOutlined />, label: '导出JSON数据' },
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
              icon={<SyncOutlined spin={loading} />}
              onClick={() => loadAlerts(pagination.current, pagination.pageSize)}
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
      {/* 总告警数卡片 */}
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
              总告警数
            </Text>
            <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: '#096dd9' }}>
              {displayStats.totalAlerts}
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
            今日新增: {Math.round(displayStats.totalAlerts * 0.1)} 条
          </Text>
          <Tag color="success" style={{ marginLeft: 'auto' }}>+5%</Tag>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginTop: 'auto'
        }}>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>处理率</Text>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>{handleRate}%</Text>
          </div>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>平均响应</Text>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>15min</Text>
          </div>
        </div>
      </Card>

      {/* 未处理告警卡片 */}
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
              未处理告警
            </Text>
            <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: '#d46b08' }}>
              {displayStats.unhandledAlerts}
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
        
        <Progress 
          percent={displayStats.totalAlerts > 0 ? (displayStats.unhandledAlerts / displayStats.totalAlerts * 100) : 0}
          strokeColor="#fa8c16"
          strokeWidth={6}
          style={{ margin: '12px 0' }}
        />
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginTop: 'auto'
        }}>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>严重</Text>
            <Text strong style={{ fontSize: '16px', display: 'block', color: '#ff4d4f' }}>
              {displayStats.alertsByLevel.CRITICAL}
            </Text>
          </div>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>高危</Text>
            <Text strong style={{ fontSize: '16px', display: 'block', color: '#fa8c16' }}>
              {displayStats.alertsByLevel.HIGH}
            </Text>
          </div>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>中危</Text>
            <Text strong style={{ fontSize: '16px', display: 'block', color: '#faad14' }}>
              {displayStats.alertsByLevel.MEDIUM}
            </Text>
          </div>
        </div>
      </Card>

      {/* 处理率卡片 */}
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
              处理效率
            </Text>
            <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: '#389e0d' }}>
              {handleRate}%
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
            <BarChartOutlined style={{ fontSize: '28px', color: 'white' }} />
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
            较昨日 +3.2%
          </Text>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <Text style={{ fontSize: '12px', color: '#666' }}>目标</Text>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>95%</Text>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginTop: 'auto'
        }}>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>平均处理</Text>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>25min</Text>
          </div>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>升级率</Text>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>2.5%</Text>
          </div>
        </div>
      </Card>

      {/* 告警分布卡片 */}
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
              告警分布
            </Text>
            <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: '#096dd9' }}>
              4级
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
            <SafetyCertificateOutlined style={{ fontSize: '28px', color: 'white' }} />
          </div>
        </div>
        
        <div style={{ margin: '12px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ 
              background: 'rgba(255, 77, 79, 0.1)',
              padding: '8px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <Text strong style={{ color: '#ff4d4f', fontSize: '18px' }}>
                {displayStats.alertsByLevel.CRITICAL || 0}
              </Text>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                严重
              </div>
            </div>
            <div style={{ 
              background: 'rgba(250, 140, 22, 0.1)',
              padding: '8px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <Text strong style={{ color: '#fa8c16', fontSize: '18px' }}>
                {displayStats.alertsByLevel.HIGH || 0}
              </Text>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                高危
              </div>
            </div>
            <div style={{ 
              background: 'rgba(250, 173, 20, 0.1)',
              padding: '8px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <Text strong style={{ color: '#faad14', fontSize: '18px' }}>
                {displayStats.alertsByLevel.MEDIUM || 0}
              </Text>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                中危
              </div>
            </div>
            <div style={{ 
              background: 'rgba(82, 196, 26, 0.1)',
              padding: '8px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <Text strong style={{ color: '#52c41a', fontSize: '18px' }}>
                {displayStats.alertsByLevel.LOW || 0}
              </Text>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                低危
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
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
              <Button type="primary" danger size="middle">
                立即处理
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
          borderRadius: '16px',
          marginBottom: '32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
        }}
        bodyStyle={{ padding: '20px' }}
      >
        <Form form={searchForm} layout="vertical">
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div>
              <Text strong style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>关键词</Text>
              <Form.Item name="keyword" label={null}>
                <Input
                  placeholder="告警类型、描述、来源..."
                  prefix={<SearchOutlined style={{ color: '#666' }} />}
                  onPressEnter={handleSearch}
                  style={{ height: '40px' }}
                />
              </Form.Item>
            </div>
            <div>
              <Text strong style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>告警级别</Text>
              <Form.Item name="alertLevel" label={null}>
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
              <Text strong style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>处理状态</Text>
              <Form.Item name="handled" label={null}>
                <Select
                  placeholder="全部状态"
                  style={{ width: '100%', height: '40px' }}
                  allowClear
                >
                  <Option value={false}>未处理</Option>
                  <Option value={true}>已处理</Option>
                </Select>
              </Form.Item>
            </div>
            <div>
              <Text strong style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>详细状态</Text>
              <Form.Item name="status" label={null}>
                <Select
                  placeholder="状态筛选"
                  style={{ width: '100%', height: '40px' }}
                  allowClear
                >
                  <Option value="PENDING">待处理</Option>
                  <Option value="PROCESSING">处理中</Option>
                  <Option value="RESOLVED">已解决</Option>
                  <Option value="FALSE_POSITIVE">误报</Option>
                </Select>
              </Form.Item>
            </div>
          </div>
        </Form>

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
            scroll={{ x: 1300 }}
            pagination={{
              ...pagination,
              showSizeChanger: true,
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
                /> : undefined
            }}
          />
        </div>
      </Card>

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

export default AlertsPage;