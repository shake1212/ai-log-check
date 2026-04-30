import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Layout, Menu, Typography, Avatar, Dropdown, Badge, Button, Space, Tabs, Spin } from 'antd';
import { useNotification } from '../hooks/useNotification';
import NotificationPanel from '../components/NotificationPanel';
import {
  DashboardOutlined,
  AlertOutlined,
  FileTextOutlined,
  TeamOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
  DatabaseOutlined,
  LineChartOutlined,
} from '@ant-design/icons';

// 懒加载页面组件 - 按需加载，减少首屏JS体积
const EnhancedDashboard = lazy(() => import('../components/EnhancedDashboard/EnhancedDashboard'));
const WMIManagement = lazy(() => import('../pages/wmi/index'));
const EventsPage = lazy(() => import('../pages/events/index'));
const LogCollectorPage = lazy(() => import('../pages/log-collector'));
const AlertsPage = lazy(() => import('../pages/alerts/alerts'));
const SystemPage = lazy(() => import('../pages/system'));
const RulesPage = lazy(() => import('../pages/rules/index'));

const LazyFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 300 }}>
    <Spin size="large" tip="加载中..." />
  </div>
);

const { Header, Content, Footer, Sider } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

export default function DefaultLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const [currentPath, setCurrentPath] = useState('/dashboard');
  const [activeTab, setActiveTab] = useState('/dashboard');
  const [tabQuery, setTabQuery] = useState<Record<string, string>>({});

  // 监听URL hash变化
  useEffect(() => {
    const handleHashChange = () => {
      let hash = window.location.hash;
      
      // 清理错误的 URL 格式：如果 URL 中有 ? 在 # 之前，需要重新组织
      // 例如：events?id=alert-52668#/system 应该变成 #/system
      const searchParams = window.location.search;
      if (searchParams && hash) {
        // 如果同时有 search params 和 hash，说明 URL 格式混乱
        // 清理 search params，只保留 hash
        const cleanUrl = window.location.pathname + hash;
        window.history.replaceState(null, '', cleanUrl);
        hash = window.location.hash;
      }
      
      const rawPath = hash.startsWith('#') ? hash.substring(1) : hash || '/dashboard';

      // 分离路径和 query 参数
      const [pathPart, queryPart] = rawPath.split('?');
      let normalizedPath = pathPart || '/dashboard';
      
      // 处理 /realtime 重定向到 /dashboard
      if (normalizedPath === '/realtime') {
        normalizedPath = '/dashboard';
      }

      // 解析 query 参数
      const queryParams: Record<string, string> = {};
      if (queryPart) {
        queryPart.split('&').forEach(pair => {
          const [k, v] = pair.split('=');
          if (k) queryParams[decodeURIComponent(k)] = decodeURIComponent(v || '');
        });
      }

      // 如果路径被规范化了（如 /realtime -> /dashboard），更新 URL
      if (normalizedPath && normalizedPath !== pathPart) {
        const newHash = queryPart ? `${normalizedPath}?${queryPart}` : normalizedPath;
        window.location.hash = newHash;
      }

      // 更新状态
      setCurrentPath(normalizedPath);
      setActiveTab(normalizedPath);
      setTabQuery(queryParams);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  // 通知系统
  const { unreadCount } = useNotification();
  
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘总览',
    },
    {
      key: '/alerts',
      icon: <AlertOutlined />,
      label: '告警处置管理',
    },
    {
      key: '/events',
      icon: <FileTextOutlined />,
      label: '事件查询统计',
    },
    {
      key: '/wmi',
      icon: <DatabaseOutlined />,
      label: '系统资源监控',
    },
    {
      key: '/log-collector',
      icon: <LineChartOutlined />,
      label: '日志采集',
    },
    {
      key: '/rules',
      icon: <CheckCircleOutlined />,
      label: '规则管理',
    },
    {
      key: '/system',
      icon: <TeamOutlined />,
      label: '系统管理后台',
      access: 'admin',
    },
  ];

  const handleUserMenuClick = ({ key }: { key: string }) => {
    switch (key) {
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
      case '/rules':
        return <RulesPage />;
      case '/log-collector':
        return <LogCollectorPage />;
      case '/wmi':
        return <WMIManagement />;
      case '/events':
        return <EventsPage initialEventId={tabQuery.eventId ? parseInt(tabQuery.eventId, 10) : undefined} />;
      case '/system':
        return <SystemPage />;
      default:
        return <EnhancedDashboard />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', display: 'flex' }}>
      {/* 通知面板 */}
      <NotificationPanel 
        visible={notificationPanelVisible}
        onClose={() => setNotificationPanelVisible(false)}
      />
      
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
        trigger={null}  // 隐藏默认触发器
        theme="dark"
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          overflow: 'hidden'
        }}
      >
        {/* 内部 flex 容器，撑满 Sider 高度 */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Logo区域 */}
        <div style={{ 
          padding: '16px', 
          textAlign: 'center',
          flexShrink: 0
        }}>
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
        
        {/* 菜单区域 - 可滚动，占据剩余空间 */}
        <div style={{ 
          flex: 1,
          overflow: 'auto',
          minHeight: 0
        }}>
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
            style={{ 
              borderRight: 'none',
              paddingBottom: '8px'
            }}
          />
        </div>
        
        {/* 登录图标区域 - 直接放在Sider最底部 */}
        <div style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          padding: collapsed ? '8px' : '8px 16px',
          flexShrink: 0
        }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%'
          }}>
            {/* 左侧：登录图标和通知按钮 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '8px',
              flex: collapsed ? 0 : 1,
              justifyContent: collapsed ? 'center' : 'flex-start'
            }}>
              {!collapsed && (
                <Badge count={unreadCount} size="small">
                  <Button 
                    type="text" 
                    icon={<BellOutlined style={{ color: 'white' }} />}
                    onClick={() => setNotificationPanelVisible(true)}
                    size="small"
                    style={{ color: 'white' }}
                  />
                </Badge>
              )}
              
              <Dropdown 
                menu={{ 
                  items: userMenu, 
                  onClick: handleUserMenuClick 
                }} 
                placement="topLeft"
                arrow
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  gap: '6px'
                }}>
                  <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                  {!collapsed && (
                    <span style={{ 
                      color: '#ffffff', 
                      fontSize: '13px',
                      fontWeight: 500,
                      whiteSpace: 'nowrap'
                    }}>
                      管理员
                    </span>
                  )}
                </div>
              </Dropdown>
            </div>
            
            {/* 右侧：折叠图标 */}
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined style={{ color: 'white' }} /> : <MenuFoldOutlined style={{ color: 'white' }} />}
                onClick={() => setCollapsed(!collapsed)}
                size="small"
                style={{ color: 'white' }}
              />
            </div>
          </div>
        </div>
        </div>{/* end 内部 flex 容器 */}
      </Sider>
      
      <Layout style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Content style={{ 
          flex: 1,
          padding: '16px',
          background: '#f0f2f5',
          overflow: 'auto'
        }}>
          <div 
            style={{ 
              height: '100%',
              background: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              padding: '24px',
              overflow: 'auto'
            }}
          >
            <Suspense fallback={<LazyFallback />}>
              {renderTabContent(activeTab)}
            </Suspense>
          </div>
        </Content>
        <Footer style={{ 
          textAlign: 'center', 
          background: '#fff', 
          padding: '12px 24px',
          flexShrink: 0
        }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            安全日志异常检测与预警系统 ©{new Date().getFullYear()} | 技术支持: AI安全团队
          </Text>
        </Footer>
      </Layout>
    </Layout>
  );
}