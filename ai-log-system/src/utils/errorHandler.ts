import { message } from 'antd';

/**
 * Error types for consistent error handling
 */
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Error details interface
 */
export interface ErrorDetails {
  type: ErrorType;
  message: string;
  statusCode?: number;
  originalError?: any;
}

/**
 * Determine error type from axios error
 */
export const getErrorType = (error: any): ErrorType => {
  // Authentication errors (401/403)
  if (error.response?.status === 401 || error.response?.status === 403) {
    return ErrorType.AUTHENTICATION;
  }
  
  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return ErrorType.TIMEOUT;
  }
  
  // Network errors (no response received)
  if (error.request && !error.response) {
    return ErrorType.NETWORK;
  }
  
  // Server errors (4xx, 5xx)
  if (error.response) {
    return ErrorType.SERVER;
  }
  
  return ErrorType.UNKNOWN;
};

/**
 * Get user-friendly error message based on error type
 */
export const getErrorMessage = (error: any, context?: string): string => {
  const errorType = getErrorType(error);
  const contextPrefix = context ? `${context}: ` : '';
  
  switch (errorType) {
    case ErrorType.AUTHENTICATION:
      return `${contextPrefix}身份验证失败，请重新登录`;
    
    case ErrorType.TIMEOUT:
      return `${contextPrefix}请求超时，请稍后重试`;
    
    case ErrorType.NETWORK:
      return `${contextPrefix}网络连接失败，请检查网络连接`;
    
    case ErrorType.SERVER:
      const status = error.response?.status;
      const serverMessage = error.response?.data?.message || error.response?.data?.error;
      
      if (serverMessage) {
        return `${contextPrefix}${serverMessage}`;
      }
      
      if (status >= 500) {
        return `${contextPrefix}服务器错误 (${status})`;
      }
      
      if (status >= 400) {
        return `${contextPrefix}请求错误 (${status})`;
      }
      
      return `${contextPrefix}操作失败 (${status})`;
    
    case ErrorType.UNKNOWN:
    default:
      return `${contextPrefix}操作失败，请稍后重试`;
  }
};

/**
 * Extract detailed error information
 */
export const getErrorDetails = (error: any): ErrorDetails => {
  const type = getErrorType(error);
  const message = getErrorMessage(error);
  const statusCode = error.response?.status;
  
  return {
    type,
    message,
    statusCode,
    originalError: error
  };
};

/**
 * Log error to console with context
 */
export const logError = (error: any, context: string): void => {
  const details = getErrorDetails(error);
  
  console.error(`[${context}] Error:`, {
    type: details.type,
    message: details.message,
    statusCode: details.statusCode,
    error: details.originalError
  });
  
  // Log additional details for debugging
  if (error.response) {
    console.error(`[${context}] Response:`, {
      status: error.response.status,
      data: error.response.data,
      headers: error.response.headers
    });
  } else if (error.request) {
    console.error(`[${context}] Request:`, error.request);
  }
};

/**
 * Handle error with consistent UI feedback and logging
 * @param error - The error object
 * @param context - Context description (e.g., "获取事件列表")
 * @param options - Additional options
 */
export const handleError = (
  error: any,
  context: string,
  options?: {
    showMessage?: boolean;
    customMessage?: string;
    onAuthError?: () => void;
  }
): ErrorDetails => {
  const { showMessage = true, customMessage, onAuthError } = options || {};
  
  // Log error
  logError(error, context);
  
  // Get error details
  const details = getErrorDetails(error);
  
  // Handle authentication errors
  if (details.type === ErrorType.AUTHENTICATION && onAuthError) {
    onAuthError();
  }
  
  // Show user message
  if (showMessage) {
    const displayMessage = customMessage || details.message;
    message.error(displayMessage);
  }
  
  return details;
};

/**
 * Create a standardized error handler for API calls
 * @param context - Context description
 * @param options - Handler options
 */
export const createErrorHandler = (
  context: string,
  options?: {
    showMessage?: boolean;
    customMessage?: string;
    onAuthError?: () => void;
  }
) => {
  return (error: any): ErrorDetails => {
    return handleError(error, context, options);
  };
};
