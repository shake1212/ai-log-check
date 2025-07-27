import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Switch, Divider } from 'antd';
import { ModelInfo, ModelType } from '../../../services/modelService';

interface ModelFormProps {
  visible: boolean;
  model?: ModelInfo;
  onCancel: () => void;
  onSubmit: (values: any) => void;
}

const ModelForm: React.FC<ModelFormProps> = ({ visible, model, onCancel, onSubmit }) => {
  const [form] = Form.useForm();
  const isEditing = !!model;
  
  // 当模型数据变化时重置表单
  useEffect(() => {
    if (visible) {
      if (model) {
        form.setFieldsValue({
          name: model.name,
          description: model.description,
          type: model.type,
          algorithm: model.algorithm,
          parameters: JSON.stringify(model.parameters, null, 2),
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, model, form]);
  
  // 提交表单
  const handleSubmit = () => {
    form.validateFields().then(values => {
      // 解析参数JSON
      let parameters = {};
      try {
        if (values.parameters) {
          parameters = JSON.parse(values.parameters);
        }
      } catch (error) {
        console.error('参数JSON解析错误:', error);
      }
      
      onSubmit({
        ...values,
        parameters,
      });
    });
  };
  
  // 算法选项
  const getAlgorithmOptions = (type: ModelType) => {
    switch (type) {
      case ModelType.ANOMALY_DETECTION:
        return [
          { label: '隔离森林 (Isolation Forest)', value: 'isolation_forest' },
          { label: '局部异常因子 (LOF)', value: 'local_outlier_factor' },
          { label: '单类支持向量机 (One-Class SVM)', value: 'one_class_svm' },
          { label: '自编码器 (Autoencoder)', value: 'autoencoder' },
          { label: '长短期记忆网络 (LSTM)', value: 'lstm' },
        ];
      case ModelType.CLASSIFICATION:
        return [
          { label: '随机森林 (Random Forest)', value: 'random_forest' },
          { label: '支持向量机 (SVM)', value: 'svm' },
          { label: '逻辑回归 (Logistic Regression)', value: 'logistic_regression' },
          { label: '梯度提升树 (XGBoost)', value: 'xgboost' },
          { label: '深度神经网络 (DNN)', value: 'dnn' },
        ];
      case ModelType.CLUSTERING:
        return [
          { label: 'K均值 (K-Means)', value: 'kmeans' },
          { label: '层次聚类 (Hierarchical)', value: 'hierarchical' },
          { label: '密度聚类 (DBSCAN)', value: 'dbscan' },
          { label: '高斯混合模型 (GMM)', value: 'gmm' },
        ];
      case ModelType.FORECASTING:
        return [
          { label: 'ARIMA', value: 'arima' },
          { label: '长短期记忆网络 (LSTM)', value: 'lstm' },
          { label: '门控循环单元 (GRU)', value: 'gru' },
          { label: '时间卷积网络 (TCN)', value: 'tcn' },
          { label: 'Prophet', value: 'prophet' },
        ];
      default:
        return [];
    }
  };
  
  // 获取当前选择的模型类型
  const currentType = Form.useWatch('type', form);
  
  return (
    <Modal
      title={isEditing ? '编辑模型' : '创建新模型'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          type: ModelType.ANOMALY_DETECTION,
          algorithm: 'isolation_forest',
        }}
      >
        <Form.Item
          name="name"
          label="模型名称"
          rules={[{ required: true, message: '请输入模型名称' }]}
        >
          <Input placeholder="输入模型名称" />
        </Form.Item>
        
        <Form.Item
          name="description"
          label="模型描述"
          rules={[{ required: true, message: '请输入模型描述' }]}
        >
          <Input.TextArea placeholder="输入模型描述" rows={3} />
        </Form.Item>
        
        <Form.Item
          name="type"
          label="模型类型"
          rules={[{ required: true, message: '请选择模型类型' }]}
        >
          <Select
            placeholder="选择模型类型"
            options={[
              { label: '异常检测', value: ModelType.ANOMALY_DETECTION },
              { label: '分类', value: ModelType.CLASSIFICATION },
              { label: '聚类', value: ModelType.CLUSTERING },
              { label: '预测', value: ModelType.FORECASTING },
            ]}
          />
        </Form.Item>
        
        <Form.Item
          name="algorithm"
          label="算法"
          rules={[{ required: true, message: '请选择算法' }]}
        >
          <Select
            placeholder="选择算法"
            options={getAlgorithmOptions(currentType)}
          />
        </Form.Item>
        
        <Divider>高级配置</Divider>
        
        <Form.Item
          name="parameters"
          label="模型参数 (JSON格式)"
        >
          <Input.TextArea 
            placeholder='{"param1": 100, "param2": 0.5}'
            rows={6}
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ModelForm; 