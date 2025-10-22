import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Tabs,
  Descriptions,
  Spin,
  message,
  Progress,
  Row,
  Col,
  Tooltip,
  Statistic,
  Badge
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  RocketOutlined,
  StopOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  UploadOutlined,
  LineChartOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import { ModelInfo, ModelStatus, ModelType, mockModels } from '../../services/modelService';
import ModelForm from './components/ModelForm';
import ModelUpload from './components/ModelUpload';
import ModelMetrics from './components/ModelMetrics';

const { TabPane } = Tabs;

const ModelsPage: React.FC = () => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [formVisible, setFormVisible] = useState<boolean>(false);
  const [uploadVisible, setUploadVisible] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [metricsVisible, setMetricsVisible] = useState<boolean>(false);

  // 加载模型数据
  useEffect(() => {
    fetchModels();
  }, []);

  // 获取模型列表
  const fetchModels = () => {
    setLoading(true);
    // 模拟API调用
    setTimeout(() => {
      setModels(mockModels);
      setLoading(false);
    }, 1000);
  };

  // 查看模型详情
  const handleViewDetails = (model: ModelInfo) => {
    setSelectedModel(model);
    setDetailVisible(true);
  };

  // 编辑模型
  const handleEdit = (model: ModelInfo) => {
    setSelectedModel(model);
    setIsEditing(true);
    setFormVisible(true);
  };

  // 创建新模型
  const handleCreate = () => {
    setSelectedModel(null);
    setIsEditing(false);
    setFormVisible(true);
  };

  // 删除模型
  const handleDelete = (model: ModelInfo) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除模型 "${model.name}" 吗？此操作不可恢复。`,
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        // 模拟删除操作
        setModels(models.filter(m => m.id !== model.id));
        message.success('模型删除成功');
      }
    });
  };

  // 部署模型
  const handleDeploy = (model: ModelInfo) => {
    // 模拟部署操作
    const updatedModels = models.map(m => {
      if (m.id === model.id) {
        return { ...m, status: ModelStatus.ACTIVE };
      }
      return m;
    });
    setModels(updatedModels);
    message.success(`模型 "${model.name}" 已成功部署`);
  };

  // 停用模型
  const handleDeactivate = (model: ModelInfo) => {
    // 模拟停用操作
    const updatedModels = models.map(m => {
      if (m.id === model.id) {
        return { ...m, status: ModelStatus.INACTIVE };
      }
      return m;
    });
    setModels(updatedModels);
    message.success(`模型 "${model.name}" 已停用`);
  };

  // 查看模型指标
  const handleViewMetrics = (model: ModelInfo) => {
    setSelectedModel(model);
    setMetricsVisible(true);
  };

  // 保存模型表单
  const handleFormSubmit = (values: any) => {
    if (isEditing && selectedModel) {
      // 更新现有模型
      const updatedModels = models.map(m => {
        if (m.id === selectedModel.id) {
          return { ...m, ...values };
        }
        return m;
      });
      setModels(updatedModels);
      message.success('模型更新成功');
    } else {
      // 创建新模型
      const newModel: ModelInfo = {
        id: `model-${Date.now()}`,
        name: values.name,
        description: values.description,
        type: values.type,
        algorithm: values.algorithm,
        version: '1.0.0',
        status: ModelStatus.INACTIVE,
        accuracy: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastTrainedAt: '',
        parameters: values.parameters || {},
        metrics: {},
      };
      setModels([...models, newModel]);
      message.success('模型创建成功');
    }
    setFormVisible(false);
  };

  // 上传模型
  const handleUploadSuccess = (modelInfo: ModelInfo) => {
    setModels([...models, modelInfo]);
    setUploadVisible(false);
    message.success('模型上传成功');
  };

  // 渲染模型状态标签
  const renderStatusTag = (status: ModelStatus) => {
    switch (status) {
      case ModelStatus.ACTIVE:
        return <Tag icon={<CheckCircleOutlined />} color="success">已部署</Tag>;
      case ModelStatus.TRAINING:
        return <Tag icon={<SyncOutlined spin />} color="processing">训练中</Tag>;
      case ModelStatus.INACTIVE:
        return <Tag icon={<PauseCircleOutlined />} color="default">未部署</Tag>;
      case ModelStatus.FAILED:
        return <Tag icon={<CloseCircleOutlined />} color="error">失败</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  // 渲染模型类型标签
  const renderTypeTag = (type: ModelType) => {
    const colors: Record<ModelType, string> = {
      [ModelType.ANOMALY_DETECTION]: 'red',
      [ModelType.CLASSIFICATION]: 'blue',
      [ModelType.CLUSTERING]: 'purple',
      [ModelType.FORECASTING]: 'green',
    };
    
    const labels: Record<ModelType, string> = {
      [ModelType.ANOMALY_DETECTION]: '异常检测',
      [ModelType.CLASSIFICATION]: '分类',
      [ModelType.CLUSTERING]: '聚类',
      [ModelType.FORECASTING]: '预测',
    };
    
    return <Tag color={colors[type]}>{labels[type]}</Tag>;
  };

  // 表格列定义
  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ModelInfo) => (
        <a onClick={() => handleViewDetails(record)}>{text}</a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: ModelType) => renderTypeTag(type),
      filters: [
        { text: '异常检测', value: ModelType.ANOMALY_DETECTION },
        { text: '分类', value: ModelType.CLASSIFICATION },
        { text: '聚类', value: ModelType.CLUSTERING },
        { text: '预测', value: ModelType.FORECASTING },
      ],
      onFilter: (value: string, record: ModelInfo) => record.type === value,
    },
    {
      title: '算法',
      dataIndex: 'algorithm',
      key: 'algorithm',
    },
    {
      title: '准确率',
      dataIndex: 'accuracy',
      key: 'accuracy',
      render: (accuracy: number) => (
        <Tooltip title={`${(accuracy * 100).toFixed(2)}%`}>
          <Progress 
            percent={accuracy * 100} 
            size="small" 
            status={accuracy > 0.9 ? 'success' : accuracy > 0.7 ? 'normal' : 'exception'}
            style={{ width: 100 }}
          />
        </Tooltip>
      ),
      sorter: (a: ModelInfo, b: ModelInfo) => a.accuracy - b.accuracy,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: ModelStatus) => renderStatusTag(status),
      filters: [
        { text: '已部署', value: ModelStatus.ACTIVE },
        { text: '训练中', value: ModelStatus.TRAINING },
        { text: '未部署', value: ModelStatus.INACTIVE },
        { text: '失败', value: ModelStatus.FAILED },
      ],
      onFilter: (value: string, record: ModelInfo) => record.status === value,
    },
    {
      title: '最后训练时间',
      dataIndex: 'lastTrainedAt',
      key: 'lastTrainedAt',
      render: (text: string) => text ? new Date(text).toLocaleString() : '未训练',
      sorter: (a: ModelInfo, b: ModelInfo) => {
        if (!a.lastTrainedAt) return 1;
        if (!b.lastTrainedAt) return -1;
        return new Date(a.lastTrainedAt).getTime() - new Date(b.lastTrainedAt).getTime();
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ModelInfo) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => handleViewDetails(record)} 
            title="查看详情"
          />
          <Button 
            type="text" 
            icon={<LineChartOutlined />} 
            onClick={() => handleViewMetrics(record)} 
            title="查看指标"
          />
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)} 
            title="编辑"
          />
          {record.status !== ModelStatus.ACTIVE ? (
            <Button 
              type="text" 
              icon={<RocketOutlined />} 
              onClick={() => handleDeploy(record)} 
              title="部署"
              disabled={record.status === ModelStatus.TRAINING}
            />
          ) : (
            <Button 
              type="text" 
              icon={<StopOutlined />} 
              onClick={() => handleDeactivate(record)} 
              title="停用"
            />
          )}
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record)} 
            title="删除"
            disabled={record.status === ModelStatus.ACTIVE || record.status === ModelStatus.TRAINING}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2>AI模型管理</h2>
      
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleCreate}
            >
              创建模型
            </Button>
            <Button 
              icon={<UploadOutlined />} 
              onClick={() => setUploadVisible(true)}
            >
              上传模型
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchModels}
            >
              刷新
            </Button>
          </Space>
        </div>
        
        <Table 
          columns={columns} 
          dataSource={models} 
          rowKey="id"
          loading={loading}
          pagination={{ 
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个模型`
          }}
        />
      </Card>
      
      {/* 模型详情弹窗 */}
      <Modal
        title="模型详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedModel && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="模型ID">{selectedModel.id}</Descriptions.Item>
              <Descriptions.Item label="状态">{renderStatusTag(selectedModel.status)}</Descriptions.Item>
              <Descriptions.Item label="名称">{selectedModel.name}</Descriptions.Item>
              <Descriptions.Item label="类型">{renderTypeTag(selectedModel.type)}</Descriptions.Item>
              <Descriptions.Item label="算法">{selectedModel.algorithm}</Descriptions.Item>
              <Descriptions.Item label="版本">{selectedModel.version}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{new Date(selectedModel.createdAt).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="最后更新">{new Date(selectedModel.updatedAt).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="最后训练时间" span={2}>
                {selectedModel.lastTrainedAt ? new Date(selectedModel.lastTrainedAt).toLocaleString() : '未训练'}
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                {selectedModel.description}
              </Descriptions.Item>
            </Descriptions>
            
            <div style={{ marginTop: 24 }}>
              <h3>性能指标</h3>
              <Row gutter={16}>
                <Col span={6}>
                  <Card>
                    <Statistic 
                      title="准确率" 
                      value={selectedModel.accuracy} 
                      precision={2}
                      formatter={(value) => `${(Number(value) * 100).toFixed(2)}%`}
                      valueStyle={{ color: selectedModel.accuracy > 0.9 ? '#3f8600' : '#cf1322' }}
                    />
                  </Card>
                </Col>
                {selectedModel.metrics.precision && (
                  <Col span={6}>
                    <Card>
                      <Statistic 
                        title="精确率" 
                        value={selectedModel.metrics.precision} 
                        precision={2}
                        formatter={(value) => `${(Number(value) * 100).toFixed(2)}%`}
                      />
                    </Card>
                  </Col>
                )}
                {selectedModel.metrics.recall && (
                  <Col span={6}>
                    <Card>
                      <Statistic 
                        title="召回率" 
                        value={selectedModel.metrics.recall} 
                        precision={2}
                        formatter={(value) => `${(Number(value) * 100).toFixed(2)}%`}
                      />
                    </Card>
                  </Col>
                )}
                {selectedModel.metrics.f1Score && (
                  <Col span={6}>
                    <Card>
                      <Statistic 
                        title="F1分数" 
                        value={selectedModel.metrics.f1Score} 
                        precision={2}
                        formatter={(value) => `${(Number(value) * 100).toFixed(2)}%`}
                      />
                    </Card>
                  </Col>
                )}
              </Row>
            </div>
            
            <div style={{ marginTop: 24 }}>
              <h3>模型参数</h3>
              <Card>
                <pre>{JSON.stringify(selectedModel.parameters, null, 2)}</pre>
              </Card>
            </div>
          </div>
        )}
      </Modal>
      
      {/* 模型表单弹窗 */}
      <ModelForm 
        visible={formVisible}
        model={isEditing ? selectedModel : undefined}
        onCancel={() => setFormVisible(false)}
        onSubmit={handleFormSubmit}
      />
      
      {/* 模型上传弹窗 */}
      <ModelUpload 
        visible={uploadVisible}
        onCancel={() => setUploadVisible(false)}
        onSuccess={handleUploadSuccess}
      />
      
      {/* 模型指标弹窗 */}
      <ModelMetrics 
        visible={metricsVisible}
        model={selectedModel}
        onCancel={() => setMetricsVisible(false)}
      />
    </div>
  );
};

export default ModelsPage; 