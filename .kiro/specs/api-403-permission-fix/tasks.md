# Implementation Plan: API 403 Permission Fix

## Overview

This implementation fixes the 403 Forbidden errors by replacing native `fetch()` calls with the configured `request` utility that automatically adds authentication headers. The root cause is simple: the events page bypasses the authentication infrastructure by using fetch() directly.

## Tasks

- [x] 1. Update events page to use request utility
  - Add import for request utility from `@/utils/request`
  - Replace all `fetch()` calls with appropriate `request.get()`, `request.post()`, `request.put()` methods
  - Update response handling (remove `.json()` calls since request utility auto-extracts data)
  - Update error handling to work with axios error structure
  - Remove custom timeout wrapper since axios has built-in timeout
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ]* 1.1 Write unit tests for updated API calls
  - Test that request utility is called instead of fetch
  - Test that responses are handled correctly
  - Test that errors are handled correctly
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [x] 2. Verify request utility configuration
  - Review `ai-log-system/src/utils/request.ts` configuration
  - Ensure request interceptor adds Authorization header
  - Ensure response interceptor handles 401/403 errors
  - Verify timeout is set to 30 seconds
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 2.1 Write property test for Authorization header attachment
  - **Property 1: Authorization Header Attachment**
  - **Validates: Requirements 2.1, 2.2**
  - Generate random tokens and verify they are added to requests

- [ ]* 2.2 Write property test for automatic data extraction
  - **Property 2: Automatic Data Extraction**
  - **Validates: Requirements 1.4**
  - Generate random response data and verify it's extracted correctly

- [ ]* 2.3 Write property test for authentication error handling
  - **Property 3: Authentication Error Handling**
  - **Validates: Requirements 2.3, 3.1**
  - Test that 401/403 responses trigger redirect to login

- [x] 3. Test events page functionality
  - Login to the application
  - Navigate to events page
  - Verify dashboard stats load without 403 errors
  - Verify event search works correctly
  - Verify trend charts load correctly
  - Check browser DevTools Network tab for Authorization headers
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4_

- [x] 4. Checkpoint - Verify events page works correctly
  - Ensure all API calls succeed
  - Ensure no 403 errors in console
  - Ensure Authorization headers are present in all requests
  - Ask the user if questions arise

- [x] 5. Search for other pages with similar issues
  - Search all page files in `ai-log-system/src/pages/` for `fetch()` usage
  - Identify pages making API calls with fetch() instead of request utility
  - Create a list of pages that need to be updated
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 6. Update other pages if needed
  - For each page identified in step 5, replace fetch() with request utility
  - Follow the same pattern as events page update
  - Test each updated page
  - _Requirements: 4.2, 4.3_

- [x] 7. Add consistent error handling
  - Ensure all pages display appropriate error messages for 401/403
  - Ensure all pages display appropriate error messages for network errors
  - Ensure all pages display appropriate error messages for timeouts
  - Ensure all pages log errors to console for debugging
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Final integration testing
  - Test complete authentication flow: login → navigate to events → API calls succeed
  - Test authentication failure: clear token → navigate to events → redirect to login
  - Test all updated pages work correctly
  - Verify no 403 errors anywhere in the application
  - _Requirements: All_

- [x] 9. Final Checkpoint - Ensure all tests pass
  - Run all unit tests
  - Run all property tests
  - Manually test all updated pages
  - Verify 403 errors are completely resolved
  - Document which pages were updated
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The core fix is simple: replace fetch() with request utility
- The request utility already has all necessary authentication logic
- No backend changes are needed
- Property tests use fast-check for TypeScript
