import { useModel } from 'umi';
import type { Permission, User } from '@/types';

export const usePermission = () => {
  const { initialState } = useModel('@@initialState');
  const user = initialState?.user;

  // 检查单个权限
  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    
    const roleHierarchy = {
      ADMIN: ['admin', 'operator', 'viewer'],
      OPERATOR: ['operator', 'viewer'],
      VIEWER: ['viewer'],
    };
    
    return roleHierarchy[user.role]?.includes(permission) || false;
  };

  // 检查多个权限（需要全部）
  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  // 检查多个权限（需要任一）
  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  // 检查角色
  const hasRole = (role: User['role']): boolean => {
    return user?.role === role;
  };

  // 检查是否为管理员
  const isAdmin = (): boolean => {
    return hasRole('ADMIN');
  };

  // 检查是否为操作员
  const isOperator = (): boolean => {
    return hasRole('OPERATOR') || hasRole('ADMIN');
  };

  // 检查是否为观察员
  const isViewer = (): boolean => {
    return hasRole('VIEWER');
  };

  // 获取用户权限列表
  const getUserPermissions = (): Permission[] => {
    if (!user) return [];
    
    const rolePermissions = {
      ADMIN: ['admin', 'operator', 'viewer'],
      OPERATOR: ['operator', 'viewer'],
      VIEWER: ['viewer'],
    };
    
    return rolePermissions[user.role] || [];
  };

  return {
    user,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasRole,
    isAdmin,
    isOperator,
    isViewer,
    getUserPermissions,
  };
};
