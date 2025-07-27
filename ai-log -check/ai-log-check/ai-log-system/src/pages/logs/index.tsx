import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Input,
  Button,
  Space,
  Tag,
  Drawer,
  Descriptions,
  Tabs,
  Spin,
  Typography,
  Row,
  Col,
  Select,
  Form,
  DatePicker,
  Tooltip,
  Badge,
  Divider,
  Alert,
  Progress
} from 'antd';
import {
  SearchOutlined,
  FileTextOutlined,
  BarChartOutlined,
  CodeOutlined,
  DownloadOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';

const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

// 日志类型定义
interface LogData {
  id: string;
  timestamp: string;
  source: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  content: string;
  ip?: string;
  userId?: string;
  action?: string;
  isAnomaly: boolean;
  anomalyScore?: number;
  anomalyReason?: string;
  raw: string;
}

// 模拟日志数据生成
const generateMockLogs = (count: number): LogData[] => {
  const sources = ['Web服务器', '数据库', '防火墙', '应用服务器', '用户认证系统'];
  const levels = ['info', 'warning', 'error', 'debug'];
  const actions = ['登录', '查询', '修改', '删除', '创建', '导出', '导入'];
  const ips = ['192.168.1.1', '10.0.0.5', '172.16.0.10', '192.168.0.15', '10.10.10.10'];
  const userIds = ['admin', 'user1', 'user2', 'guest', 'system'];
  
  return Array.from({ length: count }, (_, i) => {
    const now = new Date();
    const timestamp = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000).toISOString();
    const source = sources[Math.floor(Math.random() * sources.length)];
    const level = levels[Math.floor(Math.random() * levels.length)] as 'info' | 'warning' | 'error' | 'debug';
    const action = actions[Math.floor(Math.random() * actions.length)];
    const ip = ips[Math.floor(Math.random() * ips.length)];
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    const isAnomaly = Math.random() > 0.8;
    const anomalyScore = isAnomaly ? Math.round(Math.random() * 40 + 60) : undefined;
    
    let content = `用户 ${userId} 从 ${ip} 进行了 ${action} 操作`;
    if (level === 'error') {
      content = `错误: 操作失败，原因: 连接超时`;
    } else if (level === 'warning') {
      content = `警告: 多次尝试访问受限资源`;
    }
    
    const anomalyReason = isAnomaly ? 
      '检测到异常访问模式，用户行为与历史模式不符' : undefined;
    
    const raw = JSON.stringify({
      timestamp,
      source,
      level,
      content,
      ip,
      userId,
      action,
      metadata: {
        browser: 'Chrome',
        os: 'Windows',
        sessionId: `sess_${Math.random().toString(36).substring(2, 10)}`
      }
    }, null, 2);
    
    return {
      id: `LOG-${(10000 + i).toString()}`,
      timestamp,
      source,
      level,
      content,
      ip,
      userId,
      action,
      isAnomaly,
      anomalyScore,
      anomalyReason,
      raw
    };
  });
};

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<LogData | null>(null);
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [form] = Form.useForm();
  
  // 加载日志数据
  useEffect(() => {
    setLoading(true);
    // 模拟API请求延迟
    setTimeout(() => {
      const mockData = generateMockLogs(100);
      setLogs(mockData);
      setLoading(false);
    }, 1000);
  }, []);
  
  // 查看日志详情
  const showLogDetail = (log: LogData) => {
    setSelectedLog(log);
    setDrawerVisible(true);
  };
  
  // 日志等级标签渲染
  const renderLevelTag = (level: string) => {
    const colors: Record<string, string> = {
      info: 'blue',
      warning: 'orange',
      error: 'red',
      debug: 'green'
    };
    
    return <Tag color={colors[level]}>{level.toUpperCase()}</Tag>;
  };
  
  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (text: string) => new Date(text).toLocaleString(),
      sorter: (a: LogData, b: LogData) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
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
      onFilter: (value: string, record: LogData) => record.source === value,
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      render: renderLevelTag,
      filters: [
        { text: 'INFO', value: 'info' },
        { text: 'WARNING', value: 'warning' },
        { text: 'ERROR', value: 'error' },
        { text: 'DEBUG', value: 'debug' },
      ],
      onFilter: (value: string, record: LogData) => record.level === value,
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '异常',
      dataIndex: 'isAnomaly',
      key: 'isAnomaly',
      render: (isAnomaly: boolean, record: LogData) => (
        isAnomaly ? (
          <Tooltip title={record.anomalyReason}>
            <Tag color="red" icon={<WarningOutlined />}>异常</Tag>
          </Tooltip>
        ) : null
      ),
      filters: [
        { text: '异常', value: true },
        { text: '正常', value: false },
      ],
      onFilter: (value: boolean, record: LogData) => record.isAnomaly === value,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: LogData) => (
        <Button type="link" size="small" onClick={() => showLogDetail(record)}>
          查看详情
        </Button>
      ),
    },
  ];
  
  // 搜索表单
  const searchForm = (
    <Card style={{ marginBottom: 16 }}>
      <Form form={form} layout="horizontal">
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item label="时间范围">
              <RangePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="日志来源">
              <Select placeholder="选择日志来源" allowClear style={{ width: '100%' }}>
                <Select.Option value="Web服务器">Web服务器</Select.Option>
                <Select.Option value="数据库">数据库</Select.Option>
                <Select.Option value="防火墙">防火墙</Select.Option>
                <Select.Option value="应用服务器">应用服务器</Select.Option>
                <Select.Option value="用户认证系统">用户认证系统</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="日志级别">
              <Select placeholder="选择日志级别" allowClear style={{ width: '100%' }}>
                <Select.Option value="info">INFO</Select.Option>
                <Select.Option value="warning">WARNING</Select.Option>
                <Select.Option value="error">ERROR</Select.Option>
                <Select.Option value="debug">DEBUG</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="关键字">
              <Input placeholder="搜索日志内容" allowClear />
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24} style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<ReloadOutlined />}>重置</Button>
              <Button type="primary" icon={<SearchOutlined />}>搜索</Button>
              <Button icon={<DownloadOutlined />}>导出日志</Button>
            </Space>
          </Col>
        </Row>
      </Form>
    </Card>
  );
  
  return (
    <div>
      <h2>日志详情查看</h2>
      
      {searchForm}
      
      <Card>
        <Table 
          columns={columns} 
          dataSource={logs} 
          rowKey="id"
          loading={loading}
          pagination={{ 
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条日志`
          }}
        />
      </Card>
      
      {/* 日志详情抽屉 */}
      <Drawer
        title="日志详情"
        placement="right"
        width={700}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedLog && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="日志ID">{selectedLog.id}</Descriptions.Item>
              <Descriptions.Item label="时间">{new Date(selectedLog.timestamp).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="来源">{selectedLog.source}</Descriptions.Item>
              <Descriptions.Item label="级别">{renderLevelTag(selectedLog.level)}</Descriptions.Item>
              <Descriptions.Item label="IP地址" span={2}>{selectedLog.ip}</Descriptions.Item>
              <Descriptions.Item label="用户ID">{selectedLog.userId}</Descriptions.Item>
              <Descriptions.Item label="操作">{selectedLog.action}</Descriptions.Item>
            </Descriptions>
            
            <Divider />
            
            <Tabs defaultActiveKey="content">
              <TabPane 
                tab={<span><FileTextOutlined />日志内容</span>}
                key="content"
              >
                <Paragraph>{selectedLog.content}</Paragraph>
              </TabPane>
              
              <TabPane 
                tab={<span><BarChartOutlined />AI分析</span>}
                key="analysis"
              >
                {selectedLog.isAnomaly ? (
                  <div>
                    <Alert
                      message="检测到异常"
                      description={selectedLog.anomalyReason}
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <Row>
                      <Col span={24}>
                        <Title level={5}>异常评分</Title>
                        <Progress 
                          percent={selectedLog.anomalyScore} 
                          status="exception" 
                          strokeColor={{
                            '0%': '#108ee9',
                            '100%': '#ff4d4f',
                          }}
                        />
                      </Col>
                    </Row>
                    <Row style={{ marginTop: 16 }}>
                      <Col span={24}>
                        <Title level={5}>异常特征</Title>
                        <ul>
                          <li>用户行为模式异常</li>
                          <li>访问时间异常</li>
                          <li>操作频率超出正常范围</li>
                        </ul>
                      </Col>
                    </Row>
                  </div>
                ) : (
                  <div>
                    <Alert
                      message="未检测到异常"
                      description="该日志记录未被AI模型判定为异常"
                      type="info"
                      showIcon
                    />
                  </div>
                )}
              </TabPane>
              
              <TabPane 
                tab={<span><CodeOutlined />原始日志</span>}
                key="raw"
              >
                <pre style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: 16, 
                  borderRadius: 4,
                  overflow: 'auto',
                  maxHeight: 400
                }}>
                  {selectedLog.raw}
                </pre>
              </TabPane>
            </Tabs>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default LogsPage; 