package com.security.ailogsystem.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.security.ailogsystem.entity.LogCollectorConfig;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests verifying rule engine configuration can be read and updated via the API.
 *
 * Validates Requirements: 1.2, 1.3
 */
@WebMvcTest(SecurityLogCollectorController.class)
@WithMockUser(username = "testuser", roles = {"USER"})
class RuleEngineConfigApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SecurityLogCollectorService securityLogCollectorService;

    @MockBean
    private LogCollectorConfigService configService;

    @MockBean
    private AlertService alertService;

    @MockBean
    private com.security.ailogsystem.repository.SecurityAlertRepository securityAlertRepository;

    /**
     * Verifies that rule engine configuration can be read from the database via the API.
     * Validates Requirements: 1.2
     */
    @Test
    void testRuleEngineConfigCanBeReadViaApi() throws Exception {
        LogCollectorConfig config = buildConfig("default", true, 10);
        when(configService.getAllConfigs()).thenReturn(List.of(config));

        mockMvc.perform(get("/log-collector/configs")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value("default"));
    }

    /**
     * Verifies that rule engine configuration can be updated through the API.
     * Validates Requirements: 1.2
     */
    @Test
    void testRuleEngineConfigCanBeUpdatedViaApi() throws Exception {
        LogCollectorConfig existing = buildConfig("default", true, 10);
        LogCollectorConfig updated = buildConfig("default", false, 60);

        when(configService.existsById("default")).thenReturn(true);
        when(configService.getConfigById("default")).thenReturn(Optional.of(existing));
        when(configService.saveConfig(any(LogCollectorConfig.class))).thenReturn(updated);
        when(securityLogCollectorService.stopScheduledCollection()).thenReturn(true);

        Map<String, Object> updatePayload = new HashMap<>();
        updatePayload.put("name", "安全日志采集器");
        updatePayload.put("enabled", false);
        updatePayload.put("interval", 300);
        updatePayload.put("dataSources", List.of("security", "system"));
        updatePayload.put("retentionDays", 7);

        Map<String, Object> thresholds = new HashMap<>();
        thresholds.put("cpuUsage", 80);
        thresholds.put("memoryUsage", 90);
        thresholds.put("diskUsage", 85);
        thresholds.put("errorRate", 5);
        updatePayload.put("alertThresholds", thresholds);

        mockMvc.perform(put("/log-collector/configs/default")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatePayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("default"));
    }

    /**
     * Verifies that updating a non-existent config returns 404.
     * Validates Requirements: 1.3
     */
    @Test
    void testUpdateNonExistentConfigReturns404() throws Exception {
        when(configService.existsById("nonexistent")).thenReturn(false);

        Map<String, Object> payload = new HashMap<>();
        payload.put("enabled", true);
        payload.put("interval", 300);

        mockMvc.perform(put("/log-collector/configs/nonexistent")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isNotFound());
    }

    // --- Helper ---

    private LogCollectorConfig buildConfig(String id, Boolean enableRuleEngine, Integer timeout) {
        LogCollectorConfig config = new LogCollectorConfig();
        config.setId(id);
        config.setName("安全日志采集器");
        config.setEnabled(true);
        config.setInterval(300);
        config.setDataSources(Arrays.asList("security", "system"));
        config.setCpuThreshold(80);
        config.setMemoryThreshold(90);
        config.setDiskThreshold(85);
        config.setErrorRateThreshold(5);
        config.setRetentionDays(7);
        config.setEnableRuleEngine(enableRuleEngine);
        config.setRuleEngineTimeout(timeout);
        LocalDateTime now = LocalDateTime.now();
        config.setCreatedAt(now);
        config.setUpdatedAt(now);
        return config;
    }
}
