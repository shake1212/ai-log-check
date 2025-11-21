import React, { useState, useEffect } from 'react';
// import { history } from 'umi';
import { Layout, Menu, Typography, Avatar, Dropdown, Badge, Button, Space, Tabs } from 'antd';
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
import SystemInfoManagement from '../pages/systemInfoManagement/index';
import DebugRoute from '../pages/debug-route';
import EventsPage from '../pages/events/index';
import BatchOperationsPage from '../pages/batch-operations/index';
import DatabaseManagement from '../pages/database/index';
// 新增导入
import LogsPage from '../pages/logs/index';
import AlertsPage from '../pages/alerts/alerts';
import SystemPage from '../pages/system';
import initialConfig from '../pages/settings/index';
import { useModel } from '@/utils/useModel';

const { Header, Content, Footer, Sider } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

export default function DefaultLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const [currentPath, setCurrentPath] = useState('/dashboard');
  const [activeTab, setActiveTab] = useState('/dashboard');
  // const { initialState, setInitialState } = useModel('@@initialState');

  // 监听URL hash变化
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const rawPath = hash.startsWith('#') ? hash.substring(1) : hash;
      const normalizedPath = rawPath === '/realtime' ? '/dashboard' : rawPath;

      if (normalizedPath && normalizedPath !== rawPath) {
        window.location.hash = normalizedPath;
      }

      if (normalizedPath && normalizedPath !== currentPath) {
        setCurrentPath(normalizedPath);
        setActiveTab(normalizedPath);
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
      key: '/alerts',
      icon: <AlertOutlined />,
      label: '告警管理',
    },
    {
      key: '/events',
      icon: <FileTextOutlined />,
      label: '事件查询统计',
    },
    {
      key: '/systemInfoManagement',
      icon: <SettingOutlined />,
      label: '系统信息管理',
    },
    {
      key: '/system',
      icon: <TeamOutlined />,
      label: '系统管理后台',
      access: 'admin',
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
      key: '/database',
      icon: <DatabaseOutlined />,
      label: '数据库管理',
    },
    {
      key: '/batch-operations',
      icon: <SettingOutlined />,
      label: '批量操作管理',
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

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setCurrentPath(key);
    window.location.hash = key;
  };

  const renderTabContent = (key: string) => {
    switch (key) {
      case '/dashboard':
        return <EnhancedDashboard />;
      case '/alerts':
        return <AlertsPage />;
      case '/whitelist':
        return (
          <div style={{ padding: '20px' }}>
            <h1>白名单管理页面</h1>
            <p>白名单管理功能正在开发中...</p>
          </div>
        );
      case '/logs':
        return <LogsPage />;
      case '/settings':
        return (
          <div style={{ padding: '20px' }}>
            <h1>系统设置页面</h1>
            <p>系统设置功能正在开发中...</p>
          </div>
        );
      case '/wmi':
        return <WMIManagement />;
      case '/systemInfoManagement':
        return <SystemInfoManagement />;
      case '/events':
        return <EventsPage />;
      case '/batch-operations':
        return <BatchOperationsPage />;
      case '/database':
        return <DatabaseManagement />;
      case '/debug-route':
        return <DebugRoute />;
      case '/system':
        return <SystemPage />;
      case '/docs':
        return (
          <div style={{ padding: '20px' }}>
            <h1>API文档</h1>
            <p>API文档功能正在开发中...</p>
          </div>
        );
      case '/profile':
        return (
          <div style={{ padding: '20px' }}>
            <h1>个人资料</h1>
            <p>个人资料功能正在开发中...</p>
          </div>
        );
      default:
        return <EnhancedDashboard />;
    }
  };

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
            setActiveTab(key);
            window.location.hash = key;
          }}
        />
        <div style={{ 
          position: 'absolute', 
          bottom: 0, 
          width: '100%', 
          padding: '16px', 
          textAlign: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.2)'
        }}>
          <Space>
            <Badge count={unreadCount} size="small">
              <Button 
                type="text" 
                icon={<BellOutlined style={{ color: 'white' }} />}
                onClick={() => setNotificationPanelVisible(true)}
                size="small"
              />
            </Badge>
            <Dropdown 
              menu={{ 
                items: userMenu, 
                onClick: handleUserMenuClick 
              }} 
              placement="topLeft"
              arrow
            >
              <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <Avatar size="small" icon={<UserOutlined />} />
                {!collapsed && (
                  <div style={{ marginLeft: '8px' }}>
                    <Text style={{ color: 'white', display: 'block', fontSize: '12px' }}>管理员</Text>
                  </div>
                )}
              </div>
            </Dropdown>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined style={{ color: 'white' }} /> : <MenuFoldOutlined style={{ color: 'white' }} />}
              onClick={() => setCollapsed(!collapsed)}
              size="small"
            />
          </Space>
        </div>
      </Sider>
      <Layout>
        <Content style={{ padding: '16px', background: '#f0f2f5' }}>
          <div className="tab-content-container" style={{ height: 'calc(100vh - 120px)', overflow: 'visible' }}>
            {/* 移除了顶部的Tabs菜单，只保留侧边栏菜单 */}
            {renderTabContent(activeTab)}
          </div>
        </Content>
        <Footer style={{ textAlign: 'center', background: '#fff', padding: '12px 24px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            安全日志异常检测与预警系统 ©{new Date().getFullYear()} | 技术支持: AI安全团队
          </Text>
        </Footer>
      </Layout>
    </Layout>
  );
}