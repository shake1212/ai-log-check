import React from 'react';
import { Card, Descriptions, Avatar, Button, Space, Typography } from 'antd';
import { UserOutlined, EditOutlined, LogoutOutlined } from '@ant-design/icons';
import { useModel } from '@/utils/useModel';
import { history } from 'umi';

const { Title } = Typography;

const ProfilePage: React.FC = () => {
  const { initialState, setInitialState } = useModel('@@initialState');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setInitialState({});
    history.push('/login');
  };

  const user = initialState?.user || {};

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Avatar size={80} icon={<UserOutlined />} />
          <Title level={3} style={{ marginTop: '16px' }}>
            {user.fullName || user.username}
          </Title>
        </div>

        <Descriptions
          title="个人信息"
          bordered
          column={1}
          extra={
            <Button type="primary" icon={<EditOutlined />}>
              编辑资料
            </Button>
          }
        >
          <Descriptions.Item label="用户名">
            {user.username}
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            {user.email}
          </Descriptions.Item>
          <Descriptions.Item label="角色">
            {user.role === 'ADMIN' ? '管理员' : 
             user.role === 'OPERATOR' ? '操作员' : '观察员'}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            {user.status === 'ACTIVE' ? '正常' : '禁用'}
          </Descriptions.Item>
          <Descriptions.Item label="最后登录">
            {user.lastLoginAt || '从未登录'}
          </Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Space>
            <Button type="primary" icon={<EditOutlined />}>
              修改密码
            </Button>
            <Button danger icon={<LogoutOutlined />} onClick={handleLogout}>
              退出登录
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default ProfilePage;
