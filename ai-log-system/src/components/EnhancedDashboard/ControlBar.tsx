import React from 'react';
import { Card, Tabs, Button, Space, Badge, Dropdown } from 'antd';
import {
  DashboardFilled,
  RadarChartOutlined,
  GlobalOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  BellOutlined,
  ExportOutlined,
  SyncOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  CodeOutlined
} from '@ant-design/icons';
import { DashboardProps } from './types/dashboard';

const { TabPane } = Tabs;

interface ControlBarProps extends DashboardProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notificationPanelVisible: boolean;
  setNotificationPanelVisible: (visible: boolean) => void;
}

const ControlBar: React.FC<ControlBarProps> = ({
  isPaused,
  setIsPaused,
  connected,
  reconnect,
  unreadCount,
  activeTab,
  setActiveTab,
  setNotificationPanelVisible
}) => {
  const handleExport = (format: 'excel' | 'csv' | 'json' | 'report') => {
    console.log('导出格式:', format);
    // 这里添加导出逻辑
  };

  return (
    <Card 
      style={{ 
        marginBottom: '32px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.06)'
      }}
      bodyStyle={{ padding: '20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <Tabs 
            activeKey={activeTab}
            onChange={setActiveTab}
            size="large"
            style={{ minWidth: '300px' }}
          >
            <TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DashboardFilled />
                  仪表盘概览
                </span>
              } 
              key="overview" 
            />
            <TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RadarChartOutlined />
                  安全分析
                </span>
              } 
              key="analysis" 
            />
            <TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GlobalOutlined />
                  威胁情报
                </span>
              } 
              key="threat" 
            />
          </Tabs>
        </div>
        <div>
          <Space size="large" wrap>
            <Button
              type="primary"
              icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
              onClick={() => setIsPaused(!isPaused)}
              shape="round"
              size="large"
              style={{
                background: isPaused ? '#1890ff' : 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                border: 'none',
                padding: '0 24px',
                height: '44px'
              }}
            >
              {isPaused ? '继续监控' : '暂停监控'}
            </Button>

            <Badge count={unreadCount} size="small" offset={[-5, 5]}>
              <Button
                icon={<BellOutlined />}
                onClick={() => setNotificationPanelVisible(true)}
                shape="round"
                size="large"
                style={{ height: '44px', padding: '0 20px' }}
              >
                系统通知
              </Button>
            </Badge>

            <Dropdown
              menu={{
                items: [
                  { key: 'excel', icon: <FileExcelOutlined />, label: '导出Excel报告' },
                  { key: 'pdf', icon: <FilePdfOutlined />, label: '导出PDF报告' },
                  { key: 'json', icon: <CodeOutlined />, label: '导出JSON数据' },
                ],
                onClick: ({ key }) => handleExport(key as any),
              }}
              placement="bottomRight"
            >
              <Button 
                icon={<ExportOutlined />}
                shape="round"
                size="large"
                style={{ 
                  background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
                  border: 'none',
                  color: 'white',
                  height: '44px',
                  padding: '0 20px'
                }}
              >
                数据导出
              </Button>
            </Dropdown>

            <Button
              icon={<SyncOutlined spin={!connected} />}
              onClick={reconnect}
              disabled={connected}
              shape="round"
              size="large"
              style={{ height: '44px', padding: '0 20px' }}
            >
              重新连接
            </Button>
          </Space>
        </div>
      </div>
    </Card>
  );
};

export default ControlBar;