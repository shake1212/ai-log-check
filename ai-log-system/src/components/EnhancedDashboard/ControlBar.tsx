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
  const TYPE_LABEL: Record<string, string> = {
    'logs':          '日志数据',
    'alerts':        '告警数据',
    'events':        '安全事件',
    'security-logs': 'Windows安全日志',
    'metrics':       '系统性能指标',
  };

  const handleExport = (key: string) => {
    const [dataType, format] = key.split('_');
    const ext = format === 'excel' ? 'xlsx' : format;
    const token = localStorage.getItem('token');
    const label = TYPE_LABEL[dataType] ?? dataType;
    const ts = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '');
    const filename = `${label}_${ts}.${ext}`;
    const backendBase = process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : '';

    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${backendBase}/api/api/export/${dataType}?format=${format}`, true);
    xhr.responseType = 'blob';
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const url = window.URL.createObjectURL(xhr.response as Blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;   // 直接用前端拼好的中文文件名
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('导出失败，状态码:', xhr.status);
      }
    };
    xhr.onerror = () => console.error('导出请求失败');
    xhr.send();
  };

  return (
    <Card 
      style={{ 
        marginBottom: '16px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.06)'
      }}
      styles={{ body: { padding: '12px 14px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <Tabs 
            activeKey={activeTab}
            onChange={setActiveTab}
            size="middle"
            style={{ minWidth: '260px' }}
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
          <Space size="middle" wrap>
            <Button
              type="primary"
              icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
              onClick={() => setIsPaused(!isPaused)}
              shape="round"
              size="middle"
              style={{
                background: isPaused ? '#1890ff' : 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                border: 'none',
                padding: '0 14px',
                height: '36px'
              }}
            >
              {isPaused ? '继续监控' : '暂停监控'}
            </Button>

            <Badge count={unreadCount} size="small" offset={[-5, 5]}>
              <Button
                icon={<BellOutlined />}
                onClick={() => setNotificationPanelVisible(true)}
                shape="round"
                size="middle"
                style={{ height: '36px', padding: '0 14px' }}
              >
                系统通知
              </Button>
            </Badge>

            <Dropdown
              menu={{
                items: [
                  {
                    type: 'group',
                    label: '安全事件',
                    children: [
                      { key: 'events_excel', icon: <FileExcelOutlined />, label: '安全事件 → Excel' },
                      { key: 'events_csv',   icon: <CodeOutlined />,      label: '安全事件 → CSV' },
                      { key: 'events_json',  icon: <CodeOutlined />,      label: '安全事件 → JSON' },
                    ],
                  },
                  { type: 'divider' },
                  {
                    type: 'group',
                    label: '告警数据',
                    children: [
                      { key: 'alerts_excel', icon: <FileExcelOutlined />, label: '告警数据 → Excel' },
                      { key: 'alerts_csv',   icon: <CodeOutlined />,      label: '告警数据 → CSV' },
                      { key: 'alerts_json',  icon: <CodeOutlined />,      label: '告警数据 → JSON' },
                    ],
                  },
                  { type: 'divider' },
                  {
                    type: 'group',
                    label: '日志数据',
                    children: [
                      { key: 'logs_excel', icon: <FileExcelOutlined />, label: '日志数据 → Excel' },
                      { key: 'logs_csv',   icon: <CodeOutlined />,      label: '日志数据 → CSV' },
                      { key: 'logs_json',  icon: <CodeOutlined />,      label: '日志数据 → JSON' },
                    ],
                  },
                  { type: 'divider' },
                  {
                    type: 'group',
                    label: '系统性能指标',
                    children: [
                      { key: 'metrics_excel', icon: <FileExcelOutlined />, label: '性能指标 → Excel' },
                      { key: 'metrics_csv',   icon: <CodeOutlined />,      label: '性能指标 → CSV' },
                    ],
                  },
                  { type: 'divider' },
                  {
                    type: 'group',
                    label: 'Windows安全日志',
                    children: [
                      { key: 'security-logs_excel', icon: <FileExcelOutlined />, label: 'Windows日志 → Excel' },
                      { key: 'security-logs_csv',   icon: <CodeOutlined />,      label: 'Windows日志 → CSV' },
                    ],
                  },
                ],
                onClick: ({ key }) => handleExport(key),
              }}
              placement="bottomRight"
            >
              <Button 
                icon={<ExportOutlined />}
                shape="round"
                size="middle"
                style={{ 
                  background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
                  border: 'none',
                  color: 'white',
                  height: '36px',
                  padding: '0 14px'
                }}
              >
                数据导出
              </Button>
            </Dropdown>

            <Button
              shape="round"
              size="middle"
              style={{ height: '36px', padding: '0 14px' }}
              onClick={() => {
                window.location.hash = '/alerts';
              }}
            >
              前往告警处置
            </Button>

            <Button
              shape="round"
              size="middle"
              style={{ height: '36px', padding: '0 14px' }}
              onClick={() => {
                window.location.hash = '/events';
              }}
            >
              前往事件分析
            </Button>

            <Button
              icon={<SyncOutlined spin={!connected} />}
              onClick={reconnect}
              disabled={connected}
              shape="round"
              size="middle"
              style={{ height: '36px', padding: '0 14px' }}
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