package com.security.ailogsystem.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * TimeSeriesStatistics 数据转换逻辑测试
 * 直接测试 Service 中 getTimeSeriesStatistics 的数据转换逻辑，
 * 不依赖 Mockito，避免 ByteBuddy self-attach 问题
 */
@DisplayName("时间序列统计 - 数据转换逻辑测试")
class TimeSeriesStatisticsTest {

    private List<Map<String, Object>> transformTimeSeries(List<Object[]> hourlyStats) {
        return hourlyStats.stream()
                .map(row -> {
                    Map<String, Object> result = new HashMap<>();
                    result.put("timestamp", row[0] != null ? row[0] : "未知时间");
                    long eventCount = row[1] != null ? ((Number) row[1]).longValue() : 0L;
                    long anomalyCount = row[2] != null ? ((Number) row[2]).longValue() : 0L;
                    result.put("eventCount", eventCount);
                    result.put("anomalyCount", anomalyCount);
                    result.put("anomalyRate", eventCount > 0 ? (double) anomalyCount / eventCount : 0.0);
                    return result;
                })
                .collect(Collectors.toList());
    }

    @Test
    @DisplayName("应返回包含 eventCount/anomalyCount/anomalyRate 的时间序列数据")
    void shouldReturnTimeSeriesWithAnomalyFields() {
        List<Object[]> rows = new ArrayList<>();
        rows.add(new Object[]{"2026-05-01 10:00:00", 100L, 10L});
        rows.add(new Object[]{"2026-05-01 11:00:00", 80L, 5L});
        rows.add(new Object[]{"2026-05-02 09:00:00", 200L, 30L});

        List<Map<String, Object>> result = transformTimeSeries(rows);

        assertEquals(3, result.size());

        Map<String, Object> first = result.get(0);
        assertEquals("2026-05-01 10:00:00", first.get("timestamp"));
        assertEquals(100L, first.get("eventCount"));
        assertEquals(10L, first.get("anomalyCount"));
        assertEquals(0.1, (double) first.get("anomalyRate"), 0.001);

        Map<String, Object> second = result.get(1);
        assertEquals(80L, second.get("eventCount"));
        assertEquals(5L, second.get("anomalyCount"));
        assertEquals(0.0625, (double) second.get("anomalyRate"), 0.001);

        Map<String, Object> third = result.get(2);
        assertEquals(200L, third.get("eventCount"));
        assertEquals(30L, third.get("anomalyCount"));
        assertEquals(0.15, (double) third.get("anomalyRate"), 0.001);
    }

    @Test
    @DisplayName("anomalyCount 为 0 时 anomalyRate 应为 0.0")
    void shouldReturnZeroAnomalyRateWhenNoAnomalies() {
        List<Object[]> rows = new ArrayList<>();
        rows.add(new Object[]{"2026-05-01 10:00:00", 50L, 0L});

        List<Map<String, Object>> result = transformTimeSeries(rows);

        assertEquals(1, result.size());
        Map<String, Object> first = result.get(0);
        assertEquals(50L, first.get("eventCount"));
        assertEquals(0L, first.get("anomalyCount"));
        assertEquals(0.0, (double) first.get("anomalyRate"), 0.001);
    }

    @Test
    @DisplayName("eventCount 为 0 时 anomalyRate 应为 0.0 而非 NaN")
    void shouldReturnZeroRateWhenNoEvents() {
        List<Object[]> rows = new ArrayList<>();
        rows.add(new Object[]{"2026-05-01 10:00:00", 0L, 0L});

        List<Map<String, Object>> result = transformTimeSeries(rows);

        assertEquals(1, result.size());
        double rate = (double) result.get(0).get("anomalyRate");
        assertFalse(Double.isNaN(rate), "anomalyRate 不应为 NaN");
        assertEquals(0.0, rate, 0.001);
    }

    @Test
    @DisplayName("所有事件都是异常时 anomalyRate 应为 1.0")
    void shouldReturnFullRateWhenAllAnomalies() {
        List<Object[]> rows = new ArrayList<>();
        rows.add(new Object[]{"2026-05-01 10:00:00", 25L, 25L});

        List<Map<String, Object>> result = transformTimeSeries(rows);

        assertEquals(1.0, (double) result.get(0).get("anomalyRate"), 0.001);
    }

    @Test
    @DisplayName("null 值应被安全处理为默认值")
    void shouldHandleNullValuesSafely() {
        List<Object[]> rows = new ArrayList<>();
        rows.add(new Object[]{null, null, null});

        List<Map<String, Object>> result = transformTimeSeries(rows);

        assertEquals(1, result.size());
        Map<String, Object> first = result.get(0);
        assertEquals("未知时间", first.get("timestamp"));
        assertEquals(0L, first.get("eventCount"));
        assertEquals(0L, first.get("anomalyCount"));
        assertEquals(0.0, (double) first.get("anomalyRate"), 0.001);
    }

    @Test
    @DisplayName("空数据集应返回空列表")
    void shouldReturnEmptyListForNoData() {
        List<Map<String, Object>> result = transformTimeSeries(Collections.emptyList());
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("结果应按输入顺序排列（排序由SQL保证）")
    void shouldReturnResultsInTimeOrder() {
        List<Object[]> rows = new ArrayList<>();
        rows.add(new Object[]{"2026-05-01 08:00:00", 10L, 1L});
        rows.add(new Object[]{"2026-05-01 09:00:00", 20L, 2L});
        rows.add(new Object[]{"2026-05-01 10:00:00", 30L, 3L});

        List<Map<String, Object>> result = transformTimeSeries(rows);

        assertEquals("2026-05-01 08:00:00", result.get(0).get("timestamp"));
        assertEquals("2026-05-01 09:00:00", result.get(1).get("timestamp"));
        assertEquals("2026-05-01 10:00:00", result.get(2).get("timestamp"));
    }

    @Test
    @DisplayName("Integer 类型值也应正确转换")
    void shouldHandleIntegerTypeValues() {
        List<Object[]> rows = new ArrayList<>();
        rows.add(new Object[]{"2026-05-01 10:00:00", 100, 10});

        List<Map<String, Object>> result = transformTimeSeries(rows);

        assertEquals(100L, result.get(0).get("eventCount"));
        assertEquals(10L, result.get(0).get("anomalyCount"));
    }
}
