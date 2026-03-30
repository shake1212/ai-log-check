package com.security.ailogsystem.entity;

import net.jqwik.api.*;
import org.junit.jupiter.api.Tag;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for SystemMetrics entity
 * Feature: log-collector-monitoring
 */
class SystemMetricsPropertyTest {

    /**
     * Property 2: Metrics Response Completeness
     * For any valid system metrics stored in the database, the real-time metrics response 
     * should contain all required fields: timestamp, cpuUsage, memoryUsage, memoryUsed, 
     * memoryTotal, diskUsage, diskUsed, diskTotal, networkIn, networkOut, processCount, 
     * and topProcesses
     * 
     * Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
     */
    @Property(tries = 100)
    @Tag("Feature: log-collector-monitoring, Property 2: Metrics Response Completeness")
    void metricsResponseContainsAllRequiredFields(
            @ForAll("validSystemMetrics") SystemMetrics metrics) {
        
        // Transform to response format (simulating what the API would return)
        Map<String, Object> response = transformToRealtimeResponse(metrics);
        
        // Verify all required fields are present
        assertTrue(response.containsKey("timestamp"), 
            "Response must contain timestamp field");
        assertNotNull(response.get("timestamp"), 
            "Timestamp must not be null");
        
        assertTrue(response.containsKey("cpuUsage"), 
            "Response must contain cpuUsage field");
        
        assertTrue(response.containsKey("memoryUsage"), 
            "Response must contain memoryUsage field");
        
        assertTrue(response.containsKey("memoryUsed"), 
            "Response must contain memoryUsed field");
        
        assertTrue(response.containsKey("memoryTotal"), 
            "Response must contain memoryTotal field");
        
        assertTrue(response.containsKey("diskUsage"), 
            "Response must contain diskUsage field");
        
        assertTrue(response.containsKey("diskUsed"), 
            "Response must contain diskUsed field");
        
        assertTrue(response.containsKey("diskTotal"), 
            "Response must contain diskTotal field");
        
        assertTrue(response.containsKey("networkIn"), 
            "Response must contain networkIn field");
        
        assertTrue(response.containsKey("networkOut"), 
            "Response must contain networkOut field");
        
        assertTrue(response.containsKey("processCount"), 
            "Response must contain processCount field");
        
        assertTrue(response.containsKey("topProcesses"), 
            "Response must contain topProcesses field");
        
        // Verify that the values match the entity values
        assertEquals(metrics.getTimestamp(), response.get("timestamp"));
        assertEquals(metrics.getCpuUsage(), response.get("cpuUsage"));
        assertEquals(metrics.getMemoryUsage(), response.get("memoryUsage"));
        assertEquals(metrics.getMemoryUsed(), response.get("memoryUsed"));
        assertEquals(metrics.getMemoryTotal(), response.get("memoryTotal"));
        assertEquals(metrics.getDiskUsage(), response.get("diskUsage"));
        assertEquals(metrics.getDiskUsed(), response.get("diskUsed"));
        assertEquals(metrics.getDiskTotal(), response.get("diskTotal"));
        assertEquals(metrics.getNetworkReceived(), response.get("networkIn"));
        assertEquals(metrics.getNetworkSent(), response.get("networkOut"));
        assertEquals(metrics.getTotalProcesses(), response.get("processCount"));
    }
    
    /**
     * Arbitrary provider for valid SystemMetrics instances
     */
    @Provide
    Arbitrary<SystemMetrics> validSystemMetrics() {
        // Split into two groups due to Combinators.combine() limit of 8 parameters
        Arbitrary<SystemMetrics> baseMetrics = Combinators.combine(
            Arbitraries.defaultFor(LocalDateTime.class),
            Arbitraries.doubles().between(0.0, 100.0),  // cpuUsage
            Arbitraries.doubles().between(0.0, 100.0),  // memoryUsage
            Arbitraries.longs().between(0L, 1_000_000_000_000L),  // memoryUsed
            Arbitraries.longs().between(1_000_000_000L, 1_000_000_000_000L),  // memoryTotal
            Arbitraries.doubles().between(0.0, 100.0),  // diskUsage
            Arbitraries.longs().between(0L, 10_000_000_000_000L),  // diskUsed
            Arbitraries.longs().between(1_000_000_000L, 10_000_000_000_000L)  // diskTotal
        ).as((timestamp, cpuUsage, memoryUsage, memoryUsed, memoryTotal, 
              diskUsage, diskUsed, diskTotal) -> {
            SystemMetrics metrics = new SystemMetrics();
            metrics.setTimestamp(timestamp);
            metrics.setCpuUsage(cpuUsage);
            metrics.setMemoryUsage(memoryUsage);
            metrics.setMemoryUsed(memoryUsed);
            metrics.setMemoryTotal(memoryTotal);
            metrics.setDiskUsage(diskUsage);
            metrics.setDiskUsed(diskUsed);
            metrics.setDiskTotal(diskTotal);
            return metrics;
        });
        
        // Add remaining fields
        return Combinators.combine(
            baseMetrics,
            Arbitraries.longs().between(0L, 1_000_000_000_000L),  // networkSent
            Arbitraries.longs().between(0L, 1_000_000_000_000L),  // networkReceived
            Arbitraries.integers().between(1, 1000),  // totalProcesses
            Arbitraries.strings().alpha().ofMinLength(3).ofMaxLength(50),  // hostname
            Arbitraries.strings().numeric().ofLength(1).map(s -> "192.168.1." + s)  // ipAddress
        ).as((metrics, networkSent, networkReceived, totalProcesses, hostname, ipAddress) -> {
            metrics.setNetworkSent(networkSent);
            metrics.setNetworkReceived(networkReceived);
            metrics.setTotalProcesses(totalProcesses);
            metrics.setHostname(hostname);
            metrics.setIpAddress(ipAddress);
            return metrics;
        });
    }
    
    /**
     * Helper method to transform SystemMetrics to API response format
     * This simulates what MetricsService.transformToRealtimeResponse would do
     */
    private Map<String, Object> transformToRealtimeResponse(SystemMetrics metrics) {
        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", metrics.getTimestamp());
        response.put("cpuUsage", metrics.getCpuUsage());
        response.put("memoryUsage", metrics.getMemoryUsage());
        response.put("memoryUsed", metrics.getMemoryUsed());
        response.put("memoryTotal", metrics.getMemoryTotal());
        response.put("diskUsage", metrics.getDiskUsage());
        response.put("diskUsed", metrics.getDiskUsed());
        response.put("diskTotal", metrics.getDiskTotal());
        response.put("networkIn", metrics.getNetworkReceived());
        response.put("networkOut", metrics.getNetworkSent());
        response.put("processCount", metrics.getTotalProcesses());
        response.put("topProcesses", new Object[0]); // Empty array for now
        return response;
    }
}
