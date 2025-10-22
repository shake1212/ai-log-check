import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  message,
  Modal,
  Form,
  DatePicker,
  Divider,
  Alert,
} from 'antd';
import {
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  DeleteOutlined,
  BarChartOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { request } from '../../utils/request';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface WmiData {
  id: number;
  hostname: string;
  ipAddress: string;
  dataType: string;
  dataValue: string;
  collectTime: string;
  status: string;
  remark?: string;
}

interface Statistics {
  totalCount: number;
  statusStatistics: Record<string, number>;
  typeStatistics: Record<string, number>;
  hostStatistics: Record<string, number>;
}

/**
 * 简单WMI管理页面
 */
const SimpleWmiPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [wmiData, setWmiData] = useState<WmiData[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchForm] = Form.useForm();
  const [collectForm] = Form.useForm();
  const [collectModalVisible, setCollectModalVisible] = useState(false);

  // 数据类型选项
  const dataTypeOptions = [
    { value: 'CPU_USAGE', label: 'CPU使用率' },
    { value: 'MEMORY_USAGE', label: '内存使用率' },
    { value: 'DISK_USAGE', label: '磁盘使用率' },
    { value: 'NETWORK_TRAFFIC', label: '网络流量' },
    { value: 'PROCESS_COUNT', label: '进程数量' },
    { value: 'SERVICE_STATUS', label: '服务状态' },
    { value: 'SYSTEM_INFO', label: '系统信息' },
  ];

  // 状态颜色映射
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'SUCCESS': 'green',
      'FAILED': 'red',
      'PENDING': 'orange',
    };
    return colorMap[status] || 'default';
  };

  // 数据类型颜色映射
  const getDataTypeColor = (dataType: string) => {
    const colorMap: Record<string, string> = {
      'CPU_USAGE': 'blue',
      'MEMORY_USAGE': 'green',
      'DISK_USAGE': 'orange',
      'NETWORK_TRAFFIC': 'purple',
      'PROCESS_COUNT': 'cyan',
      'SERVICE_STATUS': 'magenta',
      'SYSTEM_INFO': 'geekblue',
    };
    return colorMap[dataType] || 'default';
  };

  // 加载WMI数据
  const loadWmiData = async (page = 1, pageSize = 10, hostname?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: (page - 1).toString(),
        size: pageSize.toString(),
      });
      if (hostname) {
        params.append('hostname', hostname);
      }

      const response = await request(`/api/simple-wmi/data/page?${params}`);
      setWmiData(response.data.content || []);
      setPagination({
        current: page,
        pageSize,
        total: response.data.totalElements || 0,
      });
    } catch (error) {
      message.error('加载WMI数据失败');
      console.error('加载WMI数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载统计信息
  const loadStatistics = async () => {
    try {
      const response = await request('/api/simple-wmi/statistics');
      setStatistics(response.data);
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  };

  // 采集WMI数据
  const handleCollectWmiData = async (values: any) => {
    try {
      const response = await request('/api/simple-wmi/collect', {
        method: 'POST',
        data: new URLSearchParams(values),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      message.success('WMI数据采集成功');
      setCollectModalVisible(false);
      collectForm.resetFields();
      loadWmiData();
      loadStatistics();
    } catch (error) {
      message.error('WMI数据采集失败');
      console.error('采集WMI数据失败:', error);
    }
  };

  // 批量采集WMI数据
  const handleBatchCollect = async () => {
    const values = collectForm.getFieldsValue();
    if (!values.hostname || !values.ipAddress) {
      message.warning('请填写主机名和IP地址');
      return;
    }

    try {
      const response = await request('/api/simple-wmi/batch-collect', {
        method: 'POST',
        data: new URLSearchParams({
          hostname: values.hostname,
          ipAddress: values.ipAddress,
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      message.success(`批量采集成功，共采集${response.data.length}条数据`);
      loadWmiData();
      loadStatistics();
    } catch (error) {
      message.error('批量采集失败');
      console.error('批量采集失败:', error);
    }
  };

  // 删除过期数据
  const handleDeleteExpired = async () => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除30天前的过期数据吗？',
      onOk: async () => {
        try {
          await request('/api/simple-wmi/data/expired?days=30', {
            method: 'DELETE',
          });
          message.success('删除过期数据成功');
          loadWmiData();
          loadStatistics();
        } catch (error) {
          message.error('删除过期数据失败');
          console.error('删除过期数据失败:', error);
        }
      },
    });
  };

  // 搜索
  const handleSearch = (values: any) => {
    loadWmiData(1, pagination.pageSize, values.hostname);
  };

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '主机名',
      dataIndex: 'hostname',
      key: 'hostname',
      width: 120,
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 120,
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 120,
      render: (dataType: string) => (
        <Tag color={getDataTypeColor(dataType)}>
          {dataTypeOptions.find(opt => opt.value === dataType)?.label || dataType}
        </Tag>
      ),
    },
    {
      title: '数据值',
      dataIndex: 'dataValue',
      key: 'dataValue',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: '采集时间',
      dataIndex: 'collectTime',
      key: 'collectTime',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString(),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
  ];

  // 初始化
  useEffect(() => {
    loadWmiData();
    loadStatistics();
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>简单WMI管理</Title>
      
      {/* 统计信息 */}
      {statistics && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总数据量"
                value={statistics.totalCount}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="成功采集"
                value={statistics.statusStatistics?.SUCCESS || 0}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="采集失败"
                value={statistics.statusStatistics?.FAILED || 0}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="监控主机"
                value={Object.keys(statistics.hostStatistics || {}).length}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 操作区域 */}
      <Card title="操作控制" style={{ marginBottom: '24px' }}>
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => setCollectModalVisible(true)}
          >
            采集数据
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleBatchCollect}
          >
            批量采集
          </Button>
          <Button
            icon={<DeleteOutlined />}
            onClick={handleDeleteExpired}
            danger
          >
            清理过期数据
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              loadWmiData();
              loadStatistics();
            }}
          >
            刷新数据
          </Button>
        </Space>
      </Card>

      {/* 搜索区域 */}
      <Card title="数据查询" style={{ marginBottom: '24px' }}>
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
        >
          <Form.Item name="hostname" label="主机名">
            <Input placeholder="输入主机名" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
              搜索
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 数据表格 */}
      <Card title="WMI数据列表">
        <Table
          columns={columns}
          dataSource={wmiData}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, pageSize) => {
              loadWmiData(page, pageSize || 10);
            },
          }}
        />
      </Card>

      {/* 采集数据模态框 */}
      <Modal
        title="采集WMI数据"
        open={collectModalVisible}
        onCancel={() => setCollectModalVisible(false)}
        footer={null}
      >
        <Form
          form={collectForm}
          layout="vertical"
          onFinish={handleCollectWmiData}
        >
          <Form.Item
            name="hostname"
            label="主机名"
            rules={[{ required: true, message: '请输入主机名' }]}
          >
            <Input placeholder="例如: server01" />
          </Form.Item>
          
          <Form.Item
            name="ipAddress"
            label="IP地址"
            rules={[
              { required: true, message: '请输入IP地址' },
              { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: '请输入有效的IP地址' }
            ]}
          >
            <Input placeholder="例如: 192.168.1.100" />
          </Form.Item>
          
          <Form.Item
            name="dataType"
            label="数据类型"
            rules={[{ required: true, message: '请选择数据类型' }]}
          >
            <Select placeholder="选择数据类型">
              {dataTypeOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                开始采集
              </Button>
              <Button onClick={() => setCollectModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SimpleWmiPage;
