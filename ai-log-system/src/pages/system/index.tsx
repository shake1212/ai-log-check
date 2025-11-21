import React, { useState, useEffect, useCallback } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { SortOrder } from 'antd/es/table/interface';

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
  Row,
  Col,
  Tooltip,
  Popconfirm,
  message,
  Badge,
  Descriptions
} from 'antd';

import {
  UserOutlined,
  TeamOutlined,
  LockOutlined,
  AuditOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import request from '@/utils/request';

const { TabPane } = Tabs;

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
  user: string;
  action: string;
  module: string;
  address: string;
  details: string;
}

// 脚本信息接口
interface ScrtInfo {
  key: string;
  name: string;
  descrtion: string;
  cooldownSeconds: number;
  allowManualTrigger: boolean;
}

// 脚本执行记录接口
interface ScrtExecution {
  executionId: string;
  scrtKey: string;
  scrtName?: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  message?: string;
  exitCode?: number;
  args?: string[];
}

// 计划任务状态接口
interface ScheduledTaskStatus {
  taskName: string;
  exists: boolean;
  status?: string;
  nextRunTime?: string;
  lastRunTime?: string;
  lastRunResult?: string;
  trigger?: string;
  taskPath?: string;
  error?: string;
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
  ];
};

// 模拟操作日志数据
const generateMockAuditLogs = (count: number): AuditLog[] => {
  const actions: string[] = ['登录', '查看日志', '修改配置', '处理预警', '创建用户', '删除用户', '修改用户权限'];
  const modules: string[] = ['用户管理', '系统配置', '日志查看', '预警处理', '仪表盘'];
  const users: string[] = ['admin', 'operator1', 'operator2', 'viewer1', 'viewer2'];
  const addresses: string[] = ['192.168.1.1', '10.0.0.5', '172.16.0.10', '192.168.0.15', '10.10.10.10'];

  const pickRandom = (list: string[]): string => {
    if (list.length === 0) {
      return '';
    }
    return list[Math.floor(Math.random() * list.length)];
  };

  return Array.from({ length: count }, (_, i) => {
    const now = new Date();
    const timestamp = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
    const action = pickRandom(actions) || '登录';
    const module = pickRandom(modules) || '用户管理';
    const user = pickRandom(users) || 'admin';
    const address = pickRandom(addresses) || '192.168.1.1';

    return {
      id: `log-${(10000 + i).toString()}`,
      timestamp,
      user,
      action,
      module,
      address,
      details: `用户 ${user} 在 ${module} 模块执行了 ${action} 操作`,
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
  const [scrtList, setScrtList] = useState<ScrtInfo[]>([]);
  const [scrtHistory, setScrtHistory] = useState<ScrtExecution[]>([]);
  const [scrtListLoading, setScrtListLoading] = useState<boolean>(false);
  const [scrtHistoryLoading, setScrtHistoryLoading] = useState<boolean>(false);
  const [runningScrtKey, setRunningScrtKey] = useState<string | null>(null);
  const [latestScrtStatus, setLatestScrtStatus] = useState<Record<string, ScrtExecution>>({});
  const [scrtArgInputs, setScrtArgInputs] = useState<Record<string, string>>({});
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTaskStatus[]>([]);
  const [scheduledTasksLoading, setScheduledTasksLoading] = useState<boolean>(false);

  const scrtRequest = useCallback(<T = any>(
    path: string,
    options?: { method?: 'GET' | 'POST'; data?: any }
  ): Promise<T> => {
    return request({
      url: `/scripts${path}`,
      method: options?.method ?? 'GET',
      data: options?.data,
    });
  }, []);

  const loadScrts = useCallback(async () => {
    try {
      setScrtListLoading(true);
      const response = await scrtRequest<ScrtInfo[]>('/available');
      setScrtList(response || []);
    } catch (error) {
      message.error('获取脚本列表失败');
    } finally {
      setScrtListLoading(false);
    }
  }, [scrtRequest]);

  const processScrtHistory = (records: ScrtExecution[]) => {
    const sorted = [...records].sort((a, b) => {
      const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return bTime - aTime;
    });

    const statusMap: Record<string, ScrtExecution> = {};
    sorted.forEach((record) => {
      if (!statusMap[record.scrtKey]) {
        statusMap[record.scrtKey] = record;
      }
    });

    setScrtHistory(sorted);
    setLatestScrtStatus(statusMap);
  };

  const loadScrtHistory = useCallback(async () => {
    try {
      setScrtHistoryLoading(true);
      const response = await scrtRequest<ScrtExecution[]>('/history');
      processScrtHistory(response || []);
    } catch (error) {
      message.error('获取脚本历史失败');
    } finally {
      setScrtHistoryLoading(false);
    }
  }, [scrtRequest]);

  const loadScheduledTasks = useCallback(async () => {
    try {
      setScheduledTasksLoading(true);
      const response = await scrtRequest<ScheduledTaskStatus[]>('/scheduled-tasks');
      setScheduledTasks(response || []);
    } catch (error) {
      message.error('获取计划任务状态失败');
    } finally {
      setScheduledTasksLoading(false);
    }
  }, [scrtRequest]);

  useEffect(() => {
    setLoading(true);
    const mockTimer = setTimeout(() => {
      const mockUsers = generateMockUsers();
      const mockLogs = generateMockAuditLogs(50);
      setUsers(mockUsers);
      setAuditLogs(mockLogs);
      setLoading(false);
    }, 1000);

    loadScrts();
    loadScrtHistory();
    loadScheduledTasks();

    const historyInterval = setInterval(() => {
      loadScrtHistory();
      loadScheduledTasks();
    }, 15000);

    return () => {
      clearTimeout(mockTimer);
      clearInterval(historyInterval);
    };
  }, [loadScrts, loadScrtHistory]);

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

  const handleSaveUser = (values: any) => {
    if (currentUser) {
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
      const newUser: User = {
        id: `user-${Date.now().toString(36)}`,
        ...values
      };
      setUsers([...users, newUser]);
      message.success('用户创建成功');
    }

    setUserModalVisible(false);
  };

  const handleDeleteUser = (userId: string) => {
    const updatedUsers = users.filter(user => user.id !== userId);
    setUsers(updatedUsers);
    message.success('用户删除成功');
  };

  const updateScrtArgsInput = (key: string, value: string) => {
    setScrtArgInputs(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const getScrtArgs = (key: string) => {
    const raw = scrtArgInputs[key]?.trim();
    if (!raw) {
      return [];
    }
    return raw.split(/\s+/).filter(Boolean);
  };

  const handleRunScrt = async (scrtKey: string) => {
    try {
      setRunningScrtKey(scrtKey);
      const args = getScrtArgs(scrtKey);
      const response = await scrtRequest('/run', {
        method: 'POST',
        data: { scrtKey, args },
      });
      const payload = response || {};
      const status = payload?.status || 'RUNNING';
      const msg = payload?.message || (status === 'RUNNING' ? '脚本已触发' : '操作完成');

      if (status === 'BUSY' || status === 'COOLDOWN') {
        message.warning(msg);
      } else if (status === 'FAILED') {
        message.error(msg);
      } else {
        message.success(msg);
      }
      await loadScrtHistory();
      setTimeout(() => {
        loadScrtHistory();
      }, 3000);
    } catch (error) {
      message.error('脚本执行失败，请稍后再试');
    } finally {
      setRunningScrtKey(null);
    }
  };

  const renderScrtStatus = (status?: string) => {
    const upper = status ? status.toUpperCase() : 'UNKNOWN';
    let color: string;
    switch (upper) {
      case 'SUCCESS':
        color = 'green';
        break;
      case 'FAILED':
        color = 'red';
        break;
      case 'RUNNING':
        color = 'blue';
        break;
      case 'BUSY':
      case 'COOLDOWN':
        color = 'orange';
        break;
      default:
        color = 'default';
    }
    return <Tag color={color}>{upper}</Tag>;
  };

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

  const userColumns: ColumnsType<User> = [
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
      onFilter: (value, record) => record.role === (value as string),
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
      onFilter: (value, record) => record.status === (value as string),
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
      key: 'actions',
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

  const auditLogColumns: ColumnsType<AuditLog> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (text: string) => new Date(text).toLocaleString(),
      sorter: (a: AuditLog, b: AuditLog) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: 'descend' as SortOrder,
    },
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
      filters: [
        { text: 'admin', value: 'admin' },
        { text: 'operator1', value: 'operator1' },
        { text: 'operator2', value: 'operator2' },
        { text: 'viewer1', value: 'viewer1' },
        { text: 'viewer2', value: 'viewer2' },
      ],
      onFilter: (value, record) => record.user === (value as string),
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
      onFilter: (value, record) => record.action === (value as string),
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
      onFilter: (value, record) => record.module === (value as string),
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      ellipsis: true,
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
    },
  ];

  const scrtColumns: ColumnsType<ScrtInfo> = [
    {
      title: '脚本名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'descrtion',
      key: 'descrtion',
      ellipsis: true,
    },
    {
      title: '自定义参数',
      key: 'customArgs',
      render: (_: any, record: ScrtInfo) => (
        <Input
          placeholder="以空格分隔，留空表示使用默认参数"
          value={scrtArgInputs[record.key] || ''}
          onChange={(e) => updateScrtArgsInput(record.key, e.target.value)}
          allowClear
        />
      ),
    },
    {
      title: '冷却时间',
      dataIndex: 'cooldownSeconds',
      key: 'cooldownSeconds',
      render: (seconds: number) => {
        if (!seconds) return '无';
        if (seconds < 60) {
          return `${seconds} 秒`;
        }
        return `${Math.round(seconds / 60)} 分钟`;
      },
    },
    {
      title: '当前状态',
      key: 'status',
      render: (_: any, record: ScrtInfo) => {
        const status = latestScrtStatus[record.key];
        if (!status) {
          return <Tag color="default">未执行</Tag>;
        }
        return (
          <div>
            {renderScrtStatus(status.status)}
            <div style={{ fontSize: 12, color: '#999' }}>
              {status.message || '无状态信息'}
              {status.startedAt && ` · ${new Date(status.startedAt).toLocaleString()}`}
            </div>
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: ScrtInfo) => (
        <Tooltip
          title={
            !record.allowManualTrigger
              ? '脚本禁止手动触发'
              : latestScrtStatus[record.key]?.status?.toUpperCase() === 'RUNNING' && !latestScrtStatus[record.key]?.finishedAt
                ? '脚本正在运行，请稍后再试'
                : undefined
          }
        >
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={runningScrtKey === record.key}
            onClick={() => handleRunScrt(record.key)}
            disabled={
              !record.allowManualTrigger ||
              (latestScrtStatus[record.key]?.status?.toUpperCase() === 'RUNNING' && !latestScrtStatus[record.key]?.finishedAt)
            }
          >
            立即执行
          </Button>
        </Tooltip>
      ),
    },
  ];

  const scrtHistoryColumns: ColumnsType<ScrtExecution> = [
    {
      title: '脚本',
      dataIndex: 'scrtName',
      key: 'scrtName',
      render: (_: any, record: ScrtExecution) => record.scrtName || record.scrtKey,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => renderScrtStatus(status),
    },
    {
      title: '参数',
      dataIndex: 'args',
      key: 'args',
      render: (args?: string[]) => (args && args.length > 0 ? args.join(' ') : '-'),
    },
    {
      title: '开始时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (text?: string) => (text ? new Date(text).toLocaleString() : '-'),
    },
    {
      title: '结束时间',
      dataIndex: 'finishedAt',
      key: 'finishedAt',
      render: (text?: string) => (text ? new Date(text).toLocaleString() : '-'),
    },
    {
      title: '退出码',
      dataIndex: 'exitCode',
      key: 'exitCode',
      render: (code?: number) => (code ?? '-'),
    },
    {
      title: '信息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
  ];

  return (
    <div>
      <h2>系统管理后台</h2>

      <Card
        title="采集脚本控制"
        style={{ marginBottom: 24 }}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadScrts} loading={scrtListLoading}>
              刷新脚本
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadScrtHistory} loading={scrtHistoryLoading}>
              刷新历史
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadScheduledTasks} loading={scheduledTasksLoading}>
              刷新计划任务
            </Button>
          </Space>
        }
      >
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <Card type="inner" title="可用脚本">
              <Table
                columns={scrtColumns}
                dataSource={scrtList}
                rowKey="key"
                loading={scrtListLoading}
                pagination={false}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12} style={{ marginTop: 16, height: '100%' }}>
            <Card type="inner" title="最近执行记录">
              <Table
                columns={scrtHistoryColumns}
                dataSource={scrtHistory}
                rowKey={(record) => record.executionId || `${record.scrtKey}-${record.startedAt}`}
                loading={scrtHistoryLoading}
                pagination={{ pageSize: 5 }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card
        title="计划任务状态"
        style={{ marginBottom: 24 }}
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadScheduledTasks} loading={scheduledTasksLoading}>
            刷新
          </Button>
        }
      >
        {scheduledTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            {scheduledTasksLoading ? '加载中...' : '暂无计划任务信息'}
          </div>
        ) : (
          <Row gutter={16}>
            {scheduledTasks.map((task) => (
              <Col xs={24} lg={12} key={task.taskName} style={{ marginBottom: 16 }}>
                <Card
                  type="inner"
                  title={task.taskName}
                  extra={
                    <Tag color={task.exists ? (task.status === 'Ready' ? 'green' : task.status === 'Running' ? 'blue' : 'orange') : 'red'}>
                      {task.exists ? (task.status || '未知') : '不存在'}
                    </Tag>
                  }
                >
                  {task.error ? (
                    <div style={{ color: '#ff4d4f' }}>{task.error}</div>
                  ) : (
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="状态">
                        {task.exists ? (
                          <Tag color={task.status === 'Ready' ? 'green' : task.status === 'Running' ? 'blue' : 'orange'}>
                            {task.status || '未知'}
                          </Tag>
                        ) : (
                          <Tag color="red">任务不存在</Tag>
                        )}
                      </Descriptions.Item>
                      {task.trigger && (
                        <Descriptions.Item label="触发器">{task.trigger}</Descriptions.Item>
                      )}
                      {task.nextRunTime && (
                        <Descriptions.Item label="下次运行时间">
                          {new Date(task.nextRunTime).toLocaleString()}
                        </Descriptions.Item>
                      )}
                      {task.lastRunTime && (
                        <Descriptions.Item label="上次运行时间">
                          {new Date(task.lastRunTime).toLocaleString()}
                        </Descriptions.Item>
                      )}
                      {task.lastRunResult && (
                        <Descriptions.Item label="上次运行结果">
                          <Tag color={task.lastRunResult === 'Success' ? 'green' : 'red'}>
                            {task.lastRunResult}
                          </Tag>
                        </Descriptions.Item>
                      )}
                      {task.taskPath && (
                        <Descriptions.Item label="任务路径">
                          <Tooltip title={task.taskPath}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                              {task.taskPath}
                            </span>
                          </Tooltip>
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>
      
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