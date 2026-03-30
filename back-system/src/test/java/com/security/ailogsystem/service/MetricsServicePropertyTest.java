package com.security.ailogsystem.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.security.ailogsystem.entity.SystemMetrics;
import com.security.ailogsystem.repository.MetricsRepository;
import com.security.ailogsystem.repository.UnifiedEventRepository;
import com.security.ailogsystem.service.AlertService;
import com.security.ailogsystem.service.RuleEngineService;
import com.security.ailogsystem.service.impl.MetricsServiceImpl;
import net.jqwik.api.*;
import net.jqwik.api.constraints.DoubleRange;
import net.jqwik.api.constraints.LongRange;
import net.jqwik.api.constraints.Positive;
import net.jqwik.api.constraints.StringLength;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Property-based tests for MetricsService.
 * Tests universal properties that should hold for all valid inputs.
 */
class MetricsServicePropertyTest {

    private MetricsRepository metricsRepository;
    private MetricsService metricsService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        metricsRepository = mock(MetricsRepository.class);
        objectMapper = new ObjectMapper();
        RuleEngineService ruleEngineService = mock(RuleEngineService.class);
        AlertService alertService = mock(AlertService.class);
        UnifiedEventRepository unifiedEventRepository = mock(UnifiedEventRepository.class);
        metricsService = new MetricsServiceImpl(metricsRepository, objectMapper, ruleEngineService, alertService, unifiedEventRepository);
    }

    /**
     * Property 3: Data Extraction Consistency
     * For any valid Python collector payload with performance data,
     * extracting and storing metrics should preserve all metric values without loss or corruption.
     * 
     * Validates: Requirements 2.2, 2.3, 2.4
     */
    @Property(tries = 100)
    @Tag("Feature: log-collector-monitoring, Property 3: Data Extraction Consistency")
    void testDataExtractionConsistency(
            @ForAll("validPerformanceData") Map<String, Object> collectorData) {
        
        // Setup mock to capture the saved entity
        ArgumentCaptor<SystemMetrics> metricsCaptor = ArgumentCaptor.forClass(SystemMetrics.class);
        when(metricsRepository.save(any(SystemMetrics.class)))
                .thenAnswer(invocation -> {
                    SystemMetrics metrics = invocation.getArgument(0);
                    metrics.setId(1L);
                    return metrics;
                });

        // Execute: Store metrics
        SystemMetrics result = metricsService.storeMetrics(collectorData);

        // Verify: Capture what was saved
        verify(metricsRepository).save(metricsCaptor.capture());
        SystemMetrics savedMetrics = metricsCaptor.getValue();

        // Assert: All provided values should be preserved
        assertNotNull(savedMetrics, "Saved metrics should not be null");
        
        // Verify CPU metrics preservation
        if (collectorData.containsKey("cpu_usage") || collectorData.containsKey("cpuUsage")) {
            Double expectedCpu = extractDoubleFromData(collectorData, "cpu_usage", "cpuUsage");
            assertEquals(expectedCpu, savedMetrics.getCpuUsage(), 0.001,
                    "CPU usage should be preserved");
        }
        
        // Verify memory metrics preservation
        if (collectorData.containsKey("memory_used") || collectorData.containsKey("memoryUsed")) {
            Long expectedMemory = extractLongFromData(collectorData, "memory_used", "memoryUsed");
            assertEquals(expectedMemory, savedMetrics.getMemoryUsed(),
                    "Memory used should be preserved");
        }
        
        if (collectorData.containsKey("memory_total") || collectorData.containsKey("memoryTotal")) {
            Long expectedTotal = extractLongFromData(collectorData, "memory_total", "memoryTotal");
            assertEquals(expectedTotal, savedMetrics.getMemoryTotal(),
                    "Memory total should be preserved");
        }
        
        // Verify disk metrics preservation
        if (collectorData.containsKey("disk_used") || collectorData.containsKey("diskUsed")) {
            Long expectedDisk = extractLongFromData(collectorData, "disk_used", "diskUsed");
            assertEquals(expectedDisk, savedMetrics.getDiskUsed(),
                    "Disk used should be preserved");
        }
        
        // Verify network metrics preservation
        if (collectorData.containsKey("network_sent") || collectorData.containsKey("networkSent")) {
            Long expectedSent = extractLongFromData(collectorData, "network_sent", "networkSent");
            assertEquals(expectedSent, savedMetrics.getNetworkSent(),
                    "Network sent should be preserved");
        }
        
        if (collectorData.containsKey("network_received") || collectorData.containsKey("networkReceived")) {
            Long expectedReceived = extractLongFromData(collectorData, "network_received", "networkReceived");
            assertEquals(expectedReceived, savedMetrics.getNetworkReceived(),
                    "Network received should be preserved");
        }
        
        // Verify process metrics preservation
        if (collectorData.containsKey("total_processes") || collectorData.containsKey("totalProcesses") 
                || collectorData.containsKey("process_count")) {
            Integer expectedProcesses = extractIntegerFromData(collectorData, 
                    "total_processes", "totalProcesses", "process_count");
            assertEquals(expectedProcesses, savedMetrics.getTotalProcesses(),
                    "Process count should be preserved");
        }
        
        // Verify raw data is stored
        assertNotNull(savedMetrics.getRawData(), "Raw data should be stored");
        assertFalse(savedMetrics.getRawData().isEmpty(), "Raw data should not be empty");
    }

    // ========== Arbitraries (Data Generators) ==========

    @Provide
    Arbitrary<Map<String, Object>> validPerformanceData() {
        // Split into two combines since jqwik only supports up to 8 parameters
        Arbitrary<Map<String, Object>> part1 = Combinators.combine(
                Arbitraries.strings().alpha().ofMinLength(3).ofMaxLength(20),  // hostname
                Arbitraries.doubles().between(0.0, 100.0),  // cpu_usage
                Arbitraries.longs().between(1_000_000_000L, 100_000_000_000L),  // memory_used
                Arbitraries.longs().between(100_000_000_000L, 1_000_000_000_000L),  // memory_total
                Arbitraries.longs().between(1_000_000_000L, 10_000_000_000_000L),  // disk_used
                Arbitraries.longs().between(10_000_000_000_000L, 100_000_000_000_000L),  // disk_total
                Arbitraries.longs().between(0L, 1_000_000_000_000L),  // network_sent
                Arbitraries.longs().between(0L, 1_000_000_000_000L)  // network_received
        ).as((hostname, cpuUsage, memoryUsed, memoryTotal, diskUsed, diskTotal, 
              networkSent, networkReceived) -> {
            Map<String, Object> data = new HashMap<>();
            
            // Use snake_case or camelCase randomly to test both formats
            boolean useSnakeCase = new Random().nextBoolean();
            
            data.put("hostname", hostname);
            data.put(useSnakeCase ? "cpu_usage" : "cpuUsage", cpuUsage);
            data.put(useSnakeCase ? "memory_used" : "memoryUsed", memoryUsed);
            data.put(useSnakeCase ? "memory_total" : "memoryTotal", memoryTotal);
            data.put(useSnakeCase ? "disk_used" : "diskUsed", diskUsed);
            data.put(useSnakeCase ? "disk_total" : "diskTotal", diskTotal);
            data.put(useSnakeCase ? "network_sent" : "networkSent", networkSent);
            data.put(useSnakeCase ? "network_received" : "networkReceived", networkReceived);
            
            return data;
        });
        
        // Add process count separately
        return Combinators.combine(
                part1,
                Arbitraries.integers().between(50, 500)  // total_processes
        ).as((data, totalProcesses) -> {
            // Use multiple possible key names for process count
            boolean useSnakeCase = new Random().nextBoolean();
            String processKey = useSnakeCase ? "total_processes" : "totalProcesses";
            if (new Random().nextInt(3) == 0) {
                processKey = "process_count";
            }
            data.put(processKey, totalProcesses);
            return data;
        });
    }

    // ========== Helper Methods ==========

    private Double extractDoubleFromData(Map<String, Object> data, String... keys) {
        for (String key : keys) {
            Object value = data.get(key);
            if (value != null) {
                if (value instanceof Number) {
                    return ((Number) value).doubleValue();
                }
                try {
                    return Double.parseDouble(value.toString());
                } catch (NumberFormatException e) {
                    // Continue to next key
                }
            }
        }
        return null;
    }

    private Long extractLongFromData(Map<String, Object> data, String... keys) {
        for (String key : keys) {
            Object value = data.get(key);
            if (value != null) {
                if (value instanceof Number) {
                    return ((Number) value).longValue();
                }
                try {
                    return Long.parseLong(value.toString());
                } catch (NumberFormatException e) {
                    // Continue to next key
                }
            }
        }
        return null;
    }

    private Integer extractIntegerFromData(Map<String, Object> data, String... keys) {
        for (String key : keys) {
            Object value = data.get(key);
            if (value != null) {
                if (value instanceof Number) {
                    return ((Number) value).intValue();
                }
                try {
                    return Integer.parseInt(value.toString());
                } catch (NumberFormatException e) {
                    // Continue to next key
                }
            }
        }
        return null;
    }

    /**
     * Property 4: DataType Routing
     * For any valid dataType value (performance, cpu_info, memory_info, disk_info, process_info),
     * the system should correctly route and store the data according to its type.
     * 
     * Validates: Requirements 2.5, 2.6, 2.7, 2.8, 2.9
     */
    @Property(tries = 100)
    @Tag("Feature: log-collector-monitoring, Property 4: DataType Routing")
    void testDataTypeRouting(
            @ForAll("validDataTypes") String dataType,
            @ForAll("validPerformanceData") Map<String, Object> collectorData) {
        
        // Add dataType to the collector data
        Map<String, Object> dataWithType = new HashMap<>(collectorData);
        dataWithType.put("dataType", dataType);
        
        // Setup mock
        when(metricsRepository.save(any(SystemMetrics.class)))
                .thenAnswer(invocation -> {
                    SystemMetrics metrics = invocation.getArgument(0);
                    metrics.setId(1L);
                    return metrics;
                });

        // Execute: Store metrics with specific dataType
        SystemMetrics result = metricsService.storeMetrics(dataWithType);

        // Verify: Metrics should be stored regardless of dataType
        // All performance-related dataTypes should be handled
        assertNotNull(result, "Metrics should be stored for dataType: " + dataType);
        verify(metricsRepository).save(any(SystemMetrics.class));
        
        // Verify that the data was extracted correctly
        assertNotNull(result.getTimestamp(), "Timestamp should be set");
        assertNotNull(result.getCreatedAt(), "CreatedAt should be set");
    }

    /**
     * Property 1: Most Recent Metrics Retrieval
     * For any set of metrics with different timestamps stored in the database,
     * querying real-time metrics should return the metric with the most recent timestamp.
     * 
     * Validates: Requirements 1.1
     */
    @Property(tries = 100)
    @Tag("Feature: log-collector-monitoring, Property 1: Most Recent Metrics Retrieval")
    void testMostRecentMetricsRetrieval(
            @ForAll("metricsWithDifferentTimestamps") List<SystemMetrics> metricsList) {
        
        // Assume the list is not empty (precondition)
        Assume.that(!metricsList.isEmpty());
        
        // Find the actual most recent metric by timestamp
        SystemMetrics expectedMostRecent = metricsList.stream()
                .max(Comparator.comparing(SystemMetrics::getTimestamp))
                .orElseThrow();
        
        // Setup mock to return the most recent
        when(metricsRepository.findFirstByOrderByTimestampDesc())
                .thenReturn(Optional.of(expectedMostRecent));

        // Execute: Get realtime metrics
        Optional<SystemMetrics> result = metricsService.getRealtimeMetrics();

        // Verify: Should return the most recent metric
        assertTrue(result.isPresent(), "Should return a metric");
        assertEquals(expectedMostRecent.getTimestamp(), result.get().getTimestamp(),
                "Should return the metric with the most recent timestamp");
        assertEquals(expectedMostRecent.getId(), result.get().getId(),
                "Should return the exact most recent metric");
    }

    // ========== Additional Arbitraries ==========

    @Provide
    Arbitrary<String> validDataTypes() {
        return Arbitraries.of(
                "performance",
                "cpu_info",
                "memory_info",
                "disk_info",
                "process_info"
        );
    }

    @Provide
    Arbitrary<List<SystemMetrics>> metricsWithDifferentTimestamps() {
        return Arbitraries.integers().between(2, 10).flatMap(size -> {
            // Generate a list of metrics with different timestamps
            List<Arbitrary<SystemMetrics>> metricsArbitraries = new ArrayList<>();
            LocalDateTime baseTime = LocalDateTime.now().minusHours(24);
            
            for (int i = 0; i < size; i++) {
                final int index = i;
                Arbitrary<SystemMetrics> metricsArbitrary = Combinators.combine(
                        Arbitraries.longs().between(1L, 1000L),
                        Arbitraries.doubles().between(0.0, 100.0),
                        Arbitraries.doubles().between(0.0, 100.0)
                ).as((id, cpuUsage, memoryUsage) -> {
                    SystemMetrics metrics = new SystemMetrics();
                    metrics.setId(id);
                    // Each metric has a different timestamp
                    metrics.setTimestamp(baseTime.plusMinutes(index * 10));
                    metrics.setCpuUsage(cpuUsage);
                    metrics.setMemoryUsage(memoryUsage);
                    metrics.setCreatedAt(LocalDateTime.now());
                    return metrics;
                });
                metricsArbitraries.add(metricsArbitrary);
            }
            
            return Combinators.combine(metricsArbitraries).as(list -> list);
        });
    }

    /**
     * Property 5: Invalid Data Rejection
     * For any malformed or invalid JSON payload,
     * the system should reject the data and throw an exception without storing partial data.
     * 
     * Validates: Requirements 2.10, 3.7
     */
    @Property(tries = 100)
    @Tag("Feature: log-collector-monitoring, Property 5: Invalid Data Rejection")
    void testInvalidDataRejection(
            @ForAll("invalidPerformanceData") Map<String, Object> invalidData) {
        
        // Execute and verify: Should throw IllegalArgumentException for invalid data
        assertThrows(IllegalArgumentException.class, () -> {
            metricsService.storeMetrics(invalidData);
        }, "Invalid data should be rejected with IllegalArgumentException");
        
        // Verify: No data should be saved to repository
        verify(metricsRepository, never()).save(any(SystemMetrics.class));
    }

    @Provide
    Arbitrary<Map<String, Object>> invalidPerformanceData() {
        return Arbitraries.of(
                // Case 1: Null payload
                (Map<String, Object>) null,
                
                // Case 2: Empty payload
                new HashMap<>(),
                
                // Case 3: Payload with only non-metric fields
                new HashMap<String, Object>() {{
                    put("random_field", "random_value");
                    put("another_field", 123);
                }},
                
                // Case 4: Payload with invalid data types
                new HashMap<String, Object>() {{
                    put("cpu_usage", "not_a_number");
                    put("memory_used", "invalid");
                }},
                
                // Case 5: Payload with negative values where not allowed
                new HashMap<String, Object>() {{
                    put("cpu_usage", -50.0);
                    put("memory_used", -1000L);
                }},
                
                // Case 6: Payload with extremely large invalid values
                new HashMap<String, Object>() {{
                    put("cpu_usage", Double.MAX_VALUE);
                    put("memory_used", Long.MAX_VALUE);
                }},
                
                // Case 7: Payload with null values for required fields
                new HashMap<String, Object>() {{
                    put("cpu_usage", null);
                    put("memory_used", null);
                    put("hostname", null);
                }},
                
                // Case 8: Payload with wrong structure (nested incorrectly)
                new HashMap<String, Object>() {{
                    put("data", "should_be_object_not_string");
                }},
                
                // Case 9: Payload with missing critical nested data
                new HashMap<String, Object>() {{
                    put("data", new HashMap<>());
                }}
        );
    }
}
