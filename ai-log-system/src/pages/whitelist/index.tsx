import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Space, 
  Popconfirm, 
  message, 
  Tag, 
  Row, 
  Col, 
  Select, 
  DatePicker, 
  Typography, 
  Tooltip, 
  Badge,
  Statistic,
  Divider,
  Upload,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined,
  UploadOutlined,
  DownloadOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  FilterOutlined,
  ExportOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 白名单项类型定义
interface WhitelistItem {
  id: number;
  value: string;
  type: 'IP' | 'EMAIL' | 'DOMAIN' | 'USER' | 'PATH' | 'URL';
  category: 'TRUSTED' | 'EXCEPTION' | 'BYPASS';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  remark?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  tags: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// 生成模拟数据
const generateMockData = (): WhitelistItem[] => {
  const types: WhitelistItem['type'][] = ['IP', 'EMAIL', 'DOMAIN', 'USER', 'PATH', 'URL'];
  const categories: WhitelistItem['category'][] = ['TRUSTED', 'EXCEPTION', 'BYPASS'];
  const statuses: WhitelistItem['status'][] = ['ACTIVE', 'INACTIVE', 'PENDING'];
  const riskLevels: WhitelistItem['riskLevel'][] = ['LOW', 'MEDIUM', 'HIGH'];
  
  const mockData: WhitelistItem[] = [
    {
      id: 1,
      value: '192.168.1.100',
      type: 'IP',
      category: 'TRUSTED',
      status: 'ACTIVE',
      remark: '内部可信IP - 管理员工作站',
      createdBy: 'admin',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      tags: ['内部', '管理员', '可信'],
      riskLevel: 'LOW'
    },
    {
      id: 2,
      value: 'admin@company.com',
      type: 'EMAIL',
      category: 'TRUSTED',
      status: 'ACTIVE',
      remark: '管理员邮箱地址',
      createdBy: 'admin',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      tags: ['管理员', '邮箱'],
      riskLevel: 'LOW'
    },
    {
      id: 3,
      value: 'trusted-partner.com',
      type: 'DOMAIN',
      category: 'TRUSTED',
      status: 'ACTIVE',
      remark: '可信合作伙伴域名',
      createdBy: 'admin',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      tags: ['合作伙伴', '域名'],
      riskLevel: 'LOW'
    },
    {
      id: 4,
      value: '192.168.2.0/24',
      type: 'IP',
      category: 'EXCEPTION',
      status: 'PENDING',
      remark: '测试网络段，待审核',
      createdBy: 'operator',
      createdAt: '2024-01-16T14:20:00Z',
      updatedAt: '2024-01-16T14:20:00Z',
      tags: ['测试', '网段'],
      riskLevel: 'MEDIUM'
    },
    {
      id: 5,
      value: '/api/public/*',
      type: 'PATH',
      category: 'BYPASS',
      status: 'ACTIVE',
      remark: '公共API路径，绕过安全检查',
      createdBy: 'admin',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      tags: ['API', '公共'],
      riskLevel: 'HIGH'
    }
  ];

  return mockData;
};

export default function WhitelistPage() {
  const [data, setData] = useState<WhitelistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<WhitelistItem | null>(null);
  const [searchFilters, setSearchFilters] = useState({
    type: undefined,
    category: undefined,
    status: undefined,
    riskLevel: undefined,
    keyword: ''
  });
  const [form] = Form.useForm();

  // 初始化数据
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setData(generateMockData());
      setLoading(false);
    }, 1000);
  }, []);

  // 统计数据
  const stats = {
    total: data.length,
    active: data.filter(item => item.status === 'ACTIVE').length,
    pending: data.filter(item => item.status === 'PENDING').length,
    highRisk: data.filter(item => item.riskLevel === 'HIGH').length,
    trusted: data.filter(item => item.category === 'TRUSTED').length,
    exception: data.filter(item => item.category === 'EXCEPTION').length,
    bypass: data.filter(item => item.category === 'BYPASS').length
  };

  // 过滤数据
  const filteredData = data.filter(item => {
    if (searchFilters.type && item.type !== searchFilters.type) return false;
    if (searchFilters.category && item.category !== searchFilters.category) return false;
    if (searchFilters.status && item.status !== searchFilters.status) return false;
    if (searchFilters.riskLevel && item.riskLevel !== searchFilters.riskLevel) return false;
    if (searchFilters.keyword && !item.value.toLowerCase().includes(searchFilters.keyword.toLowerCase()) && 
        !item.remark?.toLowerCase().includes(searchFilters.keyword.toLowerCase())) return false;
    return true;
  });

  // 渲染类型标签
  const renderTypeTag = (type: WhitelistItem['type']) => {
    const colors = {
      IP: 'blue',
      EMAIL: 'green',
      DOMAIN: 'purple',
      USER: 'orange',
      PATH: 'cyan',
      URL: 'magenta'
    };
    return <Tag color={colors[type]}>{type}</Tag>;
  };

  // 渲染分类标签
  const renderCategoryTag = (category: WhitelistItem['category']) => {
    const colors = {
      TRUSTED: 'green',
      EXCEPTION: 'orange',
      BYPASS: 'red'
    };
    const texts = {
      TRUSTED: '可信',
      EXCEPTION: '例外',
      BYPASS: '绕过'
    };
    return <Tag color={colors[category]}>{texts[category]}</Tag>;
  };

  // 渲染状态标签
  const renderStatusTag = (status: WhitelistItem['status']) => {
    const colors = {
      ACTIVE: 'success',
      INACTIVE: 'default',
      PENDING: 'warning'
    };
    const texts = {
      ACTIVE: '活跃',
      INACTIVE: '禁用',
      PENDING: '待审核'
    };
    return <Tag color={colors[status]}>{texts[status]}</Tag>;
  };

  // 渲染风险等级标签
  const renderRiskLevelTag = (riskLevel: WhitelistItem['riskLevel']) => {
    const colors = {
      LOW: 'green',
      MEDIUM: 'orange',
      HIGH: 'red'
    };
    const texts = {
      LOW: '低',
      MEDIUM: '中',
      HIGH: '高'
    };
    return <Tag color={colors[riskLevel]}>{texts[riskLevel]}</Tag>;
  };

  const columns = [
    {
      title: '白名单值',
      dataIndex: 'value',
      key: 'value',
      width: 200,
      render: (value: string, record: WhitelistItem) => (
        <div>
          <Text strong>{value}</Text>
          <div>
            {renderTypeTag(record.type)}
            {renderRiskLevelTag(record.riskLevel)}
          </div>
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: renderCategoryTag,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: renderStatusTag,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags: string[]) => (
        <div>
          {tags.map(tag => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      ),
    },
    {
      title: '创建者',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: WhitelistItem) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除?" onConfirm={() => onDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const onAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setVisible(true);
  };

  const onEdit = (record: WhitelistItem) => {
    setEditingItem(record);
    form.setFieldsValue({
      ...record,
      expiresAt: record.expiresAt ? new Date(record.expiresAt) : undefined
    });
    setVisible(true);
  };

  const onDelete = (id: number) => {
    setData(prev => prev.filter(x => x.id !== id));
    message.success('已删除');
  };

  const onOk = async () => {
    try {
    const values = await form.validateFields();
      const now = new Date().toISOString();
      
      if (editingItem) {
        // 更新现有项
        setData(prev => prev.map(x => 
          x.id === editingItem.id 
            ? { 
                ...x, 
                ...values, 
                updatedAt: now,
                expiresAt: values.expiresAt ? values.expiresAt.toISOString() : undefined
              } 
            : x
        ));
      message.success('已更新');
    } else {
        // 添加新项
      const id = Math.max(0, ...data.map(x => x.id)) + 1;
        const newItem: WhitelistItem = {
          id,
          ...values,
          createdBy: '当前用户',
          createdAt: now,
          updatedAt: now,
          expiresAt: values.expiresAt ? values.expiresAt.toISOString() : undefined,
          tags: values.tags || []
        };
        setData(prev => [newItem, ...prev]);
      message.success('已添加');
    }
    setVisible(false);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const onSearch = () => {
    // 搜索逻辑已在过滤数据中实现
  };

  const onReset = () => {
    setSearchFilters({
      type: undefined,
      category: undefined,
      status: undefined,
      riskLevel: undefined,
      keyword: ''
    });
  };

  const onExport = () => {
    message.success('导出功能开发中...');
  };

  const onImport = () => {
    message.success('导入功能开发中...');
  };

  return (
    <div>
      <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Title level={2}>白名单管理</Title>
          <Text type="secondary">管理系统白名单，控制访问权限和安全策略</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<UploadOutlined />} onClick={onImport}>
              导入
            </Button>
            <Button icon={<DownloadOutlined />} onClick={onExport}>
              导出
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
              新增白名单
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={3}>
          <Card>
            <Statistic
              title="总数"
              value={stats.total}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={3}>
          <Card>
            <Statistic
              title="活跃"
              value={stats.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={3}>
          <Card>
            <Statistic
              title="待审核"
              value={stats.pending}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={3}>
          <Card>
            <Statistic
              title="高风险"
              value={stats.highRisk}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="可信"
              value={stats.trusted}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="例外"
              value={stats.exception}
              prefix={<InfoCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="绕过"
              value={stats.bypass}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索过滤器 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={4}>
            <Input
              placeholder="搜索白名单值或备注"
              value={searchFilters.keyword}
              onChange={(e) => setSearchFilters({ ...searchFilters, keyword: e.target.value })}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择类型"
              value={searchFilters.type}
              onChange={(value) => setSearchFilters({ ...searchFilters, type: value })}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="IP">IP地址</Option>
              <Option value="EMAIL">邮箱</Option>
              <Option value="DOMAIN">域名</Option>
              <Option value="USER">用户</Option>
              <Option value="PATH">路径</Option>
              <Option value="URL">URL</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择分类"
              value={searchFilters.category}
              onChange={(value) => setSearchFilters({ ...searchFilters, category: value })}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="TRUSTED">可信</Option>
              <Option value="EXCEPTION">例外</Option>
              <Option value="BYPASS">绕过</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择状态"
              value={searchFilters.status}
              onChange={(value) => setSearchFilters({ ...searchFilters, status: value })}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="ACTIVE">活跃</Option>
              <Option value="INACTIVE">禁用</Option>
              <Option value="PENDING">待审核</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="风险等级"
              value={searchFilters.riskLevel}
              onChange={(value) => setSearchFilters({ ...searchFilters, riskLevel: value })}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="LOW">低</Option>
              <Option value="MEDIUM">中</Option>
              <Option value="HIGH">高</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={onSearch}>
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={onReset}>
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 高风险警告 */}
      {stats.highRisk > 0 && (
        <Alert
          message="高风险白名单项警告"
          description={`检测到 ${stats.highRisk} 个高风险白名单项，请仔细审查其安全性。`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary">
              立即审查
            </Button>
          }
        />
      )}

      {/* 白名单表格 */}
      <Card>
        <Table 
          rowKey="id" 
          columns={columns} 
          dataSource={filteredData} 
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingItem ? '编辑白名单项' : '新增白名单项'}
        open={visible}
        onOk={onOk}
        onCancel={() => setVisible(false)}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="value"
                label="白名单值"
                rules={[{ required: true, message: '请输入白名单值' }]}
              >
            <Input placeholder="如 192.168.1.100 或 user@example.com" />
          </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="类型"
                rules={[{ required: true, message: '请选择类型' }]}
              >
                <Select placeholder="选择类型">
                  <Option value="IP">IP地址</Option>
                  <Option value="EMAIL">邮箱</Option>
                  <Option value="DOMAIN">域名</Option>
                  <Option value="USER">用户</Option>
                  <Option value="PATH">路径</Option>
                  <Option value="URL">URL</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="选择分类">
                  <Option value="TRUSTED">可信</Option>
                  <Option value="EXCEPTION">例外</Option>
                  <Option value="BYPASS">绕过</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="riskLevel"
                label="风险等级"
                rules={[{ required: true, message: '请选择风险等级' }]}
              >
                <Select placeholder="选择风险等级">
                  <Option value="LOW">低</Option>
                  <Option value="MEDIUM">中</Option>
                  <Option value="HIGH">高</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="选择状态">
                  <Option value="ACTIVE">活跃</Option>
                  <Option value="INACTIVE">禁用</Option>
                  <Option value="PENDING">待审核</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expiresAt"
                label="过期时间"
              >
                <DatePicker 
                  showTime 
                  style={{ width: '100%' }} 
                  placeholder="选择过期时间（可选）"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="tags"
            label="标签"
          >
            <Select mode="tags" placeholder="输入标签（可选）" />
          </Form.Item>

          <Form.Item
            name="remark"
            label="备注"
          >
            <Input.TextArea rows={3} placeholder="请输入备注信息（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


