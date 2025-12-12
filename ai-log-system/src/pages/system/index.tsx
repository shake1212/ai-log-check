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
  Descriptions,
  Statistic,
  Progress,
  Typography,
  Divider,
  Avatar,
  Dropdown,
  Switch,
  Timeline,
  Segmented
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
  PlayCircleOutlined,
  SettingOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  SecurityScanOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  ExportOutlined,
  CodeOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  BellOutlined,
 
  DatabaseOutlined,
  CloudServerOutlined,
  RocketOutlined,
  FireOutlined,
  ExclamationCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  QuestionCircleOutlined,
  GlobalOutlined,
  EyeOutlined,
  KeyOutlined
} from '@ant-design/icons';
import { api, type ScriptDescriptor, type ScriptExecutionRecord, type ScheduledTaskStatus } from '@/services/api';

const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;

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
  avatar?: string;
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

// 脚本信息接口 - 使用从 api.ts 导入的类型
type ScrtInfo = ScriptDescriptor;

// 脚本执行记录接口 - 使用从 api.ts 导入的类型
type ScrtExecution = ScriptExecutionRecord;

// 颜色常量
const LEVEL_COLORS = {
  SUCCESS: '#52c41a',
  FAILED: '#ff4d4f',
  RUNNING: '#1890ff',
  BUSY: '#fa8c16',
  COOLDOWN: '#faad14',
  DEFAULT: '#d9d9d9'
};

const ROLE_COLORS = {
  ADMIN: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
  OPERATOR: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
  VIEWER: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)'
};

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
      lastLogin: new Date().toISOString(),
      avatar: 'A'
    },
    {
      id: 'user-002',
      username: 'operator1',
      name: '安全运维员1',
      email: 'operator1@example.com',
      role: UserRole.OPERATOR,
      department: '网络安全部',
      status: UserStatus.ACTIVE,
      lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      avatar: 'O'
    },
    {
      id: 'user-003',
      username: 'viewer1',
      name: '安全分析师1',
      email: 'viewer1@example.com',
      role: UserRole.VIEWER,
      department: '安全运营中心',
      status: UserStatus.ACTIVE,
      lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      avatar: 'V'
    },
    {
      id: 'user-004',
      username: 'operator2',
      name: '安全运维员2',
      email: 'operator2@example.com',
      role: UserRole.OPERATOR,
      department: '网络安全部',
      status: UserStatus.ACTIVE,
      lastLogin: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      avatar: 'O'
    },
    {
      id: 'user-005',
      username: 'viewer2',
      name: '安全分析师2',
      email: 'viewer2@example.com',
      role: UserRole.VIEWER,
      department: '安全运营中心',
      status: UserStatus.INACTIVE,
      lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      avatar: 'V'
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
  const [activeTab, setActiveTab] = useState('users');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const loadScrts = useCallback(async () => {
    try {
      setScrtListLoading(true);
      const response = await api.script.getAvailableScripts();
      setScrtList(response.data || []);
    } catch (error) {
      message.error('获取脚本列表失败');
      console.error('获取脚本列表失败:', error);
    } finally {
      setScrtListLoading(false);
    }
  }, []);

  const processScrtHistory = (records: ScrtExecution[]) => {
    const sorted = [...records].sort((a, b) => {
      const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return bTime - aTime;
    });

    const statusMap: Record<string, ScrtExecution> = {};
    sorted.forEach((record) => {
      if (!statusMap[record.scriptKey]) {
        statusMap[record.scriptKey] = record;
      }
    });

    setScrtHistory(sorted);
    setLatestScrtStatus(statusMap);
  };

  const loadScrtHistory = useCallback(async () => {
    try {
      setScrtHistoryLoading(true);
      const response = await api.script.getHistory();
      processScrtHistory(response.data || []);
    } catch (error) {
      message.error('获取脚本历史失败');
      console.error('获取脚本历史失败:', error);
    } finally {
      setScrtHistoryLoading(false);
    }
  }, []);

  const loadScheduledTasks = useCallback(async () => {
    try {
      setScheduledTasksLoading(true);
      const response = await api.script.getScheduledTasks();
      setScheduledTasks(response.data || []);
    } catch (error) {
      message.error('获取计划任务状态失败');
      console.error('获取计划任务状态失败:', error);
    } finally {
      setScheduledTasksLoading(false);
    }
  }, []);

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
  }, [loadScrts, loadScrtHistory, loadScheduledTasks]);

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

  const handleRunScrt = async (scriptKey: string) => {
    try {
      setRunningScrtKey(scriptKey);
      const args = getScrtArgs(scriptKey);
      const response = await api.script.runScript({ 
        scriptKey, 
        args 
      });
      
      const payload = response.data;
      if (!payload) {
        message.error('脚本执行响应为空');
        return;
      }
      
      const status = payload.status || 'RUNNING';
      const msg = payload.message || (status === 'RUNNING' ? '脚本已触发' : '操作完成');

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
    } catch (error: any) {
      console.error('脚本执行失败:', error);
      const errorMsg = error.response?.data?.message || error.message || '脚本执行失败，请稍后再试';
      message.error(errorMsg);
    } finally {
      setRunningScrtKey(null);
    }
  };

  const renderScrtStatus = (status?: string) => {
    const upper = status ? status.toUpperCase() : 'UNKNOWN';
    let color: string;
    let icon;
    switch (upper) {
      case 'SUCCESS':
        color = '#52c41a';
        icon = <CheckCircleOutlined />;
        break;
      case 'FAILED':
        color = '#ff4d4f';
        icon = <ExclamationCircleOutlined />;
        break;
      case 'RUNNING':
        color = '#1890ff';
        icon = <ThunderboltOutlined />;
        break;
      case 'BUSY':
      case 'COOLDOWN':
        color = '#fa8c16';
        icon = <WarningOutlined />;
        break;
      default:
        color = '#d9d9d9';
        icon = <ClockCircleOutlined />;
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 6px ${color}`
        }} />
        {icon}
        <span style={{ fontSize: '12px', fontWeight: 500 }}>
          {upper}
        </span>
      </div>
    );
  };

  const renderUserStatus = (status: string) => {
    const config = {
      [UserStatus.ACTIVE]: { color: '#52c41a', text: '活跃', icon: <CheckCircleOutlined /> },
      [UserStatus.INACTIVE]: { color: '#d9d9d9', text: '未激活', icon: <ClockCircleOutlined /> },
      [UserStatus.LOCKED]: { color: '#ff4d4f', text: '锁定', icon: <LockOutlined /> },
    };
    
    const cfg = config[status] || { color: '#d9d9d9', text: '未知', icon: <ClockCircleOutlined /> };
    
    return (
      <div style={{
        padding: '3px 10px',
        borderRadius: '20px',
        background: `rgba(${cfg.color === '#52c41a' ? '82,196,26' : cfg.color === '#ff4d4f' ? '255,77,79' : '217,217,217'}, 0.1)`,
        border: `1px solid ${cfg.color}`,
        color: cfg.color,
        fontSize: '11px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        justifyContent: 'center'
      }}>
        {cfg.icon}
        {cfg.text}
      </div>
    );
  };

  const renderUserRole = (role: string, record: User) => {
    const config = {
      [UserRole.ADMIN]: { color: '#ff4d4f', text: '管理员', gradient: ROLE_COLORS.ADMIN },
      [UserRole.OPERATOR]: { color: '#1890ff', text: '操作员', gradient: ROLE_COLORS.OPERATOR, icon: <SettingOutlined /> },
      [UserRole.VIEWER]: { color: '#52c41a', text: '查看者', gradient: ROLE_COLORS.VIEWER, icon: <EyeOutlined /> },
    };
    
    const cfg = config[role] || { color: '#d9d9d9', text: '未知', gradient: '#d9d9d9', icon: <UserOutlined /> };
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          background: cfg.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px'
        }}>
          {cfg.icon}
        </div>
        <div>
          <Text strong style={{ fontSize: '12px' }}>{cfg.text}</Text>
          <div style={{ fontSize: '10px', color: '#666' }}>
            {record.department}
          </div>
        </div>
      </div>
    );
  };

  const userColumns: ColumnsType<User> = [
    {
      title: '用户信息',
      key: 'userInfo',
      width: 200,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar
            size={40}
            style={{
              background: ROLE_COLORS[record.role as keyof typeof ROLE_COLORS] || '#d9d9d9',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {record.avatar || record.username.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: '13px', display: 'block' }}>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>@{record.username}</Text>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: '角色权限',
      dataIndex: 'role',
      key: 'role',
      width: 150,
      render: (role, record) => renderUserRole(role, record),
      filters: [
        { text: '管理员', value: UserRole.ADMIN },
        { text: '操作员', value: UserRole.OPERATOR },
        { text: '查看者', value: UserRole.VIEWER },
      ],
      onFilter: (value, record) => record.role === (value as string),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
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
      width: 150,
      render: (text?: string) => (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500 }}>
            {text ? new Date(text).toLocaleDateString() : '从未登录'}
          </div>
          {text && (
            <div style={{ fontSize: '11px', color: '#666' }}>
              {new Date(text).toLocaleTimeString()}
            </div>
          )}
        </div>
      ),
      sorter: (a: User, b: User) => {
        if (!a.lastLogin) return 1;
        if (!b.lastLogin) return -1;
        return new Date(a.lastLogin).getTime() - new Date(b.lastLogin).getTime();
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: User) => (
        <Space size="small">
          <Tooltip title="编辑用户">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => showUserModal(record)}
              style={{ fontSize: '12px' }}
            >
              编辑
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定要删除此用户吗？"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除用户">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                style={{ fontSize: '12px' }}
              >
                删除
              </Button>
            </Tooltip>
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
      width: 160,
      render: (text: string) => (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500 }}>
            {new Date(text).toLocaleDateString()}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {new Date(text).toLocaleTimeString()}
          </div>
        </div>
      ),
      sorter: (a: AuditLog, b: AuditLog) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: 'descend' as SortOrder,
    },
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
      width: 100,
      render: (user: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Avatar size="small" style={{ background: '#1890ff', fontSize: '10px' }}>
            {user.charAt(0).toUpperCase()}
          </Avatar>
          <span style={{ fontSize: '12px' }}>{user}</span>
        </div>
      ),
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
      width: 100,
      render: (action: string) => (
        <Tag color={
          action === '登录' ? 'green' :
          action.includes('查看') ? 'blue' :
          action.includes('修改') ? 'orange' :
          action.includes('处理') ? 'purple' :
          action.includes('创建') ? 'cyan' :
          action.includes('删除') ? 'red' : 'default'
        } style={{ fontSize: '11px', padding: '2px 8px' }}>
          {action}
        </Tag>
      ),
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
      width: 100,
      render: (module: string) => (
        <div style={{
          padding: '2px 8px',
          borderRadius: '12px',
          background: 'rgba(24, 144, 255, 0.1)',
          fontSize: '11px',
          textAlign: 'center'
        }}>
          {module}
        </div>
      ),
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
      width: 200,
      ellipsis: true,
      render: (details: string) => (
        <div style={{ fontSize: '12px' }}>{details}</div>
      )
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      width: 120,
      render: (address: string) => (
        <Tag style={{ fontSize: '11px', padding: '2px 6px' }}>{address}</Tag>
      ),
    },
  ];

  const scrtColumns: ColumnsType<ScrtInfo> = [
    {
      title: '脚本信息',
      key: 'scriptInfo',
      width: 200,
      render: (_, record) => (
        <div>
          <Text strong style={{ fontSize: '13px', display: 'block' }}>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>{record.description}</Text>
        </div>
      ),
    },
    {
      title: '自定义参数',
      key: 'customArgs',
      width: 200,
      render: (_: any, record: ScrtInfo) => (
        <Input
          placeholder="以空格分隔，留空表示使用默认参数"
          value={scrtArgInputs[record.key] || ''}
          onChange={(e) => updateScrtArgsInput(record.key, e.target.value)}
          allowClear
          style={{ height: '36px' }}
        />
      ),
    },
    {
      title: '冷却时间',
      dataIndex: 'cooldownSeconds',
      key: 'cooldownSeconds',
      width: 120,
      render: (seconds: number) => {
        if (!seconds) return '无';
        if (seconds < 60) {
          return <Tag color="blue">{seconds} 秒</Tag>;
        }
        return <Tag color="orange">{Math.round(seconds / 60)} 分钟</Tag>;
      },
    },
    {
      title: '当前状态',
      key: 'status',
      width: 150,
      render: (_: any, record: ScrtInfo) => {
        const status = latestScrtStatus[record.key];
        if (!status) {
          return <Tag color="default">未执行</Tag>;
        }
        return (
          <div>
            {renderScrtStatus(status.status)}
            {status.startedAt && (
              <div style={{ fontSize: 11, color: '#999', marginTop: '4px' }}>
                {new Date(status.startedAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
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
            size="small"
            style={{ fontSize: '12px' }}
          >
            执行
          </Button>
        </Tooltip>
      ),
    },
  ];

  const scrtHistoryColumns: ColumnsType<ScrtExecution> = [
    {
      title: '脚本',
      dataIndex: 'scriptName',
      key: 'scriptName',
      width: 150,
      render: (_: any, record: ScrtExecution) => (
        <div>
          <Text strong style={{ fontSize: '12px', display: 'block' }}>
            {record.scriptName || record.scriptKey}
          </Text>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            {record.triggerType || '手动'}
          </Text>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => renderScrtStatus(status),
    },
    {
      title: '时间',
      key: 'time',
      width: 180,
      render: (_: any, record: ScrtExecution) => (
        <div>
          <div style={{ fontSize: '11px' }}>
            开始: {record.startedAt ? new Date(record.startedAt).toLocaleTimeString() : '-'}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            结束: {record.finishedAt ? new Date(record.finishedAt).toLocaleTimeString() : '运行中'}
          </div>
        </div>
      ),
    },
    {
      title: '参数',
      dataIndex: 'args',
      key: 'args',
      width: 150,
      render: (args?: string[]) => (args && args.length > 0 ? args.join(' ') : '-'),
    },
    {
      title: '退出码',
      dataIndex: 'exitCode',
      key: 'exitCode',
      width: 80,
      render: (code?: number) => (
        <Tag color={code === 0 ? 'green' : code !== undefined ? 'red' : 'default'}>
          {code ?? '-'}
        </Tag>
      ),
    },
    {
      title: '输出摘要',
      dataIndex: 'outputSnippet',
      key: 'outputSnippet',
      width: 150,
      ellipsis: true,
      render: (text?: string) => (
        <Tooltip title={text}>
          <span style={{ fontSize: '11px' }}>{text || '-'}</span>
        </Tooltip>
      ),
    },
  ];

  // 渲染顶部标题
  const renderDashboardHeader = () => (
    <div style={{
      marginBottom: '32px',
      padding: '32px',
      background: 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)',
      borderRadius: '20px',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(26, 41, 128, 0.2)'
    }}>
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '300px',
        height: '300px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '50%'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-100px',
        left: '-100px',
        width: '400px',
        height: '400px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '50%'
      }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <SettingOutlined style={{ fontSize: '40px' }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: 'white' }}>
              系统管理中心
            </Title>
            <Paragraph style={{ 
              margin: '8px 0 0 0', 
              color: 'rgba(255,255,255,0.9)',
              fontSize: '16px',
              maxWidth: '600px'
            }}>
              用户管理 · 权限控制 · 脚本调度 · 系统审计
            </Paragraph>
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          padding: '16px 24px',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#52c41a',
              boxShadow: '0 0 10px #52c41a'
            }} />
            <Text style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
              系统状态: 正常
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
              • 在线用户: {users.filter(u => u.status === UserStatus.ACTIVE).length}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染操作栏
  const renderControlBar = () => (
    <Card 
      style={{ 
        marginBottom: '32px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.06)'
      }}
      bodyStyle={{ padding: '20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <Tabs 
            activeKey={activeTab}
            onChange={setActiveTab}
            size="large"
            style={{ minWidth: '400px' }}
          >
            <TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TeamOutlined />
                  用户管理
                  <Badge count={users.length} style={{ backgroundColor: '#1890ff' }} />
                </span>
              } 
              key="users" 
            />
            <TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DatabaseOutlined />
                  脚本控制
                  <Badge count={scrtList.length} style={{ backgroundColor: '#fa8c16' }} />
                </span>
              } 
              key="scripts" 
            />
            <TabPane 
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AuditOutlined />
                  系统审计
                  <Badge count={auditLogs.length} style={{ backgroundColor: '#52c41a' }} />
                </span>
              } 
              key="audit" 
            />
          </Tabs>
        </div>
        <div>
          <Space size="large" wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadScrts();
                loadScrtHistory();
                loadScheduledTasks();
              }}
              shape="round"
              size="large"
              style={{ height: '44px', padding: '0 20px' }}
            >
              刷新所有
            </Button>
            
            <Button
              icon={<FullscreenOutlined />}
              onClick={() => setIsFullscreen(!isFullscreen)}
              shape="round"
              size="large"
              style={{ height: '44px', padding: '0 20px' }}
            >
              全屏模式
            </Button>

            {activeTab === 'users' && (
              <Button 
                type="primary"
                icon={<PlusOutlined />} 
                onClick={() => showUserModal()}
                shape="round"
                size="large"
                style={{ 
                  background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                  border: 'none',
                  height: '44px',
                  padding: '0 20px'
                }}
              >
                添加用户
              </Button>
            )}
          </Space>
        </div>
      </div>
    </Card>
  );

  // 渲染核心指标卡片
  const renderCoreMetrics = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
      {/* 用户统计卡片 */}
      <Card 
        hoverable
        style={{ 
          borderRadius: '16px',
          overflow: 'hidden',
          border: 'none',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          boxShadow: '0 6px 16px rgba(0,0,0,0.08)'
        }}
        bodyStyle={{ 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div>
            <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
              系统用户
            </Text>
            <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: '#096dd9' }}>
              {users.length}
            </Title>
          </div>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TeamOutlined style={{ fontSize: '28px', color: 'white' }} />
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          margin: '12px 0'
        }}>
          <ArrowUpOutlined style={{ color: '#52c41a' }} />
          <Text strong style={{ fontSize: '14px', color: '#389e0d' }}>
            在线: {users.filter(u => u.status === UserStatus.ACTIVE).length} 人
          </Text>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <Tag color="red" style={{ fontSize: '11px' }}>管理员 {users.filter(u => u.role === UserRole.ADMIN).length}</Tag>
            <Tag color="blue" style={{ fontSize: '11px' }}>操作员 {users.filter(u => u.role === UserRole.OPERATOR).length}</Tag>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginTop: 'auto'
        }}>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>活跃用户</Text>
            <Text strong style={{ fontSize: '16px', display: 'block', color: '#52c41a' }}>
              {Math.round(users.length * 0.8)}
            </Text>
          </div>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>今日新增</Text>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>1</Text>
          </div>
        </div>
      </Card>

      {/* 脚本统计卡片 */}
      <Card 
        hoverable
        style={{ 
          borderRadius: '16px',
          overflow: 'hidden',
          border: 'none',
          background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)',
          boxShadow: '0 6px 16px rgba(250, 140, 22, 0.12)'
        }}
        bodyStyle={{ 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div>
            <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
              采集脚本
            </Text>
            <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: '#d46b08' }}>
              {scrtList.length}
            </Title>
          </div>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <DatabaseOutlined style={{ fontSize: '28px', color: 'white' }} />
          </div>
        </div>
        
        <div style={{ margin: '12px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ 
              background: 'rgba(24, 144, 255, 0.1)',
              padding: '8px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <Text strong style={{ color: '#1890ff', fontSize: '18px' }}>
                {scrtHistory.filter(r => r.status === 'SUCCESS').length}
              </Text>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                执行成功
              </div>
            </div>
            <div style={{ 
              background: 'rgba(255, 77, 79, 0.1)',
              padding: '8px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <Text strong style={{ color: '#ff4d4f', fontSize: '18px' }}>
                {scrtHistory.filter(r => r.status === 'FAILED').length}
              </Text>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                执行失败
              </div>
            </div>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginTop: 'auto'
        }}>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>运行中</Text>
            <Text strong style={{ fontSize: '16px', display: 'block', color: '#1890ff' }}>
              {scrtHistory.filter(r => r.status === 'RUNNING').length}
            </Text>
          </div>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>成功率</Text>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>
              {scrtHistory.length > 0 ? 
                Math.round((scrtHistory.filter(r => r.status === 'SUCCESS').length / scrtHistory.length) * 100) : 0}%
            </Text>
          </div>
        </div>
      </Card>

      {/* 审计统计卡片 */}
      <Card 
        hoverable
        style={{ 
          borderRadius: '16px',
          overflow: 'hidden',
          border: 'none',
          background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
          boxShadow: '0 6px 16px rgba(82, 196, 26, 0.12)'
        }}
        bodyStyle={{ 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div>
            <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
              操作日志
            </Text>
            <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: '#389e0d' }}>
              {auditLogs.length}
            </Title>
          </div>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AuditOutlined style={{ fontSize: '28px', color: 'white' }} />
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          margin: '12px 0'
        }}>
          <ArrowUpOutlined style={{ color: '#52c41a' }} />
          <Text strong style={{ fontSize: '14px', color: '#389e0d' }}>
            今日新增: {Math.round(auditLogs.length * 0.1)} 条
          </Text>
          <Tag color="success" style={{ marginLeft: 'auto' }}>+8%</Tag>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginTop: 'auto'
        }}>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>风险操作</Text>
            <Text strong style={{ fontSize: '16px', display: 'block', color: '#ff4d4f' }}>
              {Math.round(auditLogs.length * 0.05)}
            </Text>
          </div>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>合规率</Text>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>98.7%</Text>
          </div>
        </div>
      </Card>

      {/* 系统健康卡片 */}
      <Card 
        hoverable
        style={{ 
          borderRadius: '16px',
          overflow: 'hidden',
          border: 'none',
          background: 'linear-gradient(135deg, #f0f5ff 0%, #d6e4ff 100%)',
          boxShadow: '0 6px 16px rgba(24, 144, 255, 0.12)'
        }}
        bodyStyle={{ 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div>
            <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
              系统健康度
            </Text>
            <Title level={3} style={{ margin: '8px 0 0 0', fontSize: '32px', color: '#096dd9' }}>
              96.2%
            </Title>
          </div>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
           
          </div>
        </div>
        
        <Progress 
          percent={96.2}
          strokeColor="#1890ff"
          strokeWidth={6}
          style={{ margin: '12px 0' }}
        />
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginTop: 'auto'
        }}>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>运行时间</Text>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>45天</Text>
          </div>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>可用性</Text>
            <Text strong style={{ fontSize: '16px', display: 'block' }}>99.9%</Text>
          </div>
          <div>
            <Text style={{ fontSize: '12px', color: '#666' }}>告警</Text>
            <Text strong style={{ fontSize: '16px', display: 'block', color: '#ff4d4f' }}>2</Text>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div style={{ 
      padding: '32px',
      maxWidth: '1600px',
      margin: '0 auto',
      position: 'relative'
    }}>
      {renderDashboardHeader()}
      {renderControlBar()}
      
      {renderCoreMetrics()}

      {/* 主内容区域 */}
      {activeTab === 'users' && (
        <>
          {/* 用户管理卡片 */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TeamOutlined />
                <Text strong style={{ fontSize: '16px' }}>用户管理</Text>
                <Badge count={users.length} style={{ backgroundColor: '#1890ff' }} />
              </div>
            }
            extra={
              <Space>
                <Button 
                  onClick={() => setUsers(generateMockUsers())}
                  style={{ height: '36px', padding: '0 16px' }}
                  disabled={loading}
                >
                  刷新数据
                </Button>
                <Button 
                  type="primary" 
                  onClick={() => showUserModal()}
                  style={{ height: '36px', padding: '0 16px' }}
                  icon={<PlusOutlined />}
                >
                  添加用户
                </Button>
              </Space>
            }
            style={{ 
              borderRadius: '16px',
              marginBottom: '32px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ 
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #f0f0f0'
            }}>
              <Table
                columns={userColumns}
                dataSource={users}
                rowKey="id"
                loading={loading}
                scroll={{ x: 800 }}
                pagination={{
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => 
                    <div style={{ fontSize: '13px' }}>
                      显示第 <Text strong>{range[0]}</Text> 到 <Text strong>{range[1]}</Text> 条，共 <Text strong>{total}</Text> 个用户
                    </div>,
                  style: { padding: '16px 24px', margin: 0 }
                }}
                rowClassName={(record) => 
                  record.status === UserStatus.ACTIVE ? 'active-user-row' : 
                  record.status === UserStatus.INACTIVE ? 'inactive-user-row' : 'locked-user-row'
                }
                locale={{
                  emptyText: users.length === 0 ? 
                    <div style={{ padding: '40px 0', textAlign: 'center' }}>
                      <TeamOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                      <div style={{ fontSize: '16px', marginBottom: '8px' }}>暂无用户数据</div>
                      <Text type="secondary">点击"添加用户"按钮创建第一个用户</Text>
                    </div> : undefined
                }}
              />
            </div>
          </Card>
        </>
      )}

      {activeTab === 'scripts' && (
        <>
          {/* 脚本控制卡片 */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DatabaseOutlined />
                <Text strong style={{ fontSize: '16px' }}>采集脚本控制</Text>
                <Badge count={scrtList.length} style={{ backgroundColor: '#fa8c16' }} />
              </div>
            }
            extra={
              <Space>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={loadScrts} 
                  loading={scrtListLoading}
                  style={{ height: '36px', padding: '0 16px' }}
                >
                  刷新脚本
                </Button>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={loadScrtHistory} 
                  loading={scrtHistoryLoading}
                  style={{ height: '36px', padding: '0 16px' }}
                >
                  刷新历史
                </Button>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={loadScheduledTasks} 
                  loading={scheduledTasksLoading}
                  style={{ height: '36px', padding: '0 16px' }}
                >
                  刷新计划任务
                </Button>
              </Space>
            }
            style={{ 
              borderRadius: '16px',
              marginBottom: '32px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <Card type="inner" title="可用脚本" style={{ marginBottom: '16px', borderRadius: '12px' }}>
                  <div style={{ 
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #f0f0f0'
                  }}>
                    <Table
                      columns={scrtColumns}
                      dataSource={scrtList}
                      rowKey="key"
                      loading={scrtListLoading}
                      pagination={false}
                      scroll={{ x: 700 }}
                    />
                  </div>
                </Card>
              </div>
              <div>
                <Card type="inner" title="最近执行记录" style={{ marginBottom: '16px', borderRadius: '12px' }}>
                  <div style={{ 
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #f0f0f0'
                  }}>
                    <Table
                      columns={scrtHistoryColumns}
                      dataSource={scrtHistory}
                      rowKey={(record) => record.executionId || `${record.scriptKey}-${record.startedAt}`}
                      loading={scrtHistoryLoading}
                      pagination={{ pageSize: 5 }}
                      scroll={{ x: 700 }}
                    />
                  </div>
                </Card>
              </div>
            </div>

            {/* 计划任务状态 */}
            <Card
              title="计划任务状态"
              style={{ marginTop: '24px', borderRadius: '12px' }}
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
                        style={{ borderRadius: '8px' }}
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
          </Card>
        </>
      )}

      {activeTab === 'audit' && (
        <>
          {/* 系统审计卡片 */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AuditOutlined />
                <Text strong style={{ fontSize: '16px' }}>系统操作审计</Text>
                <Badge count={auditLogs.length} style={{ backgroundColor: '#52c41a' }} />
              </div>
            }
            extra={
              <Space>
                <Button 
                  onClick={() => setAuditLogs(generateMockAuditLogs(50))}
                  style={{ height: '36px', padding: '0 16px' }}
                  disabled={loading}
                >
                  刷新日志
                </Button>
                <Button 
                  type="primary"
                  style={{ height: '36px', padding: '0 16px' }}
                >
                  导出日志
                </Button>
              </Space>
            }
            style={{ 
              borderRadius: '16px',
              marginBottom: '32px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ 
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #f0f0f0'
            }}>
              <Table
                columns={auditLogColumns}
                dataSource={auditLogs}
                rowKey="id"
                loading={loading}
                scroll={{ x: 800 }}
                pagination={{ 
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => 
                    <div style={{ fontSize: '13px' }}>
                      显示第 <Text strong>{range[0]}</Text> 到 <Text strong>{range[1]}</Text> 条，共 <Text strong>{total}</Text> 条审计日志
                    </div>,
                  style: { padding: '16px 24px', margin: 0 }
                }}
                rowClassName={(record, index) => 
                  index % 2 === 0 ? 'audit-log-even-row' : 'audit-log-odd-row'
                }
                locale={{
                  emptyText: auditLogs.length === 0 ? 
                    <div style={{ padding: '40px 0', textAlign: 'center' }}>
                      <AuditOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                      <div style={{ fontSize: '16px', marginBottom: '8px' }}>暂无审计日志</div>
                      <Text type="secondary">系统暂无操作日志记录</Text>
                    </div> : undefined
                }}
              />
            </div>
          </Card>
        </>
      )}

      {/* 用户表单弹窗 */}
      <Modal
        title={currentUser ? '编辑用户' : '添加用户'}
        open={userModalVisible}
        onCancel={() => setUserModalVisible(false)}
        footer={null}
        width={600}
        style={{ top: 40 }}
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
            <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
          </Form.Item>
          
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="姓名" size="large" />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="邮箱" size="large" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="角色"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select placeholder="选择角色" size="large">
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
                <Select placeholder="选择状态" size="large">
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
            <Input placeholder="部门" size="large" />
          </Form.Item>
          
          {!currentUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
            </Form.Item>
          )}
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" size="large">
                保存
              </Button>
              <Button onClick={() => setUserModalVisible(false)} size="large">
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 底部信息栏 */}
      <div style={{ 
        marginTop: '32px', 
        padding: '20px',
        textAlign: 'center', 
        color: '#666',
        fontSize: '12px',
        borderTop: '1px solid #f0f0f0',
        background: '#fafafa',
        borderRadius: '12px'
      }}>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <Text strong>系统版本</Text>
            <div>v2.5.1 Enterprise</div>
          </div>
          <div>
            <Text strong>数据库</Text>
            <div>PostgreSQL 14.6</div>
          </div>
          <div>
            <Text strong>支持</Text>
            <div>技术支持中心 (TSC)</div>
          </div>
          <div>
            <Text strong>系统状态</Text>
            <div>
              <Badge 
                status="success" 
                text="运行正常" 
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .active-user-row {
          border-left: 4px solid #52c41a;
        }
        .inactive-user-row {
          border-left: 4px solid #d9d9d9;
        }
        .locked-user-row {
          border-left: 4px solid #ff4d4f;
        }
        .audit-log-even-row {
          background: #fafafa;
        }
        .audit-log-odd-row {
          background: white;
        }
        .ant-table-thead > tr > th {
          background: #fafafa !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          border-bottom: 2px solid #f0f0f0 !important;
        }
        .ant-table-tbody > tr > td {
          padding: 16px !important;
          font-size: 12px !important;
        }
        .ant-table-pagination {
          background: #fafafa;
          border-top: 1px solid #f0f0f0;
        }
      `}</style>
    </div>
  );
};

export default SystemPage;