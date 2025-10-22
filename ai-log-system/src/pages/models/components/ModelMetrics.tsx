import React, { useState, useEffect } from 'react';
import { Modal, Spin, Tabs, Card, Row, Col, Statistic, Progress } from 'antd';
import { Line, Pie, Column, DualAxes } from '@ant-design/charts';
import { ModelInfo } from '../../../services/modelService';

interface ModelMetricsProps {
  visible: boolean;
  model: ModelInfo | null;
  onCancel: () => void;
}

const ModelMetrics: React.FC<ModelMetricsProps> = ({ visible, model, onCancel }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [metricsData, setMetricsData] = useState<any>({
    confusionMatrix: [],
    rocCurve: [],
    featureImportance: [],
    trainingHistory: [],
  });

  // 加载模型指标数据
  useEffect(() => {
    if (visible && model) {
      setLoading(true);
      // 模拟API调用
      setTimeout(() => {
        // 生成模拟数据
        const mockData = generateMockMetricsData(model);
        setMetricsData(mockData);
        setLoading(false);
      }, 1000);
    }
  }, [visible, model]);

  // 生成模拟指标数据
  const generateMockMetricsData = (model: ModelInfo) => {
    // 混淆矩阵数据
    const confusionMatrix = [
      { actual: '正常', predicted: '正常', value: 850 },
      { actual: '正常', predicted: '异常', value: 50 },
      { actual: '异常', predicted: '正常', value: 30 },
      { actual: '异常', predicted: '异常', value: 70 },
    ];
    
    // ROC曲线数据
    const rocCurve = Array.from({ length: 100 }, (_, i) => {
      const x = i / 100;
      // 模拟ROC曲线，稍微加一点随机性
      const y = Math.min(1, x + (1 - x) * model.accuracy * (0.8 + Math.random() * 0.4));
      return { x, y };
    });
    
    // 特征重要性数据
    const featureImportance = [
      { feature: '时间戳模式', importance: 0.85 },
      { feature: '用户行为', importance: 0.92 },
      { feature: 'IP地址', importance: 0.75 },
      { feature: '操作类型', importance: 0.68 },
      { feature: '资源访问', importance: 0.81 },
      { feature: '请求频率', importance: 0.89 },
    ].sort((a, b) => b.importance - a.importance);
    
    // 训练历史数据
    const trainingHistory = Array.from({ length: 50 }, (_, i) => {
      const epoch = i + 1;
      const trainLoss = 0.5 * Math.exp(-epoch / 10) + Math.random() * 0.05;
      const valLoss = trainLoss + 0.1 + Math.random() * 0.1;
      const trainAcc = 1 - trainLoss;
      const valAcc = 1 - valLoss;
      
      return {
        epoch,
        trainLoss,
        valLoss,
        trainAcc,
        valAcc,
      };
    });
    
    return {
      confusionMatrix,
      rocCurve,
      featureImportance,
      trainingHistory,
    };
  };
  
  // 渲染混淆矩阵
  const renderConfusionMatrix = () => {
    const config = {
      data: metricsData.confusionMatrix,
      xField: 'predicted',
      yField: 'actual',
      colorField: 'value',
      sizeField: 'value',
      shape: 'square',
      color: ['#BAE7FF', '#1890FF', '#0050B3'],
      label: {
        style: {
          fill: '#fff',
          fontSize: 12,
        },
      },
      xAxis: {
        title: {
          text: '预测值',
        },
      },
      yAxis: {
        title: {
          text: '实际值',
        },
      },
    };
    
    return <Column {...config} />;
  };
  
  // 渲染ROC曲线
  const renderRocCurve = () => {
    const config = {
      data: metricsData.rocCurve,
      xField: 'x',
      yField: 'y',
      smooth: true,
      lineStyle: {
        stroke: '#1890ff',
        lineWidth: 2,
      },
      point: {
        size: 2,
        shape: 'circle',
        style: {
          fill: '#1890ff',
          stroke: '#1890ff',
          lineWidth: 2,
        },
      },
      xAxis: {
        title: {
          text: '假正例率 (FPR)',
        },
      },
      yAxis: {
        title: {
          text: '真正例率 (TPR)',
        },
      },
      annotations: [
        {
          type: 'line',
          start: ['min', 'min'],
          end: ['max', 'max'],
          style: {
            stroke: '#ccc',
            lineDash: [4, 4],
          },
        },
      ],
    };
    
    return <Line {...config} />;
  };
  
  // 渲染特征重要性
  const renderFeatureImportance = () => {
    const config = {
      data: metricsData.featureImportance,
      xField: 'importance',
      yField: 'feature',
      seriesField: 'feature',
      legend: false,
      meta: {
        importance: {
          alias: '重要性',
          formatter: (v: number) => `${(v * 100).toFixed(1)}%`,
        },
      },
      barStyle: {
        radius: [0, 4, 4, 0],
      },
      xAxis: {
        title: {
          text: '特征重要性',
        },
      },
      yAxis: {
        title: {
          text: '特征',
        },
      },
    };
    
    return <Column {...config} />;
  };
  
  // 渲染训练历史
  const renderTrainingHistory = () => {
    const config = {
      data: [metricsData.trainingHistory, metricsData.trainingHistory],
      xField: 'epoch',
      yField: ['trainLoss', 'valLoss'],
      geometryOptions: [
        {
          geometry: 'line',
          smooth: true,
          color: '#1890ff',
          lineStyle: {
            lineWidth: 2,
          },
        },
        {
          geometry: 'line',
          smooth: true,
          color: '#ff7a45',
          lineStyle: {
            lineWidth: 2,
          },
        },
      ],
      xAxis: {
        title: {
          text: 'Epoch',
        },
      },
      yAxis: {
        title: {
          text: 'Loss',
        },
      },
      legend: {
        itemName: {
          formatter: (text: string) => {
            if (text === 'trainLoss') return '训练损失';
            if (text === 'valLoss') return '验证损失';
            return text;
          },
        },
      },
    };
    
    return <DualAxes {...config} />;
  };
  
  // 渲染准确率历史
  const renderAccuracyHistory = () => {
    const config = {
      data: [metricsData.trainingHistory, metricsData.trainingHistory],
      xField: 'epoch',
      yField: ['trainAcc', 'valAcc'],
      geometryOptions: [
        {
          geometry: 'line',
          smooth: true,
          color: '#52c41a',
          lineStyle: {
            lineWidth: 2,
          },
        },
        {
          geometry: 'line',
          smooth: true,
          color: '#faad14',
          lineStyle: {
            lineWidth: 2,
          },
        },
      ],
      xAxis: {
        title: {
          text: 'Epoch',
        },
      },
      yAxis: {
        title: {
          text: 'Accuracy',
        },
      },
      legend: {
        itemName: {
          formatter: (text: string) => {
            if (text === 'trainAcc') return '训练准确率';
            if (text === 'valAcc') return '验证准确率';
            return text;
          },
        },
      },
    };
    
    return <DualAxes {...config} />;
  };

  return (
    <Modal
      title={model ? `${model.name} - 性能指标` : '模型性能指标'}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>加载模型指标...</p>
        </div>
      ) : (
        <Tabs defaultActiveKey="overview">
          <Tabs.TabPane tab="概览" key="overview">
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Card>
                  <Statistic 
                    title="准确率" 
                    value={model?.accuracy || 0} 
                    precision={2}
                    formatter={(value) => `${(Number(value) * 100).toFixed(2)}%`}
                    valueStyle={{ color: (model?.accuracy || 0) > 0.9 ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic 
                    title="精确率" 
                    value={model?.metrics.precision || 0} 
                    precision={2}
                    formatter={(value) => `${(Number(value) * 100).toFixed(2)}%`}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic 
                    title="召回率" 
                    value={model?.metrics.recall || 0} 
                    precision={2}
                    formatter={(value) => `${(Number(value) * 100).toFixed(2)}%`}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic 
                    title="F1分数" 
                    value={model?.metrics.f1Score || 0} 
                    precision={2}
                    formatter={(value) => `${(Number(value) * 100).toFixed(2)}%`}
                  />
                </Card>
              </Col>
            </Row>
            
            <Card title="混淆矩阵" style={{ marginTop: 16 }}>
              <div style={{ height: 300 }}>
                {renderConfusionMatrix()}
              </div>
            </Card>
            
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Card title="ROC曲线">
                  <div style={{ height: 300 }}>
                    {renderRocCurve()}
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="特征重要性">
                  <div style={{ height: 300 }}>
                    {renderFeatureImportance()}
                  </div>
                </Card>
              </Col>
            </Row>
          </Tabs.TabPane>
          
          <Tabs.TabPane tab="训练历史" key="training">
            <Card title="训练和验证损失">
              <div style={{ height: 300 }}>
                {renderTrainingHistory()}
              </div>
            </Card>
            
            <Card title="训练和验证准确率" style={{ marginTop: 16 }}>
              <div style={{ height: 300 }}>
                {renderAccuracyHistory()}
              </div>
            </Card>
          </Tabs.TabPane>
          
          <Tabs.TabPane tab="详细指标" key="details">
            <Card>
              <Row gutter={[16, 16]}>
                {model?.metrics && Object.entries(model.metrics).map(([key, value]) => (
                  <Col span={8} key={key}>
                    <Card>
                      <Statistic 
                        title={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} 
                        value={value as number} 
                        precision={4}
                        formatter={(val) => typeof val === 'number' ? `${(val * 100).toFixed(2)}%` : val}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Tabs.TabPane>
        </Tabs>
      )}
    </Modal>
  );
};

export default ModelMetrics; 