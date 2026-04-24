import React from 'react';
import { Button, Badge, Dropdown, Space, Typography } from 'antd';
import {
  RobotOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  BellOutlined,
  ExportOutlined,
  FileExcelOutlined,
  CodeOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

export interface DashboardTopBarProps {
  connected: boolean;
  reconnect: () => void;
  isPaused: boolean;
  setIsPaused: (v: boolean) => void;
  unreadCount: number;
  notificationPanelVisible: boolean;
  setNotificationPanelVisible: (v: boolean) => void;
}

const TYPE_LABEL: Record<string, string> = {
  logs: '日志数据',
  alerts: '告警数据',
  events: '安全事件',
  'security-logs': 'Windows安全日志',
  metrics: '系统性能指标',
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
      link.download = filename;
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

const exportMenuItems = [
  {
    type: 'group' as const,
    label: '安全事件',
    children: [
      { key: 'events_excel', icon: <FileExcelOutlined />, label: '安全事件 → Excel' },
      { key: 'events_csv', icon: <CodeOutlined />, label: '安全事件 → CSV' },
      { key: 'events_json', icon: <CodeOutlined />, label: '安全事件 → JSON' },
    ],
  },
  { type: 'divider' as const },
  {
    type: 'group' as const,
    label: '告警数据',
    children: [
      { key: 'alerts_excel', icon: <FileExcelOutlined />, label: '告警数据 → Excel' },
      { key: 'alerts_csv', icon: <CodeOutlined />, label: '告警数据 → CSV' },
      { key: 'alerts_json', icon: <CodeOutlined />, label: '告警数据 → JSON' },
    ],
  },
  { type: 'divider' as const },
  {
    type: 'group' as const,
    label: '日志数据',
    children: [
      { key: 'logs_excel', icon: <FileExcelOutlined />, label: '日志数据 → Excel' },
      { key: 'logs_csv', icon: <CodeOutlined />, label: '日志数据 → CSV' },
      { key: 'logs_json', icon: <CodeOutlined />, label: '日志数据 → JSON' },
    ],
  },
  { type: 'divider' as const },
  {
    type: 'group' as const,
    label: '系统性能指标',
    children: [
      { key: 'metrics_excel', icon: <FileExcelOutlined />, label: '性能指标 → Excel' },
      { key: 'metrics_csv', icon: <CodeOutlined />, label: '性能指标 → CSV' },
    ],
  },
  { type: 'divider' as const },
  {
    type: 'group' as const,
    label: 'Windows安全日志',
    children: [
      { key: 'security-logs_excel', icon: <FileExcelOutlined />, label: 'Windows日志 → Excel' },
      { key: 'security-logs_csv', icon: <CodeOutlined />, label: 'Windows日志 → CSV' },
    ],
  },
];

const DashboardTopBar: React.FC<DashboardTopBarProps> = ({
  connected,
  reconnect,
  isPaused,
  setIsPaused,
  unreadCount,
  setNotificationPanelVisible,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '64px',
        padding: '0 24px',
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Left: Logo + Title + Connection Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <RobotOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
        <Text strong style={{ fontSize: '16px', color: '#1a1a1a' }}>
          AI 智能安全监控
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: connected ? '#52c41a' : '#ff4d4f',
              boxShadow: `0 0 6px ${connected ? '#52c41a' : '#ff4d4f'}`,
            }}
          />
          {connected ? (
            <Text style={{ fontSize: '13px', color: '#52c41a' }}>已连接</Text>
          ) : (
            <Text
              style={{ fontSize: '13px', color: '#ff4d4f', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={reconnect}
            >
              点击重连
            </Text>
          )}
        </div>
      </div>

      {/* Right: 3 action buttons */}
      <Space size="middle">
        <Button
          type="primary"
          icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
          onClick={() => setIsPaused(!isPaused)}
          shape="round"
          size="middle"
          style={{ height: '36px', padding: '0 14px' }}
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
            items: exportMenuItems,
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
              padding: '0 14px',
            }}
          >
            数据导出
          </Button>
        </Dropdown>
      </Space>
    </div>
  );
};

export default DashboardTopBar;
