# Error Handling Guide

This guide explains how to use the centralized error handling utility across the application.

## Overview

The error handling utility (`errorHandler.ts`) provides consistent error handling for all API calls and operations throughout the application. It automatically:

- Identifies error types (authentication, network, timeout, server errors)
- Displays user-friendly error messages
- Logs detailed error information to the console for debugging
- Handles authentication errors by redirecting to login

## Error Types

The utility recognizes the following error types:

1. **AUTHENTICATION** (401/403) - Authentication or authorization failures
2. **NETWORK** - Network connection failures
3. **TIMEOUT** - Request timeout errors
4. **SERVER** - Server errors (4xx, 5xx status codes)
5. **UNKNOWN** - Other unclassified errors

## Usage

### Basic Error Handling

Use `handleError()` for standard error handling with user feedback:

```typescript
import { handleError } from '@/utils/errorHandler';

try {
  const data = await request.get('/api/events/dashboard-stats');
  // Process data
} catch (error: any) {
  handleError(error, '获取仪表板统计');
}
```

This will:
- Log the error to console with context
- Display an appropriate error message to the user
- Handle authentication errors automatically

### Silent Error Logging

Use `logError()` when you want to log errors without showing user messages:

```typescript
import { logError } from '@/utils/errorHandler';

try {
  const data = await request.get('/api/events/statistics');
  // Process data
} catch (error: any) {
  logError(error, '获取统计信息');
  // Handle error silently
}
```

### Custom Error Messages

Override the default error message:

```typescript
try {
  const data = await request.post('/api/events/collect');
  message.success('日志收集任务已启动');
} catch (error: any) {
  handleError(error, '触发日志收集', {
    customMessage: '无法启动日志收集，请检查系统状态'
  });
}
```

### Suppress User Messages

Log errors without displaying messages to users:

```typescript
try {
  const data = await request.get('/api/events/statistics');
  // Process data
} catch (error: any) {
  handleError(error, '加载统计信息', {
    showMessage: false
  });
}
```

### Custom Authentication Error Handling

Provide a custom handler for authentication errors:

```typescript
try {
  const data = await request.get('/api/protected-resource');
  // Process data
} catch (error: any) {
  handleError(error, '访问受保护资源', {
    onAuthError: () => {
      // Custom logic before redirect
      localStorage.clear();
      window.location.href = '/login';
    }
  });
}
```

## Error Messages

The utility provides user-friendly error messages in Chinese:

| Error Type | Message |
|-----------|---------|
| Authentication (401/403) | `{context}: 身份验证失败，请重新登录` |
| Timeout | `{context}: 请求超时，请稍后重试` |
| Network | `{context}: 网络连接失败，请检查网络连接` |
| Server (5xx) | `{context}: 服务器错误 ({status})` |
| Server (4xx) | `{context}: 请求错误 ({status})` |
| Unknown | `{context}: 操作失败，请稍后重试` |

## Console Logging

All errors are logged to the console with detailed information:

```
[获取事件列表] Error: {
  type: 'TIMEOUT',
  message: '获取事件列表: 请求超时，请稍后重试',
  statusCode: undefined,
  error: AxiosError {...}
}
```

For errors with responses, additional details are logged:

```
[获取事件列表] Response: {
  status: 500,
  data: {...},
  headers: {...}
}
```

## Best Practices

### 1. Always Provide Context

Always provide a descriptive context string that explains what operation failed:

```typescript
// Good
handleError(error, '获取事件列表');
handleError(error, '更新规则状态');
handleError(error, '删除用户');

// Bad
handleError(error, 'API调用');
handleError(error, '操作');
```

### 2. Use Appropriate Error Handling

Choose the right function based on your needs:

- Use `handleError()` for user-facing operations that need feedback
- Use `logError()` for background operations or when you handle errors manually
- Use `showMessage: false` for operations where you want logging but no user notification

### 3. Check Mounted State

In React components, always check if the component is still mounted before calling error handlers:

```typescript
const isMountedRef = useRef(true);

useEffect(() => {
  isMountedRef.current = true;
  
  return () => {
    isMountedRef.current = false;
  };
}, []);

const fetchData = async () => {
  try {
    const data = await request.get('/api/data');
    if (!isMountedRef.current) return;
    setData(data);
  } catch (error: any) {
    if (isMountedRef.current) {
      handleError(error, '获取数据');
    }
  }
};
```

### 4. Type Error Parameters

Always type error parameters as `any` to access error properties:

```typescript
// Good
} catch (error: any) {
  handleError(error, '操作失败');
}

// Bad
} catch (error) {
  handleError(error, '操作失败');
}
```

## Migration from Old Error Handling

### Before

```typescript
} catch (error) {
  console.error('获取事件列表错误:', error);
  if (error.response) {
    message.error(`获取事件列表失败: ${error.response.status}`);
  } else if (error.code === 'ECONNABORTED') {
    message.error('获取事件列表超时');
  } else {
    message.error('获取事件列表失败，请检查网络连接');
  }
}
```

### After

```typescript
} catch (error: any) {
  handleError(error, '获取事件列表');
}
```

## Updated Pages

The following pages have been updated to use the centralized error handler:

- ✅ `ai-log-system/src/pages/events/index.tsx`
- ✅ `ai-log-system/src/pages/wmi/index.tsx`
- ✅ `ai-log-system/src/pages/rules/index.tsx`
- ✅ `ai-log-system/src/pages/alerts/alerts.tsx`
- ✅ `ai-log-system/src/pages/system/index.tsx`
- ✅ `ai-log-system/src/pages/log-collector/index.tsx`

## Testing

To test error handling:

1. **Authentication Errors**: Clear localStorage token and make an API call
2. **Network Errors**: Disconnect from network and make an API call
3. **Timeout Errors**: Set a very short timeout and make a slow API call
4. **Server Errors**: Make an API call to a non-existent endpoint

Check the browser console for detailed error logs and verify that appropriate user messages are displayed.
