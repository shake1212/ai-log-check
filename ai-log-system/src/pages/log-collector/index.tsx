/**
 * 日志采集管理页面
 * 整合采集器配置和脚本控制，避免重复
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { history } from 'umi';
import {
  Card, Row, Col, Button, Space, Statistic, Spin, Modal, Form, Input,
  InputNumber, Switch, Select, message, Table, Tag, Badge, Tooltip
} from 'antd';
import {
  PlayCircleOutlined, ReloadOutlined, SettingOutlined, EyeOutlined,
  WarningOutlined, CheckCircleOutlined, CloseCircleOutlined, DatabaseOutlined,
  BarChartOutlined, LinkOutlined, PauseCircleOutlined, SyncOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { logCollectorService, LogCollectorConfig, LogCollectorStatus } from '../../services/LogCollectorService';
import { api, type ScriptDescriptor, type ScriptExecutionRecord } from '@/services/api';
import { getDataSourceLabel } from '../../utils/enumLabels';

const { Option, OptGroup } = Select;

const LogCollectorPage: React.FC = () => {
  // ========== 状态 ==========
  const [configs, setConfigs] = useState<LogCollectorConfig[]>([]);
  const [status, setStatus] = useState<LogCollectorStatus[]>([]);
  const [activeAlertCount, setActiveAlertCount] = useState<number>(0);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<LogCollectorConfig | null>(null);
  const [configForm] = Form.useForm();

  const [scrtList, setScrtList] = useState<ScriptDescriptor[]>([]);
  const [scrtHistory, setScrtHistory] = useState<ScriptExecutionRecord[]>([]);
  const [runningScrtKey, setRunningScrtKey] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  // ========== 数据加载 ==========
  const getPrimaryStatus = useCallback((): LogCollectorStatus | null => {
    if (status.length === 0) return null;
    return status.find(s => s.status === 'running') || status.find(s => s.status === 'error') || status[0];
  }, [status]);

  const loadConfigs = useCallback(async () => {
    try {
      const data = await logCollectorService.getConfigs();
      if (isMountedRef.current) setConfigs(data);
    } catch (error) {
      console.error('Failed to load configs:', error);
    }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const data = await logCollectorService.getStatus();
      if (isMountedRef.current) setStatus(data);
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  }, []);

  const loadActiveAlerts = useCallback(async () => {
    try {
      const alerts = await logCollectorService.getAlerts();
      if (isMountedRef.current) setActiveAlertCount(alerts.filter(a => !a.resolved).length);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  }, []);

  const loadScrts = useCallback(async () => {
    try {
      const response = await api.script.getAvailableScripts();
      setScrtList(response?.data || response || []);
    } catch (error) {
      console.error('Failed to load scripts:', error);
    }
  }, []);

  const loadScrtHistory = useCallback(async () => {
    try {
      const response = await api.script.getHistory();
      const data = response?.data || response || [];
      setScrtHistory(data.sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime()));
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }, []);

  // ========== 操作处理 ==========
  const handleStartCollector = async (collectorId: string) => {
    try {
      if (await logCollectorService.startCollector(collectorId)) {
        message.success('采集器启动成功');
        loadStatus();
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '启动失败');
    }
  };

  const handleStopCollector = async (collectorId: string) => {
    try {
      if (await logCollectorService.stopCollector(collectorId)) {
        message.success('采集器停止成功');
        loadStatus();
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '停止失败');
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await logCollectorService.testConnection();
      message[result.connected ? 'success' : 'error'](result.connected ? '连接成功' : `连接失败: ${result.message}`);
    } catch (error) {
      message.error('连接测试失败');
    }
  };

  const handleUpdateConfig = async (values: any) => {
    try {
      const mergedThresholds: Record<string, number> = {};
      Object.keys(selectedConfig!.alertThresholds).forEach(key => {
        const val = values.alertThresholds?.[key] ?? (selectedConfig!.alertThresholds as any)[key];
        if (val !== undefined && val !== null) mergedThresholds[key] = val;
      });
      if (await logCollectorService.updateConfig({ ...selectedConfig!, ...values, alertThresholds: mergedThresholds as any })) {
        message.success('配置更新成功');
        setConfigModalVisible(false);
        loadConfigs();
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '配置更新失败');
    }
  };

  const handleRunScrt = async (scriptKey: string) => {
    try {
      setRunningScrtKey(scriptKey);
      const response = await api.script.runScript({ scriptKey, args: [] });
      message[response.data?.status === 'FAILED' ? 'error' : 'success'](response.data?.message || '脚本已触发');
      setTimeout(loadScrtHistory, 2000);
    } catch (error: any) {
      message.error(error.response?.data?.message || '执行失败');
    } finally {
      setRunningScrtKey(null);
    }
  };

  // ========== 初始化 ==========
  useEffect(() => {
    isMountedRef.current = true;
    const init = async () => {
      setLoading(true);
      await Promise.all([loadConfigs(), loadStatus(), loadActiveAlerts(), loadScrts(), loadScrtHistory()]);
      setLoading(false);
    };
    init();
    const interval = setInterval(() => { loadStatus(); loadActiveAlerts(); loadScrtHistory(); }, 15000);
    return () => { isMountedRef.current = false; clearInterval(interval); };
  }, [loadConfigs, loadStatus, loadActiveAlerts, loadScrts, loadScrtHistory]);

  // ========== 表格列 ==========
  const configColumns: ColumnsType<LogCollectorConfig> = [
    { title: '名称', dataIndex: 'name', render: (t) => <Space><SettingOutlined />{t}</Space> },
    { title: '状态', dataIndex: 'enabled', render: (e) => <Badge status={e ? 'success' : 'default'} text={e ? '启用' : '禁用'} /> },
    { title: '间隔', dataIndex: 'interval', render: (i) => `${Math.round(i / 60)}分钟` },
    { title: '数据源', dataIndex: 'dataSources', render: (s: string[]) => s?.slice(0, 2).map(getDataSourceLabel).join(', ') + (s?.length > 2 ? '...' : '') || '-' },
    { title: '最后运行', key: 'lastRun', render: (_, r) => {
      const s = status.find(st => st.id === r.id);
      return s?.lastRunTime ? dayjs(s.lastRunTime).format('MM-DD HH:mm') : '-';
    }},
    { title: '操作', key: 'action', render: (_, r) => (
      <Button size="small" icon={<SettingOutlined />} onClick={() => { setSelectedConfig(r); configForm.setFieldsValue(r); setConfigModalVisible(true); }}>配置</Button>
    )}
  ];

  const scrtColumns: ColumnsType<ScriptDescriptor> = [
    { title: '脚本名称', key: 'name', render: (_, r) => <strong>{r.name}</strong> },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '冷却', dataIndex: 'cooldownSeconds', width: 80, render: (s) => s ? `${Math.round(s / 60)}分钟` : '-' },
    { title: '最后执行', key: 'lastExec', render: (_, r) => {
      const last = scrtHistory.find(h => h.scriptKey === r.key);
      return last ? <span>{dayjs(last.startedAt).format('MM-DD HH:mm')} <Tag color={last.status === 'SUCCESS' ? 'success' : 'error'}>{last.status}</Tag></span> : '-';
    }},
    { title: '操作', key: 'actions', width: 80, render: (_, r) => (
      <Button type="primary" size="small" icon={<PlayCircleOutlined />} loading={runningScrtKey === r.key} disabled={!r.allowManualTrigger} onClick={() => handleRunScrt(r.key)}>执行</Button>
    )}
  ];

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" tip="加载中..." /></div>;

  const primaryStatus = getPrimaryStatus();
  const isRunning = primaryStatus?.status === 'running';

  return (
    <div style={{ padding: 24 }}>
      {/* 状态概览 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="采集器" value={isRunning ? '运行中' : '已停止'}
              valueStyle={{ color: isRunning ? '#3f8600' : '#cf1322', fontSize: 16 }}
              prefix={isRunning ? <CheckCircleOutlined /> : <CloseCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="运行次数" value={status.reduce((sum, s) => sum + s.totalRuns, 0)} prefix={<DatabaseOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="成功率" value={status.length ? Math.round(status.reduce((sum, s) => sum + s.successRuns, 0) / status.reduce((sum, s) => sum + s.totalRuns || 1, 0) * 100) : 0} suffix="%" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" hoverable style={{ cursor: 'pointer' }} onClick={() => history.push('/alerts')}>
            <Statistic title="活跃告警" value={activeAlertCount} valueStyle={{ color: activeAlertCount > 0 ? '#cf1322' : '#3f8600' }} prefix={<WarningOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          {isRunning ? (
            <Button icon={<PauseCircleOutlined />} onClick={() => handleStopCollector(primaryStatus?.id || configs[0]?.id || 'default')}>暂停采集</Button>
          ) : (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => handleStartCollector(primaryStatus?.id || configs[0]?.id || 'default')}>启动采集</Button>
          )}
          <Button icon={<SyncOutlined />} onClick={() => { loadStatus(); loadScrtHistory(); }}>刷新</Button>
          <Button icon={<EyeOutlined />} onClick={handleTestConnection}>测试连接</Button>
        </Space>
      </Card>

      {/* 采集器配置 */}
      <Card title="采集器配置" style={{ marginBottom: 16 }} extra={<Button icon={<ReloadOutlined />} onClick={loadConfigs}>刷新</Button>}>
        <Table columns={configColumns} dataSource={configs} rowKey="id" size="small" pagination={false} />
      </Card>

      {/* 脚本列表 */}
      <Card title="可用脚本" style={{ marginBottom: 16 }} extra={<Button icon={<ReloadOutlined />} onClick={loadScrts}>刷新</Button>}>
        <Table columns={scrtColumns} dataSource={scrtList} rowKey="key" size="small" pagination={false} />
      </Card>



      {/* 配置模态框 */}
      <Modal title="采集器配置" open={configModalVisible} onCancel={() => setConfigModalVisible(false)} onOk={() => configForm.submit()} width={500}>
        <Form form={configForm} layout="vertical" onFinish={handleUpdateConfig}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="interval" label="间隔" rules={[{ required: true }]}>
            <Select>
              <Option value={180}>3分钟</Option>
              <Option value={300}>5分钟</Option>
              <Option value={600}>10分钟（推荐）</Option>
              <Option value={900}>15分钟</Option>
              <Option value={1800}>30分钟</Option>
            </Select>
          </Form.Item>
          <Form.Item name="dataSources" label="数据源">
            <Select mode="multiple">
              <Option value="security">安全日志</Option>
              <Option value="system">系统日志</Option>
              <Option value="application">应用日志</Option>
              <Option value="cpu">CPU</Option>
              <Option value="memory">内存</Option>
              <Option value="disk">磁盘</Option>
              <Option value="network">网络</Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}><Form.Item name={['alertThresholds', 'cpuUsage']} label="CPU阈值"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name={['alertThresholds', 'memoryUsage']} label="内存阈值"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name={['alertThresholds', 'diskUsage']} label="磁盘阈值"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item name="enableRuleEngine" label="启用规则引擎" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LogCollectorPage;
