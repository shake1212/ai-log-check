import { useState, useCallback, useRef, useEffect } from 'react';
import { message, notification } from 'antd';

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  persistent?: boolean; // 是否持久显示
  autoClose?: boolean; // 是否自动关闭
  duration?: number; // 显示时长
}

export const useNotification = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationIdRef = useRef(0);

  // 生成唯一ID
  const generateId = useCallback(() => {
    return `notification_${Date.now()}_${++notificationIdRef.current}`;
  }, []);

  // 添加通知
  const addNotification = useCallback((
    type: NotificationItem['type'],
    title: string,
    message: string,
    options: {
      persistent?: boolean;
      autoClose?: boolean;
      duration?: number;
    } = {}
  ) => {
    const id = generateId();
    const notificationItem: NotificationItem = {
      id,
      type,
      title,
      message,
      timestamp: Date.now(),
      read: false,
      persistent: options.persistent || false,
      autoClose: options.autoClose !== false,
      duration: options.duration || 4.5
    };

    setNotifications(prev => {
      // 检查是否已存在相同的通知（避免重复）
      const exists = prev.some(item => 
        item.title === title && 
        item.message === message && 
        item.type === type &&
        Date.now() - item.timestamp < 5000 // 5秒内的重复消息
      );
      
      if (exists) {
        return prev;
      }

      return [notificationItem, ...prev.slice(0, 49)]; // 最多保留50条
    });

    setUnreadCount(prev => prev + 1);

    // 显示Ant Design通知
    const notificationConfig = {
      message: title,
      description: message,
      duration: notificationItem.autoClose ? (notificationItem.duration || 4.5) : 0,
      key: id,
      onClose: () => {
        setNotifications(prev => 
          prev.map(item => 
            item.id === id ? { ...item, read: true } : item
          )
        );
      }
    };

    switch (type) {
      case 'success':
        notification.success(notificationConfig);
        break;
      case 'error':
        notification.error(notificationConfig);
        break;
      case 'warning':
        notification.warning(notificationConfig);
        break;
      case 'info':
        notification.info(notificationConfig);
        break;
    }

    return id;
  }, [generateId]);

  // 标记为已读
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(item => 
        item.id === id ? { ...item, read: true } : item
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // 标记所有为已读
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(item => ({ ...item, read: true }))
    );
    setUnreadCount(0);
  }, []);

  // 删除通知
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const item = prev.find(n => n.id === id);
      if (item && !item.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== id);
    });
  }, []);

  // 清空所有通知
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // 获取未读通知
  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(item => !item.read);
  }, [notifications]);

  // 获取最近通知
  const getRecentNotifications = useCallback((limit: number = 10) => {
    return notifications.slice(0, limit);
  }, [notifications]);

  // 自动清理过期通知
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNotifications(prev => {
        const filtered = prev.filter(item => {
          // 保留未读通知和持久通知
          if (!item.read || item.persistent) return true;
          // 删除超过1小时的通知
          return now - item.timestamp < 60 * 60 * 1000;
        });
        
        // 更新未读计数
        const unread = filtered.filter(item => !item.read).length;
        setUnreadCount(unread);
        
        return filtered;
      });
    }, 60000); // 每分钟检查一次

    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    getUnreadNotifications,
    getRecentNotifications
  };
};
