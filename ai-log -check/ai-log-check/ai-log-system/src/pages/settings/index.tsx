import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Slider,
  Switch,
  Select,
  Divider,
  Typography,
  Row,
  Col,
  Space,
  Tabs,
  message,
  Tooltip,
  InputNumber,
  Alert
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  QuestionCircleOutlined,
  ExperimentOutlined,
  SettingOutlined,
  BulbOutlined,
  RobotOutlined,
  BarChartOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// 模型配置接口
interface ModelConfig {
  anomalyDetection: {
    threshold: number;
    sensitivity: number;
    algorithm: string;
    featureImportance: Record<string, number>;
    enableRealTimeDetection: boolean;
    trainingFrequency: string;
  };
  notification: {
    enableEmail: boolean;
    enableSms: boolean;
    enableWebhook: boolean;
    minSeverityLevel: string;
    recipients: string[];
    webhookUrl: string;
  };
  dataProcessing: {
    logRetentionDays: number;
    samplingRate: number;
    enablePreprocessing: boolean;
    preprocessingSteps: string[];
  };
}

// 初始配置
const initialConfig: ModelConfig = {
  anomalyDetection: {
    threshold: 75,
    sensitivity: 65,
    algorithm: 'isolation_forest',
    featureImportance: {
      'timestamp': 0.8,
      'user_behavior': 0.9,
      'ip_address': 0.7,
      'action_type': 0.6,
      'resource_access': 0.8
    },
    enableRealTimeDetection: true,
    trainingFrequency: 'daily',
  },
  notification: {
    enableEmail: true,
    enableSms: false,
    enableWebhook: true,
    minSeverityLevel: 'medium',
    recipients: ['admin@example.com', 'security@example.com'],
    webhookUrl: 'https://api.example.com/webhook/security'
  },
  dataProcessing: {
    logRetentionDays: 90,
    samplingRate: 100,
    enablePreprocessing: true,
    preprocessingSteps: ['normalization', 'outlier_removal', 'feature_extraction']
  }
};

const SettingsPage: React.FC = () => {
  const [config, setConfig] = useState<ModelConfig>(initialConfig);
  const [loading, setLoading] = useState<boolean>(false);
  const [form] = Form.useForm();
  
  // 初始化表单
  useEffect(() => {
    form.setFieldsValue({
      anomalyThreshold: config.anomalyDetection.threshold,
      sensitivity: config.anomalyDetection.sensitivity,
      algorithm: config.anomalyDetection.algorithm,
      enableRealTimeDetection: config.anomalyDetection.enableRealTimeDetection,
      trainingFrequency: config.anomalyDetection.trainingFrequency,
      
      enableEmail: config.notification.enableEmail,
      enableSms: config.notification.enableSms,
      enableWebhook: config.notification.enableWebhook,
      minSeverityLevel: config.notification.minSeverityLevel,
      recipients: config.notification.recipients.join(', '),
      webhookUrl: config.notification.webhookUrl,
      
      logRetentionDays: config.dataProcessing.logRetentionDays,
      samplingRate: config.dataProcessing.samplingRate,
      enablePreprocessing: config.dataProcessing.enablePreprocessing,
      preprocessingSteps: config.dataProcessing.preprocessingSteps,
    });
  }, [config, form]);
  
  // 保存配置
  const handleSave = (values: any) => {
    setLoading(true);
    
    // 模拟API保存
    setTimeout(() => {
      // 更新配置
      const updatedConfig: ModelConfig = {
        anomalyDetection: {
          threshold: values.anomalyThreshold,
          sensitivity: values.sensitivity,
          algorithm: values.algorithm,
          featureImportance: config.anomalyDetection.featureImportance, // 保持不变
          enableRealTimeDetection: values.enableRealTimeDetection,
          trainingFrequency: values.trainingFrequency,
        },
        notification: {
          enableEmail: values.enableEmail,
          enableSms: values.enableSms,
          enableWebhook: values.enableWebhook,
          minSeverityLevel: values.minSeverityLevel,
          recipients: values.recipients.split(',').map((email: string) => email.trim()),
          webhookUrl: values.webhookUrl,
        },
        dataProcessing: {
          logRetentionDays: values.logRetentionDays,
          samplingRate: values.samplingRate,
          enablePreprocessing: values.enablePreprocessing,
          preprocessingSteps: values.preprocessingSteps,
        }
      };
      
      setConfig(updatedConfig);
      setLoading(false);
      message.success('配置保存成功');
    }, 1000);
  };
  
  // 重置配置
  const handleReset = () => {
    form.setFieldsValue({
      anomalyThreshold: initialConfig.anomalyDetection.threshold,
      sensitivity: initialConfig.anomalyDetection.sensitivity,
      algorithm: initialConfig.anomalyDetection.algorithm,
      enableRealTimeDetection: initialConfig.anomalyDetection.enableRealTimeDetection,
      trainingFrequency: initialConfig.anomalyDetection.trainingFrequency,
      
      enableEmail: initialConfig.notification.enableEmail,
      enableSms: initialConfig.notification.enableSms,
      enableWebhook: initialConfig.notification.enableWebhook,
      minSeverityLevel: initialConfig.notification.minSeverityLevel,
      recipients: initialConfig.notification.recipients.join(', '),
      webhookUrl: initialConfig.notification.webhookUrl,
      
      logRetentionDays: initialConfig.dataProcessing.logRetentionDays,
      samplingRate: initialConfig.dataProcessing.samplingRate,
      enablePreprocessing: initialConfig.dataProcessing.enablePreprocessing,
      preprocessingSteps: initialConfig.dataProcessing.preprocessingSteps,
    });
    message.info('配置已重置');
  };
  
  // 特征重要性渲染
  const renderFeatureImportance = () => {
    const features = Object.entries(config.anomalyDetection.featureImportance);
    
    return (
      <div>
        <Title level={5}>特征重要性</Title>
        <Paragraph>
          以下是模型使用的各个特征及其重要性权重。权重越高，该特征对异常检测的影响越大。
        </Paragraph>
        
        {features.map(([feature, importance]) => (
          <div key={feature} style={{ marginBottom: 12 }}>
            <Row>
              <Col span={8}>
                <Text>{feature.replace('_', ' ')}</Text>
              </Col>
              <Col span={16}>
                <Slider
                  value={importance * 100}
                  tipFormatter={(value) => `${value}%`}
                  disabled
                />
              </Col>
            </Row>
          </div>
        ))}
        
        <Alert
          message="特征重要性说明"
          description="特征重要性是由模型训练自动计算的，无法直接修改。如需调整，请在数据处理中修改相关参数后重新训练模型。"
          type="info"
          showIcon
        />
      </div>
    );
  };
  
  return (
    <div>
      <h2>模型参数配置</h2>
      
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            anomalyThreshold: config.anomalyDetection.threshold,
            sensitivity: config.anomalyDetection.sensitivity,
            algorithm: config.anomalyDetection.algorithm,
            enableRealTimeDetection: config.anomalyDetection.enableRealTimeDetection,
            trainingFrequency: config.anomalyDetection.trainingFrequency,
            
            enableEmail: config.notification.enableEmail,
            enableSms: config.notification.enableSms,
            enableWebhook: config.notification.enableWebhook,
            minSeverityLevel: config.notification.minSeverityLevel,
            recipients: config.notification.recipients.join(', '),
            webhookUrl: config.notification.webhookUrl,
            
            logRetentionDays: config.dataProcessing.logRetentionDays,
            samplingRate: config.dataProcessing.samplingRate,
            enablePreprocessing: config.dataProcessing.enablePreprocessing,
            preprocessingSteps: config.dataProcessing.preprocessingSteps,
          }}
        >
          <Tabs defaultActiveKey="anomaly">
            <TabPane 
              tab={<span><RobotOutlined />异常检测参数</span>} 
              key="anomaly"
            >
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    label={
                      <span>
                        异常阈值
                        <Tooltip title="当AI模型对日志的异常评分超过此阈值时，将触发预警">
                          <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                        </Tooltip>
                      </span>
                    }
                    name="anomalyThreshold"
                    rules={[{ required: true, message: '请设置异常阈值' }]}
                  >
                    <Slider
                      min={0}
                      max={100}
                      marks={{
                        0: '0%',
                        25: '25%',
                        50: '50%',
                        75: '75%',
                        100: '100%'
                      }}
                      tipFormatter={(value) => `${value}%`}
                    />
                  </Form.Item>
                  
                  <Form.Item
                    label={
                      <span>
                        灵敏度
                        <Tooltip title="灵敏度越高，模型越容易检测到轻微异常，但可能增加误报">
                          <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                        </Tooltip>
                      </span>
                    }
                    name="sensitivity"
                    rules={[{ required: true, message: '请设置灵敏度' }]}
                  >
                    <Slider
                      min={0}
                      max={100}
                      marks={{
                        0: '低',
                        50: '中',
                        100: '高'
                      }}
                      tipFormatter={(value) => `${value}%`}
                    />
                  </Form.Item>
                  
                  <Form.Item
                    label="算法选择"
                    name="algorithm"
                    rules={[{ required: true, message: '请选择算法' }]}
                  >
                    <Select>
                      <Option value="isolation_forest">隔离森林 (Isolation Forest)</Option>
                      <Option value="local_outlier_factor">局部异常因子 (LOF)</Option>
                      <Option value="one_class_svm">单类支持向量机 (One-Class SVM)</Option>
                      <Option value="autoencoder">自编码器 (Autoencoder)</Option>
                      <Option value="lstm">长短期记忆网络 (LSTM)</Option>
                    </Select>
                  </Form.Item>
                  
                  <Form.Item
                    label="训练频率"
                    name="trainingFrequency"
                    rules={[{ required: true, message: '请选择训练频率' }]}
                  >
                    <Select>
                      <Option value="hourly">每小时</Option>
                      <Option value="daily">每天</Option>
                      <Option value="weekly">每周</Option>
                      <Option value="monthly">每月</Option>
                    </Select>
                  </Form.Item>
                  
                  <Form.Item
                    label="实时检测"
                    name="enableRealTimeDetection"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                  </Form.Item>
                </Col>
                
                <Col span={12}>
                  {renderFeatureImportance()}
                </Col>
              </Row>
            </TabPane>
            
            <TabPane 
              tab={<span><SettingOutlined />通知配置</span>} 
              key="notification"
            >
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    label="最低预警级别"
                    name="minSeverityLevel"
                    rules={[{ required: true, message: '请选择最低预警级别' }]}
                  >
                    <Select>
                      <Option value="low">低</Option>
                      <Option value="medium">中</Option>
                      <Option value="high">高</Option>
                    </Select>
                  </Form.Item>
                  
                  <Form.Item
                    label="邮件通知"
                    name="enableEmail"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                  </Form.Item>
                  
                  <Form.Item
                    label="短信通知"
                    name="enableSms"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                  </Form.Item>
                  
                  <Form.Item
                    label="Webhook通知"
                    name="enableWebhook"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                  </Form.Item>
                </Col>
                
                <Col span={12}>
                  <Form.Item
                    label="通知接收人 (邮箱，用逗号分隔)"
                    name="recipients"
                    rules={[{ required: true, message: '请输入通知接收人' }]}
                  >
                    <Input.TextArea rows={4} />
                  </Form.Item>
                  
                  <Form.Item
                    label="Webhook URL"
                    name="webhookUrl"
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>
            
            <TabPane 
              tab={<span><BarChartOutlined />数据处理</span>} 
              key="data"
            >
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    label="日志保留天数"
                    name="logRetentionDays"
                    rules={[{ required: true, message: '请设置日志保留天数' }]}
                  >
                    <InputNumber min={1} max={365} style={{ width: '100%' }} />
                  </Form.Item>
                  
                  <Form.Item
                    label="采样率 (%)"
                    name="samplingRate"
                    rules={[{ required: true, message: '请设置采样率' }]}
                  >
                    <Slider
                      min={1}
                      max={100}
                      marks={{
                        1: '1%',
                        25: '25%',
                        50: '50%',
                        75: '75%',
                        100: '100%'
                      }}
                    />
                  </Form.Item>
                </Col>
                
                <Col span={12}>
                  <Form.Item
                    label="启用预处理"
                    name="enablePreprocessing"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                  </Form.Item>
                  
                  <Form.Item
                    label="预处理步骤"
                    name="preprocessingSteps"
                    rules={[{ required: true, message: '请选择预处理步骤' }]}
                  >
                    <Select mode="multiple">
                      <Option value="normalization">归一化</Option>
                      <Option value="outlier_removal">异常值移除</Option>
                      <Option value="feature_extraction">特征提取</Option>
                      <Option value="dimensionality_reduction">降维</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
          
          <Divider />
          
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<SaveOutlined />}
                loading={loading}
              >
                保存配置
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={handleReset}
              >
                重置默认
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SettingsPage; 