package com.security.ailogsystem.controller;

import com.security.ailogsystem.dto.EventStatisticsDTO;
import com.security.ailogsystem.service.EventQueryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 事件控制器测试类
 */
@WebMvcTest(EventController.class)
class EventControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EventQueryService eventQueryService;

    @Test
    void testGetComprehensiveStatistics() throws Exception {
        // 准备测试数据
        EventStatisticsDTO.BasicStatistics basicStats = EventStatisticsDTO.BasicStatistics.builder()
                .totalEvents(1000L)
                .totalAlerts(100L)
                .anomalyEvents(50L)
                .normalEvents(950L)
                .anomalyRate(0.05)
                .firstEventTime(LocalDateTime.now().minusDays(30))
                .lastEventTime(LocalDateTime.now())
                .build();

        Map<String, Long> sourceStats = new HashMap<>();
        sourceStats.put("web-server", 500L);
        sourceStats.put("database", 300L);
        sourceStats.put("api-gateway", 200L);

        Map<String, Long> levelStats = new HashMap<>();
        levelStats.put("info", 800L);
        levelStats.put("warn", 150L);
        levelStats.put("error", 50L);

        EventStatisticsDTO statistics = EventStatisticsDTO.builder()
                .basic(basicStats)
                .sourceStatistics(sourceStats)
                .levelStatistics(levelStats)
                .build();

        when(eventQueryService.getComprehensiveStatistics()).thenReturn(statistics);

        // 执行测试
        mockMvc.perform(get("/api/events/statistics/comprehensive")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.basic.totalEvents").value(1000))
                .andExpect(jsonPath("$.basic.totalAlerts").value(100))
                .andExpect(jsonPath("$.basic.anomalyEvents").value(50))
                .andExpect(jsonPath("$.basic.anomalyRate").value(0.05))
                .andExpect(jsonPath("$.sourceStatistics.web-server").value(500))
                .andExpect(jsonPath("$.sourceStatistics.database").value(300))
                .andExpect(jsonPath("$.levelStatistics.info").value(800))
                .andExpect(jsonPath("$.levelStatistics.error").value(50));
    }

    @Test
    void testGetSourceStatistics() throws Exception {
        // 准备测试数据
        Map<String, Long> sourceStats = new HashMap<>();
        sourceStats.put("web-server", 500L);
        sourceStats.put("database", 300L);
        sourceStats.put("api-gateway", 200L);

        when(eventQueryService.getSourceStatistics(any(), any())).thenReturn(sourceStats);

        // 执行测试
        mockMvc.perform(get("/api/events/statistics/sources")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.web-server").value(500))
                .andExpect(jsonPath("$.database").value(300))
                .andExpect(jsonPath("$.api-gateway").value(200));
    }

    @Test
    void testGetLevelStatistics() throws Exception {
        // 准备测试数据
        Map<String, Long> levelStats = new HashMap<>();
        levelStats.put("info", 800L);
        levelStats.put("warn", 150L);
        levelStats.put("error", 50L);

        when(eventQueryService.getLevelStatistics(any(), any())).thenReturn(levelStats);

        // 执行测试
        mockMvc.perform(get("/api/events/statistics/levels")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info").value(800))
                .andExpect(jsonPath("$.warn").value(150))
                .andExpect(jsonPath("$.error").value(50));
    }

    @Test
    void testGetRealTimeStatistics() throws Exception {
        // 准备测试数据
        Map<String, Long> realTimeStats = new HashMap<>();
        realTimeStats.put("lastHourEvents", 25L);
        realTimeStats.put("lastHourAnomalies", 2L);
        realTimeStats.put("last24HoursEvents", 500L);
        realTimeStats.put("last24HoursAnomalies", 30L);
        realTimeStats.put("totalEvents", 10000L);
        realTimeStats.put("totalAnomalies", 500L);
        realTimeStats.put("pendingAlerts", 50L);

        when(eventQueryService.getRealTimeStatistics()).thenReturn(realTimeStats);

        // 执行测试
        mockMvc.perform(get("/api/events/statistics/realtime")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lastHourEvents").value(25))
                .andExpect(jsonPath("$.lastHourAnomalies").value(2))
                .andExpect(jsonPath("$.last24HoursEvents").value(500))
                .andExpect(jsonPath("$.totalEvents").value(10000))
                .andExpect(jsonPath("$.pendingAlerts").value(50));
    }

    @Test
    void testGetQueryHelp() throws Exception {
        // 执行测试
        mockMvc.perform(get("/api/events/help")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").exists())
                .andExpect(jsonPath("$.endpoints").exists())
                .andExpect(jsonPath("$.parameters").exists())
                .andExpect(jsonPath("$.examples").exists());
    }
}
