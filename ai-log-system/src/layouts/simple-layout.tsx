import React, { useState } from 'react';
import { Layout, Menu, Typography, Avatar, Dropdown, Badge, Button, Space, Card, Row, Col, Statistic } from 'antd';
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
} from '@ant-design/icons';

const { Header, Content, Footer, Sider } = Layout;
const { Title, Text } = Typography;

// 内联仪表盘组件
const InlineDashboard = () => (
  <div style={{ padding: '20px' }}>
    <h1>AI安全日志异常检测系统 - 仪表盘</h1>
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic
            title="系统状态"
            value="正常"
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="异常事件"
            value={5}
            prefix={<AlertOutlined />}
            valueStyle={{ color: '#cf1322' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="总日志数"
            value={1234}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="实时状态"
            value="运行中"
            prefix={<SyncOutlined spin />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
      </Col>
    </Row>
    
    <Row gutter={16} style={{ marginTop: '20px' }}>
      <Col span={12}>
        <Card title="最近异常日志" extra={<Button type="link" size="small">查看全部</Button>}>
          <div style={{ height: '200px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">异常日志列表</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>显示最近的异常事件</Text>
            </div>
          </div>
        </Card>
      </Col>
      <Col span={12}>
        <Card title="系统性能监控" extra={<Button type="link" size="small">详细监控</Button>}>
          <div style={{ height: '200px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">性能监控图表</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>CPU、内存、网络使用率</Text>
            </div>
          </div>
        </Card>
      </Col>
    </Row>
    
    <Row gutter={16} style={{ marginTop: '20px' }}>
      <Col span={24}>
        <Card title="实时日志流" extra={<Button type="link" size="small">暂停/继续</Button>}>
          <div style={{ height: '150px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">实时日志流</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>显示最新的系统日志</Text>
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  </div>
);

export default function SimpleLayout() {
  const [collapsed, setCollapsed] = useState(false);
  
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
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
    {
      key: '/system',
      icon: <TeamOutlined />,
      label: '系统管理后台',
    },
    {
      key: '/docs',
      icon: <BookOutlined />,
      label: 'API文档',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    console.log('Menu clicked:', key);
    // 简单的页面切换逻辑
    if (key === '/dashboard') {
      // 显示仪表盘
    }
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
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
          selectedKeys={['/dashboard']}
          items={menuItems}
          onClick={handleMenuClick}
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
              <Text>仪表盘</Text>
            </div>
          </div>
          <div>
            <Space size="middle">
              <Badge count={5} size="small">
                <Button type="text" icon={<BellOutlined />} />
              </Badge>
              <Dropdown 
                menu={{ items: userMenu }} 
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
          <InlineDashboard />
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
