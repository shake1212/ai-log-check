import React, { useState } from 'react';
import { Outlet, Link, useLocation, history } from 'umi';
import { Layout, Menu, theme, Typography, Avatar, Dropdown } from 'antd';
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
  ExperimentOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { ProLayout } from '@ant-design/pro-components';

const { Header, Content, Footer, Sider } = Layout;
const { Title } = Typography;

export default function DefaultLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '实时监控面板',
    },
    {
      key: '/alerts',
      icon: <AlertOutlined />,
      label: '异常预警列表',
    },
    {
      key: '/logs',
      icon: <FileTextOutlined />,
      label: '日志详情查看',
    },
    {
      key: '/models',
      icon: <RobotOutlined />,
      label: 'AI模型管理',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '模型参数配置',
    },
    {
      key: '/system',
      icon: <TeamOutlined />,
      label: '系统管理后台',
    },
  ];

  const userMenu = [
    {
      key: 'profile',
      label: '个人资料',
    },
    {
      key: 'settings',
      label: '账户设置',
    },
    {
      key: 'logout',
      label: '退出登录',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
        theme="dark"
      >
        <div style={{ 
          height: 32, 
          margin: 16, 
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start'
        }}>
          <Title level={4} style={{ color: 'white', margin: 0 }}>
            {collapsed ? '安全' : '安全日志系统'}
          </Title>
        </div>
        <Menu 
          theme="dark" 
          mode="inline" 
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => {
            history.push(key);
          }}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          padding: '0 16px', 
          background: '#fff', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: '18px' }
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <BellOutlined style={{ fontSize: '18px', marginRight: 24 }} />
            <Dropdown menu={{ items: userMenu }} placement="bottomRight">
              <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: '16px' }}>
          <div style={{ padding: 24, background: '#fff', minHeight: 360 }}>
            <Outlet />
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          安全日志异常检测与预警系统 ©{new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>
  );
}