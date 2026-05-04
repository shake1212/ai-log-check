# Design Document

## Overview

This design enhances the route guard system with token validation, permission-based access control, proper redirect handling, and session expiration management. The solution uses React hooks for state management and integrates with the existing authentication API.

## Architecture

The enhanced route guard follows a layered approach:

1. **Auth Wrapper Layer**: Validates authentication and handles redirects
2. **Permission Layer**: Checks role-based access control
3. **API Interceptor Layer**: Handles global 401/403 responses
4. **Utility Layer**: Provides auth helper functions

### Component Flow

```
User Access Route
    ↓
Auth Wrapper
    ↓
Check Token Exists? → No → Redirect to Login (with redirect param)
    ↓ Yes
Validate Token with API
    ↓
Valid? → No → Clear Token → Redirect to Login (with message)
    ↓ Yes
Check Route Permissions
    ↓
Has Permission? → No → Show 403 Page
    ↓ Yes
Render Protected Content
```

## Components and Interfaces

### Enhanced Auth Wrapper

**File**: `src/wrappers/auth.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'umi';
import { Spin, message } from 'antd';
import { validateToken } from '@/services/authService';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        setIsValid(false);
        return;
      }
      
      try {
        // Validate token with backend
        const response = await validateToken(token);
        
        if (response.valid) {
          setIsValid(true);
        } else {
          // Token invalid, clear and redirect
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          message.warning('登录已过期，请重新登录');
          setIsValid(false);
        }
      } catch (error) {
        // Validation failed, clear and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        message.error('身份验证失败，请重新登录');
        setIsValid(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Monitor storage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && !e.newValue) {
        window.location.href = '/login';
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" tip="验证身份中..." />
      </div>
    );
  }
  
  if (!isValid) {
    const redirectUrl = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={redirectUrl} replace />;
  }
  
  return <>{children}</>;
};

export default AuthWrapper;
```

### Permission Wrapper

**File**: `src/wrappers/permission.tsx`

```typescript
import React from 'react';
import { Navigate } from 'umi';
import { Result, Button } from 'antd';
import { history } from 'umi';

interface PermissionWrapperProps {
  children: React.ReactNode;
  access?: string;
}

const PermissionWrapper: React.FC<PermissionWrapperProps> = ({ 
  children, 
  access 
}) => {
  // If no access requirement, allow all authenticated users
  if (!access) {
    return <>{children}</>;
  }
  
  // Get user from localStorage
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    return <Navigate to="/login" replace />;
  }
  
  try {
    const user = JSON.parse(userStr);
    const userRole = user.role || user.userType;
    
    // Check if user has required permission
    if (access === 'admin' && userRole !== 'admin') {
      return (
        <Result
          status="403"
          title="403"
          subTitle="抱歉，您没有权限访问此页面"
          extra={
            <Button type="primary" onClick={() => history.push('/dashboard')}>
              返回首页
            </Button>
          }
        />
      );
    }
    
    return <>{children}</>;
  } catch (error) {
    console.error('Failed to parse user data:', error);
    return <Navigate to="/login" replace />;
  }
};

export default PermissionWrapper;
```

### Auth Service

**File**: `src/services/authService.ts`

```typescript
export interface ValidateTokenResponse {
  valid: boolean;
  user?: any;
}

export async function validateToken(token: string): Promise<ValidateTokenResponse> {
  const response = await fetch('/api/auth/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Token validation failed');
  }
  
  return response.json();
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}
```

### Enhanced Login Page

**File**: `src/pages/login/index.tsx` (modifications)

```typescript
// In handleLogin function, after successful login:

if (response.ok) {
  const data = await response.json();
  
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  
  setInitialState({
    user: data.user,
    token: data.token,
    isAuthenticated: true,
  });

  message.success('登录成功！');
  
  // Handle redirect
  const searchParams = new URLSearchParams(location.search);
  const redirect = searchParams.get('redirect');
  
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
    // Valid internal redirect
    history.replace(redirect);
  } else {
    // Default redirect
    history.replace('/dashboard');
  }
}
```

### Global Request Interceptor

**File**: `src/utils/request.ts` (new or enhanced)

```typescript
import { message } from 'antd';
import { history } from 'umi';

// Add response interceptor for handling 401/403
export function setupRequestInterceptor() {
  const originalFetch = window.fetch;
  
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    
    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      message.warning('登录已过期，请重新登录');
      
      const currentPath = window.location.pathname + window.location.search;
      history.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }
    
    return response;
  };
}
```

## Data Models

### User Model

```typescript
interface User {
  id: string;
  username: string;
  role: 'admin' | 'operator';
  // or
  userType: 'admin' | 'operator';
}
```

### Auth State

```typescript
interface AuthState {
  user?: User;
  token: string;
  isAuthenticated: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Token Validation Before Access

*For any* protected route access attempt, the system should validate the token with the backend before rendering the protected content.

**Validates: Requirements 1.1, 1.3**

### Property 2: Invalid Token Cleanup

*For any* token validation failure (401, 403, or error), the system should clear both the token and user data from localStorage.

**Validates: Requirements 1.2, 4.4**

### Property 3: Redirect Preservation

*For any* unauthenticated access to a protected route, the system should preserve the original path in the redirect parameter, and after successful login, navigate to that preserved path if it's a valid internal path.

**Validates: Requirements 2.1, 2.2, 2.4**

### Property 4: Permission Enforcement

*For any* route with an access requirement, if the authenticated user lacks the required permission, the system should display a 403 page and not render the protected content.

**Validates: Requirements 3.1, 3.2**

### Property 5: Loading State Consistency

*For any* authentication check in progress, the system should display a loading indicator and not render protected content until validation completes.

**Validates: Requirements 5.1, 5.3**

## Error Handling

### Token Validation Errors

- **Network Error**: Display "网络错误，请稍后重试" and redirect to login
- **401 Unauthorized**: Display "登录已过期，请重新登录" and redirect to login
- **403 Forbidden**: Display "访问被拒绝" and redirect to login
- **500 Server Error**: Display "服务器错误" and redirect to login

### Permission Errors

- **Missing User Data**: Redirect to login
- **Invalid User Data**: Clear storage and redirect to login
- **Insufficient Permissions**: Display 403 page with "返回首页" button

### Redirect Errors

- **External URL**: Ignore and use default redirect
- **Invalid Path**: Use default redirect to /dashboard
- **Missing Redirect**: Use default redirect to /dashboard

## Testing Strategy

### Unit Tests

1. **Test token validation logic**: Mock API responses for valid/invalid tokens
2. **Test redirect URL parsing**: Verify internal vs external URL detection
3. **Test permission checking**: Verify role-based access control logic
4. **Test logout function**: Verify localStorage cleanup

### Integration Tests

1. **Test auth flow**: Login → Access protected route → Verify content renders
2. **Test expiration flow**: Login → Expire token → Access route → Verify redirect
3. **Test permission flow**: Login as operator → Access admin route → Verify 403
4. **Test redirect flow**: Access protected route → Login → Verify redirect to original route

### Manual Testing

1. Access protected route without login → Should redirect to login with redirect param
2. Login successfully → Should redirect to original route
3. Let token expire → Access any route → Should show expiration message and redirect
4. Login as operator → Access /system → Should show 403 page
5. Login as admin → Access /system → Should show system page
6. Logout → Should clear storage and redirect to login
