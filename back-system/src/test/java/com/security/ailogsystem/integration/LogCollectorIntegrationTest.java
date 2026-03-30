package com.security.ailogsystem.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.security.ailogsystem.dto.SystemInfoIngestRequest;
import com.security.ailogsystem.entity.SystemMetrics;
import com.security.ailogsystem.repository.MetricsRepository;
import com.security.ailogsystem.service.MetricsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for log collector monitoring endpoints.
 * Tests the complete flow from Python collector to database to API endpoints.
 * 
 * Validates Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.5, 4.2, 4.3, 4.4, 4.5
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@WithMockUser(username = "testuser", roles = {"USER"})
class LogCollectorIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MetricsRepository metricsRepository;

    @Autowired
    private MetricsService metricsService;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private org.springframework.context.ApplicationContext applicationContext;

    @BeforeEach
    void setUp() {
        // Clean up database before each test
        metricsRepository.deleteAll();
    }

    /**
     * Test 10.1: Python collector to database flow
     * Validates Requirements: 2.1, 2.2, 2.3, 2.4
     */
    @Test
    void testPythonCollectorToDatabaseFlow() throws Exception {
        // Step 1: Simulate Python collector sending performance data
        SystemInfoIngestRequest request = createPerformanceDataRequest();
        String requestJson = objectMapper.writeValueAsString(request);

        // Step 2: Send data to ingest endpoint
        MvcResult ingestResult = mockMvc.perform(post("/api/system-info/ingest")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();

        // Step 3: Verify metrics are stored in database
        List<SystemMetrics> storedMetrics = metricsRepository.findAll();
        assertEquals(1, storedMetrics.size(), "Should have stored exactly one metric");

        SystemMetrics metrics = storedMetrics.get(0);
        assertNotNull(metrics.getId(), "Metrics should have an ID");
        assertNotNull(metrics.getTimestamp(), "Metrics should have a timestamp");
        assertEquals(45.2, metrics.getCpuUsage(), 0.01, "CPU usage should match");
        assertEquals(67.8, metrics.getMemoryUsage(), 0.01, "Memory usage should match");
        assertEquals(8589934592L, metrics.getMemoryUsed(), "Memory used should match");
        assertEquals(17179869184L, metrics.getMemoryTotal(), "Memory total should match");
        assertEquals(72.5, metrics.getDiskUsage(), 0.01, "Disk usage should match");
        assertEquals(483183820800L, metrics.getDiskUsed(), "Disk used should match");
        assertEquals(1000204886016L, metrics.getDiskTotal(), "Disk total should match");
        assertEquals(9876543210L, metrics.getNetworkSent(), "Network sent should match");
        assertEquals(1234567890L, metrics.getNetworkReceived(), "Network received should match");
        assertEquals(245, metrics.getTotalProcesses(), "Process count should match");

        // Step 4: Query real-time endpoint and verify data
        MvcResult realtimeResult = mockMvc.perform(get("/log-collector/metrics/realtime")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cpuUsage").value(45.2))
                .andExpect(jsonPath("$.memoryUsage").value(67.8))
                .andExpect(jsonPath("$.memoryUsed").value(8589934592L))
                .andExpect(jsonPath("$.memoryTotal").value(17179869184L))
                .andExpect(jsonPath("$.diskUsage").value(72.5))
                .andExpect(jsonPath("$.diskUsed").value(483183820800L))
                .andExpect(jsonPath("$.diskTotal").value(1000204886016L))
                .andExpect(jsonPath("$.networkIn").value(1234567890L))
                .andExpect(jsonPath("$.networkOut").value(9876543210L))
                .andExpect(jsonPath("$.processCount").value(245))
                .andExpect(jsonPath("$.topProcesses").isArray())
                .andReturn();

        String responseBody = realtimeResult.getResponse().getContentAsString();
        assertNotNull(responseBody, "Response body should not be null");
        assertTrue(responseBody.contains("cpuUsage"), "Response should contain cpuUsage");
        assertTrue(responseBody.contains("memoryUsage"), "Response should contain memoryUsage");
    }

    @Test
    void testMultiplePythonCollectorSubmissions() throws Exception {
        // Submit multiple metrics over time
        for (int i = 0; i < 5; i++) {
            SystemInfoIngestRequest request = createPerformanceDataRequest();
            // Vary the CPU usage for each submission
            Map<String, Object> payload = request.getPayload();
            payload.put("cpu_usage", 40.0 + (i * 5.0));
            
            String requestJson = objectMapper.writeValueAsString(request);

            mockMvc.perform(post("/api/system-info/ingest")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestJson))
                    .andExpect(status().isCreated());

            // Small delay to ensure different timestamps
            Thread.sleep(100);
        }

        // Verify all metrics are stored
        List<SystemMetrics> storedMetrics = metricsRepository.findAll();
        assertEquals(5, storedMetrics.size(), "Should have stored 5 metrics");

        // Verify real-time endpoint returns the most recent
        mockMvc.perform(get("/log-collector/metrics/realtime")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cpuUsage").value(60.0)); // Last submission: 40 + (4 * 5)
    }

    @Test
    void testInvalidPythonCollectorData() throws Exception {
        // Test with missing required fields
        SystemInfoIngestRequest request = new SystemInfoIngestRequest();
        request.setDataType("performance");
        request.setPayload(new HashMap<>()); // Empty payload

        String requestJson = objectMapper.writeValueAsString(request);

        mockMvc.perform(post("/api/system-info/ingest")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest());

        // Verify no metrics were stored
        assertEquals(0, metricsRepository.count(), "No metrics should be stored for invalid data");
    }

    @Test
    void testDifferentDataTypes() throws Exception {
        // Test with cpu_info dataType
        SystemInfoIngestRequest cpuRequest = createCpuInfoRequest();
        String cpuJson = objectMapper.writeValueAsString(cpuRequest);

        mockMvc.perform(post("/api/system-info/ingest")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cpuJson))
                .andExpect(status().isCreated());

        // Test with memory_info dataType
        SystemInfoIngestRequest memoryRequest = createMemoryInfoRequest();
        String memoryJson = objectMapper.writeValueAsString(memoryRequest);

        mockMvc.perform(post("/api/system-info/ingest")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(memoryJson))
                .andExpect(status().isCreated());

        // Verify metrics are stored for both
        List<SystemMetrics> storedMetrics = metricsRepository.findAll();
        assertTrue(storedMetrics.size() >= 2, "Should have stored metrics for both data types");
    }

    // Helper methods

    private SystemInfoIngestRequest createPerformanceDataRequest() {
        SystemInfoIngestRequest request = new SystemInfoIngestRequest();
        request.setDataType("performance");
        
        Map<String, Object> payload = new HashMap<>();
        payload.put("timestamp", LocalDateTime.now().toString());
        payload.put("hostname", "test-host");
        payload.put("ip_address", "192.168.1.100");
        
        // CPU metrics
        payload.put("cpu_usage", 45.2);
        payload.put("cpu_cores", 4);
        payload.put("cpu_frequency", 2400.0);
        
        // Memory metrics
        payload.put("memory_usage", 67.8);
        payload.put("memory_used", 8589934592L);
        payload.put("memory_total", 17179869184L);
        payload.put("memory_available", 8589934592L);
        
        // Disk metrics
        payload.put("disk_usage", 72.5);
        payload.put("disk_used", 483183820800L);
        payload.put("disk_total", 1000204886016L);
        
        // Network metrics
        payload.put("network_sent", 9876543210L);
        payload.put("network_received", 1234567890L);
        payload.put("network_sent_rate", 1000.0);
        payload.put("network_received_rate", 2000.0);
        
        // Process metrics
        payload.put("total_processes", 245);
        payload.put("running_processes", 50);
        
        // System metrics
        payload.put("system_load", 1.5);
        payload.put("uptime", 86400L);
        
        // Top processes
        List<Map<String, Object>> topProcesses = new ArrayList<>();
        Map<String, Object> process1 = new HashMap<>();
        process1.put("pid", 1234);
        process1.put("name", "java");
        process1.put("cpu", 15.2);
        process1.put("memory", 8.5);
        topProcesses.add(process1);
        payload.put("top_processes", topProcesses);
        
        request.setPayload(payload);
        return request;
    }

    private SystemInfoIngestRequest createCpuInfoRequest() {
        SystemInfoIngestRequest request = new SystemInfoIngestRequest();
        request.setDataType("cpu_info");
        
        Map<String, Object> payload = new HashMap<>();
        payload.put("timestamp", LocalDateTime.now().toString());
        payload.put("hostname", "test-host");
        payload.put("cpu_usage", 50.0);
        payload.put("cpu_cores", 8);
        payload.put("cpu_frequency", 3000.0);
        
        request.setPayload(payload);
        return request;
    }

    private SystemInfoIngestRequest createMemoryInfoRequest() {
        SystemInfoIngestRequest request = new SystemInfoIngestRequest();
        request.setDataType("memory_info");
        
        Map<String, Object> payload = new HashMap<>();
        payload.put("timestamp", LocalDateTime.now().toString());
        payload.put("hostname", "test-host");
        payload.put("memory_usage", 70.0);
        payload.put("memory_used", 10737418240L);
        payload.put("memory_total", 17179869184L);
        payload.put("memory_available", 6442450944L);
        
        request.setPayload(payload);
        return request;
    }

    /**
     * Test 10.2: Historical metrics query
     * Validates Requirements: 3.1, 3.2, 3.3, 3.5
     */
    @Test
    void testHistoricalMetricsQuery() throws Exception {
        // Store multiple metrics with different timestamps
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime twoHoursAgo = now.minusHours(2);
        LocalDateTime oneHourAgo = now.minusHours(1);
        LocalDateTime thirtyMinutesAgo = now.minusMinutes(30);

        // Create metrics at different times
        createAndStoreMetrics(twoHoursAgo, 40.0, 60.0, 70.0);
        createAndStoreMetrics(oneHourAgo, 45.0, 65.0, 72.0);
        createAndStoreMetrics(thirtyMinutesAgo, 50.0, 70.0, 75.0);
        createAndStoreMetrics(now, 55.0, 75.0, 78.0);

        // Verify all metrics are stored
        assertEquals(4, metricsRepository.count(), "Should have 4 metrics stored");

        // Test 1: Query with start time only (Requirements 3.1)
        mockMvc.perform(get("/log-collector/metrics/historical")
                        .param("start", oneHourAgo.toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(3)) // Should return 3 metrics after oneHourAgo
                .andExpect(jsonPath("$[0].cpuUsage").value(45.0))
                .andExpect(jsonPath("$[1].cpuUsage").value(50.0))
                .andExpect(jsonPath("$[2].cpuUsage").value(55.0));

        // Test 2: Query with end time only (Requirements 3.2)
        mockMvc.perform(get("/log-collector/metrics/historical")
                        .param("end", oneHourAgo.toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2)) // Should return 2 metrics before oneHourAgo
                .andExpect(jsonPath("$[0].cpuUsage").value(40.0))
                .andExpect(jsonPath("$[1].cpuUsage").value(45.0));

        // Test 3: Query with both start and end times (Requirements 3.3)
        mockMvc.perform(get("/log-collector/metrics/historical")
                        .param("start", twoHoursAgo.toString())
                        .param("end", thirtyMinutesAgo.toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(3)) // Should return 3 metrics in range
                .andExpect(jsonPath("$[0].cpuUsage").value(40.0))
                .andExpect(jsonPath("$[1].cpuUsage").value(45.0))
                .andExpect(jsonPath("$[2].cpuUsage").value(50.0));

        // Test 4: Query without parameters (should default to last 24 hours)
        mockMvc.perform(get("/log-collector/metrics/historical")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(4)); // All metrics are within 24 hours

        // Test 5: Verify ordering is ascending by timestamp (Requirements 3.5)
        MvcResult result = mockMvc.perform(get("/log-collector/metrics/historical")
                        .param("start", twoHoursAgo.toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        List<Map<String, Object>> metrics = objectMapper.readValue(
                responseBody, 
                new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, Object>>>() {}
        );

        // Verify ascending order
        for (int i = 0; i < metrics.size() - 1; i++) {
            double currentCpu = ((Number) metrics.get(i).get("cpuUsage")).doubleValue();
            double nextCpu = ((Number) metrics.get(i + 1).get("cpuUsage")).doubleValue();
            assertTrue(currentCpu <= nextCpu, 
                    "Metrics should be ordered by timestamp ascending (CPU usage increases over time)");
        }
    }

    @Test
    void testHistoricalMetricsEmptyRange() throws Exception {
        // Store metrics at current time
        createAndStoreMetrics(LocalDateTime.now(), 50.0, 70.0, 75.0);

        // Query for a time range in the past with no data
        LocalDateTime pastStart = LocalDateTime.now().minusDays(7);
        LocalDateTime pastEnd = LocalDateTime.now().minusDays(6);

        mockMvc.perform(get("/log-collector/metrics/historical")
                        .param("start", pastStart.toString())
                        .param("end", pastEnd.toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0)); // Should return empty array
    }

    @Test
    void testHistoricalMetricsInvalidTimeRange() throws Exception {
        // Test with start time after end time
        LocalDateTime start = LocalDateTime.now();
        LocalDateTime end = LocalDateTime.now().minusHours(2);

        mockMvc.perform(get("/log-collector/metrics/historical")
                        .param("start", start.toString())
                        .param("end", end.toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$[0].error").value("Invalid time range"));
    }

    @Test
    void testHistoricalMetricsLargeDataset() throws Exception {
        // Store many metrics over a time range
        LocalDateTime baseTime = LocalDateTime.now().minusHours(12);
        
        for (int i = 0; i < 50; i++) {
            LocalDateTime timestamp = baseTime.plusMinutes(i * 10);
            createAndStoreMetrics(timestamp, 40.0 + i, 60.0 + i * 0.5, 70.0 + i * 0.3);
        }

        // Query all metrics
        mockMvc.perform(get("/log-collector/metrics/historical")
                        .param("start", baseTime.toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(50));

        // Query a subset
        LocalDateTime midpoint = baseTime.plusHours(4);
        mockMvc.perform(get("/log-collector/metrics/historical")
                        .param("start", baseTime.toString())
                        .param("end", midpoint.toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(25)); // Approximately half
    }

    private void createAndStoreMetrics(LocalDateTime timestamp, Double cpu, Double memory, Double disk) {
        SystemMetrics metrics = new SystemMetrics();
        metrics.setTimestamp(timestamp);
        metrics.setHostname("test-host");
        metrics.setIpAddress("192.168.1.100");
        metrics.setCpuUsage(cpu);
        metrics.setCpuCores(4);
        metrics.setCpuFrequency(2400.0);
        metrics.setMemoryUsage(memory);
        metrics.setMemoryUsed(8589934592L);
        metrics.setMemoryTotal(17179869184L);
        metrics.setMemoryAvailable(8589934592L);
        metrics.setDiskUsage(disk);
        metrics.setDiskUsed(483183820800L);
        metrics.setDiskTotal(1000204886016L);
        metrics.setNetworkSent(9876543210L);
        metrics.setNetworkReceived(1234567890L);
        metrics.setNetworkSentRate(1000.0);
        metrics.setNetworkReceivedRate(2000.0);
        metrics.setTotalProcesses(245);
        metrics.setRunningProcesses(50);
        metrics.setSystemLoad(1.5);
        metrics.setUptime(86400L);
        metrics.setRawData("{\"test\": \"data\"}");
        
        metricsRepository.save(metrics);
    }

    /**
     * Test 10.3: Alerts endpoint
     * Validates Requirements: 4.2, 4.3, 4.4, 4.5
     */
    @Test
    void testAlertsEndpoint() throws Exception {
        // Create test alerts in database
        createAndStoreAlert(
                com.security.ailogsystem.entity.SecurityAlert.AlertLevel.HIGH,
                "CPU_USAGE_HIGH",
                "CPU usage exceeded 80%: 85.2%",
                false,
                LocalDateTime.now().minusMinutes(10)
        );
        
        createAndStoreAlert(
                com.security.ailogsystem.entity.SecurityAlert.AlertLevel.MEDIUM,
                "MEMORY_USAGE_HIGH",
                "Memory usage exceeded 70%: 75.0%",
                false,
                LocalDateTime.now().minusMinutes(5)
        );
        
        createAndStoreAlert(
                com.security.ailogsystem.entity.SecurityAlert.AlertLevel.LOW,
                "DISK_SPACE_LOW",
                "Disk space below 20%: 15.0%",
                true,
                LocalDateTime.now().minusMinutes(15)
        );
        
        createAndStoreAlert(
                com.security.ailogsystem.entity.SecurityAlert.AlertLevel.HIGH,
                "NETWORK_ERROR",
                "Network connection lost",
                false,
                LocalDateTime.now().minusMinutes(2)
        );

        // Test 1: Query all alerts without filters
        mockMvc.perform(get("/log-collector/alerts")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(4));

        // Test 2: Filter by severity (Requirements 4.4)
        mockMvc.perform(get("/log-collector/alerts")
                        .param("severity", "HIGH")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].alertLevel").value("HIGH"))
                .andExpect(jsonPath("$[1].alertLevel").value("HIGH"));

        mockMvc.perform(get("/log-collector/alerts")
                        .param("severity", "MEDIUM")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].alertLevel").value("MEDIUM"));

        // Test 3: Filter by status (Requirements 4.5)
        mockMvc.perform(get("/log-collector/alerts")
                        .param("status", "PENDING")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(3)) // 3 unhandled alerts
                .andExpect(jsonPath("$[0].handled").value(false))
                .andExpect(jsonPath("$[1].handled").value(false))
                .andExpect(jsonPath("$[2].handled").value(false));

        mockMvc.perform(get("/log-collector/alerts")
                        .param("status", "RESOLVED")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1)) // 1 handled alert
                .andExpect(jsonPath("$[0].handled").value(true));

        // Test 4: Verify ordering by timestamp descending (Requirements 4.3)
        MvcResult result = mockMvc.perform(get("/log-collector/alerts")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        List<Map<String, Object>> alerts = objectMapper.readValue(
                responseBody,
                new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, Object>>>() {}
        );

        // Verify descending order (most recent first)
        assertEquals("NETWORK_ERROR", alerts.get(0).get("alertType"), 
                "First alert should be the most recent (NETWORK_ERROR)");
        assertEquals("MEMORY_USAGE_HIGH", alerts.get(1).get("alertType"),
                "Second alert should be MEMORY_USAGE_HIGH");
        assertEquals("CPU_USAGE_HIGH", alerts.get(2).get("alertType"),
                "Third alert should be CPU_USAGE_HIGH");
        assertEquals("DISK_SPACE_LOW", alerts.get(3).get("alertType"),
                "Fourth alert should be the oldest (DISK_SPACE_LOW)");

        // Test 5: Filter by both severity and status
        mockMvc.perform(get("/log-collector/alerts")
                        .param("severity", "HIGH")
                        .param("status", "PENDING")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].alertLevel").value("HIGH"))
                .andExpect(jsonPath("$[0].handled").value(false));
    }

    @Test
    void testAlertsEndpointEmptyDatabase() throws Exception {
        // Query alerts when database is empty
        mockMvc.perform(get("/log-collector/alerts")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void testAlertsEndpointInvalidSeverity() throws Exception {
        // Test with invalid severity value
        mockMvc.perform(get("/log-collector/alerts")
                        .param("severity", "INVALID")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testAlertsEndpointMultipleSeverities() throws Exception {
        // Create alerts with different severities
        createAndStoreAlert(
                com.security.ailogsystem.entity.SecurityAlert.AlertLevel.CRITICAL,
                "SYSTEM_FAILURE",
                "Critical system failure",
                false,
                LocalDateTime.now()
        );
        
        createAndStoreAlert(
                com.security.ailogsystem.entity.SecurityAlert.AlertLevel.LOW,
                "INFO_MESSAGE",
                "Informational message",
                true,
                LocalDateTime.now().minusMinutes(1)
        );

        // Query for CRITICAL alerts
        mockMvc.perform(get("/log-collector/alerts")
                        .param("severity", "CRITICAL")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].alertLevel").value("CRITICAL"));

        // Query for LOW alerts
        mockMvc.perform(get("/log-collector/alerts")
                        .param("severity", "LOW")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].alertLevel").value("LOW"));
    }

    @Test
    void testAlertsResponseFormat() throws Exception {
        // Create a single alert
        createAndStoreAlert(
                com.security.ailogsystem.entity.SecurityAlert.AlertLevel.HIGH,
                "TEST_ALERT",
                "Test alert description",
                false,
                LocalDateTime.now()
        );

        // Verify response format contains all required fields
        mockMvc.perform(get("/log-collector/alerts")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[0].alertLevel").value("HIGH"))
                .andExpect(jsonPath("$[0].alertType").value("TEST_ALERT"))
                .andExpect(jsonPath("$[0].description").value("Test alert description"))
                .andExpect(jsonPath("$[0].timestamp").exists())
                .andExpect(jsonPath("$[0].handled").value(false))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    private void createAndStoreAlert(
            com.security.ailogsystem.entity.SecurityAlert.AlertLevel level,
            String type,
            String description,
            boolean handled,
            LocalDateTime timestamp) {
        
        com.security.ailogsystem.entity.SecurityAlert alert = 
                new com.security.ailogsystem.entity.SecurityAlert();
        alert.setAlertLevel(level);
        alert.setAlertType(type);
        alert.setDescription(description);
        alert.setHandled(handled);
        alert.setCreatedTime(timestamp);
        
        // Use the repository to save
        com.security.ailogsystem.repository.SecurityAlertRepository alertRepository = 
                applicationContext.getBean(com.security.ailogsystem.repository.SecurityAlertRepository.class);
        alertRepository.save(alert);
    }
}
