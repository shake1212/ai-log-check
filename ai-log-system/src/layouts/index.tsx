import React, { useState, useEffect } from 'react';
// import { history } from 'umi';
import { Layout, Menu, Typography, Avatar, Dropdown, Badge, Button, Space } from 'antd';
import { useNotification } from '../hooks/useNotification';
import NotificationPanel from '../components/NotificationPanel';
import {
  DashboardOutlined,
  AlertOutlined,
  FileTextOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  CheckCircleOutlined,
  RobotOutlined,
  BookOutlined,
  LogoutOutlined,
  UserSwitchOutlined,
  SyncOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import EnhancedDashboard from '../components/EnhancedDashboard';
import WMIManagement from '../pages/wmi/index';
import WMIManagementAdvanced from '../pages/wmi-management/index';
// import DatabaseManagement from '../pages/database/index';
import DebugRoute from '../pages/debug-route';
import EventsPage from '../pages/events/index';
import BatchOperationsPage from '../pages/batch-operations/index';
// 新增导入
import LogsPage from '../pages/logs/logs';
import AlertsPage from '../pages/alerts/alerts';
// import { useModel } from '@/utils/useModel';
// import styles from './index.less';

const { Header, Content, Footer, Sider } = Layout;
const { Title, Text } = Typography;

export default function DefaultLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const [currentPath, setCurrentPath] = useState('/dashboard');
  // const { initialState, setInitialState } = useModel('@@initialState');

  // 监听URL hash变化
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const path = hash.startsWith('#') ? hash.substring(1) : hash;
      if (path && path !== currentPath) {
        setCurrentPath(path);
      }
    };

    // 初始化时检查hash
    handleHashChange();

    // 监听hash变化
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [currentPath]);
  
  // 通知系统
  const { unreadCount } = useNotification();
  
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/realtime',
      icon: <BellOutlined />,
      label: '实时监控',
    },
    {
      key: '/alerts',
      icon: <AlertOutlined />,
      label: '告警管理',
    },
    {
      key: '/whitelist',
      icon: <CheckCircleOutlined />,
      label: '白名单管理',
    },
    {
      key: '/logs',
      icon: <FileTextOutlined />,
      label: '日志查询',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
    {
      key: '/wmi',
      icon: <DatabaseOutlined />,
      label: 'WMI基础',
    },
    {
      key: '/wmi-management',
      icon: <SettingOutlined />,
      label: 'WMI高级管理',
    },
    {
      key: '/database',
      icon: <DatabaseOutlined />,
      label: '数据库管理',
    },
    {
      key: '/events',
      icon: <FileTextOutlined />,
      label: '事件查询统计',
    },
    {
      key: '/batch-operations',
      icon: <SettingOutlined />,
      label: '批量操作管理',
      access: 'admin',
    },
    {
      key: '/system',
      icon: <TeamOutlined />,
      label: '系统管理后台',
      access: 'admin',
    },
    {
      key: '/docs',
      icon: <BookOutlined />,
      label: 'API文档',
    },
  ];

  const handleUserMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'profile':
        setCurrentPath('/profile');
        window.location.hash = '/profile';
        break;
      case 'logout':
        handleLogout();
        break;
      default:
        break;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // setInitialState({});
    window.location.href = '/login';
  };

  const userMenu = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  // 根据权限过滤菜单
  const filteredMenuItems = menuItems.filter(item => {
    if (item.access === 'admin') {
      // return initialState?.user?.role === 'ADMIN';
      return true; // 开发环境暂时允许所有菜单
    }
    return true;
  });

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 通知面板 */}
      <NotificationPanel 
        visible={notificationPanelVisible}
        onClose={() => setNotificationPanelVisible(false)}
      />
      
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
        theme="dark"
      >
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🛡️</div>
          {!collapsed && (
            <div>
              <Title level={4} style={{ color: 'white', margin: 0 }}>
                安全日志系统
              </Title>
              <Text style={{ color: '#ccc' }}>AI异常检测</Text>
            </div>
          )}
        </div>
        <Menu
          theme="dark" 
          mode="inline" 
          selectedKeys={[currentPath]}
          items={filteredMenuItems}
          onClick={({ key }) => {
            setCurrentPath(key);
            window.location.hash = key;
          }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <div style={{ marginLeft: '16px' }}>
              <Text strong>当前位置: </Text>
              <Text>{filteredMenuItems.find(item => item.key === currentPath)?.label || '首页'}</Text>
            </div>
          </div>
          <div>
            <Space size="middle">
              <Badge count={unreadCount} size="small">
                <Button 
                  type="text" 
                  icon={<BellOutlined />}
                  onClick={() => setNotificationPanelVisible(true)}
                />
              </Badge>
              <Dropdown 
                menu={{ 
                  items: userMenu, 
                  onClick: handleUserMenuClick 
                }} 
                placement="bottomRight"
                arrow
              >
                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <Avatar icon={<UserOutlined />} />
                  {!collapsed && (
                    <div style={{ marginLeft: '8px' }}>
                      <Text strong>管理员</Text>
                      <br />
                      <Text type="secondary">管理员</Text>
                    </div>
                  )}
                </div>
              </Dropdown>
            </Space>
          </div>
        </Header>
        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          {currentPath === '/dashboard' && <EnhancedDashboard />}
          {currentPath === '/realtime' && (
            <div style={{ padding: '20px' }}>
              <h1>实时监控页面</h1>
              <p>实时监控功能正在开发中...</p>
            </div>
          )}
          {currentPath === '/alerts' && <AlertsPage />}
          {currentPath === '/whitelist' && (
            <div style={{ padding: '20px' }}>
              <h1>白名单管理页面</h1>
              <p>白名单管理功能正在开发中...</p>
            </div>
          )}
          {currentPath === '/logs' && <LogsPage />}
          {currentPath === '/settings' && (
            <div style={{ padding: '20px' }}>
              <h1>系统设置页面</h1>
              <p>系统设置功能正在开发中...</p>
            </div>
          )}
          {currentPath === '/wmi' && <WMIManagement />}
          {currentPath === '/wmi-management' && <WMIManagementAdvanced />}
          {currentPath === '/events' && <EventsPage />}
          {currentPath === '/batch-operations' && <BatchOperationsPage />}
          {currentPath === '/database' && <DatabaseManagement />}
          {currentPath === '/debug-route' && <DebugRoute />}
          {currentPath === '/system' && (
            <div style={{ padding: '20px' }}>
              <h1>系统管理后台</h1>
              <p>系统管理功能正在开发中...</p>
            </div>
          )}
          {currentPath === '/docs' && (
            <div style={{ padding: '20px' }}>
              <h1>API文档</h1>
              <p>API文档功能正在开发中...</p>
            </div>
          )}
          {currentPath === '/profile' && (
            <div style={{ padding: '20px' }}>
              <h1>个人资料</h1>
              <p>个人资料功能正在开发中...</p>
            </div>
          )}
        </Content>
        <Footer style={{ textAlign: 'center', background: '#fff' }}>
          <Text type="secondary">
            安全日志异常检测与预警系统 ©{new Date().getFullYear()} | 技术支持: AI安全团队
          </Text>
        </Footer>
      </Layout>
    </Layout>
  );
}