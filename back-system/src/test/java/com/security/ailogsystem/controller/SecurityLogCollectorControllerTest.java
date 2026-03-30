package com.security.ailogsystem.controller;

import com.security.ailogsystem.entity.SecurityAlert;
import com.security.ailogsystem.entity.SystemMetrics;
import com.security.ailogsystem.repository.SecurityAlertRepository;
import com.security.ailogsystem.service.AlertService;
import com.security.ailogsystem.service.LogCollectorConfigService;
import com.security.ailogsystem.service.MetricsService;
import com.security.ailogsystem.service.SecurityLogCollectorService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for SecurityLogCollectorController endpoints
 */
@WebMvcTest(SecurityLogCollectorController.class)
@WithMockUser(username = "testuser", roles = {"USER"})
class SecurityLogCollectorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SecurityLogCollectorService securityLogCollectorService;

    @MockBean
    private LogCollectorConfigService configService;

    @MockBean
    private MetricsService metricsService;

    @MockBean
    private AlertService alertService;

    @MockBean
    private SecurityAlertRepository securityAlertRepository;

    @Test
    void testGetRealtimeMetrics_WithData() throws Exception {
        // Prepare test data
        SystemMetrics metrics = new SystemMetrics();
        metrics.setId(1L);
        metrics.setTimestamp(LocalDateTime.now());
        metrics.setCpuUsage(45.2);
        metrics.setMemoryUsage(67.8);
        metrics.setMemoryUsed(8589934592L);
        metrics.setMemoryTotal(17179869184L);
        metrics.setDiskUsage(72.5);
        metrics.setDiskUsed(483183820800L);
        metrics.setDiskTotal(1000204886016L);
        metrics.setNetworkSent(9876543210L);
        metrics.setNetworkReceived(1234567890L);
        metrics.setTotalProcesses(245);

        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", metrics.getTimestamp());
        response.put("cpuUsage", 45.2);
        response.put("memoryUsage", 67.8);
        response.put("memoryUsed", 8589934592L);
        response.put("memoryTotal", 17179869184L);
        response.put("diskUsage", 72.5);
        response.put("diskUsed", 483183820800L);
        response.put("diskTotal", 1000204886016L);
        response.put("networkIn", 1234567890L);
        response.put("networkOut", 9876543210L);
        response.put("processCount", 245);
        response.put("topProcesses", new ArrayList<>());

        when(metricsService.getRealtimeMetrics()).thenReturn(Optional.of(metrics));
        when(metricsService.transformToRealtimeResponse(metrics)).thenReturn(response);

        // Execute test
        mockMvc.perform(get("/log-collector/metrics/realtime")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cpuUsage").value(45.2))
                .andExpect(jsonPath("$.memoryUsage").value(67.8))
                .andExpect(jsonPath("$.memoryUsed").value(8589934592L))
                .andExpect(jsonPath("$.memoryTotal").value(17179869184L))
                .andExpect(jsonPath("$.diskUsage").value(72.5))
                .andExpect(jsonPath("$.processCount").value(245));
    }

    @Test
    void testGetRealtimeMetrics_EmptyDatabase() throws Exception {
        // Mock empty database scenario
        when(metricsService.getRealtimeMetrics()).thenReturn(Optional.empty());

        // Execute test
        mockMvc.perform(get("/log-collector/metrics/realtime")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timestamp").isEmpty())
                .andExpect(jsonPath("$.cpuUsage").isEmpty())
                .andExpect(jsonPath("$.memoryUsage").isEmpty())
                .andExpect(jsonPath("$.topProcesses").isArray());
    }

    @Test
    void testGetRealtimeMetrics_ErrorHandling() throws Exception {
        // Mock service throwing exception
        when(metricsService.getRealtimeMetrics())
                .thenThrow(new RuntimeException("Database connection failed"));

        // Execute test
        mockMvc.perform(get("/log-collector/metrics/realtime")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Failed to retrieve realtime metrics"))
                .andExpect(jsonPath("$.message").value("Database connection failed"));
    }

    @Test
    void testGetHistoricalMetrics_WithTimeRange() throws Exception {
        // Prepare test data
        LocalDateTime start = LocalDateTime.now().minusHours(2);
        LocalDateTime end = LocalDateTime.now();

        List<SystemMetrics> metricsList = Arrays.asList(
                createMetrics(start, 40.0, 60.0, 70.0),
                createMetrics(start.plusHours(1), 45.0, 65.0, 72.0),
                createMetrics(end, 50.0, 70.0, 75.0)
        );

        List<Map<String, Object>> response = Arrays.asList(
                createHistoricalItem(start, 40.0, 60.0, 70.0),
                createHistoricalItem(start.plusHours(1), 45.0, 65.0, 72.0),
                createHistoricalItem(end, 50.0, 70.0, 75.0)
        );

        when(metricsService.getHistoricalMetrics(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(metricsList);
        when(metricsService.transformToHistoricalResponse(metricsList)).thenReturn(response);

        // Execute test
        mockMvc.perform(get("/log-collector/metrics/historical")
                        .param("start", start.toString())
                        .param("end", end.toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].cpuUsage").value(40.0))
                .andExpect(jsonPath("$[1].cpuUsage").value(45.0))
                .andExpect(jsonPath("$[2].cpuUsage").value(50.0));
    }

    @Test
    void testGetHistoricalMetrics_DefaultTimeRange() throws Exception {
        // Prepare test data - should default to last 24 hours
        List<SystemMetrics> metricsList = Collections.emptyList();
        List<Map<String, Object>> response = Collections.emptyList();

        when(metricsService.getHistoricalMetrics(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(metricsList);
        when(metricsService.transformToHistoricalResponse(metricsList)).thenReturn(response);

        // Execute test without parameters
        mockMvc.perform(get("/log-collector/metrics/historical")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void testGetHistoricalMetrics_InvalidTimeRange() throws Exception {
        // Test with start time after end time
        LocalDateTime start = LocalDateTime.now();
        LocalDateTime end = LocalDateTime.now().minusHours(2);

        // Execute test
        mockMvc.perform(get("/log-collector/metrics/historical")
                        .param("start", start.toString())
                        .param("end", end.toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$[0].error").value("Invalid time range"))
                .andExpect(jsonPath("$[0].message").value("Start time must be before end time"));
    }

    @Test
    void testGetHistoricalMetrics_InvalidDateFormat() throws Exception {
        // Execute test with invalid date format
        mockMvc.perform(get("/log-collector/metrics/historical")
                        .param("start", "invalid-date")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$[0].error").value("Invalid date format"));
    }

    @Test
    void testGetHistoricalMetrics_ErrorHandling() throws Exception {
        // Mock service throwing exception
        when(metricsService.getHistoricalMetrics(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenThrow(new RuntimeException("Query failed"));

        // Execute test
        mockMvc.perform(get("/log-collector/metrics/historical")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$[0].error").value("Failed to retrieve historical metrics"))
                .andExpect(jsonPath("$[0].message").value("Query failed"));
    }

    @Test
    void testGetAlerts_NoFilters() throws Exception {
        // Prepare test data
        List<SecurityAlert> alerts = Arrays.asList(
                createAlert(1L, SecurityAlert.AlertLevel.HIGH, "CPU_HIGH", "CPU usage high", false),
                createAlert(2L, SecurityAlert.AlertLevel.MEDIUM, "MEMORY_HIGH", "Memory usage high", false),
                createAlert(3L, SecurityAlert.AlertLevel.LOW, "DISK_SPACE", "Disk space low", true)
        );

        when(alertService.getLogCollectorAlerts(null, null)).thenReturn(alerts);

        // Execute test
        mockMvc.perform(get("/log-collector/alerts")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].alertLevel").value("HIGH"))
                .andExpect(jsonPath("$[1].alertLevel").value("MEDIUM"))
                .andExpect(jsonPath("$[2].handled").value(true));
    }

    @Test
    void testGetAlerts_FilterBySeverity() throws Exception {
        // Prepare test data
        List<SecurityAlert> alerts = Arrays.asList(
                createAlert(1L, SecurityAlert.AlertLevel.HIGH, "CPU_HIGH", "CPU usage high", false),
                createAlert(2L, SecurityAlert.AlertLevel.HIGH, "MEMORY_HIGH", "Memory usage high", false)
        );

        when(alertService.getLogCollectorAlerts(null, "HIGH")).thenReturn(alerts);

        // Execute test
        mockMvc.perform(get("/log-collector/alerts")
                        .param("severity", "HIGH")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].alertLevel").value("HIGH"))
                .andExpect(jsonPath("$[1].alertLevel").value("HIGH"));
    }

    @Test
    void testGetAlerts_FilterByStatus() throws Exception {
        // Prepare test data
        List<SecurityAlert> alerts = Arrays.asList(
                createAlert(1L, SecurityAlert.AlertLevel.HIGH, "CPU_HIGH", "CPU usage high", false),
                createAlert(2L, SecurityAlert.AlertLevel.MEDIUM, "MEMORY_HIGH", "Memory usage high", false)
        );

        when(alertService.getLogCollectorAlerts("PENDING", null)).thenReturn(alerts);

        // Execute test
        mockMvc.perform(get("/log-collector/alerts")
                        .param("status", "PENDING")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].handled").value(false))
                .andExpect(jsonPath("$[1].handled").value(false));
    }

    @Test
    void testGetAlerts_InvalidSeverity() throws Exception {
        // Mock service throwing IllegalArgumentException for invalid severity
        when(alertService.getLogCollectorAlerts(null, "INVALID"))
                .thenThrow(new IllegalArgumentException("Invalid severity level: INVALID. Severity must be one of: LOW, MEDIUM, HIGH, CRITICAL"));

        // Execute test with invalid severity
        mockMvc.perform(get("/log-collector/alerts")
                        .param("severity", "INVALID")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$[0].error").value("Invalid parameter"));
    }

    @Test
    void testGetAlerts_ErrorHandling() throws Exception {
        // Mock service throwing exception
        when(alertService.getLogCollectorAlerts(null, null))
                .thenThrow(new RuntimeException("Database error"));

        // Execute test
        mockMvc.perform(get("/log-collector/alerts")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$[0].error").value("Failed to retrieve alerts"))
                .andExpect(jsonPath("$[0].message").value("Database error"));
    }

    // Helper methods

    private SystemMetrics createMetrics(LocalDateTime timestamp, Double cpu, Double memory, Double disk) {
        SystemMetrics metrics = new SystemMetrics();
        metrics.setTimestamp(timestamp);
        metrics.setCpuUsage(cpu);
        metrics.setMemoryUsage(memory);
        metrics.setDiskUsage(disk);
        return metrics;
    }

    private Map<String, Object> createHistoricalItem(LocalDateTime timestamp, Double cpu, Double memory, Double disk) {
        Map<String, Object> item = new HashMap<>();
        item.put("timestamp", timestamp);
        item.put("cpuUsage", cpu);
        item.put("memoryUsage", memory);
        item.put("diskUsage", disk);
        return item;
    }

    private SecurityAlert createAlert(Long id, SecurityAlert.AlertLevel level, String type, String description, boolean handled) {
        SecurityAlert alert = new SecurityAlert();
        alert.setId(id);
        alert.setAlertLevel(level);
        alert.setAlertType(type);
        alert.setDescription(description);
        alert.setHandled(handled);
        alert.setCreatedTime(LocalDateTime.now());
        return alert;
    }
}
