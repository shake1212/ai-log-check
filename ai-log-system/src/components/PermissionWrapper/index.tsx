import React from 'react';
import { useModel } from 'umi';
import type { Permission } from '@/types';

interface PermissionWrapperProps {
  children: React.ReactNode;
  permission?: Permission;
  fallback?: React.ReactNode;
  requireAll?: boolean;
  permissions?: Permission[];
}

const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  children,
  permission,
  fallback = null,
  requireAll = false,
  permissions = [],
}) => {
  const { initialState } = useModel('@@initialState');
  const user = initialState?.user;

  // 检查单个权限
  const checkSinglePermission = (perm: Permission): boolean => {
    if (!user) return false;
    
    const roleHierarchy = {
      ADMIN: ['admin', 'operator', 'viewer'],
      OPERATOR: ['operator', 'viewer'],
      VIEWER: ['viewer'],
    };
    
    return roleHierarchy[user.role]?.includes(perm) || false;
  };

  // 检查权限
  const hasPermission = (): boolean => {
    if (!permission && permissions.length === 0) {
      return true; // 没有权限要求，默认显示
    }

    if (permission) {
      return checkSinglePermission(permission);
    }

    if (permissions.length > 0) {
      if (requireAll) {
        // 需要所有权限
        return permissions.every(perm => checkSinglePermission(perm));
      } else {
        // 需要任一权限
        return permissions.some(perm => checkSinglePermission(perm));
      }
    }

    return false;
  };

  return hasPermission() ? <>{children}</> : <>{fallback}</>;
};

export default PermissionWrapper;
