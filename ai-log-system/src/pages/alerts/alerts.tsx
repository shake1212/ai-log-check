// src/pages/Alerts.tsx (修改导入部分)
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
  Alert
} from 'antd';
import { 
  CheckOutlined, 
  ExclamationCircleOutlined, 
  SearchOutlined,
  ReloadOutlined,
  SyncOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { alertApi } from '@/services/api'; // 修改这里：使用 alertApi 而不是 logApi
import { useWebSocket } from '@/services/websocket';
import type { SecurityAlert } from '@/types/log';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;
const { confirm } = Modal;

const Alerts: React.FC = () => {
  const { alerts: wsAlerts, connected, reconnect, retryCount, maxRetries } = useWebSocket();
  const [loading, setLoading] = useState(false);
  const [alertList, setAlertList] = useState<SecurityAlert[]>([]);
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    level: undefined as SecurityAlert['alertLevel'] | undefined,
    alertType: '',
    handled: undefined as boolean | undefined,
  });

  // 修复依赖循环问题
  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      // 从 API 获取基础警报数据 - 使用 alertApi 而不是 logApi
      const response = await alertApi.getUnhandledAlerts();
      const apiAlerts = response.data; // 从响应中提取 data
      
      // 创建合并的警报映射，以 ID 为键
      const alertMap = new Map<number, SecurityAlert>();
      
      // 先添加 API 数据
      apiAlerts.forEach(alert => {
        alertMap.set(alert.id, alert);
      });
      
      // 再添加/更新 WebSocket 实时数据
      wsAlerts.forEach(realtimeAlert => {
        alertMap.set(realtimeAlert.id, realtimeAlert);
      });
      
      // 转换为数组并按时间倒序排序
      const mergedAlerts = Array.from(alertMap.values()).sort((a, b) => 
        new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
      );
      
      setAlertList(mergedAlerts);
    } catch (error) {
      console.error('加载警报失败:', error);
      message.error('加载警报失败');
      
      // 如果 API 失败，至少显示 WebSocket 数据
      if (wsAlerts.length > 0) {
        const sortedAlerts = [...wsAlerts].sort((a, b) => 
          new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
        );
        setAlertList(sortedAlerts);
        message.info('使用实时数据替代');
      } else {
        setAlertList([]);
      }
    } finally {
      setLoading(false);
    }
  }, [wsAlerts]);

  // 修复 useEffect 依赖
  useEffect(() => {
    loadAlerts();
  }, []); // 只在组件挂载时加载一次

  // 当 WebSocket 数据变化时重新加载
  useEffect(() => {
    if (wsAlerts.length > 0) {
      loadAlerts();
    }
  }, [wsAlerts.length]);

  const handleMarkAsHandled = useCallback((alert: SecurityAlert) => {
    confirm({
      title: '确认处理',
      icon: <ExclamationCircleOutlined />,
      content: `确定要将警报 "${alert.alertType}" 标记为已处理吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          await alertApi.handleAlert(alert.id); // 使用 alertApi 而不是 logApi
          message.success('警报已标记为已处理');
          
          // 更新本地状态
          setAlertList(prev => 
            prev.map(item => 
              item.id === alert.id 
                ? { ...item, handled: true }
                : item
            )
          );
        } catch (error) {
          console.error('标记警报失败:', error);
          message.error('操作失败，请重试');
        } finally {
          setLoading(false);
        }
      },
    });
  }, []);

  // 添加搜索功能
  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const response = await alertApi.searchSecurityAlerts({
        keyword: searchParams.keyword,
        level: searchParams.level,
        handled: searchParams.handled,
        page: 1,
        size: 100
      });
      setAlertList(response.data.content);
    } catch (error) {
      console.error('搜索警报失败:', error);
      message.error('搜索失败');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  const handleReset = useCallback(() => {
    setSearchParams({
      keyword: '',
      level: undefined,
      alertType: '',
      handled: undefined,
    });
    loadAlerts();
  }, [loadAlerts]);

  // 获取未处理警报数量
  const unhandledCount = alertList.filter(alert => !alert.handled).length;

  const columns: ColumnsType<SecurityAlert> = [
    {
      title: '警报等级',
      dataIndex: 'alertLevel',
      key: 'alertLevel',
      width: 100,
      render: (level: SecurityAlert['alertLevel']) => (
        <Tag color={
          level === 'CRITICAL' ? 'red' :
          level === 'HIGH' ? 'orange' :
          level === 'MEDIUM' ? 'yellow' : 'green'
        }>
          {level}
        </Tag>
      ),
      sorter: (a, b) => a.alertLevel.localeCompare(b.alertLevel),
    },
    {
      title: '警报类型',
      dataIndex: 'alertType',
      key: 'alertType',
      width: 150,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdTime',
      key: 'createdTime',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString(),
      sorter: (a, b) => new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime(),
    },
    {
      title: '状态',
      dataIndex: 'handled',
      key: 'handled',
      width: 100,
      render: (handled: boolean) => (
        <Tag color={handled ? 'green' : 'red'}>
          {handled ? '已处理' : '未处理'}
        </Tag>
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
      width: 120,
      render: (_, record: SecurityAlert) => (
        <Space>
          {!record.handled && (
            <Button
              type="link"
              icon={<CheckOutlined />}
              onClick={() => handleMarkAsHandled(record)}
              size="small"
              disabled={loading}
            >
              标记处理
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <span>安全警报管理</span>
            <Badge 
              count={unhandledCount} 
              showZero 
              style={{ backgroundColor: unhandledCount > 0 ? '#ff4d4f' : '#52c41a' }}
            />
            <Tag color={connected ? 'green' : 'red'}>
              {connected ? '实时连接' : `连接断开 (${retryCount}/${maxRetries})`}
            </Tag>
          </Space>
        }
        extra={
          <Space>
            <Button 
              onClick={reconnect} 
              disabled={connected}
              icon={<SyncOutlined />}
              size="small"
            >
              {connected ? '已连接' : '重连'}
            </Button>
            <Button 
              onClick={loadAlerts} 
              loading={loading} 
              icon={<ReloadOutlined />}
            >
              刷新
            </Button>
          </Space>
        }
      >
        {/* 连接状态警告 */}
        {!connected && retryCount > 0 && (
          <Alert
            message="WebSocket 连接已断开"
            description={`正在尝试重连... (${retryCount}/${maxRetries})`}
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" onClick={reconnect}>
                立即重连
              </Button>
            }
          />
        )}

        {/* 搜索栏 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Input
                placeholder="搜索关键词"
                value={searchParams.keyword}
                onChange={e => setSearchParams({ ...searchParams, keyword: e.target.value })}
                prefix={<SearchOutlined />}
                onPressEnter={handleSearch}
              />
            </Col>
            <Col span={4}>
              <Select
                placeholder="警报等级"
                value={searchParams.level}
                onChange={value => setSearchParams({ ...searchParams, level: value })}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="LOW">低</Option>
                <Option value="MEDIUM">中</Option>
                <Option value="HIGH">高</Option>
                <Option value="CRITICAL">严重</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="处理状态"
                value={searchParams.handled}
                onChange={value => setSearchParams({ ...searchParams, handled: value })}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value={false}>未处理</Option>
                <Option value={true}>已处理</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Button 
                type="primary" 
                onClick={handleSearch}
                style={{ width: '100%' }}
                loading={loading}
              >
                搜索
              </Button>
            </Col>
            <Col span={4}>
              <Button 
                onClick={handleReset}
                style={{ width: '100%' }}
                disabled={loading}
              >
                重置
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 警报表格 */}
        <Table
          columns={columns}
          dataSource={alertList}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条警报`,
          }}
          rowClassName={(record) => 
            !record.handled ? 'unhandled-alert-row' : ''
          }
          locale={{
            emptyText: alertList.length === 0 ? 
              <Empty 
                description="暂无警报数据" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              /> : undefined
          }}
        />
      </Card>

      <style jsx>{`
        :global(.unhandled-alert-row) {
          background-color: #fff2f0;
        }
        :global(.unhandled-alert-row:hover) {
          background-color: #ffe7e6;
        }
      `}</style>
    </div>
  );
};

export default Alerts;