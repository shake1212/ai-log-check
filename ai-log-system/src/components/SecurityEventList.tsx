import React, { useState, useEffect } from 'react';
import { List, Empty, Spin, Select, Space, Typography, Button, message } from 'antd';
import { ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import SecurityEventCard from './cards/SecurityEventCard';
import './SecurityEventList.less';

const { Title, Text } = Typography;
const { Option } = Select;

interface SecurityEvent {
  id: string;
  eventId: string;
  processName?: string;
  userName?: string;
  normalizedMessage: string;
  timestamp: string;
  sourceIp?: string;
  destinationIp?: string;
  threatLevel?: string;
  threatScore?: number;
  ruleMatched?: boolean;
  matchedRuleCount?: number;
  matchedRules?: any[];
}

interface SecurityEventListProps {
  apiUrl?: string;
  pageSize?: number;
  showFilters?: boolean;
  onEventClick?: (event: SecurityEvent) => void;
}

const SecurityEventList: React.FC<SecurityEventListProps> = ({
  apiUrl = '/api/events',
  pageSize = 10,
  showFilters = true,
  onEventClick,
}) => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // 过滤器状态
  const [threatLevelFilter, setThreatLevelFilter] = useState<string>('ALL');
  const [ruleMatchedFilter, setRuleMatchedFilter] = useState<string>('ALL');

  // 加载事件数据
  const loadEvents = async () => {
    setLoading(true);
    try {
      // 构建查询参数
      const params = new URLSearchParams({
        page: currentPage.toString(),
        size: pageSize.toString(),
      });

      if (threatLevelFilter !== 'ALL') {
        params.append('threatLevel', threatLevelFilter);
      }

      if (ruleMatchedFilter === 'MATCHED') {
        params.append('ruleMatched', 'true');
      } else if (ruleMatchedFilter === 'NOT_MATCHED') {
        params.append('ruleMatched', 'false');
      }

      const response = await fetch(`${apiUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('加载事件失败');
      }

      const data = await response.json();
      
      setEvents(data.content || data.data || []);
      setTotal(data.totalElements || data.total || 0);
    } catch (error) {
      console.error('加载事件失败:', error);
      message.error('加载事件失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和过滤器变化时重新加载
  useEffect(() => {
    loadEvents();
  }, [currentPage, threatLevelFilter, ruleMatchedFilter]);

  // 刷新数据
  const handleRefresh = () => {
    setCurrentPage(1);
    loadEvents();
  };

  // 重置过滤器
  const handleResetFilters = () => {
    setThreatLevelFilter('ALL');
    setRuleMatchedFilter('ALL');
    setCurrentPage(1);
  };

  return (
    <div className="security-event-list">
      {/* 头部：标题和操作 */}
      <div className="list-header">
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>
            安全事件列表
          </Title>
          <Text type="secondary">
            共 {total} 条事件
            {threatLevelFilter !== 'ALL' && ` · 威胁等级: ${threatLevelFilter}`}
            {ruleMatchedFilter !== 'ALL' && ` · ${ruleMatchedFilter === 'MATCHED' ? '已匹配规则' : '未匹配规则'}`}
          </Text>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* 过滤器 */}
      {showFilters && (
        <div className="list-filters">
          <Space size="middle" wrap>
            <div>
              <Text strong style={{ marginRight: 8 }}>
                <FilterOutlined /> 威胁等级:
              </Text>
              <Select
                value={threatLevelFilter}
                onChange={setThreatLevelFilter}
                style={{ width: 120 }}
              >
                <Option value="ALL">全部</Option>
                <Option value="CRITICAL">严重</Option>
                <Option value="HIGH">高危</Option>
                <Option value="MEDIUM">中危</Option>
                <Option value="LOW">低危</Option>
              </Select>
            </div>

            <div>
              <Text strong style={{ marginRight: 8 }}>
                规则匹配:
              </Text>
              <Select
                value={ruleMatchedFilter}
                onChange={setRuleMatchedFilter}
                style={{ width: 120 }}
              >
                <Option value="ALL">全部</Option>
                <Option value="MATCHED">已匹配</Option>
                <Option value="NOT_MATCHED">未匹配</Option>
              </Select>
            </div>

            {(threatLevelFilter !== 'ALL' || ruleMatchedFilter !== 'ALL') && (
              <Button size="small" onClick={handleResetFilters}>
                重置过滤器
              </Button>
            )}
          </Space>
        </div>
      )}

      {/* 事件列表 */}
      <Spin spinning={loading}>
        {events.length > 0 ? (
          <List
            dataSource={events}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              onChange: setCurrentPage,
              showSizeChanger: false,
              showTotal: (total) => `共 ${total} 条`,
            }}
            renderItem={(event) => (
              <SecurityEventCard
                key={event.id}
                eventId={event.eventId}
                processName={event.processName}
                userName={event.userName}
                message={event.normalizedMessage}
                timestamp={event.timestamp}
                sourceIp={event.sourceIp}
                destinationIp={event.destinationIp}
                threatLevel={event.threatLevel}
                threatScore={event.threatScore}
                ruleMatched={event.ruleMatched}
                matchedRuleCount={event.matchedRuleCount}
                matchedRules={event.matchedRules}
                onClick={() => onEventClick?.(event)}
              />
            )}
          />
        ) : (
          <Empty
            description="暂无安全事件"
            style={{ padding: '60px 0' }}
          />
        )}
      </Spin>
    </div>
  );
};

export default SecurityEventList;
