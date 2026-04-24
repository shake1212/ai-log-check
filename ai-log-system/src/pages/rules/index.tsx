import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Switch,
  Space,
  Button,
  message,
  Typography,
  Tooltip,
  Modal,
  Descriptions,
} from 'antd';
import {
  ReloadOutlined,
  EyeOutlined,
  LockOutlined,
} from '@ant-design/icons';
import ruleManagementApi, { Rule } from '@/services/ruleManagementApi';
import { getSeverity, getThreatCategory, getThreatType, translate, PATTERN_TYPE_MAP } from '@/utils/enumLabels';
import './index.less';

const { Title, Text } = Typography;

const RulesPage: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);

  // 加载规则列表
  const loadRules = async (page = 1, size = 10) => {
    setLoading(true);
    try {
      const response = await ruleManagementApi.getRules({
        page: page - 1, // 后端从0开始
        size,
      });

      setRules(response.content);
      setPagination({
        current: response.currentPage + 1, // 前端从1开始
        pageSize: response.pageSize,
        total: response.totalElements,
      });
    } catch (error) {
      console.error('加载规则列表失败:', error);
      message.error('加载规则列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 切换规则状态
  const handleToggleRule = async (rule: Rule, enabled: boolean) => {
    try {
      await ruleManagementApi.toggleRule(rule.id, enabled);
      message.success(enabled ? '规则已启用' : '规则已禁用');
      loadRules(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('更新规则状态失败:', error);
      message.error('更新规则状态失败');
    }
  };

  // 查看规则详情
  const handleViewDetail = (rule: Rule) => {
    setSelectedRule(rule);
    setDetailModalVisible(true);
  };

  // 初始加载
  useEffect(() => {
    loadRules();
  }, []);

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (category: string) => (
        <Tag color="blue">{getThreatCategory(category)}</Tag>
      ),
    },
    {
      title: '威胁类型',
      dataIndex: 'threatType',
      key: 'threatType',
      width: 150,
      ellipsis: true,
      render: (threatType: string) => (
        <Tag color="orange">{getThreatType(threatType)}</Tag>
      ),
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 120,
      render: (severity: string) => {
        const { label, color } = getSeverity(severity);
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: '匹配类型',
      dataIndex: 'patternType',
      key: 'patternType',
      width: 120,
      render: (v: string) => translate(PATTERN_TYPE_MAP, v),
    },
    {
      title: '分数',
      dataIndex: 'score',
      key: 'score',
      width: 80,
      render: (score: number) => (score ? score.toFixed(2) : '-'),
    },
    {
      title: '命中次数',
      dataIndex: 'hitCount',
      key: 'hitCount',
      width: 100,
      render: (count: number) => count || 0,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean, record: Rule) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggleRule(record, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: Rule) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="rules-page">
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <LockOutlined style={{ marginRight: 8 }} />
          规则管理
        </Title>
        <Text type="secondary">
          管理威胁检测规则，共 {pagination.total} 条规则
        </Text>
      </div>

      {/* 操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => loadRules(pagination.current, pagination.pageSize)}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </Card>

      {/* 规则列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={rules}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              loadRules(page, pageSize);
            },
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* 规则详情弹窗 */}
      <Modal
        title="规则详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedRule && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="规则ID">{selectedRule.id}</Descriptions.Item>
            <Descriptions.Item label="规则名称">{selectedRule.name}</Descriptions.Item>
            <Descriptions.Item label="分类"><Tag color="blue">{getThreatCategory(selectedRule.category)}</Tag></Descriptions.Item>
            <Descriptions.Item label="威胁类型"><Tag color="orange">{getThreatType(selectedRule.threatType)}</Tag></Descriptions.Item>
            <Descriptions.Item label="严重程度">
              {(() => { const { label, color } = getSeverity(selectedRule.severity); return <Tag color={color}>{label}</Tag>; })()}
            </Descriptions.Item>
            <Descriptions.Item label="匹配类型">{translate(PATTERN_TYPE_MAP, selectedRule.patternType)}</Descriptions.Item>
            <Descriptions.Item label="分数">{selectedRule.score?.toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={selectedRule.enabled ? 'green' : 'red'}>
                {selectedRule.enabled ? '启用' : '禁用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="命中次数">{selectedRule.hitCount || 0}</Descriptions.Item>
            <Descriptions.Item label="最后命中时间">
              {selectedRule.lastHitTime || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {selectedRule.createdAt}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间" span={2}>
              {selectedRule.updatedAt}
            </Descriptions.Item>
            <Descriptions.Item label="匹配模式" span={2}>
              <Text code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {selectedRule.pattern}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>
              {selectedRule.description || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default RulesPage;
