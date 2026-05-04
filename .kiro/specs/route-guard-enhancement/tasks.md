# Implementation Plan: Route Guard Enhancement

## Overview

Enhance the route guard system with token validation, permission-based access control, proper redirect handling, and session expiration management.

## Tasks

- [x] 1. Create auth service with token validation
  - Create `src/services/authService.ts` file
  - Implement `validateToken` function that calls `/api/auth/validate`
  - Implement `logout` function that clears storage and redirects
  - Add TypeScript interfaces for API responses
  - _Requirements: 1.1, 6.1, 6.2, 6.3_

- [x] 2. Enhance auth wrapper with token validation
  - Add loading state to track validation progress
  - Add isValid state to track authentication status
  - Implement token validation on mount using authService
  - Display loading spinner during validation
  - Handle validation errors by clearing storage and showing message
  - Preserve redirect parameter in login URL
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.3, 4.4, 5.1, 5.2, 5.3_

- [x] 3. Create permission wrapper component
  - Create `src/wrappers/permission.tsx` file
  - Implement role-based access control logic
  - Check user role from localStorage
  - Display 403 Result page for insufficient permissions
  - Allow access when no permission requirement specified
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Update route configuration with permission wrapper
  - Add permission wrapper to routes that require admin access
  - Update `/system` route to use permission wrapper
  - Ensure nested wrapper order (auth → permission → content)
  - _Requirements: 3.1_

- [x] 5. Enhance login page redirect handling
  - Parse redirect parameter from URL query string
  - Validate redirect URL is internal and safe
  - Navigate to redirect URL after successful login
  - Fall back to /dashboard if no valid redirect
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6. Create global request interceptor for 401 handling
  - Create `src/utils/request.ts` if it doesn't exist
  - Implement fetch interceptor to catch 401 responses
  - Clear storage and show expiration message on 401
  - Preserve current path for post-login redirect
  - Initialize interceptor in app.tsx
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 7. Create 403 forbidden page component
  - Create `src/pages/403/index.tsx` file
  - Display user-friendly 403 error message
  - Add "返回首页" button that navigates to /dashboard
  - Style consistently with application theme
  - _Requirements: 3.2_

- [x] 8. Add route for 403 page
  - Add 403 route to config/config.ts
  - Set layout: false for 403 page
  - Place before the catch-all 404 route
  - _Requirements: 3.2_

- [x] 9. Test authentication flow
  - Test accessing protected route without token redirects to login
  - Test login with redirect parameter navigates to original route
  - Test login without redirect parameter navigates to dashboard
  - Test invalid redirect parameter falls back to dashboard
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 10. Test token validation flow
  - Test valid token allows access to protected routes
  - Test invalid token clears storage and redirects to login
  - Test expired token shows expiration message
  - Test loading spinner displays during validation
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 5.1, 5.2_

- [x] 11. Test permission control flow
  - Test admin user can access /system route
  - Test operator user sees 403 page for /system route
  - Test 403 page "返回首页" button works
  - Test routes without access requirement allow all authenticated users
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

## Notes

- Token validation requires backend API endpoint `/api/auth/validate`
- Permission checking relies on user.role or user.userType field
- All existing functionality should continue to work
- Loading states prevent content flashing during auth checks
