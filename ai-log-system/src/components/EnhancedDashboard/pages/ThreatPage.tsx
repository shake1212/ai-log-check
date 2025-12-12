// src/components/EnhancedDashboard/pages/ThreatPage.tsx
import React, { useState, useMemo } from 'react';
import {
  Card,
  Typography,
  Row,
  Col,
  Select,
  Input,
  Button,
  Tag,
  List,
  Badge,
  Switch,
  Progress,
  Spin,
  Empty,
  Alert,
  Space
} from 'antd';
import {
  GlobalOutlined,
  BugOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  CloudOutlined,
  BellOutlined,
  SyncOutlined,
  DownloadOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { ThreatIntelItem, LEVEL_GRADIENTS } from '../types/dashboard';

const { Text, Title, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

interface ThreatPageProps {
  threatIntelData: ThreatIntelItem[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onSyncCloudIntel?: () => void;
  onViewDetails?: (item: ThreatIntelItem) => void;
  onAddToMonitor?: (item: ThreatIntelItem) => void;
  onExportIOC?: (item: ThreatIntelItem) => void;
}

const ThreatPage: React.FC<ThreatPageProps> = ({
  threatIntelData = [],
  loading = false,
  onRefresh,
  onSyncCloudIntel,
  onViewDetails,
  onAddToMonitor,
  onExportIOC
}) => {
  const [threatTypeFilter, setThreatTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 威胁情报统计
  const threatStats = useMemo(() => ({
    total: threatIntelData.length,
    active: threatIntelData.filter(item => item.status === 'active').length,
    malware: threatIntelData.filter(item => item.type === 'malware').length,
    phishing: threatIntelData.filter(item => item.type === 'phishing').length,
    vulnerability: threatIntelData.filter(item => item.type === 'vulnerability').length,
    botnet: threatIntelData.filter(item => item.type === 'botnet').length,
    zeroDay: threatIntelData.filter(item => item.type === 'zero-day').length,
    critical: threatIntelData.filter(item => item.severity === 'critical').length,
    high: threatIntelData.filter(item => item.severity === 'high').length,
    medium: threatIntelData.filter(item => item.severity === 'medium').length,
    low: threatIntelData.filter(item => item.severity === 'low').length,
  }), [threatIntelData]);

  // 过滤后的威胁情报数据
  const filteredThreatIntelData = useMemo(() => {
    let filtered = threatIntelData;
    
    if (threatTypeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === threatTypeFilter);
    }
    
    if (severityFilter !== 'all') {
      filtered = filtered.filter(item => item.severity === severityFilter);
    }
    
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.description.toLowerCase().includes(term) ||
        item.source.toLowerCase().includes(term) ||
        item.affectedSystems.some(system => system.toLowerCase().includes(term)) ||
        item.relatedThreats.some(threat => threat.toLowerCase().includes(term))
      );
    }
    
    return filtered;
  }, [threatIntelData, threatTypeFilter, severityFilter, searchTerm]);

  // 威胁类型中文映射
  const threatTypeMap = {
    malware: '恶意软件',
    phishing: '钓鱼攻击',
    vulnerability: '漏洞利用',
    botnet: '僵尸网络',
    'zero-day': '零日攻击'
  };

  // 严重程度中文映射
  const severityMap = {
    critical: '严重',
    high: '高危',
    medium: '中危',
    low: '低危'
  };

  // 状态中文映射
  const statusMap = {
    active: '活跃',
    inactive: '不活跃',
    mitigated: '已缓解'
  };

  // 获取威胁等级颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ff4d4f';
      case 'high': return '#fa8c16';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#1890ff';
    }
  };

  // 获取威胁类型图标
  const getThreatTypeIcon = (type: string) => {
    switch (type) {
      case 'malware': return <BugOutlined />;
      case 'phishing': return <EyeInvisibleOutlined />;
      case 'vulnerability': return <LockOutlined />;
      default: return <GlobalOutlined />;
    }
  };

  // 渲染威胁概览卡片
  const renderOverviewCards = () => (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {[
        { label: '威胁总数', value: threatStats.total, color: '#ff4d4f', bg: '#fff1f0' },
        { label: '活跃威胁', value: threatStats.active, color: '#fa8c16', bg: '#fff7e6' },
        { label: '恶意软件', value: threatStats.malware, color: '#52c41a', bg: '#f6ffed' },
        { label: '钓鱼攻击', value: threatStats.phishing, color: '#1890ff', bg: '#e6f7ff' },
        { label: '严重威胁', value: threatStats.critical, color: '#722ed1', bg: '#f9f0ff' },
        { label: '漏洞利用', value: threatStats.vulnerability, color: '#eb2f96', bg: '#fff0f6' },
      ].map((stat, index) => (
        <Col xs={24} sm={12} md={8} lg={6} key={index}>
          <Card 
            hoverable 
            style={{ 
              textAlign: 'center', 
              background: stat.bg,
              borderRadius: 12,
              height: '100%'
            }}
          >
            <Title level={3} style={{ color: stat.color, margin: '8px 0' }}>
              {stat.value}
            </Title>
            <Text type="secondary">{stat.label}</Text>
          </Card>
        </Col>
      ))}
    </Row>
  );

  // 渲染过滤和搜索栏
  const renderFilterBar = () => (
    <Card style={{ marginBottom: 24, borderRadius: 16 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} md={6}>
          <div>
            <Text strong style={{ marginRight: 8, display: 'block', marginBottom: 4 }}>
              威胁类型:
            </Text>
            <Select
              value={threatTypeFilter}
              onChange={setThreatTypeFilter}
              style={{ width: '100%' }}
              placeholder="全部类型"
            >
              <Option value="all">全部类型</Option>
              <Option value="malware">恶意软件</Option>
              <Option value="phishing">钓鱼攻击</Option>
              <Option value="vulnerability">漏洞利用</Option>
              <Option value="botnet">僵尸网络</Option>
              <Option value="zero-day">零日攻击</Option>
            </Select>
          </div>
        </Col>
        <Col xs={24} md={6}>
          <div>
            <Text strong style={{ marginRight: 8, display: 'block', marginBottom: 4 }}>
              严重程度:
            </Text>
            <Select
              value={severityFilter}
              onChange={setSeverityFilter}
              style={{ width: '100%' }}
              placeholder="全部级别"
            >
              <Option value="all">全部级别</Option>
              <Option value="critical">严重</Option>
              <Option value="high">高危</Option>
              <Option value="medium">中危</Option>
              <Option value="low">低危</Option>
            </Select>
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              搜索威胁:
            </Text>
            <Search
              placeholder="搜索威胁情报..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={(value) => setSearchTerm(value)}
              allowClear
            />
          </div>
        </Col>
        <Col xs={24} md={4}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button 
              icon={<SyncOutlined />} 
              onClick={onRefresh}
              loading={loading}
            >
              刷新
            </Button>
            {onSyncCloudIntel && (
              <Button 
                type="primary" 
                icon={<CloudOutlined />}
                onClick={onSyncCloudIntel}
              >
                同步云端
              </Button>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );

  // 渲染威胁情报列表项
  const renderThreatListItem = (item: ThreatIntelItem) => (
    <List.Item
      style={{
        padding: 16,
        marginBottom: 8,
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        background: item.status === 'active' ? '#fff2f0' : '#fafafa'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, width: '100%' }}>
        <div style={{
          width: 50,
          height: 50,
          borderRadius: 10,
          background: LEVEL_GRADIENTS[item.severity.toUpperCase() as keyof typeof LEVEL_GRADIENTS] || LEVEL_GRADIENTS.LOW,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {getThreatTypeIcon(item.type)}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <Text strong style={{ fontSize: 15 }}>{item.description}</Text>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                来源: {item.source} • 检测时间: {new Date(item.detectionDate).toLocaleString()}
              </div>
            </div>
            <Space style={{ marginTop: 4 }}>
              <Tag color={getSeverityColor(item.severity)}>
                {severityMap[item.severity]}
              </Tag>
              <Tag color={item.status === 'active' ? 'red' : item.status === 'mitigated' ? 'green' : 'default'}>
                {statusMap[item.status]}
              </Tag>
              <Tag>{threatTypeMap[item.type]}</Tag>
            </Space>
          </div>
          
          <div style={{ margin: '12px 0', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ fontSize: 13 }}>
              <Text strong>影响系统: </Text>
              {item.affectedSystems.join(', ')}
            </div>
            <div style={{ fontSize: 13 }}>
              <Text strong>IOC数量: </Text>
              {item.iocCount}个
            </div>
            <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong>置信度: </Text>
              <Progress 
                percent={item.confidence} 
                size="small" 
                style={{ width: 80 }}
                strokeColor={getSeverityColor(item.severity)}
              />
            </div>
          </div>
          
          {item.relatedThreats.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Text strong style={{ fontSize: 12 }}>相关威胁: </Text>
              <div style={{ marginTop: 4 }}>
                {item.relatedThreats.slice(0, 3).map((threat, idx) => (
                  <Tag key={idx} style={{ fontSize: 11, margin: 2 }}>{threat}</Tag>
                ))}
                {item.relatedThreats.length > 3 && (
                  <Tag style={{ fontSize: 11, margin: 2 }}>
                    +{item.relatedThreats.length - 3} 更多
                  </Tag>
                )}
              </div>
            </div>
          )}
          
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            {onViewDetails && (
              <Button 
                size="small" 
                type="primary" 
                ghost
                onClick={() => onViewDetails(item)}
              >
                查看详情
              </Button>
            )}
            {onAddToMonitor && (
              <Button 
                size="small"
                onClick={() => onAddToMonitor(item)}
              >
                添加到监控
              </Button>
            )}
            {onExportIOC && (
              <Button 
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => onExportIOC(item)}
              >
                导出IOC
              </Button>
            )}
          </div>
        </div>
      </div>
    </List.Item>
  );

  // 渲染订阅面板
  const renderSubscriptionPanel = () => (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BellOutlined />
          <Text strong>情报源订阅</Text>
        </div>
      }
      style={{ marginTop: 24, borderRadius: 16 }}
    >
      <Row gutter={[16, 16]}>
        {[
          { icon: <CloudOutlined />, title: '云端威胁情报', color: '#1890ff', desc: '实时同步云端最新威胁情报' },
          { icon: <GlobalOutlined />, title: '国际威胁情报', color: '#52c41a', desc: '获取国际安全组织威胁情报' },
          { icon: <DatabaseOutlined />, title: '本地威胁情报', color: '#722ed1', desc: '分析本地网络威胁数据' },
        ].map((item, index) => (
          <Col xs={24} sm={12} md={8} key={index}>
            <Card hoverable style={{ textAlign: 'center', height: '100%' }}>
              <div style={{ fontSize: 32, color: item.color, marginBottom: 12 }}>
                {item.icon}
              </div>
              <Title level={5} style={{ margin: '8px 0' }}>{item.title}</Title>
              <Switch defaultChecked style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 12, color: '#666' }}>
                {item.desc}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );

  return (
    <div style={{ padding: '0 4px' }}>
      {renderOverviewCards()}
      {renderFilterBar()}
      
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GlobalOutlined />
            <Text strong>威胁情报列表</Text>
            <Badge count={threatStats.active} style={{ backgroundColor: '#ff4d4f' }} />
          </div>
        }
        extra={
          <Text type="secondary" style={{ fontSize: 12 }}>
            共 {filteredThreatIntelData.length} 条记录
          </Text>
        }
        style={{ borderRadius: 16 }}
      >
        <Spin spinning={loading}>
          {filteredThreatIntelData.length > 0 ? (
            <List
              dataSource={filteredThreatIntelData}
              renderItem={renderThreatListItem}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
                style: { marginTop: 16 }
              }}
            />
          ) : (
            <Empty description="暂无威胁情报数据" />
          )}
        </Spin>
      </Card>

      {renderSubscriptionPanel()}
    </div>
  );
};

export default ThreatPage;