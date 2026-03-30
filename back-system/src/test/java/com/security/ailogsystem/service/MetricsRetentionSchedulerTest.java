package com.security.ailogsystem.service;

import com.security.ailogsystem.entity.SystemMetrics;
import com.security.ailogsystem.repository.MetricsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for MetricsRetentionScheduler.
 * Tests the scheduled cleanup job for old metrics.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MetricsRetentionSchedulerTest {

    @Autowired
    private MetricsRetentionScheduler metricsRetentionScheduler;

    @Autowired
    private MetricsRepository metricsRepository;

    @Autowired
    private MetricsService metricsService;

    @BeforeEach
    void setUp() {
        // Clean up any existing metrics before each test
        metricsRepository.deleteAll();
    }

    @Test
    void testCleanupDeletesOldMetrics() {
        // Create old metrics (40 days old)
        List<SystemMetrics> oldMetrics = createTestMetrics(10, LocalDateTime.now().minusDays(40));
        metricsRepository.saveAll(oldMetrics);

        // Create recent metrics (10 days old)
        List<SystemMetrics> recentMetrics = createTestMetrics(5, LocalDateTime.now().minusDays(10));
        metricsRepository.saveAll(recentMetrics);

        // Verify initial count
        assertEquals(15, metricsRepository.count());

        // Execute cleanup with 30-day retention
        int deletedCount = metricsService.cleanupOldMetrics(30);

        // Verify old metrics were deleted
        assertEquals(10, deletedCount);
        assertEquals(5, metricsRepository.count());
    }

    @Test
    void testCleanupPreservesRecentMetrics() {
        // Create recent metrics (10 days old)
        List<SystemMetrics> recentMetrics = createTestMetrics(15, LocalDateTime.now().minusDays(10));
        metricsRepository.saveAll(recentMetrics);

        // Verify initial count
        assertEquals(15, metricsRepository.count());

        // Execute cleanup with 30-day retention
        int deletedCount = metricsService.cleanupOldMetrics(30);

        // Verify no metrics were deleted
        assertEquals(0, deletedCount);
        assertEquals(15, metricsRepository.count());
    }

    @Test
    void testCleanupWithNoOldMetrics() {
        // Create only recent metrics
        List<SystemMetrics> recentMetrics = createTestMetrics(20, LocalDateTime.now().minusDays(5));
        metricsRepository.saveAll(recentMetrics);

        // Execute cleanup
        int deletedCount = metricsService.cleanupOldMetrics(30);

        // Verify no metrics were deleted
        assertEquals(0, deletedCount);
        assertEquals(20, metricsRepository.count());
    }

    @Test
    void testCleanupWithEmptyDatabase() {
        // Verify database is empty
        assertEquals(0, metricsRepository.count());

        // Execute cleanup
        int deletedCount = metricsService.cleanupOldMetrics(30);

        // Verify no metrics were deleted
        assertEquals(0, deletedCount);
        assertEquals(0, metricsRepository.count());
    }

    @Test
    void testCleanupWithExactBoundary() {
        // Create metrics exactly at the 30-day boundary
        List<SystemMetrics> boundaryMetrics = createTestMetrics(5, LocalDateTime.now().minusDays(30));
        metricsRepository.saveAll(boundaryMetrics);

        // Create metrics just before the boundary (30 days + 1 hour)
        List<SystemMetrics> oldMetrics = createTestMetrics(3, LocalDateTime.now().minusDays(30).minusHours(1));
        metricsRepository.saveAll(oldMetrics);

        // Create metrics just after the boundary (29 days)
        List<SystemMetrics> recentMetrics = createTestMetrics(4, LocalDateTime.now().minusDays(29));
        metricsRepository.saveAll(recentMetrics);

        // Verify initial count
        assertEquals(12, metricsRepository.count());

        // Execute cleanup with 30-day retention
        int deletedCount = metricsService.cleanupOldMetrics(30);

        // Verify only metrics older than 30 days were deleted
        // The boundary metrics (exactly 30 days) should be preserved
        assertEquals(3, deletedCount);
        assertTrue(metricsRepository.count() >= 4); // At least the recent ones should remain
    }

    @Test
    void testCleanupWithDifferentRetentionPeriods() {
        // Create metrics at different ages
        List<SystemMetrics> metrics60Days = createTestMetrics(5, LocalDateTime.now().minusDays(60));
        List<SystemMetrics> metrics45Days = createTestMetrics(5, LocalDateTime.now().minusDays(45));
        List<SystemMetrics> metrics20Days = createTestMetrics(5, LocalDateTime.now().minusDays(20));
        List<SystemMetrics> metrics5Days = createTestMetrics(5, LocalDateTime.now().minusDays(5));

        metricsRepository.saveAll(metrics60Days);
        metricsRepository.saveAll(metrics45Days);
        metricsRepository.saveAll(metrics20Days);
        metricsRepository.saveAll(metrics5Days);

        // Verify initial count
        assertEquals(20, metricsRepository.count());

        // Test with 30-day retention
        int deletedCount30 = metricsService.cleanupOldMetrics(30);
        assertEquals(10, deletedCount30); // Should delete 60-day and 45-day metrics
        assertEquals(10, metricsRepository.count());

        // Test with 15-day retention
        int deletedCount15 = metricsService.cleanupOldMetrics(15);
        assertEquals(5, deletedCount15); // Should delete 20-day metrics
        assertEquals(5, metricsRepository.count());
    }

    @Test
    void testScheduledCleanupExecution() {
        // Create old metrics
        List<SystemMetrics> oldMetrics = createTestMetrics(8, LocalDateTime.now().minusDays(35));
        metricsRepository.saveAll(oldMetrics);

        // Create recent metrics
        List<SystemMetrics> recentMetrics = createTestMetrics(12, LocalDateTime.now().minusDays(15));
        metricsRepository.saveAll(recentMetrics);

        // Verify initial count
        assertEquals(20, metricsRepository.count());

        // Execute the scheduled cleanup method
        // Note: This tests the scheduler method directly, not the actual scheduling
        metricsRetentionScheduler.cleanupOldMetrics();

        // Verify old metrics were deleted (default retention is 30 days)
        assertTrue(metricsRepository.count() <= 12);
    }

    @Test
    void testCleanupWithInvalidRetentionDays() {
        // Create some metrics
        List<SystemMetrics> metrics = createTestMetrics(10, LocalDateTime.now().minusDays(40));
        metricsRepository.saveAll(metrics);

        // Test with zero retention days
        assertThrows(IllegalArgumentException.class, () -> {
            metricsService.cleanupOldMetrics(0);
        });

        // Test with negative retention days
        assertThrows(IllegalArgumentException.class, () -> {
            metricsService.cleanupOldMetrics(-5);
        });

        // Verify no metrics were deleted
        assertEquals(10, metricsRepository.count());
    }

    /**
     * Helper method to create test metrics with a specific timestamp.
     */
    private List<SystemMetrics> createTestMetrics(int count, LocalDateTime timestamp) {
        List<SystemMetrics> metricsList = new ArrayList<>();

        for (int i = 0; i < count; i++) {
            SystemMetrics metrics = new SystemMetrics();
            metrics.setTimestamp(timestamp.plusMinutes(i)); // Slightly different timestamps
            metrics.setHostname("test-host-" + i);
            metrics.setIpAddress("192.168.1." + (i % 255));
            metrics.setCpuUsage(50.0 + (i % 50));
            metrics.setCpuCores(4);
            metrics.setCpuFrequency(2400.0);
            metrics.setMemoryUsage(60.0 + (i % 40));
            metrics.setMemoryUsed(8589934592L + (i * 1000000));
            metrics.setMemoryTotal(17179869184L);
            metrics.setMemoryAvailable(8589934592L - (i * 1000000));
            metrics.setDiskUsage(70.0 + (i % 30));
            metrics.setDiskUsed(483183820800L + (i * 10000000));
            metrics.setDiskTotal(1000204886016L);
            metrics.setNetworkSent(1234567890L + (i * 1000));
            metrics.setNetworkReceived(9876543210L + (i * 1000));
            metrics.setNetworkSentRate(1000.0 + (i * 10));
            metrics.setNetworkReceivedRate(2000.0 + (i * 10));
            metrics.setTotalProcesses(200 + i);
            metrics.setRunningProcesses(50 + (i % 20));
            metrics.setSystemLoad(1.5 + (i * 0.1));
            metrics.setUptime(86400L * (i + 1));
            metrics.setRawData("{\"test\": \"data" + i + "\"}");

            metricsList.add(metrics);
        }

        return metricsList;
    }
}
