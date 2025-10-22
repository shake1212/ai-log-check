import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Tag, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  Row, 
  Col,
  Badge,
  Tooltip,
  message
} from 'antd';
import { 
  SearchOutlined, 
  FilterOutlined, 
  ReloadOutlined, 
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

// 预警状态枚举
const AlertStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  RESOLVED: 'resolved',
  FALSE_POSITIVE: 'false_positive'
};

// 模拟预警数据
const generateMockAlerts = (count) => {
  const alertTypes = ['SQL注入', 'XSS攻击', '暴力破解', '异常登录', '数据泄露', '权限提升', '恶意扫描'];
  const sources = ['Web服务器', '数据库', '防火墙', '应用服务器', '用户认证系统'];
  const statuses = [AlertStatus.PENDING, AlertStatus.PROCESSING, AlertStatus.RESOLVED, AlertStatus.FALSE_POSITIVE];
  
  return Array.from({ length: count }, (_, i) => {
    const now = new Date();
    const timestamp = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
    const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const level = Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low';
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      id: `ALERT-${(10000 + i).toString()}`,
      timestamp,
      source: sources[Math.floor(Math.random() * sources.length)],
      type,
      level,
      description: `检测到${type}攻击尝试，可能存在安全风险`,
      status,
      assignee: status !== AlertStatus.PENDING ? '系统管理员' : undefined,
      resolution: status === AlertStatus.RESOLVED || status === AlertStatus.FALSE_POSITIVE 
        ? '已处理并加强防护措施' : undefined,
      aiConfidence: Math.round(Math.random() * 40 + 60)
    };
  });
};

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [processingModalVisible, setProcessingModalVisible] = useState(false);
  const [form] = Form.useForm();
  
  // 加载预警数据
  useEffect(() => {
    setLoading(true);
    // 模拟API请求延迟
    setTimeout(() => {
      const mockData = generateMockAlerts(50);
      setAlerts(mockData);
      setLoading(false);
    }, 1000);
  }, []);
  
  // 处理预警
  const handleProcessAlert = (values) => {
    if (!selectedAlert) return;
    
    // 更新预警状态
    const updatedAlerts = alerts.map(alert => {
      if (alert.id === selectedAlert.id) {
        return {
          ...alert,
          status: values.status,
          assignee: values.assignee,
          resolution: values.resolution
        };
      }
      return alert;
    });
    
    setAlerts(updatedAlerts);
    setProcessingModalVisible(false);
    form.resetFields();
    message.success('预警处理成功');
  };
  
  // 查看预警详情
  const showDetailModal = (alert) => {
    setSelectedAlert(alert);
    setDetailModalVisible(true);
  };
  
  // 处理预警操作
  const showProcessingModal = (alert) => {
    setSelectedAlert(alert);
    setProcessingModalVisible(true);
    form.setFieldsValue({
      status: alert.status,
      assignee: alert.assignee || '当前用户',
      resolution: alert.resolution || ''
    });
  };
  
  // 状态标签渲染
  const renderStatusTag = (status) => {
    switch (status) {
      case AlertStatus.PENDING:
        return <Tag icon={<ExclamationCircleOutlined />} color="error">待处理</Tag>;
      case AlertStatus.PROCESSING:
        return <Tag icon={<ClockCircleOutlined />} color="processing">处理中</Tag>;
      case AlertStatus.RESOLVED:
        return <Tag icon={<CheckCircleOutlined />} color="success">已解决</Tag>;
      case AlertStatus.FALSE_POSITIVE:
        return <Tag color="default">误报</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };
  
  // 风险等级标签渲染
  const renderLevelTag = (level) => {
    const colors = {
      high: 'red',
      medium: 'orange',
      low: 'green'
    };
    
    return (
      <Tag color={colors[level]}>
        {level === 'high' ? '高' : level === 'medium' ? '中' : '低'}
      </Tag>
    );
  };
  
  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (text) => new Date(text).toLocaleString(),
      sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      filters: [
        { text: 'Web服务器', value: 'Web服务器' },
        { text: '数据库', value: '数据库' },
        { text: '防火墙', value: '防火墙' },
        { text: '应用服务器', value: '应用服务器' },
        { text: '用户认证系统', value: '用户认证系统' },
      ],
      onFilter: (value, record) => record.source === value,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      filters: [
        { text: 'SQL注入', value: 'SQL注入' },
        { text: 'XSS攻击', value: 'XSS攻击' },
        { text: '暴力破解', value: '暴力破解' },
        { text: '异常登录', value: '异常登录' },
        { text: '数据泄露', value: '数据泄露' },
        { text: '权限提升', value: '权限提升' },
        { text: '恶意扫描', value: '恶意扫描' },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: '风险等级',
      dataIndex: 'level',
      key: 'level',
      render: renderLevelTag,
      filters: [
        { text: '高', value: 'high' },
        { text: '中', value: 'medium' },
        { text: '低', value: 'low' },
      ],
      onFilter: (value, record) => record.level === value,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: renderStatusTag,
      filters: [
        { text: '待处理', value: AlertStatus.PENDING },
        { text: '处理中', value: AlertStatus.PROCESSING },
        { text: '已解决', value: AlertStatus.RESOLVED },
        { text: '误报', value: AlertStatus.FALSE_POSITIVE },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'AI置信度',
      dataIndex: 'aiConfidence',
      key: 'aiConfidence',
      render: (value) => (
        <Tooltip title={`AI模型对此预警的置信度为${value}%`}>
          <Badge 
            status={value > 80 ? 'error' : value > 60 ? 'warning' : 'default'} 
            text={`${value}%`} 
          />
        </Tooltip>
      ),
      sorter: (a, b) => a.aiConfidence - b.aiConfidence,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => showDetailModal(record)}>
            查看详情
          </Button>
          <Button 
            type="link" 
            size="small" 
            onClick={() => showProcessingModal(record)}
          >
            处理预警
          </Button>
        </Space>
      ),
    },
  ];
  
  // 搜索表单
  const searchForm = (
    <Card style={{ marginBottom: 16 }}>
      <Form layout="horizontal">
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item label="时间范围">
              <DatePicker.RangePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="预警类型">
              <Select 
                placeholder="选择预警类型" 
                allowClear
                style={{ width: '100%' }}
              >
                <Select.Option value="SQL注入">SQL注入</Select.Option>
                <Select.Option value="XSS攻击">XSS攻击</Select.Option>
                <Select.Option value="暴力破解">暴力破解</Select.Option>
                <Select.Option value="异常登录">异常登录</Select.Option>
                <Select.Option value="数据泄露">数据泄露</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="风险等级">
              <Select 
                placeholder="选择风险等级" 
                allowClear
                style={{ width: '100%' }}
              >
                <Select.Option value="high">高</Select.Option>
                <Select.Option value="medium">中</Select.Option>
                <Select.Option value="low">低</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="处理状态">
              <Select 
                placeholder="选择处理状态" 
                allowClear
                style={{ width: '100%' }}
              >
                <Select.Option value={AlertStatus.PENDING}>待处理</Select.Option>
                <Select.Option value={AlertStatus.PROCESSING}>处理中</Select.Option>
                <Select.Option value={AlertStatus.RESOLVED}>已解决</Select.Option>
                <Select.Option value={AlertStatus.FALSE_POSITIVE}>误报</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24} style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<ReloadOutlined />}>重置</Button>
              <Button type="primary" icon={<SearchOutlined />}>搜索</Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </Card>
  );
  
  return (
    <div>
      <h2>异常预警列表</h2>
      
      {searchForm}
      
      <Card>
        <Table 
          columns={columns} 
          dataSource={alerts} 
          rowKey="id"
          loading={loading}
          pagination={{ 
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条预警`
          }}
        />
      </Card>
      
      {/* 预警详情弹窗 */}
      <Modal
        title="预警详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="process" 
            type="primary" 
            onClick={() => {
              setDetailModalVisible(false);
              if (selectedAlert) {
                showProcessingModal(selectedAlert);
              }
            }}
          >
            处理预警
          </Button>,
        ]}
        width={700}
      >
        {selectedAlert && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <p><strong>预警ID:</strong> {selectedAlert.id}</p>
                <p><strong>时间:</strong> {new Date(selectedAlert.timestamp).toLocaleString()}</p>
                <p><strong>来源:</strong> {selectedAlert.source}</p>
                <p><strong>类型:</strong> {selectedAlert.type}</p>
              </Col>
              <Col span={12}>
                <p><strong>风险等级:</strong> {renderLevelTag(selectedAlert.level)}</p>
                <p><strong>状态:</strong> {renderStatusTag(selectedAlert.status)}</p>
                <p><strong>AI置信度:</strong> {selectedAlert.aiConfidence}%</p>
                <p><strong>处理人:</strong> {selectedAlert.assignee || '未分配'}</p>
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <p><strong>描述:</strong></p>
              <p>{selectedAlert.description}</p>
            </div>
            {selectedAlert.resolution && (
              <div style={{ marginTop: 16 }}>
                <p><strong>解决方案:</strong></p>
                <p>{selectedAlert.resolution}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
      
      {/* 处理预警弹窗 */}
      <Modal
        title="处理预警"
        open={processingModalVisible}
        onCancel={() => setProcessingModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form 
          form={form}
          layout="vertical"
          onFinish={handleProcessAlert}
        >
          <Form.Item
            name="status"
            label="处理状态"
            rules={[{ required: true, message: '请选择处理状态' }]}
          >
            <Select>
              <Select.Option value={AlertStatus.PROCESSING}>处理中</Select.Option>
              <Select.Option value={AlertStatus.RESOLVED}>已解决</Select.Option>
              <Select.Option value={AlertStatus.FALSE_POSITIVE}>误报</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="assignee"
            label="处理人"
            rules={[{ required: true, message: '请输入处理人' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="resolution"
            label="处理备注"
            rules={[{ required: true, message: '请输入处理备注' }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AlertsPage; 