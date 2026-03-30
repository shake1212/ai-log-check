/**
 * Python日志采集前端展示页面
 * 展示和管理Python采集器的状态和数据
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Statistic,
  Progress,
  Alert,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  message,
  Tabs,
  Table,
  Tag,
  Badge,
  Descriptions,
  List,
  Empty,
  Tooltip,
  Popconfirm
} from 'antd';
import {
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  SettingOutlined,
  DownloadOutlined,
  EyeOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Line } from '@ant-design/charts';

// 导入服务
import { logCollectorService, LogCollectorConfig, LogCollectorStatus, SystemMetrics, AlertInfo } from '../../services/LogCollectorService';
import { getDataSourceLabel, getAlertCategory, getAlertTypeLabel } from '../../utils/enumLabels';

const { Option, OptGroup } = Select;
const { TabPane } = Tabs;

const LogCollectorPage: React.FC = () => {
  // 状态管理
  const [configs, setConfigs] = useState<LogCollectorConfig[]>([]);
  const [status, setStatus] = useState<LogCollectorStatus[]>([]);
  const [realtimeMetrics, setRealtimeMetrics] = useState<SystemMetrics | null>(null);
  const [historicalMetrics, setHistoricalMetrics] = useState<SystemMetrics[]>([]);
  const [alerts, setAlerts] = useState<AlertInfo[]>([]);
  
  // 模态框状态
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<LogCollectorConfig | null>(null);
  
  // 加载状态
  const [loading, setLoading] = useState({
    configs: false,
    status: false,
    realtime: false,
    historical: false,
    alerts: false
  });
  const [initialLoading, setInitialLoading] = useState(true);
  
  // 表单实例
  const [configForm] = Form.useForm();
  const [exportForm] = Form.useForm();

  // 加载配置
  const loadConfigs = useCallback(async () => {
    setLoading(prev => ({ ...prev, configs: true }));
    try {
      const data = await logCollectorService.getConfigs();
      setConfigs(data);
    } catch (error) {
      console.error('Failed to load configs:', error);
      message.error('加载配置失败');
    } finally {
      setLoading(prev => ({ ...prev, configs: false }));
    }
  }, []);

  // 加载状态
  const loadStatus = useCallback(async () => {
    setLoading(prev => ({ ...prev, status: true }));
    try {
      const data = await logCollectorService.getStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load status:', error);
      message.error('加载状态失败');
    } finally {
      setLoading(prev => ({ ...prev, status: false }));
    }
  }, []);

  // 加载实时指标
  const loadRealtimeMetrics = useCallback(async () => {
    setLoading(prev => ({ ...prev, realtime: true }));
    try {
      const data = await logCollectorService.getRealtimeMetrics();
      setRealtimeMetrics(data);
    } catch (error) {
      console.error('Failed to load realtime metrics:', error);
    } finally {
      setLoading(prev => ({ ...prev, realtime: false }));
    }
  }, []);

  // 加载历史指标
  const loadHistoricalMetrics = useCallback(async () => {
    setLoading(prev => ({ ...prev, historical: true }));
    try {
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const data = await logCollectorService.getHistoricalMetrics(startTime, endTime);
      setHistoricalMetrics(data);
    } catch (error) {
      console.error('Failed to load historical metrics:', error);
    } finally {
      setLoading(prev => ({ ...prev, historical: false }));
    }
  }, []);

  // 加载告警
  const loadAlerts = useCallback(async () => {
    setLoading(prev => ({ ...prev, alerts: true }));
    try {
      const data = await logCollectorService.getAlerts();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(prev => ({ ...prev, alerts: false }));
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.allSettled([
          loadConfigs(),
          loadStatus(),
          loadRealtimeMetrics(),
          loadHistoricalMetrics(),
          loadAlerts()
        ]);
      } catch (error) {
        console.error('Initialization failed:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    initializeData();

    // 设置定时刷新
    const interval = setInterval(() => {
      loadStatus();
      loadRealtimeMetrics();
      loadAlerts();
    }, 10000); // 每10秒刷新一次

    return () => clearInterval(interval);
  }, [loadConfigs, loadStatus, loadRealtimeMetrics, loadHistoricalMetrics, loadAlerts]);

  // 启动采集器
  const handleStartCollector = async (collectorId: string) => {
    try {
      const success = await logCollectorService.startCollector(collectorId);
      if (success) {
        message.success('采集器启动成功');
        loadStatus();
      } else {
        message.error('启动采集器失败');
      }
    } catch (error) {
      console.error('Failed to start collector:', error);
      message.error('启动采集器失败');
    }
  };

  // 停止采集器
  const handleStopCollector = async (collectorId: string) => {
    try {
      const success = await logCollectorService.stopCollector(collectorId);
      if (success) {
        message.success('采集器停止成功');
        loadStatus();
      } else {
        message.error('停止采集器失败');
      }
    } catch (error) {
      console.error('Failed to stop collector:', error);
      message.error('停止采集器失败');
    }
  };

  // 测试连接
  const handleTestConnection = async () => {
    try {
      const result = await logCollectorService.testConnection();
      if (result.connected) {
        message.success('连接测试成功');
      } else {
        message.error(`连接测试失败: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
      message.error('连接测试失败');
    }
  };

  // 确认告警
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const success = await logCollectorService.acknowledgeAlert(alertId);
      if (success) {
        message.success('告警已确认');
        loadAlerts();
      } else {
        message.error('确认告警失败');
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      message.error('确认告警失败');
    }
  };

  // 解决告警
  const handleResolveAlert = async (alertId: string) => {
    try {
      const success = await logCollectorService.resolveAlert(alertId);
      if (success) {
        message.success('告警已解决');
        loadAlerts();
      } else {
        message.error('解决告警失败');
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      message.error('解决告警失败');
    }
  };

  // 导出数据
  const handleExportData = async (values: any) => {
    try {
      const blob = await logCollectorService.exportData(values);
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `log-collector-export-${dayjs().format('YYYYMMDDHHmmss')}.${values.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      message.success('数据导出成功');
      setExportModalVisible(false);
      exportForm.resetFields();
    } catch (error) {
      console.error('Failed to export data:', error);
      message.error('数据导出失败');
    }
  };

  // 更新配置
  const handleUpdateConfig = async (values: any) => {
    try {
      const config: LogCollectorConfig = {
        ...selectedConfig!,
        ...values
      };
      
      const success = await logCollectorService.updateConfig(config);
      if (success) {
        message.success('配置更新成功');
        setConfigModalVisible(false);
        configForm.resetFields();
        loadConfigs();
      } else {
        message.error('配置更新失败');
      }
    } catch (error) {
      console.error('Failed to update config:', error);
      message.error('配置更新失败');
    }
  };

  // 打开配置模态框
  const handleOpenConfigModal = (config: LogCollectorConfig) => {
    setSelectedConfig(config);
    configForm.setFieldsValue(config);
    setConfigModalVisible(true);
  };

  // 渲染状态卡片
  const renderStatusCards = () => {
    const activeCollector = status.find(s => s.status === 'running');
    const errorCollector = status.find(s => s.status === 'error');
    
    return (
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="采集器状态"
              value={activeCollector ? '运行中' : '已停止'}
              valueStyle={{ color: activeCollector ? '#3f8600' : '#cf1322' }}
              prefix={activeCollector ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总运行次数"
              value={status.reduce((sum, s) => sum + s.totalRuns, 0)}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="成功率"
              value={status.reduce((sum, s) => sum + s.successRuns, 0)}
              suffix={`/ ${status.reduce((sum, s) => sum + s.totalRuns, 0)}`}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃告警"
              value={alerts.filter(a => !a.resolved).length}
              valueStyle={{ color: '#cf1322' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  // 渲染性能监控
  const renderPerformanceMonitoring = () => {
    if (!realtimeMetrics) return null;

    return (
      <Card title="实时性能监控" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={Math.round(realtimeMetrics.cpuUsage ?? 0)}
                format={percent => `${percent}%`}
                status={realtimeMetrics.cpuUsage > 80 ? 'exception' : realtimeMetrics.cpuUsage > 60 ? 'normal' : 'success'}
              />
              <div style={{ marginTop: 8, fontWeight: 'bold' }}>CPU使用率</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={Math.round(realtimeMetrics.memoryUsage ?? 0)}
                format={percent => `${percent}%`}
                status={realtimeMetrics.memoryUsage > 90 ? 'exception' : realtimeMetrics.memoryUsage > 80 ? 'normal' : 'success'}
              />
              <div style={{ marginTop: 8, fontWeight: 'bold' }}>内存使用率</div>
              <div style={{ fontSize: 12, color: '#666' }}>
                已用: {realtimeMetrics.memoryUsed != null ? (realtimeMetrics.memoryUsed / 1024).toFixed(1) : '--'}GB / 
                总计: {realtimeMetrics.memoryTotal != null ? (realtimeMetrics.memoryTotal / 1024).toFixed(1) : '--'}GB
              </div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={Math.round(realtimeMetrics.diskUsage ?? 0)}
                format={percent => `${percent}%`}
                status={realtimeMetrics.diskUsage > 90 ? 'exception' : realtimeMetrics.diskUsage > 80 ? 'normal' : 'success'}
              />
              <div style={{ marginTop: 8, fontWeight: 'bold' }}>磁盘使用率</div>
              <div style={{ fontSize: 12, color: '#666' }}>
                已用: {realtimeMetrics.diskUsed != null ? realtimeMetrics.diskUsed.toFixed(1) : '--'}GB / 
                总计: {realtimeMetrics.diskTotal != null ? realtimeMetrics.diskTotal.toFixed(1) : '--'}GB
              </div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <Statistic
                title="活跃进程"
                value={realtimeMetrics.processCount}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CloudServerOutlined />}
              />
              <div style={{ marginTop: 8 }}>
                <Statistic
                  title="网络流入"
                  value={realtimeMetrics.networkIn}
                  suffix="KB/s"
                />
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  // 渲染历史趋势图
  const renderHistoricalTrend = () => {
    if (historicalMetrics.length === 0) return null;

    const cpuData = historicalMetrics.map(m => ({
      time: dayjs(m.timestamp).format('HH:mm'),
      value: m.cpuUsage
    }));

    const memoryData = historicalMetrics.map(m => ({
      time: dayjs(m.timestamp).format('HH:mm'),
      value: m.memoryUsage
    }));

    const config = {
      data: cpuData,
      xField: 'time',
      yField: 'value',
      point: {
        size: 2,
        shape: 'circle',
      },
      label: {
        style: {
          fill: '#aaa',
        },
      },
      smooth: true,
      height: 200,
    };

    return (
      <Card title="历史趋势" style={{ marginTop: 16 }}>
        <Tabs defaultActiveKey="cpu">
          <TabPane tab="CPU使用率" key="cpu">
            <Line {...config} data={cpuData} />
          </TabPane>
          <TabPane tab="内存使用率" key="memory">
            <Line {...config} data={memoryData} />
          </TabPane>
        </Tabs>
      </Card>
    );
  };

  // 渲染告警列表
  const renderAlerts = () => {
    const unresolvedAlerts = alerts.filter(a => !a.resolved);
    
    const columns: ColumnsType<AlertInfo> = [
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        render: (type) => {
          const typeMap = {
            warning: { color: 'orange', text: '警告' },
            critical: { color: 'red', text: '严重' },
            info: { color: 'blue', text: '信息' }
          };
          const config = typeMap[type as keyof typeof typeMap] || { color: 'default', text: type };
          return <Tag color={config.color}>{config.text}</Tag>;
        }
      },
      {
        title: '类别',
        dataIndex: 'category',
        key: 'category',
        render: (category) => getAlertCategory(category)
      },
      {
        title: '标题',
        dataIndex: 'title',
        key: 'title',
        render: (title) => getAlertTypeLabel(title) || title
      },
      {
        title: '数值',
        key: 'value',
        render: (_, record) => (
          <span>
            {record.value} / {record.threshold}
          </span>
        )
      },
      {
        title: '时间',
        dataIndex: 'timestamp',
        key: 'timestamp',
        render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm:ss')
      },
      {
        title: '状态',
        key: 'status',
        render: (_, record) => (
          <Space>
            {record.acknowledged ? (
              <Tag color="green">已确认</Tag>
            ) : (
              <Tag color="orange">未确认</Tag>
            )}
            {record.resolved ? (
              <Tag color="blue">已解决</Tag>
            ) : (
              <Tag color="red">未解决</Tag>
            )}
          </Space>
        )
      },
      {
        title: '操作',
        key: 'action',
        render: (_, record) => (
          <Space size="small">
            {!record.acknowledged && (
              <Button
                size="small"
                onClick={() => handleAcknowledgeAlert(record.id)}
              >
                确认
              </Button>
            )}
            {!record.resolved && (
              <Button
                size="small"
                type="primary"
                onClick={() => handleResolveAlert(record.id)}
              >
                解决
              </Button>
            )}
          </Space>
        )
      }
    ];

    return (
      <Card title="告警列表" style={{ marginTop: 16 }}>
        {unresolvedAlerts.length > 0 ? (
          <Table
            columns={columns}
            dataSource={unresolvedAlerts}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <Empty description="暂无告警" />
        )}
      </Card>
    );
  };

  // 渲染进程列表
  const renderProcessList = () => {
    if (!realtimeMetrics || !realtimeMetrics.topProcesses || realtimeMetrics.topProcesses.length === 0) {
      return null;
    }

    return (
      <Card title="Top进程" size="small" style={{ marginTop: 16 }}>
        <List
          size="small"
          dataSource={realtimeMetrics.topProcesses.slice(0, 5)}
          renderItem={process => (
            <List.Item
              actions={[
                <Tag color="blue" key="cpu">CPU: {process.cpuUsage.toFixed(1)}%</Tag>,
                <Tag color="green" key="memory">内存: {process.memoryUsage.toFixed(1)}%</Tag>
              ]}
            >
              <List.Item.Meta
                title={process.name}
                description={`PID: ${process.pid} | 状态: ${process.status} ${process.user ? `| 用户: ${process.user}` : ''}`}
              />
            </List.Item>
          )}
        />
      </Card>
    );
  };

  // 渲染配置表格
  const renderConfigTable = () => {
    const columns: ColumnsType<LogCollectorConfig> = [
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        render: (text) => (
          <Space>
            <SettingOutlined />
            {text}
          </Space>
        )
      },
      {
        title: '状态',
        dataIndex: 'enabled',
        key: 'enabled',
        render: (enabled) => (
          <Badge 
            status={enabled ? 'success' : 'default'} 
            text={enabled ? '启用' : '禁用'} 
          />
        )
      },
      {
        title: '采集间隔',
        dataIndex: 'interval',
        key: 'interval',
        render: (interval) => `${interval}秒`
      },
      {
        title: '数据源',
        dataIndex: 'dataSources',
        key: 'dataSources',
        render: (sources: string[]) => {
          if (!sources || sources.length === 0) return '-';
          return sources.map(source => getDataSourceLabel(source)).join(', ');
        }
      },
      {
        title: '最后运行',
        dataIndex: 'lastRun',
        key: 'lastRun',
        render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'
      },
      {
        title: '下次运行',
        dataIndex: 'nextRun',
        key: 'nextRun',
        render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'
      },
      {
        title: '操作',
        key: 'action',
        render: (_, record) => (
          <Space size="small">
            <Button
              size="small"
              icon={<SettingOutlined />}
              onClick={() => handleOpenConfigModal(record)}
            >
              配置
            </Button>
          </Space>
        )
      }
    ];

    return (
      <Card title="采集器配置" style={{ marginTop: 16 }}>
        <Table
          columns={columns}
          dataSource={configs}
          rowKey="id"
          loading={loading.configs}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    );
  };

  if (initialLoading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div>正在加载日志采集界面...</div>
        <Progress percent={30} status="active" style={{ marginTop: 16 }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* 标题和操作按钮 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Python日志采集系统</h2>
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => handleStartCollector('default')}
          >
            启动采集
          </Button>
          <Button
            danger
            icon={<StopOutlined />}
            onClick={() => handleStopCollector('default')}
          >
            停止采集
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => setExportModalVisible(true)}
          >
            导出数据
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              loadStatus();
              loadRealtimeMetrics();
              loadAlerts();
            }}
          >
            刷新
          </Button>
          <Button
            icon={<EyeOutlined />}
            onClick={handleTestConnection}
          >
            测试连接
          </Button>
        </Space>
      </div>

      {/* 状态卡片 */}
      {renderStatusCards()}

      {/* 性能监控 */}
      {renderPerformanceMonitoring()}

      {/* 历史趋势 */}
      {renderHistoricalTrend()}

      {/* 告警列表 */}
      {renderAlerts()}

      {/* 进程列表 */}
      {renderProcessList()}

      {/* 配置表格 */}
      {renderConfigTable()}

      {/* 配置模态框 */}
      <Modal
        title="采集器配置"
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        onOk={() => configForm.submit()}
        width={600}
      >
        <Form
          form={configForm}
          layout="vertical"
          onFinish={handleUpdateConfig}
        >
          <Form.Item
            name="name"
            label="采集器名称"
            rules={[{ required: true, message: '请输入采集器名称' }]}
          >
            <Input placeholder="输入采集器名称" />
          </Form.Item>
          <Form.Item
            name="enabled"
            label="启用状态"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="interval"
            label="采集间隔（秒）"
            rules={[{ required: true, message: '请输入采集间隔' }]}
          >
            <InputNumber min={10} max={3600} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="dataSources"
            label="数据源"
          >
            <Select mode="multiple" placeholder="选择数据源">
              <OptGroup label="Windows事件日志">
                <Option value="security">安全日志</Option>
                <Option value="system">系统日志</Option>
                <Option value="application">应用日志</Option>
              </OptGroup>
              <OptGroup label="系统性能指标">
                <Option value="cpu">CPU信息</Option>
                <Option value="memory">内存信息</Option>
                <Option value="disk">磁盘信息</Option>
                <Option value="network">网络信息</Option>
                <Option value="process">进程信息</Option>
              </OptGroup>
            </Select>
          </Form.Item>
          <Form.Item
            name={['alertThresholds', 'cpuUsage']}
            label="CPU告警阈值（%）"
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name={['alertThresholds', 'memoryUsage']}
            label="内存告警阈值（%）"
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name={['alertThresholds', 'diskUsage']}
            label="磁盘告警阈值（%）"
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="retentionDays"
            label="数据保留天数"
          >
            <InputNumber min={1} max={365} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="enableRuleEngine"
            label="启用规则引擎分析"
            valuePropName="checked"
            tooltip="启用后将对采集的安全事件进行威胁分析和规则匹配，自动识别潜在威胁"
          >
            <Switch />
          </Form.Item>
          
          <Form.Item
            name="ruleEngineTimeout"
            label="规则引擎超时（秒）"
            tooltip="规则引擎分析单个事件的最大等待时间"
            rules={[
              { type: 'number', min: 1, max: 60, message: '超时时间必须在1-60秒之间' }
            ]}
          >
            <InputNumber 
              min={1} 
              max={60} 
              style={{ width: '100%' }}
              placeholder="默认10秒"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导出模态框 */}
      <Modal
        title="导出数据"
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        onOk={() => exportForm.submit()}
      >
        <Form
          form={exportForm}
          layout="vertical"
          onFinish={handleExportData}
          initialValues={{
            format: 'csv',
            startTime: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
            endTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            metrics: ['cpuUsage', 'memoryUsage', 'diskUsage']
          }}
        >
          <Form.Item
            name="format"
            label="导出格式"
            rules={[{ required: true, message: '请选择导出格式' }]}
          >
            <Select placeholder="选择导出格式">
              <Option value="csv">CSV</Option>
              <Option value="json">JSON</Option>
              <Option value="excel">Excel</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="startTime"
            label="开始时间"
            rules={[{ required: true, message: '请选择开始时间' }]}
          >
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item
            name="endTime"
            label="结束时间"
            rules={[{ required: true, message: '请选择结束时间' }]}
          >
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item
            name="metrics"
            label="导出指标"
          >
            <Select mode="multiple" placeholder="选择要导出的指标">
              <Option value="cpuUsage">CPU使用率</Option>
              <Option value="memoryUsage">内存使用率</Option>
              <Option value="diskUsage">磁盘使用率</Option>
              <Option value="networkIn">网络流入</Option>
              <Option value="networkOut">网络流出</Option>
              <Option value="processCount">进程数量</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LogCollectorPage;