import React, { useState, useEffect, useCallback } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  Card, Table, Button, Space, Modal, Form, Input, Select, Tag, Row, Col,
  Popconfirm, message, Typography, Avatar
} from 'antd';
import {
  UserOutlined, LockOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined
} from '@ant-design/icons';
import { api } from '@/services/api';

const { Text } = Typography;

const UserRole = { ADMIN: 'admin', OPERATOR: 'operator', VIEWER: 'viewer' };
const UserStatus = { ACTIVE: 'active', INACTIVE: 'inactive' };

interface User {
  id: string; username: string; name: string; email: string;
  role: string; department: string; status: string; lastLogin?: string;
}

const mapApiUserToPageUser = (item: any): User => ({
  id: String(item.id),
  username: item.username || 'unknown',
  name: item.fullName || item.username || '未命名用户',
  email: item.email || '',
  role: String(item.role || '').toUpperCase() === 'ADMIN' ? UserRole.ADMIN :
        String(item.role || '').toUpperCase() === 'OPERATOR' ? UserRole.OPERATOR : UserRole.VIEWER,
  department: item.department || '未分配',
  status: item.isActive !== false ? UserStatus.ACTIVE : UserStatus.INACTIVE,
  lastLogin: item.lastLogin || undefined,
});

const SystemPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.user.getUsers({ page: 0, size: 200 });
      const userData = response?.data?.content || response?.content || [];
      setUsers(userData.map(mapApiUserToPageUser));
    } catch (error) {
      console.error('加载用户失败:', error);
      message.error('加载用户失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const showUserModal = (user?: User) => {
    setCurrentUser(user || null);
    setUserModalVisible(true);
    if (user) {
      form.setFieldsValue(user);
    } else {
      form.resetFields();
    }
  };

  const handleSaveUser = (values: any) => {
    if (currentUser) {
      setUsers(users.map(u => u.id === currentUser.id ? { ...u, ...values } : u));
      message.success('用户更新成功');
    } else {
      setUsers([...users, { id: `user-${Date.now()}`, ...values }]);
      message.success('用户创建成功');
    }
    setUserModalVisible(false);
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
    message.success('用户删除成功');
  };

  const userColumns: ColumnsType<User> = [
    {
      title: '用户', key: 'user', width: 200,
      render: (_, r) => (
        <Space>
          <Avatar style={{ backgroundColor: r.role === UserRole.ADMIN ? '#ff4d4f' : '#1890ff' }}>
            {r.username[0].toUpperCase()}
          </Avatar>
          <div>
            <Text strong>{r.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>@{r.username}</Text>
          </div>
        </Space>
      )
    },
    {
      title: '角色', dataIndex: 'role', width: 100,
      render: (role) => <Tag color={role === UserRole.ADMIN ? 'red' : role === UserRole.OPERATOR ? 'blue' : 'green'}>
        {role === UserRole.ADMIN ? '管理员' : role === UserRole.OPERATOR ? '操作员' : '查看者'}
      </Tag>
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (status) => <Tag color={status === UserStatus.ACTIVE ? 'success' : 'default'}>
        {status === UserStatus.ACTIVE ? '活跃' : '未激活'}
      </Tag>
    },
    {
      title: '最后登录', dataIndex: 'lastLogin', width: 150,
      render: (t) => t ? new Date(t).toLocaleString() : '-'
    },
    {
      title: '操作', key: 'actions', width: 120,
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => showUserModal(r)}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDeleteUser(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="用户管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadUsers} loading={loading}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => showUserModal()}>添加用户</Button>
          </Space>
        }
      >
        <Table columns={userColumns} dataSource={users} rowKey="id" loading={loading} />
      </Card>

      <Modal
        title={currentUser ? '编辑用户' : '添加用户'}
        open={userModalVisible}
        onCancel={() => setUserModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveUser}>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="role" label="角色" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value={UserRole.ADMIN}>管理员</Select.Option>
                  <Select.Option value={UserRole.OPERATOR}>操作员</Select.Option>
                  <Select.Option value={UserRole.VIEWER}>查看者</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value={UserStatus.ACTIVE}>活跃</Select.Option>
                  <Select.Option value={UserStatus.INACTIVE}>未激活</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="department" label="部门" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {!currentUser && (
            <Form.Item name="password" label="密码" rules={[{ required: true }]}>
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
          )}
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button onClick={() => setUserModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemPage;
