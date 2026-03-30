import React from 'react';
import { Modal, Descriptions, Tag, Space, Typography, Divider, List, Badge } from 'antd';
import {
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  FireOutlined,
  ShieldOutlined,
  BugOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { getSeverity, translate, EVENT_TYPE_MAP, CATEGORY_MAP, STATUS_MAP, getStatus } from '@/utils/enumLabels';

const { Text, Title } = Typography;

interface MatchedRule {
  ruleId: number;
  ruleName: string;
  threatType: string;
  severity: string;
  score: number;
  category: string;
}

interface SecurityEventDetailModalProps {
  visible: boolean;
  onClose: () => void;
  event: {
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
    matchedRules?: MatchedRule[];
    commandLine?: string;
    filePath?: string;
    computerName?: string;
  } | null;
}

const SecurityEventDetailModal: React.FC<SecurityEventDetailModalProps> = ({
  visible,
  onClose,
  event,
}) => {
  if (!event) return null;

  // 威胁等级配置
  const threatLevelConfig = {
    CRITICAL: { color: '#ff4d4f', text: '严重', icon: <FireOutlined /> },
    HIGH: { color: '#ff7a45', text: '高危', icon: <WarningOutlined /> },
    MEDIUM: { color: '#faad14', text: '中危', icon: <InfoCircleOutlined /> },
    LOW: { color: '#52c41a', text: '低危', icon: <CheckCircleOutlined /> },
  };

  const config = threatLevelConfig[event.threatLevel as keyof typeof threatLevelConfig] || threatLevelConfig.LOW;

  // 威胁类型图标映射
  const getThreatTypeIcon = (threatType: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      BRUTE_FORCE: <LockOutlined />,
      BACKDOOR: <BugOutlined />,
      MALWARE: <BugOutlined />,
      PRIVILEGE_ESCALATION: <ShieldOutlined />,
      SQL_INJECTION: <BugOutlined />,
      XSS_ATTACK: <BugOutlined />,
      COMMAND_INJECTION: <BugOutlined />,
      DATA_EXFILTRATION: <WarningOutlined />,
    };
    return iconMap[threatType] || <InfoCircleOutlined />;
  };

  // 格式化时间
  const formatTime = (time: string) => {
    try {
      const date = new Date(time);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return time;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <Badge count={config.icon} style={{ backgroundColor: config.color }} />
          <span>安全事件详情</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      {/* 威胁评估 */}
      <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
        <Space size="large">
          <div>
            <Text type="secondary">威胁等级</Text>
            <div style={{ marginTop: 8 }}>
              <Tag color={config.color} style={{ fontSize: 16, padding: '6px 16px' }}>
                {config.icon} {config.text}
              </Tag>
            </div>
          </div>
          {event.threatScore !== undefined && (
            <div>
              <Text type="secondary">威胁分数</Text>
              <div style={{ marginTop: 8 }}>
                <Text strong style={{ fontSize: 24, color: config.color }}>
                  {event.threatScore.toFixed(0)}
                </Text>
                <Text type="secondary"> / 100</Text>
              </div>
            </div>
          )}
          <div>
            <Text type="secondary">规则匹配</Text>
            <div style={{ marginTop: 8 }}>
              {event.ruleMatched ? (
                <Tag color="red" icon={<WarningOutlined />} style={{ fontSize: 14, padding: '4px 12px' }}>
                  匹配 {event.matchedRuleCount} 条规则
                </Tag>
              ) : (
                <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontSize: 14, padding: '4px 12px' }}>
                  未匹配规则
                </Tag>
              )}
            </div>
          </div>
        </Space>
      </div>

      {/* 基本信息 */}
      <Title level={5}>基本信息</Title>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="事件ID">{event.eventId}</Descriptions.Item>
        <Descriptions.Item label="时间">{formatTime(event.timestamp)}</Descriptions.Item>
        {event.computerName && (
          <Descriptions.Item label="计算机名">{event.computerName}</Descriptions.Item>
        )}
        {event.userName && (
          <Descriptions.Item label="用户名">{event.userName}</Descriptions.Item>
        )}
        {event.processName && (
          <Descriptions.Item label="进程名" span={2}>{event.processName}</Descriptions.Item>
        )}
        {event.commandLine && (
          <Descriptions.Item label="命令行" span={2}>
            <Text code style={{ fontSize: 12 }}>{event.commandLine}</Text>
          </Descriptions.Item>
        )}
        {event.filePath && (
          <Descriptions.Item label="文件路径" span={2}>
            <Text code style={{ fontSize: 12 }}>{event.filePath}</Text>
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* 网络信息 */}
      {(event.sourceIp || event.destinationIp) && (
        <>
          <Divider />
          <Title level={5}>网络信息</Title>
          <Descriptions bordered column={2} size="small">
            {event.sourceIp && (
              <Descriptions.Item label="源IP">{event.sourceIp}</Descriptions.Item>
            )}
            {event.sourcePort && (
              <Descriptions.Item label="源端口">{event.sourcePort}</Descriptions.Item>
            )}
            {event.destinationIp && (
              <Descriptions.Item label="目标IP">{event.destinationIp}</Descriptions.Item>
            )}
            {event.destinationPort && (
              <Descriptions.Item label="目标端口">{event.destinationPort}</Descriptions.Item>
            )}
          </Descriptions>
        </>
      )}

      {/* 事件消息 */}
      <Divider />
      <Title level={5}>事件消息</Title>
      <div style={{ padding: 12, backgroundColor: '#fafafa', borderRadius: 4 }}>
        <Text>{event.normalizedMessage}</Text>
      </div>

      {/* 匹配的规则 */}
      {event.ruleMatched && event.matchedRules && event.matchedRules.length > 0 && (
        <>
          <Divider />
          <Title level={5}>匹配的规则 ({event.matchedRules.length})</Title>
          <List
            dataSource={event.matchedRules}
            renderItem={(rule) => (
              <List.Item>
                <List.Item.Meta
                  avatar={getThreatTypeIcon(rule.threatType)}
                  title={
                    <Space>
                      <Text strong>{rule.ruleName}</Text>
                      <Tag color="blue">{rule.category}</Tag>
                      <Tag
                        color={
                          rule.severity === 'CRITICAL' ? 'red' :
                          rule.severity === 'HIGH' ? 'orange' :
                          rule.severity === 'MEDIUM' ? 'gold' : 'green'
                        }
                      >
                        {getSeverity(rule.severity).label}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space>
                      <Text type="secondary">威胁类型: {rule.threatType}</Text>
                      <Text type="secondary">规则分数: {(rule.score * 100).toFixed(0)}</Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </>
      )}
    </Modal>
  );
};

export default SecurityEventDetailModal;
