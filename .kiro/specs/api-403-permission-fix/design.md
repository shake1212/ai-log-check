# Design Document

## Overview

The 403 Forbidden errors are caused by the events page using native `fetch()` calls instead of the configured `request` utility. The `request` utility (an Axios instance) has interceptors that automatically add the Authorization header with the Bearer token to all requests. When using native `fetch()`, these headers are not added, causing the backend to reject the requests as unauthenticated.

The solution is straightforward:
1. Replace all `fetch()` calls in the events page with the `request` utility
2. Verify the request utility is properly configured
3. Check other pages for similar issues

## Architecture

### Current Architecture (Problematic)

```
Events Page
    ↓ (uses fetch())
    ↓ (NO Authorization header)
    ↓
Backend API
    ↓ (TokenAuthFilter checks for token)
    ↓ (No token found)
    ↓
403 Forbidden
```

### Target Architecture (Fixed)

```
Events Page
    ↓ (uses request utility)
    ↓ (request interceptor adds Authorization header)
    ↓
Backend API
    ↓ (TokenAuthFilter validates token)
    ↓ (Token valid, sets authentication)
    ↓
200 OK with data
```

## Components and Interfaces

### Request Utility (Already Exists)

Location: `ai-log-system/src/utils/request.ts`

Current implementation:
```typescript
import axios from 'axios';

const request = axios.create({
  baseURL: '',
  timeout: 30000,
});

// Request interceptor - adds token
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handles errors
request.interceptors.response.use(
  (response) => {
    return response.data;  // Auto-extract data
  },
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default request;
```

### Events Page Refactoring

**Before (using fetch):**
```typescript
const response = await fetch('/api/events/dashboard-stats');
if (response.ok) {
  const data = await response.json();
  // use data
}
```

**After (using request utility):**
```typescript
import request from '@/utils/request';

const data = await request.get('/api/events/dashboard-stats');
// data is already extracted by response interceptor
// use data directly
```

### API Method Mapping

| fetch() method | request utility method | Notes |
|---------------|----------------------|-------|
| `fetch(url)` | `request.get(url)` | GET request |
| `fetch(url, {method: 'POST', body: JSON.stringify(data)})` | `request.post(url, data)` | POST with JSON body |
| `fetch(url, {method: 'PUT', body: JSON.stringify(data)})` | `request.put(url, data)` | PUT with JSON body |
| `fetch(url, {method: 'DELETE'})` | `request.delete(url)` | DELETE request |

### Timeout Handling

**Before (using fetch with custom timeout):**
```typescript
const withTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
  ]);
};

const response = await withTimeout(fetch('/api/events/search'), 5000);
```

**After (using request utility with axios timeout):**
```typescript
// Option 1: Use default timeout (30s)
const data = await request.post('/api/events/search', searchParams);

// Option 2: Override timeout for specific request
const data = await request.post('/api/events/search', searchParams, {
  timeout: 5000
});
```

## Data Models

No changes to data models. The request utility returns the same data structure as fetch() after JSON parsing.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Authorization Header Attachment

*For any* API request made using the request utility when a token exists in localStorage, the request should include an Authorization header with the format `Bearer {token}`.

**Validates: Requirements 2.1, 2.2**

### Property 2: Automatic Data Extraction

*For any* successful API response (status 200-299), the request utility should automatically extract and return `response.data`, not the full response object.

**Validates: Requirements 1.4**

### Property 3: Authentication Error Handling

*For any* API response with status 401 or 403, the request utility should clear localStorage and redirect to the login page.

**Validates: Requirements 2.3, 3.1**

### Property 4: Request Method Equivalence

*For any* API endpoint, using `request.get(url)` should produce the same result as `fetch(url)` with the Authorization header manually added.

**Validates: Requirements 1.1, 1.3**

## Error Handling

### Scenario 1: No Token in localStorage

- Request utility sends request without Authorization header
- Backend returns 403
- Response interceptor redirects to login
- User sees login page

### Scenario 2: Expired Token

- Request utility sends request with expired token
- Backend returns 403
- Response interceptor redirects to login
- User sees login page

### Scenario 3: Network Error

- Request fails before reaching backend
- Axios throws network error
- Page catches error and displays error message
- User sees "Network error" message

### Scenario 4: Timeout

- Request takes longer than configured timeout
- Axios throws timeout error
- Page catches error and displays timeout message
- User sees "Request timed out" message

## Testing Strategy

### Unit Tests

**Request Utility Tests:**
- Test that request interceptor adds Authorization header when token exists
- Test that request interceptor skips Authorization header when no token
- Test that response interceptor extracts data from successful responses
- Test that response interceptor redirects on 401/403 errors
- Test that response interceptor preserves error details for other errors

**Events Page Tests:**
- Test that API calls use request utility instead of fetch
- Test that error handling works correctly with request utility
- Test that loading states are managed correctly
- Test that data is displayed correctly after successful requests

### Integration Tests

- Test full flow: login → store token → make API request → receive data
- Test authentication failure: expired token → API request → redirect to login
- Test network error: disconnect → API request → error message displayed
- Test timeout: slow API → timeout → error message displayed

### Manual Testing Checklist

1. Login with valid credentials
2. Navigate to events page
3. Verify dashboard stats load correctly (no 403 errors)
4. Verify event search works correctly
5. Verify trend charts load correctly
6. Open browser DevTools Network tab and verify Authorization header is present
7. Clear localStorage token and verify redirect to login on next API call
8. Check browser console for any errors

## Implementation Notes

### Files to Modify

1. **ai-log-system/src/pages/events/index.tsx**
   - Add import: `import request from '@/utils/request';`
   - Replace all `fetch()` calls with appropriate `request` methods
   - Update response handling (no need for `.json()` call)
   - Update error handling to work with axios errors

### Axios Error Structure

When using the request utility, errors have a different structure:

```typescript
try {
  const data = await request.get('/api/events/dashboard-stats');
} catch (error) {
  // Axios error structure
  if (error.response) {
    // Server responded with error status
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
  } else if (error.request) {
    // Request made but no response
    console.error('No response received');
  } else {
    // Error setting up request
    console.error('Error:', error.message);
  }
}
```

### Response Data Structure

With fetch():
```typescript
const response = await fetch('/api/events/dashboard-stats');
const data = await response.json();  // Need to call .json()
```

With request utility:
```typescript
const data = await request.get('/api/events/dashboard-stats');
// data is already parsed, no .json() needed
```

## Migration Strategy

1. **Phase 1: Update events page**
   - Replace fetch() with request utility
   - Test all API calls work correctly
   - Verify no 403 errors

2. **Phase 2: Search for other pages**
   - Search all page files for fetch() usage
   - Identify pages making API calls with fetch()
   - Update those pages to use request utility

3. **Phase 3: Verification**
   - Test all pages that were updated
   - Verify authentication works consistently
   - Check for any remaining 403 errors
