import React, { useState } from 'react';
import { Tabs, Typography } from 'antd';
import { ShieldOutlined, BarChartOutlined, UnorderedListOutlined } from '@ant-design/icons';
import SecurityEventList from '@/components/SecurityEventList';
import RuleStatisticsDashboard from '@/components/RuleStatisticsDashboard';
import SecurityEventDetailModal from '@/components/modals/SecurityEventDetailModal';

const { Title, Text } = Typography;

interface SecurityEvent {
  id: string;
  eventId: string;
  processName?: string;
  userName?: string;
  normalizedMessage: string;
  timestamp: string;
  sourceIp?: string;
  destinationIp?: string;
  sourcePort?: number;
  destinationPort?: number;
  threatLevel?: string;
  threatScore?: number;
  ruleMatched?: boolean;
  matchedRuleCount?: number;
  matchedRules?: any[];
  commandLine?: string;
  filePath?: string;
  computerName?: string;
}

const SecurityEventsPage: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // 处理事件点击
  const handleEventClick = (event: SecurityEvent) => {
    setSelectedEvent(event);
    setDetailModalVisible(true);
  };

  // 关闭详情弹窗
  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedEvent(null);
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <ShieldOutlined /> 安全事件管理
        </Title>
        <Text type="secondary">
          查看和管理系统安全事件，分析威胁规则匹配情况
        </Text>
      </div>

      {/* 标签页 */}
      <Tabs
        defaultActiveKey="events"
        items={[
          {
            key: 'events',
            label: (
              <span>
                <UnorderedListOutlined />
                事件列表
              </span>
            ),
            children: (
              <SecurityEventList
                apiUrl="/api/events"
                pageSize={10}
                showFilters={true}
                onEventClick={handleEventClick}
              />
            ),
          },
          {
            key: 'statistics',
            label: (
              <span>
                <BarChartOutlined />
                规则统计
              </span>
            ),
            children: <RuleStatisticsDashboard autoRefresh={true} refreshInterval={60000} />,
          },
        ]}
      />

      {/* 事件详情弹窗 */}
      <SecurityEventDetailModal
        visible={detailModalVisible}
        onClose={handleCloseDetail}
        event={selectedEvent}
      />
    </div>
  );
};

export default SecurityEventsPage;
