import dayjs from 'dayjs';
import type { User, Permission } from '@/types';

// 日期时间工具
export const dateUtils = {
  // 格式化日期
  format: (date: string | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
    return dayjs(date).format(format);
  },

  // 相对时间
  fromNow: (date: string | Date) => {
    return dayjs(date).fromNow();
  },

  // 获取时间范围
  getTimeRange: (type: 'today' | 'yesterday' | 'week' | 'month' | 'year') => {
    const now = dayjs();
    switch (type) {
      case 'today':
        return {
          start: now.startOf('day').toISOString(),
          end: now.endOf('day').toISOString(),
        };
      case 'yesterday':
        const yesterday = now.subtract(1, 'day');
        return {
          start: yesterday.startOf('day').toISOString(),
          end: yesterday.endOf('day').toISOString(),
        };
      case 'week':
        return {
          start: now.startOf('week').toISOString(),
          end: now.endOf('week').toISOString(),
        };
      case 'month':
        return {
          start: now.startOf('month').toISOString(),
          end: now.endOf('month').toISOString(),
        };
      case 'year':
        return {
          start: now.startOf('year').toISOString(),
          end: now.endOf('year').toISOString(),
        };
      default:
        return {
          start: now.startOf('day').toISOString(),
          end: now.endOf('day').toISOString(),
        };
    }
  },
};

// 权限工具
export const permissionUtils = {
  // 检查用户权限
  hasPermission: (user: User | undefined, permission: Permission): boolean => {
    if (!user) return false;
    
    const roleHierarchy = {
      ADMIN: ['admin', 'operator', 'viewer'],
      OPERATOR: ['operator', 'viewer'],
      VIEWER: ['viewer'],
    };
    
    return roleHierarchy[user.role]?.includes(permission) || false;
  },

  // 检查是否为管理员
  isAdmin: (user: User | undefined): boolean => {
    return user?.role === 'ADMIN';
  },

  // 检查是否为操作员
  isOperator: (user: User | undefined): boolean => {
    return user?.role === 'OPERATOR' || user?.role === 'ADMIN';
  },
};

// 字符串工具
export const stringUtils = {
  // 截断字符串
  truncate: (str: string, length: number, suffix = '...'): string => {
    if (str.length <= length) return str;
    return str.substring(0, length) + suffix;
  },

  // 首字母大写
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  // 驼峰转横线
  camelToKebab: (str: string): string => {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  },

  // 横线转驼峰
  kebabToCamel: (str: string): string => {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  },

  // 生成随机字符串
  randomString: (length = 8): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
};

// 数字工具
export const numberUtils = {
  // 格式化数字
  format: (num: number, decimals = 2): string => {
    return num.toLocaleString('zh-CN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },

  // 格式化文件大小
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // 生成随机数
  random: (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
};

// 数组工具
export const arrayUtils = {
  // 去重
  unique: <T>(arr: T[]): T[] => {
    return [...new Set(arr)];
  },

  // 分组
  groupBy: <T>(arr: T[], key: keyof T): Record<string, T[]> => {
    return arr.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },

  // 排序
  sortBy: <T>(arr: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
    return [...arr].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  },
};

// 对象工具
export const objectUtils = {
  // 深拷贝
  deepClone: <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map(item => objectUtils.deepClone(item)) as any;
    if (typeof obj === 'object') {
      const clonedObj = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = objectUtils.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
    return obj;
  },

  // 合并对象
  merge: <T>(target: T, ...sources: Partial<T>[]): T => {
    return Object.assign(target, ...sources);
  },

  // 获取嵌套属性值
  get: (obj: any, path: string, defaultValue?: any): any => {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result == null || typeof result !== 'object') {
        return defaultValue;
      }
      result = result[key];
    }
    return result !== undefined ? result : defaultValue;
  },
};

// 验证工具
export const validationUtils = {
  // 邮箱验证
  isEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // 手机号验证
  isPhone: (phone: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  },

  // URL验证
  isUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  // 密码强度验证
  isStrongPassword: (password: string): boolean => {
    // 至少8位，包含大小写字母、数字和特殊字符
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  },
};

// 存储工具
export const storageUtils = {
  // 设置localStorage
  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  // 获取localStorage
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return defaultValue || null;
    }
  },

  // 删除localStorage
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  },

  // 清空localStorage
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  },
};

// 防抖和节流
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), wait);
    }
  };
};

// 导出所有工具
export const utils = {
  date: dateUtils,
  permission: permissionUtils,
  string: stringUtils,
  number: numberUtils,
  array: arrayUtils,
  object: objectUtils,
  validation: validationUtils,
  storage: storageUtils,
  debounce,
  throttle,
};
