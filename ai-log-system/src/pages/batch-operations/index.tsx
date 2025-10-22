import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Upload,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Progress,
  Row,
  Col,
  Statistic,
  Tabs,
  Tag,
  Typography,
  Divider,
  Alert,
  Tooltip,
  Badge
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';

const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { TextArea } = Input;

// 批量操作结果接口
interface BatchOperationResult {
  success: boolean;
  totalCount: number;
  successCount: number;
  errorCount: number;
  message: string;
  errors?: string[];
  duration?: number;
}

// 批量操作统计接口
interface BatchStats {
  totalLogs: number;
  anomalyLogs: number;
  normalLogs: number;
  recent24HoursLogs: number;
  anomalyRate: number;
  lastUpdated: string;
}

// 操作历史接口
interface OperationHistory {
  id: string;
  operation: string;
  timestamp: string;
  totalCount: number;
  successCount: number;
  errorCount: number;
  status: 'success' | 'error' | 'processing';
  duration: number;
}

const BatchOperationsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<BatchStats | null>(null);
  const [operationHistory, setOperationHistory] = useState<OperationHistory[]>([]);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [cleanupModalVisible, setCleanupModalVisible] = useState(false);
  const [markAnomalyModalVisible, setMarkAnomalyModalVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [uploadForm] = Form.useForm();
  const [cleanupForm] = Form.useForm();
  const [markAnomalyForm] = Form.useForm();

  // 获取批量操作统计
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/logs/batch/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      message.error('获取统计信息失败');
    }
  };

  // 获取操作历史
  const fetchOperationHistory = async () => {
    try {
      // 这里应该调用实际的API，暂时使用模拟数据
      const mockHistory: OperationHistory[] = [
        {
          id: '1',
          operation: '批量导入日志',
          timestamp: dayjs().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
          totalCount: 1000,
          successCount: 1000,
          errorCount: 0,
          status: 'success',
          duration: 2500
        },
        {
          id: '2',
          operation: '批量标记异常',
          timestamp: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
          totalCount: 50,
          successCount: 50,
          errorCount: 0,
          status: 'success',
          duration: 800
        },
        {
          id: '3',
          operation: '清理过期日志',
          timestamp: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
          totalCount: 5000,
          successCount: 5000,
          errorCount: 0,
          status: 'success',
          duration: 12000
        }
      ];
      setOperationHistory(mockHistory);
    } catch (error) {
      message.error('获取操作历史失败');
    }
  };

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.json,.csv,.txt',
    beforeUpload: (file) => {
      const isValidType = ['application/json', 'text/csv', 'text/plain'].includes(file.type);
      if (!isValidType) {
        message.error('只支持 JSON、CSV、TXT 格式的文件');
        return false;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB');
        return false;
      }
      return false; // 阻止自动上传
    },
    onChange: (info) => {
      if (info.fileList.length > 0) {
        uploadForm.setFieldsValue({ file: info.fileList[0].originFileObj });
      }
    }
  };

  // 批量导入日志
  const handleBatchImport = async (values: any) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', values.file);
      formData.append('batchSize', values.batchSize || 1000);

      const response = await fetch('/api/logs/batch/import', {
        method: 'POST',
        body: formData
      });

      const result: BatchOperationResult = await response.json();
      
      if (result.success) {
        message.success(`导入成功：${result.successCount}/${result.totalCount} 条记录`);
        setUploadModalVisible(false);
        uploadForm.resetFields();
        fetchStats();
        fetchOperationHistory();
      } else {
        message.error(`导入失败：${result.message}`);
      }
    } catch (error) {
      message.error('批量导入失败');
    } finally {
      setLoading(false);
    }
  };

  // 清理过期日志
  const handleCleanup = async (values: any) => {
    try {
      setLoading(true);
      const response = await fetch('/api/logs/batch/cleanup', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          beforeDate: values.beforeDate.format('YYYY-MM-DDTHH:mm:ss')
        })
      });

      const result: BatchOperationResult = await response.json();
      
      if (result.success) {
        message.success(`清理完成：删除了 ${result.successCount} 条过期记录`);
        setCleanupModalVisible(false);
        cleanupForm.resetFields();
        fetchStats();
        fetchOperationHistory();
      } else {
        message.error(`清理失败：${result.message}`);
      }
    } catch (error) {
      message.error('清理过期日志失败');
    } finally {
      setLoading(false);
    }
  };

  // 批量标记异常
  const handleMarkAnomaly = async (values: any) => {
    try {
      setLoading(true);
      const response = await fetch('/api/logs/batch/mark-anomaly', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ids: selectedRowKeys,
          isAnomaly: values.isAnomaly,
          anomalyScore: values.anomalyScore,
          anomalyReason: values.anomalyReason
        })
      });

      const result: BatchOperationResult = await response.json();
      
      if (result.success) {
        message.success(`标记完成：${result.successCount} 条记录`);
        setMarkAnomalyModalVisible(false);
        markAnomalyForm.resetFields();
        setSelectedRowKeys([]);
        fetchStats();
        fetchOperationHistory();
      } else {
        message.error(`标记失败：${result.message}`);
      }
    } catch (error) {
      message.error('批量标记异常失败');
    } finally {
      setLoading(false);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的记录');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条记录吗？此操作不可恢复。`,
      icon: <ExclamationCircleOutlined />,
      onOk: async () => {
        try {
          setLoading(true);
          const response = await fetch('/api/logs/batch/delete', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(selectedRowKeys)
          });

          const result: BatchOperationResult = await response.json();
          
          if (result.success) {
            message.success(`删除完成：${result.successCount} 条记录`);
            setSelectedRowKeys([]);
            fetchStats();
            fetchOperationHistory();
          } else {
            message.error(`删除失败：${result.message}`);
          }
        } catch (error) {
          message.error('批量删除失败');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // 操作历史表格列
  const historyColumns: ColumnsType<OperationHistory> = [
    {
      title: '操作类型',
      dataIndex: 'operation',
      key: 'operation',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180
    },
    {
      title: '总数',
      dataIndex: 'totalCount',
      key: 'totalCount',
      width: 80
    },
    {
      title: '成功',
      dataIndex: 'successCount',
      key: 'successCount',
      width: 80,
      render: (text) => <Text type="success">{text}</Text>
    },
    {
      title: '失败',
      dataIndex: 'errorCount',
      key: 'errorCount',
      width: 80,
      render: (text) => <Text type="danger">{text}</Text>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusConfig = {
          success: { color: 'success', icon: <CheckCircleOutlined />, text: '成功' },
          error: { color: 'error', icon: <ExclamationCircleOutlined />, text: '失败' },
          processing: { color: 'processing', icon: <ClockCircleOutlined />, text: '处理中' }
        };
        const config = statusConfig[status];
        return (
          <Badge 
            status={config.color as any} 
            text={
              <Space>
                {config.icon}
                {config.text}
              </Space>
            } 
          />
        );
      }
    },
    {
      title: '耗时(ms)',
      dataIndex: 'duration',
      key: 'duration',
      width: 100
    }
  ];

  useEffect(() => {
    fetchStats();
    fetchOperationHistory();
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>批量操作管理</Title>
      
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总日志数"
              value={stats?.totalLogs || 0}
              prefix={<InfoCircleOutlined />}
              loading={!stats}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="异常日志"
              value={stats?.anomalyLogs || 0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ExclamationCircleOutlined />}
              loading={!stats}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="异常率"
              value={stats?.anomalyRate ? stats.anomalyRate * 100 : 0}
              precision={2}
              suffix="%"
              valueStyle={{ color: '#cf1322' }}
              loading={!stats}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="24小时新增"
              value={stats?.recent24HoursLogs || 0}
              prefix={<ClockCircleOutlined />}
              loading={!stats}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作按钮 */}
      <Card style={{ marginBottom: '24px' }}>
        <Space wrap>
          <Button 
            type="primary" 
            icon={<UploadOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            批量导入
          </Button>
          <Button 
            icon={<DeleteOutlined />}
            onClick={handleBatchDelete}
            disabled={selectedRowKeys.length === 0}
          >
            批量删除 ({selectedRowKeys.length})
          </Button>
          <Button 
            icon={<EditOutlined />}
            onClick={() => setMarkAnomalyModalVisible(true)}
            disabled={selectedRowKeys.length === 0}
          >
            批量标记异常 ({selectedRowKeys.length})
          </Button>
          <Button 
            icon={<DeleteOutlined />}
            onClick={() => setCleanupModalVisible(true)}
          >
            清理过期日志
          </Button>
          <Button 
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchStats();
              fetchOperationHistory();
            }}
          >
            刷新
          </Button>
        </Space>
      </Card>

      {/* 主要内容 */}
      <Card>
        <Tabs defaultActiveKey="history">
          <TabPane tab="操作历史" key="history">
            <Table
              columns={historyColumns}
              dataSource={operationHistory}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true
              }}
            />
          </TabPane>
          
          <TabPane tab="操作指南" key="guide">
            <Alert
              message="批量操作指南"
              description={
                <div>
                  <p><strong>1. 批量导入：</strong>支持 JSON、CSV、TXT 格式文件，建议批次大小 1000-5000 条</p>
                  <p><strong>2. 批量删除：</strong>选择要删除的记录，确认后执行删除操作</p>
                  <p><strong>3. 批量标记异常：</strong>选择记录并设置异常标记和原因</p>
                  <p><strong>4. 清理过期日志：</strong>删除指定日期之前的历史数据</p>
                  <p><strong>注意事项：</strong>批量操作不可恢复，请谨慎操作</p>
                </div>
              }
              type="info"
              showIcon
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 批量导入模态框 */}
      <Modal
        title="批量导入日志"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={uploadForm}
          layout="vertical"
          onFinish={handleBatchImport}
        >
          <Form.Item
            name="file"
            label="选择文件"
            rules={[{ required: true, message: '请选择要导入的文件' }]}
          >
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>
          
          <Form.Item
            name="batchSize"
            label="批次大小"
            initialValue={1000}
            rules={[{ required: true, message: '请输入批次大小' }]}
          >
            <Input type="number" min={100} max={5000} />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                开始导入
              </Button>
              <Button onClick={() => setUploadModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 清理过期日志模态框 */}
      <Modal
        title="清理过期日志"
        open={cleanupModalVisible}
        onCancel={() => setCleanupModalVisible(false)}
        footer={null}
        width={500}
      >
        <Alert
          message="警告"
          description="此操作将永久删除指定日期之前的所有日志记录，请谨慎操作！"
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        
        <Form
          form={cleanupForm}
          layout="vertical"
          onFinish={handleCleanup}
        >
          <Form.Item
            name="beforeDate"
            label="清理日期"
            rules={[{ required: true, message: '请选择清理日期' }]}
          >
            <DatePicker 
              showTime 
              placeholder="选择要清理的日期"
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} danger>
                确认清理
              </Button>
              <Button onClick={() => setCleanupModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量标记异常模态框 */}
      <Modal
        title="批量标记异常"
        open={markAnomalyModalVisible}
        onCancel={() => setMarkAnomalyModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={markAnomalyForm}
          layout="vertical"
          onFinish={handleMarkAnomaly}
        >
          <Form.Item
            name="isAnomaly"
            label="异常标记"
            rules={[{ required: true, message: '请选择异常标记' }]}
          >
            <Select placeholder="选择异常标记">
              <Option value={true}>标记为异常</Option>
              <Option value={false}>标记为正常</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="anomalyScore"
            label="异常分数"
            rules={[{ required: true, message: '请输入异常分数' }]}
          >
            <Input type="number" min={0} max={1} step={0.01} placeholder="0.0-1.0" />
          </Form.Item>
          
          <Form.Item
            name="anomalyReason"
            label="异常原因"
            rules={[{ required: true, message: '请输入异常原因' }]}
          >
            <TextArea rows={3} placeholder="请输入异常原因" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                确认标记
              </Button>
              <Button onClick={() => setMarkAnomalyModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BatchOperationsPage;
