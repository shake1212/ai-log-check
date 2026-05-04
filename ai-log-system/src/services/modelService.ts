import request from '@/utils/request';

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
  getModels: () => request.get<ModelInfo[]>('/api/models'),
  
  // 获取单个模型详情
  getModel: (id: string) => request.get<ModelInfo>(`/api/models/${id}`),
  
  // 创建新模型
  createModel: (data: TrainingRequest) => request.post<ModelInfo>('/api/models', data),
  
  // 更新模型
  updateModel: (id: string, data: Partial<TrainingRequest>) => request.put<ModelInfo>(`/api/models/${id}`, data),
  
  // 删除模型
  deleteModel: (id: string) => request.delete<void>(`/api/models/${id}`),
  
  // 获取模型训练状态
  getTrainingStatus: (id: string) => request.get<TrainingStatus>(`/api/models/${id}/training`),
  
  // 开始模型训练
  startTraining: (id: string, data: Partial<TrainingRequest>) => request.post<TrainingStatus>(`/api/models/${id}/training`, data),
  
  // 停止模型训练
  stopTraining: (id: string) => request.post<TrainingStatus>(`/api/models/${id}/training/stop`, {}),
  
  // 使用模型进行预测
  predict: (data: PredictionRequest) => request.post<PredictionResponse>('/api/predict', data),
  
  // 批量预测
  batchPredict: (data: { modelId: string, items: any[] }) => request.post<PredictionResponse[]>('/api/batch-predict', data),
  
  // 上传模型文件
  uploadModel: (formData: FormData) => {
    return request.post('/api/models/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // 获取模型性能指标
  getModelMetrics: (id: string) => request.get<any>(`/api/models/${id}/metrics`),
  
  // 模型部署
  deployModel: (id: string) => request.post<ModelInfo>(`/api/models/${id}/deploy`, {}),
  
  // 停用模型
  deactivateModel: (id: string) => request.post<ModelInfo>(`/api/models/${id}/deactivate`, {}),
};