# Route Guard Enhancement - Testing Guide

## Prerequisites

Before testing, ensure:
1. Backend API has `/api/auth/validate` endpoint implemented
2. Backend returns proper 401 responses for expired tokens
3. User data includes `role` or `userType` field (e.g., 'admin', 'operator')

## Test Scenarios

### 1. Authentication Flow Tests

#### Test 1.1: Unauthenticated Access
**Steps:**
1. Clear localStorage (or use incognito mode)
2. Navigate to `http://localhost:8000/dashboard`
3. **Expected:** Redirected to `/login?redirect=%2Fdashboard`

#### Test 1.2: Login with Redirect
**Steps:**
1. From the redirected login page (with redirect parameter)
2. Login with valid credentials (e.g., admin / 123456)
3. **Expected:** Redirected to `/dashboard` (the original destination)

#### Test 1.3: Login without Redirect
**Steps:**
1. Navigate directly to `http://localhost:8000/login`
2. Login with valid credentials
3. **Expected:** Redirected to `/dashboard` (default)

#### Test 1.4: Invalid Redirect Parameter
**Steps:**
1. Navigate to `http://localhost:8000/login?redirect=https://evil.com`
2. Login with valid credentials
3. **Expected:** Redirected to `/dashboard` (external URLs rejected)

### 2. Token Validation Flow Tests

#### Test 2.1: Valid Token
**Steps:**
1. Login successfully
2. Navigate to any protected route (e.g., `/alerts`)
3. **Expected:** 
   - Brief loading spinner appears
   - Content loads successfully
   - No error messages

#### Test 2.2: Invalid Token
**Steps:**
1. Login successfully
2. Manually modify token in localStorage to invalid value
3. Refresh the page or navigate to another route
4. **Expected:**
   - Loading spinner appears
   - Error message: "身份验证失败，请重新登录"
   - Redirected to login with redirect parameter

#### Test 2.3: Expired Token (Backend 401)
**Steps:**
1. Login successfully
2. Wait for token to expire (or manually trigger backend to return 401)
3. Make any API call or navigate to a route
4. **Expected:**
   - Warning message: "登录已过期，请重新登录"
   - Redirected to login with current path preserved

#### Test 2.4: Loading State
**Steps:**
1. Login successfully
2. Open DevTools Network tab and throttle to "Slow 3G"
3. Navigate to a protected route
4. **Expected:**
   - Loading spinner with "验证身份中..." text appears
   - No content flashing before validation completes

### 3. Permission Control Flow Tests

#### Test 3.1: Admin Access to System Page
**Steps:**
1. Login as admin (admin / 123456)
2. Navigate to `http://localhost:8000/system`
3. **Expected:** System page loads successfully

#### Test 3.2: Operator Access to System Page (403)
**Steps:**
1. Login as operator (operator / 123456)
2. Navigate to `http://localhost:8000/system`
3. **Expected:**
   - 403 error page displays
   - Message: "抱歉，您没有权限访问此页面"
   - "返回首页" button is visible

#### Test 3.3: Return Home from 403
**Steps:**
1. From the 403 page (Test 3.2)
2. Click "返回首页" button
3. **Expected:** Navigated to `/dashboard`

#### Test 3.4: Routes Without Access Requirement
**Steps:**
1. Login as operator (operator / 123456)
2. Navigate to `/dashboard`, `/alerts`, `/events`, etc.
3. **Expected:** All routes load successfully (no permission restrictions)

### 4. Session Expiration Tests

#### Test 4.1: Token Expiration During API Call
**Steps:**
1. Login successfully
2. Make the backend return 401 for next API call
3. Trigger any API call (e.g., load dashboard data)
4. **Expected:**
   - Warning message: "登录已过期，请重新登录"
   - Redirected to login with current path preserved
   - localStorage cleared (token and user removed)

#### Test 4.2: Multiple 401 Responses
**Steps:**
1. Login successfully
2. Make multiple API calls that return 401
3. **Expected:**
   - Only one warning message appears
   - Only one redirect occurs
   - No duplicate messages or redirects

### 5. Logout Tests

#### Test 5.1: Manual Logout
**Steps:**
1. Login successfully
2. Call `logout()` function from authService (or implement logout button)
3. **Expected:**
   - localStorage cleared (token and user removed)
   - Redirected to `/login`
   - No redirect parameter preserved

#### Test 5.2: Storage Event Listener
**Steps:**
1. Login successfully in Tab A
2. Open Tab B with the same application
3. In Tab A, clear localStorage or logout
4. **Expected:** Tab B automatically redirects to login

## Backend Requirements

For full testing, the backend needs:

### 1. Token Validation Endpoint

```
POST /api/auth/validate
Headers: Authorization: Bearer <token>

Response (200 OK):
{
  "valid": true,
  "user": {
    "id": "1",
    "username": "admin",
    "role": "admin"
  }
}

Response (401 Unauthorized):
{
  "valid": false,
  "message": "Token expired"
}
```

### 2. User Data Structure

User object should include:
```json
{
  "id": "1",
  "username": "admin",
  "role": "admin"  // or "userType": "admin"
}
```

Supported roles:
- `admin`: Full access to all routes
- `operator`: Limited access (no /system route)

## Common Issues

### Issue 1: Infinite Redirect Loop
**Symptom:** Page keeps redirecting between login and protected route
**Cause:** Token validation always fails
**Solution:** Check backend `/api/auth/validate` endpoint is working

### Issue 2: 403 Page Not Showing
**Symptom:** Permission wrapper not working
**Cause:** User data missing `role` or `userType` field
**Solution:** Ensure backend returns user role in login response

### Issue 3: Loading Spinner Never Disappears
**Symptom:** Stuck on "验证身份中..." screen
**Cause:** Token validation API call hanging or failing
**Solution:** Check network tab for API errors, ensure backend is running

### Issue 4: Redirect Parameter Lost
**Symptom:** After login, always goes to dashboard instead of original route
**Cause:** Redirect parameter not preserved or parsed correctly
**Solution:** Check URL has `?redirect=` parameter, verify login page redirect logic

## Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ Proper loading states
- ✅ Correct redirects
- ✅ Appropriate error messages
- ✅ localStorage properly managed
- ✅ Permission checks working
- ✅ No content flashing
- ✅ No infinite loops
