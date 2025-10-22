import { api } from './api';

// 模型类型
export enum ModelType {
  ANOMALY_DETECTION = 'anomaly_detection',
  CLASSIFICATION = 'classification',
  CLUSTERING = 'clustering',
  FORECASTING = 'forecasting',
}

// 模型状态
export enum ModelStatus {
  ACTIVE = 'active',
  TRAINING = 'training',
  INACTIVE = 'inactive',
  FAILED = 'failed',
}

// 模型信息接口
export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  type: ModelType;
  algorithm: string;
  version: string;
  status: ModelStatus;
  accuracy: number;
  createdAt: string;
  updatedAt: string;
  lastTrainedAt: string;
  parameters: Record<string, any>;
  metrics: {
    precision?: number;
    recall?: number;
    f1Score?: number;
    auc?: number;
    [key: string]: any;
  };
}

// 模型预测请求
export interface PredictionRequest {
  modelId: string;
  data: any;
}

// 模型预测响应
export interface PredictionResponse {
  result: any;
  confidence: number;
  explanation?: any;
}

// 模型训练请求
export interface TrainingRequest {
  modelId?: string;
  name: string;
  description: string;
  type: ModelType;
  algorithm: string;
  parameters: Record<string, any>;
  datasetId?: string;
}

// 模型训练状态
export interface TrainingStatus {
  modelId: string;
  status: ModelStatus;
  progress: number;
  message: string;
  startedAt: string;
  estimatedCompletionAt?: string;
}

// 模型服务
export const modelService = {
  // 获取所有模型
  getModels: () => api.get<ModelInfo[]>('/models'),
  
  // 获取单个模型详情
  getModel: (id: string) => api.get<ModelInfo>(`/models/${id}`),
  
  // 创建新模型
  createModel: (data: TrainingRequest) => api.post<ModelInfo>('/models', data),
  
  // 更新模型
  updateModel: (id: string, data: Partial<TrainingRequest>) => api.put<ModelInfo>(`/models/${id}`, data),
  
  // 删除模型
  deleteModel: (id: string) => api.delete<void>(`/models/${id}`),
  
  // 获取模型训练状态
  getTrainingStatus: (id: string) => api.get<TrainingStatus>(`/models/${id}/training`),
  
  // 开始模型训练
  startTraining: (id: string, data: Partial<TrainingRequest>) => api.post<TrainingStatus>(`/models/${id}/training`, data),
  
  // 停止模型训练
  stopTraining: (id: string) => api.post<TrainingStatus>(`/models/${id}/training/stop`, {}),
  
  // 使用模型进行预测
  predict: (data: PredictionRequest) => api.post<PredictionResponse>('/predict', data),
  
  // 批量预测
  batchPredict: (data: { modelId: string, items: any[] }) => api.post<PredictionResponse[]>('/batch-predict', data),
  
  // 上传模型文件
  uploadModel: (formData: FormData) => {
    return fetch(`${'/api'}/models/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    }).then(response => {
      if (!response.ok) {
        throw new Error(`上传失败: ${response.status} ${response.statusText}`);
      }
      return response.json();
    });
  },
  
  // 获取模型性能指标
  getModelMetrics: (id: string) => api.get<any>(`/models/${id}/metrics`),
  
  // 模型部署
  deployModel: (id: string) => api.post<ModelInfo>(`/models/${id}/deploy`, {}),
  
  // 停用模型
  deactivateModel: (id: string) => api.post<ModelInfo>(`/models/${id}/deactivate`, {}),
};

// 模拟响应数据（开发阶段使用）
export const mockModels: ModelInfo[] = [
  {
    id: 'model-001',
    name: '异常检测模型-基础版',
    description: '基于隔离森林算法的日志异常检测模型',
    type: ModelType.ANOMALY_DETECTION,
    algorithm: 'isolation_forest',
    version: '1.0.0',
    status: ModelStatus.ACTIVE,
    accuracy: 0.92,
    createdAt: '2023-10-15T08:30:00Z',
    updatedAt: '2023-10-15T10:15:00Z',
    lastTrainedAt: '2023-10-15T09:45:00Z',
    parameters: {
      n_estimators: 100,
      contamination: 0.05,
      max_samples: 'auto',
    },
    metrics: {
      precision: 0.89,
      recall: 0.94,
      f1Score: 0.91,
      auc: 0.95,
    },
  },
  {
    id: 'model-002',
    name: '用户行为分类模型',
    description: '基于随机森林的用户行为分类模型',
    type: ModelType.CLASSIFICATION,
    algorithm: 'random_forest',
    version: '1.2.0',
    status: ModelStatus.ACTIVE,
    accuracy: 0.88,
    createdAt: '2023-09-20T14:20:00Z',
    updatedAt: '2023-10-10T11:30:00Z',
    lastTrainedAt: '2023-10-10T09:15:00Z',
    parameters: {
      n_estimators: 200,
      max_depth: 15,
      min_samples_split: 5,
    },
    metrics: {
      precision: 0.87,
      recall: 0.86,
      f1Score: 0.86,
      auc: 0.92,
    },
  },
  {
    id: 'model-003',
    name: '高级异常检测模型',
    description: '基于深度学习的异常检测模型',
    type: ModelType.ANOMALY_DETECTION,
    algorithm: 'autoencoder',
    version: '0.9.5',
    status: ModelStatus.TRAINING,
    accuracy: 0.94,
    createdAt: '2023-10-18T09:00:00Z',
    updatedAt: '2023-10-18T09:00:00Z',
    lastTrainedAt: '2023-10-18T09:00:00Z',
    parameters: {
      encoding_dim: 32,
      epochs: 100,
      batch_size: 64,
      learning_rate: 0.001,
    },
    metrics: {
      precision: 0.95,
      recall: 0.93,
      f1Score: 0.94,
      auc: 0.97,
    },
  },
]; 