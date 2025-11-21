import React from 'react';
import { 
  Drawer, 
  List, 
  Badge, 
  Button, 
  Typography, 
  Space, 
  Tag, 
  Empty,
  Divider,
  Tooltip
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useNotification, NotificationItem } from '../hooks/useNotification';

const { Text, Title } = Typography;

interface NotificationPanelProps {
  visible: boolean;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ visible, onClose }) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    getUnreadNotifications
  } = useNotification();

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'info':
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return <InfoCircleOutlined />;
    }
  };

  const getTypeColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'processing';
      default:
        return 'default';
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) { // 1分钟内
      return '刚刚';
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) { // 1天内
      return `${Math.floor(diff / 3600000)}小时前`;
    } else {
      return new Date(timestamp).toLocaleDateString();
    }
  };

  const unreadNotifications = getUnreadNotifications();

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <BellOutlined />
            <span>系统通知</span>
            {unreadCount > 0 && (
              <Badge count={unreadCount} size="small" />
            )}
          </Space>
          <Space>
            {unreadCount > 0 && (
              <Button 
                type="link" 
                size="small" 
                onClick={markAllAsRead}
                icon={<CheckOutlined />}
              >
                全部已读
              </Button>
            )}
            {notifications.length > 0 && (
              <Button 
                type="link" 
                size="small" 
                onClick={clearAll}
                icon={<DeleteOutlined />}
                danger
              >
                清空
              </Button>
            )}
          </Space>
        </div>
      }
      placement="right"
      width={400}
      open={visible}
      onClose={onClose}
      styles={{ body: { padding: 0 } }}
    >
      {notifications.length === 0 ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          padding: '40px 20px'
        }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无通知"
          />
        </div>
      ) : (
        <List
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: '12px 16px',
                backgroundColor: item.read ? 'transparent' : '#f6ffed',
                borderLeft: item.read ? 'none' : '3px solid #52c41a',
                cursor: 'pointer'
              }}
              onClick={() => !item.read && markAsRead(item.id)}
            >
              <List.Item.Meta
                avatar={getIcon(item.type)}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong={!item.read} style={{ fontSize: '14px' }}>
                      {item.title}
                    </Text>
                    <Space size="small">
                      <Tag color={getTypeColor(item.type)} size="small">
                        {item.type === 'success' ? '成功' : 
                         item.type === 'error' ? '错误' : 
                         item.type === 'warning' ? '警告' : '信息'}
                      </Tag>
                      {!item.read && (
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#1890ff'
                        }} />
                      )}
                    </Space>
                  </div>
                }
                description={
                  <div>
                    <Text 
                      type={item.read ? 'secondary' : undefined}
                      style={{ fontSize: '13px', lineHeight: '1.4' }}
                    >
                      {item.message}
                    </Text>
                    <div style={{ 
                      marginTop: '8px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {formatTime(item.timestamp)}
                      </Text>
                      <Tooltip title="删除">
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(item.id);
                          }}
                          style={{ opacity: 0.6 }}
                        />
                      </Tooltip>
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
      
      {unreadNotifications.length > 0 && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <div style={{ padding: '0 16px 16px' }}>
            <Title level={5} style={{ margin: '0 0 8px 0' }}>
              未读通知 ({unreadCount})
            </Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              点击通知可标记为已读
            </Text>
          </div>
        </>
      )}
    </Drawer>
  );
};

export default NotificationPanel;
