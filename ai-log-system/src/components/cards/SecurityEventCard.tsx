import React from 'react';
import { Card, Tag, Badge, Tooltip, Space, Typography, Divider } from 'antd';
import {
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  FireOutlined,
  ShieldOutlined,
  BugOutlined,
  LockOutlined,
} from '@ant-design/icons';
import './SecurityEventCard.less';
import { getSeverity, translate, EVENT_TYPE_MAP, CATEGORY_MAP } from '@/utils/enumLabels';

const { Text, Paragraph } = Typography;

interface MatchedRule {
  ruleId: number;
  ruleName: string;
  threatType: string;
  severity: string;
  score: number;
  category: string;
}

interface SecurityEventCardProps {
  eventId: string;
  processName?: string;
  userName?: string;
  message: string;
  timestamp: string;
  sourceIp?: string;
  destinationIp?: string;
  threatLevel?: string;
  threatScore?: number;
  ruleMatched?: boolean;
  matchedRuleCount?: number;
  matchedRules?: MatchedRule[];
  onClick?: () => void;
}

const SecurityEventCard: React.FC<SecurityEventCardProps> = ({
  eventId,
  processName,
  userName,
  message,
  timestamp,
  sourceIp,
  destinationIp,
  threatLevel = 'LOW',
  threatScore = 0,
  ruleMatched = false,
  matchedRuleCount = 0,
  matchedRules = [],
  onClick,
}) => {
  // 威胁等级配置
  const threatLevelConfig = {
    CRITICAL: {
      color: '#ff4d4f',
      bgColor: '#fff1f0',
      borderColor: '#ffccc7',
      icon: <FireOutlined />,
      text: '严重',
    },
    HIGH: {
      color: '#ff7a45',
      bgColor: '#fff2e8',
      borderColor: '#ffd8bf',
      icon: <WarningOutlined />,
      text: '高危',
    },
    MEDIUM: {
      color: '#faad14',
      bgColor: '#fffbe6',
      borderColor: '#ffe58f',
      icon: <InfoCircleOutlined />,
      text: '中危',
    },
    LOW: {
      color: '#52c41a',
      bgColor: '#f6ffed',
      borderColor: '#b7eb8f',
      icon: <CheckCircleOutlined />,
      text: '低危',
    },
  };

  const config = threatLevelConfig[threatLevel as keyof typeof threatLevelConfig] || threatLevelConfig.LOW;

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

  // 威胁分数颜色
  const getScoreColor = (score: number) => {
    if (score >= 85) return '#ff4d4f';
    if (score >= 60) return '#ff7a45';
    if (score >= 30) return '#faad14';
    return '#52c41a';
  };

  return (
    <Card
      className="security-event-card"
      hoverable
      onClick={onClick}
      style={{
        borderLeft: `4px solid ${config.color}`,
        marginBottom: 16,
      }}
    >
      {/* 头部：威胁等级和分数 */}
      <div className="event-header">
        <Space size="middle">
          <Badge
            count={config.icon}
            style={{
              backgroundColor: config.color,
            }}
          />
          <Tag color={config.color} style={{ fontSize: 14, padding: '4px 12px' }}>
            {config.text}
          </Tag>
          {threatScore > 0 && (
            <Tooltip title="威胁分数">
              <Tag
                color={getScoreColor(threatScore)}
                style={{ fontSize: 14, padding: '4px 12px', fontWeight: 'bold' }}
              >
                {threatScore.toFixed(0)} 分
              </Tag>
            </Tooltip>
          )}
          {ruleMatched && (
            <Tag color="red" icon={<WarningOutlined />}>
              匹配 {matchedRuleCount} 条规则
            </Tag>
          )}
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatTime(timestamp)}
        </Text>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* 事件信息 */}
      <div className="event-info">
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div>
            <Text strong>事件ID: </Text>
            <Text code>{eventId}</Text>
          </div>

          {processName && (
            <div>
              <Text strong>进程: </Text>
              <Text>{processName}</Text>
            </div>
          )}

          {userName && (
            <div>
              <Text strong>用户: </Text>
              <Text>{userName}</Text>
            </div>
          )}

          {(sourceIp || destinationIp) && (
            <div>
              <Text strong>网络: </Text>
              {sourceIp && <Text>{sourceIp}</Text>}
              {sourceIp && destinationIp && <Text> → </Text>}
              {destinationIp && <Text>{destinationIp}</Text>}
            </div>
          )}

          <div>
            <Text strong>消息: </Text>
            <Paragraph
              ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
              style={{ marginBottom: 0 }}
            >
              {message}
            </Paragraph>
          </div>
        </Space>
      </div>

      {/* 匹配的规则 */}
      {ruleMatched && matchedRules.length > 0 && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <div className="matched-rules">
            <Text strong style={{ marginBottom: 8, display: 'block' }}>
              匹配的规则:
            </Text>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {matchedRules.map((rule, index) => (
                <div key={index} className="rule-item">
                  <Space size="small" wrap>
                    {getThreatTypeIcon(rule.threatType)}
                    <Text strong>{rule.ruleName}</Text>
                    <Tag color="blue">{rule.category}</Tag>
                    <Tag color={
                      rule.severity === 'CRITICAL' ? 'red' :
                      rule.severity === 'HIGH' ? 'orange' :
                      rule.severity === 'MEDIUM' ? 'gold' : 'green'
                    }>
                      {getSeverity(rule.severity).label}
                    </Tag>
                    <Text type="secondary">
                      威胁类型: {rule.threatType}
                    </Text>
                  </Space>
                </div>
              ))}
            </Space>
          </div>
        </>
      )}

      {/* 无规则匹配提示 */}
      {!ruleMatched && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <Text type="secondary">
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
              未匹配到威胁规则
            </Text>
          </div>
        </>
      )}
    </Card>
  );
};

export default SecurityEventCard;
