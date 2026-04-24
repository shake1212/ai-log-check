package com.security.ailogsystem.controller;

import com.security.ailogsystem.entity.SecurityAlert;
import com.security.ailogsystem.repository.SecurityAlertRepository;
import com.security.ailogsystem.service.AlertService;
import com.security.ailogsystem.service.LogCollectorConfigService;
import com.security.ailogsystem.service.SecurityLogCollectorService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

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
    private AlertService alertService;

    @MockBean
    private SecurityAlertRepository securityAlertRepository;

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
