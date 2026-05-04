# Manual Testing Guide: Events Page Functionality

## Prerequisites
- Backend server must be running
- Frontend development server must be running
- Valid user credentials for login

## Test Execution Steps

### 1. Login to the Application

**Steps:**
1. Open browser and navigate to the application URL (typically `http://localhost:8000` or similar)
2. Enter valid credentials
3. Click login button
4. Verify successful login and redirect to dashboard

**Expected Result:**
- ✅ Login successful
- ✅ Token stored in localStorage
- ✅ Redirected to main dashboard

---

### 2. Navigate to Events Page

**Steps:**
1. From the main dashboard, click on "Events" or "事件" in the navigation menu
2. Wait for the page to load

**Expected Result:**
- ✅ Events page loads without errors
- ✅ No 403 Forbidden errors in browser console
- ✅ Loading indicators appear while data is being fetched

---

### 3. Verify Dashboard Stats Load Without 403 Errors

**Steps:**
1. Open Browser DevTools (F12 or Right-click → Inspect)
2. Go to the "Console" tab
3. Go to the "Network" tab
4. Observe the API calls being made
5. Look for the `/api/events/dashboard-stats` request

**Expected Result:**
- ✅ `/api/events/dashboard-stats` request returns 200 OK (not 403)
- ✅ Dashboard statistics cards display data:
  - Total logs count
  - Today's logs count
  - Anomaly count
  - Average daily events
- ✅ No error messages in console
- ✅ No red error indicators on the page

**What to Check in Network Tab:**
- Status Code: Should be `200` (not `403`)
- Request Headers: Should include `Authorization: Bearer jwt-token-{timestamp}`
- Response: Should contain JSON data with statistics

---

### 4. Verify Event Search Works Correctly

**Steps:**
1. In the search form at the top of the events page:
   - Select a time range (or leave default 7 days)
   - Optionally select event type
   - Optionally select severity level
   - Optionally enter a keyword
2. Click the "Search" or "搜索" button
3. Observe the Network tab for `/api/events/search` request

**Expected Result:**
- ✅ `/api/events/search` request returns 200 OK (not 403)
- ✅ Request includes Authorization header
- ✅ Event table updates with search results
- ✅ Pagination works correctly
- ✅ If no results found, appropriate message is displayed
- ✅ No console errors

**Test Variations:**
- Search with only time range
- Search with event type filter
- Search with severity filter
- Search with keyword
- Search with combination of filters
- Search with no filters (should show all events)

---

### 5. Verify Trend Charts Load Correctly

**Steps:**
1. On the events page, look for the "Trends" or "趋势" tab/section
2. Click on it if it's a separate tab
3. Observe the Network tab for `/api/events/statistics/timeseries` request
4. Wait for charts to render

**Expected Result:**
- ✅ `/api/events/statistics/timeseries` request returns 200 OK (not 403)
- ✅ Request includes Authorization header
- ✅ Trend charts display data:
  - Event count over time
  - Anomaly count over time
  - Anomaly rate over time
- ✅ Charts render without errors
- ✅ No console errors

---

### 6. Check Browser DevTools Network Tab for Authorization Headers

**Steps:**
1. Keep DevTools Network tab open
2. Perform various actions on the events page (search, pagination, etc.)
3. For each API request, click on it in the Network tab
4. Go to the "Headers" section
5. Look under "Request Headers"

**Expected Result:**
- ✅ ALL API requests to `/api/events/*` include the Authorization header
- ✅ Authorization header format: `Bearer jwt-token-{timestamp}`
- ✅ Token value matches what's stored in localStorage (check Application → Local Storage)

**API Endpoints to Verify:**
- `/api/events/dashboard-stats`
- `/api/events/search`
- `/api/events/statistics/timeseries`
- `/api/events/{id}` (when clicking on event details)
- `/api/events/recent` (if used)

---

## Additional Verification Tests

### Test 7: Event Details Modal

**Steps:**
1. Click on any event row in the table
2. Observe the Network tab for `/api/events/{id}` request
3. Verify event details modal opens

**Expected Result:**
- ✅ Request returns 200 OK with Authorization header
- ✅ Event details modal displays complete information
- ✅ No errors in console

### Test 8: Pagination

**Steps:**
1. If there are multiple pages of events, click on page 2, 3, etc.
2. Observe Network tab for each pagination request

**Expected Result:**
- ✅ Each pagination request includes Authorization header
- ✅ Data loads correctly for each page
- ✅ No 403 errors

### Test 9: Refresh/Reload

**Steps:**
1. Click any refresh button on the page
2. Or press F5 to reload the entire page
3. Verify data reloads correctly

**Expected Result:**
- ✅ All API requests include Authorization header
- ✅ Data reloads successfully
- ✅ No 403 errors

---

## Error Scenarios to Test

### Test 10: Expired Token

**Steps:**
1. Open DevTools → Application → Local Storage
2. Delete or modify the token value
3. Try to perform any action on the events page

**Expected Result:**
- ✅ API returns 401 or 403
- ✅ User is redirected to login page
- ✅ Token and user data are cleared from localStorage

### Test 11: Network Error

**Steps:**
1. Open DevTools → Network tab
2. Enable "Offline" mode
3. Try to perform any action

**Expected Result:**
- ✅ Appropriate error message displayed
- ✅ User is informed about network issues
- ✅ No application crash

---

## Success Criteria

All of the following must be true:

- ✅ No 403 Forbidden errors anywhere on the events page
- ✅ All API requests include Authorization header with Bearer token
- ✅ Dashboard statistics load and display correctly
- ✅ Event search works with all filter combinations
- ✅ Trend charts load and display correctly
- ✅ Event details modal works correctly
- ✅ Pagination works correctly
- ✅ Error handling works appropriately (expired token → redirect to login)
- ✅ No console errors during normal operation

---

## Troubleshooting

### If you see 403 errors:
1. Check if token exists in localStorage
2. Check if Authorization header is present in request
3. Check if token format is correct: `Bearer jwt-token-{timestamp}`
4. Verify backend is running and accessible

### If data doesn't load:
1. Check Network tab for actual API responses
2. Check console for JavaScript errors
3. Verify backend endpoints are working (test with Postman/curl)

### If Authorization header is missing:
1. Verify the code is using `request` utility from `@/utils/request`
2. Verify the request utility has the interceptor configured
3. Check if there are any fetch() calls that weren't replaced

---

## Reporting Results

After completing all tests, document:

1. **Pass/Fail Status** for each test
2. **Screenshots** of:
   - Network tab showing 200 responses with Authorization headers
   - Events page with loaded data
   - Any errors encountered
3. **Console Logs** if any errors occurred
4. **Notes** on any unexpected behavior

---

## Requirements Validation

This testing validates the following requirements:

- **Requirement 1.1**: Events page uses request utility instead of fetch()
- **Requirement 1.2**: Request utility is imported correctly
- **Requirement 1.3**: API requests use request.get(), request.post(), etc.
- **Requirement 3.1**: Authentication failure displays appropriate message
- **Requirement 3.2**: Network errors display appropriate message
- **Requirement 3.3**: Timeouts display appropriate message
- **Requirement 3.4**: Errors are logged to console for debugging
