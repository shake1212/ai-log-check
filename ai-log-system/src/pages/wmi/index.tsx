import React, { useState } from 'react';
import { Card, Tabs, Typography, Row, Col, Statistic, Alert } from 'antd';
import {
  DatabaseOutlined,
  CloudServerOutlined,
  BugOutlined,
  SettingOutlined,
  MonitorOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import WMIEnvironment from '../../components/WMI/WMIEnvironment';
import WMIDataFlow from '../../components/WMI/WMIDataFlow';
import WMITestConnection from '../../components/WMI/WMITestConnection';

const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;

const WMIManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('environment');

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <DatabaseOutlined style={{ marginRight: '8px' }} />
          WMI管理系统
        </Title>
        <Paragraph>
          Windows Management Instrumentation (WMI) 是一个用于管理Windows系统的核心接口。
          通过WMI可以监控系统性能、收集日志数据、管理服务等。
        </Paragraph>
      </div>

      {/* 系统概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="WMI连接数"
              value={2}
              prefix={<CloudServerOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="数据源数量"
              value={4}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃查询"
              value={3}
              prefix={<MonitorOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="数据点总数"
              value={1646}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 系统状态提示 */}
      <Alert
        message="WMI系统状态"
        description="系统运行正常，所有WMI连接稳定。建议定期检查连接状态和查询性能。"
        type="success"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      {/* 功能模块 */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'environment',
              label: '环境配置',
              children: <WMIEnvironment />
            },
            {
              key: 'dataflow',
              label: '数据流管理',
              children: <WMIDataFlow />
            },
            {
              key: 'test',
              label: '连接测试',
              children: <WMITestConnection />
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default WMIManagement;
