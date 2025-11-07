import React, { useState, useEffect, useRef } from 'react';
import '../styles/responsive.less';
import { useNotification } from '../hooks/useNotification';
import NotificationPanel from './NotificationPanel';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Button, 
  Space, 
  Switch, 
  Tooltip, 
  Dropdown, 
  Menu, 
  message,
  Spin,
  Badge,
  Progress,
  Alert
} from 'antd';
import {
  CheckCircleOutlined,
  AlertOutlined,
  SyncOutlined,
  DownloadOutlined,
  ReloadOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  MoreOutlined,
  ExportOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  BellOutlined
} from '@ant-design/icons';
import LineChart from './Charts/LineChart';
import PieChart from './Charts/PieChart';
import BarChart from './Charts/BarChart';
import { useWebSocket } from '../hooks/useWebSocket';
import { exportToExcel, exportToCSV, exportToJSON, generateReport } from '../utils/exportUtils';

interface LogDataItem {
  time: string;
  value: number;
  type: string;
  source: string;
  level: string;
  description?: string | undefined;
}

interface DashboardStats {
  totalLogs: number;
  anomalyCount: number;
  highRiskCount: number;
  systemHealth: string;
  activeUsers: number;
  responseTime: number;
  throughput: number;
}

const EnhancedDashboard: React.FC = () => {
  const [logData, setLogData] = useState<LogDataItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalLogs: 0,
    anomalyCount: 0,
    highRiskCount: 0,
    systemHealth: 'healthy',
    activeUsers: 0,
    responseTime: 0,
    throughput: 0
  });
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  
  // 使用 ref 跟踪组件挂载状态
  const isMounted = useRef(true);
  
  // 通知系统
  const { addNotification, unreadCount } = useNotification();

  // 生成模拟数据
  const generateMockData = () => {
    // 检查组件是否已卸载
    if (!isMounted.current) return;
    
    const mockData: LogDataItem[] = [];
    const now = new Date();
    
    for (let i = 0; i < 50; i++) {
      const time = new Date(now.getTime() - (50 - i) * 30000);
      mockData.push({
        time: time.toISOString(),
        value: Math.floor(Math.random() * 100),
        type: Math.random() > 0.8 ? 'anomaly' : 'normal',
        source: ['Web服务器', '数据库', '防火墙', '应用服务器'][Math.floor(Math.random() * 4)] || '未知来源',
        level: Math.random() > 0.9 ? 'high' : Math.random() > 0.7 ? 'medium' : 'low',
        description: Math.random() > 0.8 ? '检测到异常行为' : undefined
      });
    }
    
    // 检查组件是否已卸载
    if (isMounted.current) {
      setLogData(mockData);
      setStats({
        totalLogs: 1234,
        anomalyCount: 5,
        highRiskCount: 2,
        systemHealth: 'healthy',
        activeUsers: 45,
        responseTime: 120,
        throughput: 850
      });
      setLoading(false);
    }
  };

  // WebSocket连接 - 使用 useRef 包装回调函数
  const onMessageRef = useRef<(message: any) => void>();
  const onErrorRef = useRef<() => void>();
  const onOpenRef = useRef<() => void>();
  const onCloseRef = useRef<() => void>();

  // 初始化 ref
  useEffect(() => {
    onMessageRef.current = (message) => {
      if (!isMounted.current) return;
      
      if (message.type === 'log_data') {
        setLogData(prev => {
          const newData = [...prev, ...message.data];
          return newData.slice(-100); // 保留最近100条数据
        });
        
        // 检查异常事件并发送通知
        message.data.forEach((item: LogDataItem) => {
          if (item.type === 'anomaly') {
            addNotification(
              'warning',
              '检测到异常事件',
              `${item.source} - ${item.description || '异常行为检测'}`,
              { persistent: item.level === 'high' }
            );
          }
        });
      } else if (message.type === 'stats_update') {
        setStats(message.data);
      }
    };

    onErrorRef.current = () => {
      if (!isMounted.current) return;
      
      addNotification(
        'error',
        'WebSocket连接失败',
        '当前使用模拟数据，部分功能可能受限',
        { persistent: true }
      );
      // 使用模拟数据
      generateMockData();
    };

    onOpenRef.current = () => {
      if (!isMounted.current) return;
      
      addNotification(
        'success',
        'WebSocket连接成功',
        '实时数据更新已启用'
      );
    };

    onCloseRef.current = () => {
      if (!isMounted.current) return;
      
      addNotification(
        'warning',
        'WebSocket连接断开',
        '正在尝试重新连接...'
      );
    };
  }, [addNotification]);

  const { isConnected, sendMessage } = useWebSocket({
    url: 'ws://localhost:8080/ws',
    onMessage: (message) => onMessageRef.current?.(message),
    onError: () => onErrorRef.current?.(),
    onOpen: () => onOpenRef.current?.(),
    onClose: () => onCloseRef.current?.(),
  });

  // 初始化数据
  useEffect(() => {
    isMounted.current = true;
    
    const timer = setTimeout(() => {
      generateMockData();
    }, 1000);
    
    // 清理函数
    return () => {
      isMounted.current = false;
      clearTimeout(timer);
    };
  }, []);

  // 实时数据更新
  useEffect(() => {
    if (isPaused || !isMounted.current) return;

    const interval = setInterval(() => {
      // 检查组件是否已卸载
      if (!isMounted.current) return;
      
      const newLog: LogDataItem = {
        time: new Date().toISOString(),
        value: Math.floor(Math.random() * 100),
        type: Math.random() > 0.8 ? 'anomaly' : 'normal',
        source: ['Web服务器', '数据库', '防火墙', '应用服务器'][Math.floor(Math.random() * 4)] || '未知来源',
        level: Math.random() > 0.9 ? 'high' : Math.random() > 0.7 ? 'medium' : 'low',
        description: Math.random() > 0.8 ? '检测到异常行为' : undefined
      };

      setLogData(prev => {
        const newData = [...prev, newLog];
        return newData.slice(-100);
      });

      // 更新统计数据
      setStats(prev => ({
        ...prev,
        totalLogs: prev.totalLogs + 1,
        anomalyCount: newLog.type === 'anomaly' ? prev.anomalyCount + 1 : prev.anomalyCount,
        highRiskCount: newLog.level === 'high' ? prev.highRiskCount + 1 : prev.highRiskCount
      }));

      // 如果是异常事件，发送通知
      if (newLog.type === 'anomaly') {
        addNotification(
          'warning',
          '检测到异常事件',
          `${newLog.source} - ${newLog.description || '异常行为检测'}`,
          { persistent: newLog.level === 'high' }
        );
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused, addNotification]);

  // 导出功能
  const handleExport = (format: 'excel' | 'csv' | 'json' | 'report') => {
    try {
      const exportData = logData.map(item => ({
        时间: new Date(item.time).toLocaleString(),
        类型: item.type === 'anomaly' ? '异常' : '正常',
        来源: item.source,
        风险等级: item.level === 'high' ? '高' : item.level === 'medium' ? '中' : '低',
        数值: item.value,
        描述: item.description || '无'
      }));

      const timestamp = new Date().toISOString().split('T')[0];
      
      switch (format) {
        case 'excel':
          exportToExcel(exportData, `security_logs_${timestamp}.xlsx`);
          addNotification('success', '导出成功', 'Excel文件已导出到下载文件夹');
          break;
        case 'csv':
          exportToCSV(exportData, `security_logs_${timestamp}.csv`);
          addNotification('success', '导出成功', 'CSV文件已导出到下载文件夹');
          break;
        case 'json':
          exportToJSON(exportData, `security_logs_${timestamp}.json`);
          addNotification('success', '导出成功', 'JSON文件已导出到下载文件夹');
          break;
        case 'report':
          generateReport({
            title: '安全日志异常检测报告',
            period: `2024年1月1日 - ${new Date().toLocaleDateString()}`,
            statistics: stats,
            charts: [],
            logs: logData.slice(-20) // 最近20条日志
          });
          addNotification('success', '报告生成成功', '安全日志报告已生成并下载');
          break;
      }
    } catch (error) {
      addNotification('error', '导出失败', '请检查数据格式后重试');
    }
  };

  // 威胁类型分布数据
  const threatDistribution = [
    { name: 'SQL注入', value: 35, color: '#ff4d4f' },
    { name: 'XSS攻击', value: 25, color: '#ff7a45' },
    { name: '暴力破解', value: 20, color: '#ffa940' },
    { name: '异常登录', value: 15, color: '#52c41a' },
    { name: '其他', value: 5, color: '#1890ff' }
  ];

  // 系统性能数据
  const performanceData = [
    { name: 'CPU使用率', value: 65, color: '#1890ff' },
    { name: '内存使用率', value: 78, color: '#52c41a' },
    { name: '磁盘使用率', value: 45, color: '#faad14' },
    { name: '网络使用率', value: 32, color: '#722ed1' }
  ];

  const exportMenu = (
    <Menu onClick={({ key }) => handleExport(key as any)}>
      <Menu.Item key="excel" icon={<FileExcelOutlined />}>
        导出Excel
      </Menu.Item>
      <Menu.Item key="csv" icon={<FileTextOutlined />}>
        导出CSV
      </Menu.Item>
      <Menu.Item key="json" icon={<FileTextOutlined />}>
        导出JSON
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="report" icon={<FilePdfOutlined />}>
        生成报告
      </Menu.Item>
    </Menu>
  );

  // 如果组件已卸载，不渲染任何内容
  if (!isMounted.current) {
    return null;
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p style={{ marginTop: '16px' }}>正在加载数据...</p>
      </div>
    );
  }

  return (
    <div className="responsive-container animate-fade-in-up">
      {/* 通知面板 */}
      <NotificationPanel 
        visible={notificationPanelVisible}
        onClose={() => setNotificationPanelVisible(false)}
      />

      {/* 页面标题和操作栏 */}
      <div className="header-content" style={{ marginBottom: '20px' }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '24px', 
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            AI安全日志异常检测系统
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#666' }}>
            实时监控 · 智能分析 · 预警防护
          </p>
        </div>
        <div className="header-actions">
          <Space wrap>
            <Tooltip title={isPaused ? '继续实时更新' : '暂停实时更新'}>
              <Switch
                checked={!isPaused}
                onChange={(checked) => setIsPaused(!checked)}
                checkedChildren={<PlayCircleOutlined />}
                unCheckedChildren={<PauseCircleOutlined />}
                className="animate-pulse"
              />
            </Tooltip>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={generateMockData}
              loading={loading}
              type="primary"
              ghost
            >
              刷新数据
            </Button>
            <Badge count={unreadCount} size="small">
              <Button 
                icon={<BellOutlined />} 
                onClick={() => setNotificationPanelVisible(true)}
                type="primary"
                ghost
              >
                通知
              </Button>
            </Badge>
            <Dropdown overlay={exportMenu} placement="bottomRight">
              <Button icon={<ExportOutlined />} type="primary">
                导出数据 <MoreOutlined />
              </Button>
            </Dropdown>
          </Space>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="statistics-grid animate-fade-in-up" style={{ marginBottom: '20px' }}>
        <div className="statistic-card responsive-card">
          <Card hoverable>
            <Statistic
              title="系统状态"
              value={stats.systemHealth === 'healthy' ? '正常' : '异常'}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ 
                color: stats.systemHealth === 'healthy' ? '#3f8600' : '#cf1322' 
              }}
            />
            <Progress 
              percent={stats.systemHealth === 'healthy' ? 95 : 60} 
              size="small" 
              status={stats.systemHealth === 'healthy' ? 'success' : 'exception'}
              style={{ marginTop: '8px' }}
            />
          </Card>
        </div>
        <div className="statistic-card responsive-card">
          <Card hoverable>
            <Statistic
              title="总日志数"
              value={stats.totalLogs}
              valueStyle={{ color: '#1890ff' }}
              suffix="条"
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              今日新增: +{Math.floor(Math.random() * 100)}
            </div>
          </Card>
        </div>
        <div className="statistic-card responsive-card">
          <Card hoverable>
            <Statistic
              title="异常事件"
              value={stats.anomalyCount}
              prefix={<AlertOutlined />}
              valueStyle={{ color: '#cf1322' }}
              suffix="个"
            />
            <Badge 
              count={stats.highRiskCount} 
              style={{ backgroundColor: '#ff4d4f', marginTop: '8px' }}
            >
              <span style={{ fontSize: '12px', color: '#666' }}>高风险事件</span>
            </Badge>
          </Card>
        </div>
        <div className="statistic-card responsive-card">
          <Card hoverable>
            <Statistic
              title="实时状态"
              value="运行中"
              prefix={<SyncOutlined spin />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              活跃用户: {stats.activeUsers}人
            </div>
          </Card>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="responsive-grid animate-fade-in-up" style={{ marginBottom: '20px' }}>
        <div className="chart-container">
          <LineChart 
            data={logData} 
            title="实时日志流" 
            height={350}
          />
        </div>
        <div className="chart-container">
          <PieChart 
            data={threatDistribution} 
            title="威胁类型分布" 
            height={350}
          />
        </div>
      </div>

      <div className="responsive-grid animate-fade-in-up">
        <div className="chart-container">
          <BarChart 
            data={performanceData} 
            title="系统性能监控" 
            height={300}
            yAxisName="使用率(%)"
          />
        </div>
        <div>
          <Card 
            title="最近异常日志" 
            extra={<Button type="link" size="small">查看全部</Button>}
            hoverable
            className="responsive-card"
          >
            <div className="custom-scrollbar" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {logData
                .filter(item => item.type === 'anomaly')
                .slice(-5)
                .map((item, index) => (
                  <div 
                    key={index} 
                    className="animate-fade-in-left"
                    style={{ 
                      padding: '8px 0', 
                      borderBottom: index < 4 ? '1px solid #f0f0f0' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      animationDelay: `${index * 0.1}s`
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold' }}>
                        {new Date(item.time).toLocaleTimeString()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {item.source} - {item.description || '异常事件'}
                      </div>
                    </div>
                    <Badge 
                      status={item.level === 'high' ? 'error' : item.level === 'medium' ? 'warning' : 'default'}
                      text={item.level === 'high' ? '高' : item.level === 'medium' ? '中' : '低'}
                    />
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;