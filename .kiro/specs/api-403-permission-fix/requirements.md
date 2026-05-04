# Requirements Document

## Introduction

The frontend application is receiving 403 Forbidden errors when accessing several API endpoints (`/api/events/search`, `/api/events/dashboard-stats`, `/api/events/statistics/timeseries`). Investigation reveals that the events page (`ai-log-system/src/pages/events/index.tsx`) is using native `fetch()` calls instead of the `request` utility from `@/utils/request`, which means the Authorization header with the Bearer token is NOT being automatically attached to these requests.

Other pages and services that use the `request` utility (like `ruleManagementApi.ts`, `ruleEngineApi.ts`, `api.ts`) work correctly because the request interceptor automatically adds the token.

## Glossary

- **request utility**: Axios instance configured in `@/utils/request.ts` with interceptors that automatically add Authorization headers
- **fetch()**: Native browser API for HTTP requests that does NOT automatically add authentication headers
- **Authorization header**: HTTP header containing the Bearer token in format `Bearer jwt-token-{timestamp}`
- **Bearer Token**: Authentication token in format `jwt-token-{timestamp}` stored in localStorage
- **request interceptor**: Axios middleware that automatically adds the Authorization header to all requests

## Requirements

### Requirement 1: Replace fetch() with request utility in events page

**User Story:** As a frontend user, I want the events page to use the request utility instead of native fetch(), so that my authentication token is automatically included in API requests.

#### Acceptance Criteria

1. THE events page SHALL replace all `fetch()` calls with the `request` utility from `@/utils/request`
2. THE events page SHALL import the request utility at the top of the file
3. WHEN making API requests, THE events page SHALL use `request.get()`, `request.post()`, `request.put()` methods instead of `fetch()`
4. THE events page SHALL handle response data correctly since the request utility automatically extracts `response.data`
5. THE events page SHALL maintain all existing error handling logic
6. THE events page SHALL maintain all existing timeout logic using axios timeout configuration

### Requirement 2: Verify request utility configuration

**User Story:** As a developer, I want to ensure the request utility is properly configured, so that all API requests include authentication headers.

#### Acceptance Criteria

1. THE request utility SHALL have a request interceptor that adds the Authorization header from localStorage
2. THE request utility SHALL format the Authorization header as `Bearer {token}`
3. THE request utility SHALL have a response interceptor that handles 401/403 errors by redirecting to login
4. THE request utility SHALL automatically extract response.data in the response interceptor
5. THE request utility SHALL have a timeout configuration of at least 30 seconds

### Requirement 3: Add consistent error handling

**User Story:** As a frontend user, I want consistent error messages when API requests fail, so that I understand what went wrong.

#### Acceptance Criteria

1. WHEN an API request fails with 401 or 403, THE events page SHALL display a message indicating authentication failure
2. WHEN an API request fails with a network error, THE events page SHALL display a message indicating network issues
3. WHEN an API request times out, THE events page SHALL display a message indicating the request timed out
4. THE events page SHALL log all API errors to the console for debugging

### Requirement 4: Test other pages for similar issues

**User Story:** As a developer, I want to identify and fix any other pages using fetch() instead of the request utility, so that all pages have consistent authentication.

#### Acceptance Criteria

1. THE developer SHALL search all page files for direct `fetch()` usage
2. WHEN a page uses `fetch()` for API calls, THE developer SHALL replace it with the request utility
3. THE developer SHALL verify that pages using the request utility or service files work correctly
4. THE developer SHALL document which pages were updated
