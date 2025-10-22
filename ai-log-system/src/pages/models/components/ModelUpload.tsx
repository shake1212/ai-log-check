import React, { useState } from 'react';
import { Modal, Form, Input, Select, Upload, Button, Space, Alert, message } from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import { ModelInfo, ModelType } from '../../../services/modelService';

const { Dragger } = Upload;

interface ModelUploadProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: (model: ModelInfo) => void;
}

const ModelUpload: React.FC<ModelUploadProps> = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  
  // 重置状态
  const resetState = () => {
    form.resetFields();
    setFileList([]);
    setUploading(false);
  };
  
  // 取消上传
  const handleCancel = () => {
    resetState();
    onCancel();
  };
  
  // 上传前检查
  const beforeUpload = (file: any) => {
    // 检查文件类型
    const isValidType = file.type === 'application/octet-stream' || 
                        file.type === '' || 
                        file.name.endsWith('.h5') ||
                        file.name.endsWith('.pkl') ||
                        file.name.endsWith('.pt') ||
                        file.name.endsWith('.pb') ||
                        file.name.endsWith('.onnx');
                        
    if (!isValidType) {
      message.error('只支持上传机器学习模型文件 (.h5, .pkl, .pt, .pb, .onnx)');
    }
    
    // 检查文件大小
    const isLessThan100M = file.size / 1024 / 1024 < 100;
    if (!isLessThan100M) {
      message.error('文件大小不能超过100MB');
    }
    
    return isValidType && isLessThan100M;
  };
  
  // 处理文件变化
  const handleChange = (info: any) => {
    let fileList = [...info.fileList];
    
    // 只保留最后一个文件
    fileList = fileList.slice(-1);
    
    setFileList(fileList);
  };
  
  // 提交表单
  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (fileList.length === 0) {
        message.error('请上传模型文件');
        return;
      }
      
      setUploading(true);
      
      // 模拟上传
      setTimeout(() => {
        // 创建一个模拟的模型信息对象
        const modelInfo: ModelInfo = {
          id: `model-${Date.now()}`,
          name: values.name,
          description: values.description,
          type: values.type,
          algorithm: values.algorithm,
          version: '1.0.0',
          status: ModelType.INACTIVE,
          accuracy: 0.85, // 模拟准确率
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastTrainedAt: new Date().toISOString(),
          parameters: {},
          metrics: {
            precision: 0.83,
            recall: 0.87,
            f1Score: 0.85,
          },
        };
        
        setUploading(false);
        resetState();
        onSuccess(modelInfo);
      }, 2000);
    });
  };
  
  return (
    <Modal
      title="上传预训练模型"
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      okText="上传"
      okButtonProps={{ loading: uploading }}
      width={600}
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
            options={[
              { label: '隔离森林 (Isolation Forest)', value: 'isolation_forest' },
              { label: '局部异常因子 (LOF)', value: 'local_outlier_factor' },
              { label: '单类支持向量机 (One-Class SVM)', value: 'one_class_svm' },
              { label: '自编码器 (Autoencoder)', value: 'autoencoder' },
              { label: '长短期记忆网络 (LSTM)', value: 'lstm' },
              { label: '随机森林 (Random Forest)', value: 'random_forest' },
              { label: '支持向量机 (SVM)', value: 'svm' },
              { label: '梯度提升树 (XGBoost)', value: 'xgboost' },
            ]}
          />
        </Form.Item>
        
        <Form.Item
          name="modelFile"
          label="模型文件"
        >
          <Dragger
            name="file"
            multiple={false}
            fileList={fileList}
            beforeUpload={beforeUpload}
            onChange={handleChange}
            customRequest={({ onSuccess }) => {
              setTimeout(() => {
                onSuccess?.('ok', undefined as any);
              }, 0);
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持上传 .h5, .pkl, .pt, .pb, .onnx 等模型文件，大小不超过100MB
            </p>
          </Dragger>
        </Form.Item>
        
        <Alert
          message="注意"
          description="上传的模型需要符合系统要求的格式和接口规范。请确保模型已经过充分训练和验证。"
          type="info"
          showIcon
        />
      </Form>
    </Modal>
  );
};

export default ModelUpload; 