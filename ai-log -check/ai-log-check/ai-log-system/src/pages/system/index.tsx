import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tabs,
  Tag,
  Switch,
  Divider,
  Typography,
  Row,
  Col,
  Tooltip,
  Popconfirm,
  message,
  Badge
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  LockOutlined,
  AuditOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

const { TabPane } = Tabs;
const { Title } = Typography;

// 用户角色枚举
const UserRole = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
};

// 用户状态枚举
const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  LOCKED: 'locked'
};

// 用户数据接口
interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  lastLogin?: string;
}

// 操作日志接口
interface AuditLog {
  id: string;
  timestamp: string;
  username: string;
  action: string;
  module: string;
  details: string;
  ip: string;
}

// 模拟用户数据
const generateMockUsers = (): User[] => {
  return [
    {
      id: 'user-001',
      username: 'admin',
      name: '系统管理员',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      department: '信息安全部',
      status: UserStatus.ACTIVE,
      lastLogin: new Date().toISOString()
    },
    {
      id: 'user-002',
      username: 'operator1',
      name: '安全运维员1',
      email: 'operator1@example.com',
      role: UserRole.OPERATOR,
      department: '网络安全部',
      status: UserStatus.ACTIVE,
      lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'user-003',
      username: 'viewer1',
      name: '安全分析师1',
      email: 'viewer1@example.com',
      role: UserRole.VIEWER,
      department: '安全运营中心',
      status: UserStatus.ACTIVE,
      lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'user-004',
      username: 'operator2',
      name: '安全运维员2',
      email: 'operator2@example.com',
      role: UserRole.OPERATOR,
      department: '网络安全部',
      status: UserStatus.INACTIVE,
      lastLogin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'user-005',
      username: 'viewer2',
      name: '安全分析师2',
      email: 'viewer2@example.com',
      role: UserRole.VIEWER,
      department: '安全运营中心',
      status: UserStatus.LOCKED,
      lastLogin: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
};

// 模拟操作日志数据
const generateMockAuditLogs = (count: number): AuditLog[] => {
  const actions = ['登录', '查看日志', '修改配置', '处理预警', '创建用户', '删除用户', '修改用户权限'];
  const modules = ['用户管理', '系统配置', '日志查看', '预警处理', '仪表盘'];
  const usernames = ['admin', 'operator1', 'operator2', 'viewer1', 'viewer2'];
  const ips = ['192.168.1.1', '10.0.0.5', '172.16.0.10', '192.168.0.15', '10.10.10.10'];
  
  return Array.from({ length: count }, (_, i) => {
    const now = new Date();
    const timestamp = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
    const username = usernames[Math.floor(Math.random() * usernames.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const module = modules[Math.floor(Math.random() * modules.length)];
    const ip = ips[Math.floor(Math.random() * ips.length)];
    
    return {
      id: `log-${(10000 + i).toString()}`,
      timestamp,
      username,
      action,
      module,
      details: `用户 ${username} 在 ${module} 模块执行了 ${action} 操作`,
      ip
    };
  });
};

const SystemPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userModalVisible, setUserModalVisible] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  
  // 加载数据
  useEffect(() => {
    setLoading(true);
    // 模拟API请求延迟
    setTimeout(() => {
      const mockUsers = generateMockUsers();
      const mockLogs = generateMockAuditLogs(50);
      setUsers(mockUsers);
      setAuditLogs(mockLogs);
      setLoading(false);
    }, 1000);
  }, []);
  
  // 添加/编辑用户
  const showUserModal = (user?: User) => {
    setCurrentUser(user || null);
    setUserModalVisible(true);
    
    if (user) {
      form.setFieldsValue({
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        status: user.status
      });
    } else {
      form.resetFields();
    }
  };
  
  // 保存用户
  const handleSaveUser = (values: any) => {
    if (currentUser) {
      // 更新用户
      const updatedUsers = users.map(user => {
        if (user.id === currentUser.id) {
          return {
            ...user,
            ...values
          };
        }
        return user;
      });
      setUsers(updatedUsers);
      message.success('用户信息更新成功');
    } else {
      // 添加新用户
      const newUser: User = {
        id: `user-${Date.now().toString(36)}`,
        ...values
      };
      setUsers([...users, newUser]);
      message.success('用户创建成功');
    }
    
    setUserModalVisible(false);
  };
  
  // 删除用户
  const handleDeleteUser = (userId: string) => {
    const updatedUsers = users.filter(user => user.id !== userId);
    setUsers(updatedUsers);
    message.success('用户删除成功');
  };
  
  // 渲染用户状态标签
  const renderUserStatus = (status: string) => {
    switch (status) {
      case UserStatus.ACTIVE:
        return <Badge status="success" text="活跃" />;
      case UserStatus.INACTIVE:
        return <Badge status="default" text="未激活" />;
      case UserStatus.LOCKED:
        return <Badge status="error" text="锁定" />;
      default:
        return <Badge status="default" text="未知" />;
    }
  };
  
  // 渲染用户角色标签
  const renderUserRole = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return <Tag color="red">管理员</Tag>;
      case UserRole.OPERATOR:
        return <Tag color="blue">操作员</Tag>;
      case UserRole.VIEWER:
        return <Tag color="green">查看者</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };
  
  // 用户表格列定义
  const userColumns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: renderUserRole,
      filters: [
        { text: '管理员', value: UserRole.ADMIN },
        { text: '操作员', value: UserRole.OPERATOR },
        { text: '查看者', value: UserRole.VIEWER },
      ],
      onFilter: (value: string, record: User) => record.role === value,
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: renderUserStatus,
      filters: [
        { text: '活跃', value: UserStatus.ACTIVE },
        { text: '未激活', value: UserStatus.INACTIVE },
        { text: '锁定', value: UserStatus.LOCKED },
      ],
      onFilter: (value: string, record: User) => record.status === value,
    },
    {
      title: '最后登录',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      render: (text?: string) => text ? new Date(text).toLocaleString() : '从未登录',
      sorter: (a: User, b: User) => {
        if (!a.lastLogin) return 1;
        if (!b.lastLogin) return -1;
        return new Date(a.lastLogin).getTime() - new Date(b.lastLogin).getTime();
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => showUserModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此用户吗？"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              size="small" 
              danger 
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  
  // 操作日志表格列定义
  const auditLogColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (text: string) => new Date(text).toLocaleString(),
      sorter: (a: AuditLog, b: AuditLog) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      filters: [
        { text: 'admin', value: 'admin' },
        { text: 'operator1', value: 'operator1' },
        { text: 'operator2', value: 'operator2' },
        { text: 'viewer1', value: 'viewer1' },
        { text: 'viewer2', value: 'viewer2' },
      ],
      onFilter: (value: string, record: AuditLog) => record.username === value,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      filters: [
        { text: '登录', value: '登录' },
        { text: '查看日志', value: '查看日志' },
        { text: '修改配置', value: '修改配置' },
        { text: '处理预警', value: '处理预警' },
        { text: '创建用户', value: '创建用户' },
        { text: '删除用户', value: '删除用户' },
        { text: '修改用户权限', value: '修改用户权限' },
      ],
      onFilter: (value: string, record: AuditLog) => record.action === value,
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      filters: [
        { text: '用户管理', value: '用户管理' },
        { text: '系统配置', value: '系统配置' },
        { text: '日志查看', value: '日志查看' },
        { text: '预警处理', value: '预警处理' },
        { text: '仪表盘', value: '仪表盘' },
      ],
      onFilter: (value: string, record: AuditLog) => record.module === value,
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      ellipsis: true,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
    },
  ];
  
  return (
    <div>
      <h2>系统管理后台</h2>
      
      <Tabs defaultActiveKey="users">
        <TabPane 
          tab={<span><TeamOutlined />用户管理</span>} 
          key="users"
        >
          <Card
            title="用户列表"
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => showUserModal()}
              >
                添加用户
              </Button>
            }
          >
            <Table 
              columns={userColumns} 
              dataSource={users} 
              rowKey="id"
              loading={loading}
              pagination={{ showSizeChanger: true }}
            />
          </Card>
        </TabPane>
        
        <TabPane 
          tab={<span><AuditOutlined />操作审计</span>} 
          key="audit"
        >
          <Card title="操作日志">
            <Table 
              columns={auditLogColumns} 
              dataSource={auditLogs} 
              rowKey="id"
              loading={loading}
              pagination={{ 
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条操作记录`
              }}
            />
          </Card>
        </TabPane>
      </Tabs>
      
      {/* 用户表单弹窗 */}
      <Modal
        title={currentUser ? '编辑用户' : '添加用户'}
        open={userModalVisible}
        onCancel={() => setUserModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveUser}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="姓名" />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="邮箱" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="角色"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select placeholder="选择角色">
                  <Select.Option value={UserRole.ADMIN}>管理员</Select.Option>
                  <Select.Option value={UserRole.OPERATOR}>操作员</Select.Option>
                  <Select.Option value={UserRole.VIEWER}>查看者</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="选择状态">
                  <Select.Option value={UserStatus.ACTIVE}>活跃</Select.Option>
                  <Select.Option value={UserStatus.INACTIVE}>未激活</Select.Option>
                  <Select.Option value={UserStatus.LOCKED}>锁定</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="department"
            label="部门"
            rules={[{ required: true, message: '请输入部门' }]}
          >
            <Input placeholder="部门" />
          </Form.Item>
          
          {!currentUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>
          )}
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => setUserModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemPage; 