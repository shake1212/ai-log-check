package com.security.ailogsystem.repository;

import com.security.ailogsystem.entity.SystemMetrics;
import net.jqwik.api.*;
import org.junit.jupiter.api.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for MetricsRepository
 * Feature: log-collector-monitoring
 */
@DataJpaTest
@ActiveProfiles("test")
class MetricsRepositoryPropertyTest {

    @Autowired
    private MetricsRepository metricsRepository;

    @Autowired
    private TestEntityManager entityManager;

    /**
     * Property 6: Time-Range Query Correctness
     * For any time range (start, end) and any set of metrics with timestamps,
     * querying historical metrics should return exactly those metrics where
     * timestamp >= start AND timestamp <= end, with proper handling of null
     * start or end values
     * 
     * Validates: Requirements 3.1, 3.2, 3.3
     */
    @Property(tries = 100)
    @Tag("Feature: log-collector-monitoring, Property 6: Time-Range Query Correctness")
    void timeRangeQueryReturnsCorrectMetrics(
            @ForAll("metricsWithTimestamps") List<SystemMetrics> metrics,
            @ForAll("timeRange") TimeRange range) {
        
        // Clear database and store test metrics
        metricsRepository.deleteAll();
        entityManager.flush();
        
        List<SystemMetrics> savedMetrics = new ArrayList<>();
        for (SystemMetrics metric : metrics) {
            SystemMetrics saved = metricsRepository.save(metric);
            entityManager.flush();
            savedMetrics.add(saved);
        }
        
        // Query with time range
        List<SystemMetrics> results;
        if (range.start != null && range.end != null) {
            results = metricsRepository.findByTimestampBetweenOrderByTimestampAsc(
                range.start, range.end);
        } else if (range.start != null) {
            results = metricsRepository.findByTimestampAfterOrderByTimestampAsc(
                range.start);
        } else if (range.end != null) {
            results = metricsRepository.findByTimestampBeforeOrderByTimestampAsc(
                range.end);
        } else {
            // Both null - should return all
            results = metricsRepository.findAll();
        }
        
        // Verify results match expected filtering
        List<SystemMetrics> expected = savedMetrics.stream()
            .filter(m -> matchesTimeRange(m.getTimestamp(), range))
            .sorted((a, b) -> a.getTimestamp().compareTo(b.getTimestamp()))
            .collect(Collectors.toList());
        
        assertEquals(expected.size(), results.size(),
            "Query should return correct number of metrics");
        
        // Verify each result is in expected range
        for (SystemMetrics result : results) {
            assertTrue(matchesTimeRange(result.getTimestamp(), range),
                "All results should be within the specified time range");
        }
    }

    /**
     * Property 7: Historical Metrics Ordering
     * For any set of historical metrics returned by a query, the results
     * should be ordered by timestamp in ascending order
     * 
     * Validates: Requirements 3.5
     */
    @Property(tries = 100)
    @Tag("Feature: log-collector-monitoring, Property 7: Historical Metrics Ordering")
    void historicalMetricsAreOrderedByTimestamp(
            @ForAll("metricsWithTimestamps") List<SystemMetrics> metrics) {
        
        // Clear database and store test metrics
        metricsRepository.deleteAll();
        entityManager.flush();
        
        for (SystemMetrics metric : metrics) {
            metricsRepository.save(metric);
            entityManager.flush();
        }
        
        // Query all metrics
        LocalDateTime veryOldTime = LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime veryFutureTime = LocalDateTime.of(2100, 12, 31, 23, 59);
        List<SystemMetrics> results = metricsRepository
            .findByTimestampBetweenOrderByTimestampAsc(veryOldTime, veryFutureTime);
        
        // Verify ordering
        for (int i = 0; i < results.size() - 1; i++) {
            LocalDateTime current = results.get(i).getTimestamp();
            LocalDateTime next = results.get(i + 1).getTimestamp();
            
            assertTrue(current.isBefore(next) || current.isEqual(next),
                "Metrics should be ordered by timestamp in ascending order. " +
                "Found " + current + " followed by " + next);
        }
    }

    // Helper methods and providers
    
    private boolean matchesTimeRange(LocalDateTime timestamp, TimeRange range) {
        boolean afterStart = range.start == null || 
            !timestamp.isBefore(range.start);
        boolean beforeEnd = range.end == null || 
            !timestamp.isAfter(range.end);
        return afterStart && beforeEnd;
    }
    
    /**
     * Arbitrary provider for SystemMetrics with various timestamps
     */
    @Provide
    Arbitrary<List<SystemMetrics>> metricsWithTimestamps() {
        return Arbitraries.integers().between(1, 10).flatMap(size -> {
            List<Arbitrary<SystemMetrics>> metricArbitraries = new ArrayList<>();
            for (int i = 0; i < size; i++) {
                metricArbitraries.add(createMetricArbitrary());
            }
            return Combinators.combine(metricArbitraries).as(list -> list);
        });
    }
    
    private Arbitrary<SystemMetrics> createMetricArbitrary() {
        return Combinators.combine(
            Arbitraries.integers().between(2020, 2030),  // year
            Arbitraries.integers().between(1, 12),       // month
            Arbitraries.integers().between(1, 28),       // day
            Arbitraries.integers().between(0, 23),       // hour
            Arbitraries.integers().between(0, 59),       // minute
            Arbitraries.doubles().between(0.0, 100.0),   // cpuUsage
            Arbitraries.longs().between(0L, 1_000_000_000_000L)  // memoryUsed
        ).as((year, month, day, hour, minute, cpuUsage, memoryUsed) -> {
            SystemMetrics metric = new SystemMetrics();
            metric.setTimestamp(LocalDateTime.of(year, month, day, hour, minute));
            metric.setCpuUsage(cpuUsage);
            metric.setMemoryUsed(memoryUsed);
            metric.setMemoryTotal(1_000_000_000_000L);
            return metric;
        });
    }

    /**
     * Arbitrary provider for time ranges
     */
    @Provide
    Arbitrary<TimeRange> timeRange() {
        Arbitrary<LocalDateTime> dateTime = Arbitraries.integers()
            .between(2020, 2030)
            .flatMap(year -> Arbitraries.integers().between(1, 12)
                .flatMap(month -> Arbitraries.integers().between(1, 28)
                    .flatMap(day -> Arbitraries.integers().between(0, 23)
                        .flatMap(hour -> Arbitraries.integers().between(0, 59)
                            .map(minute -> LocalDateTime.of(year, month, day, hour, minute))))));
        
        return Combinators.combine(
            dateTime.optional(),
            dateTime.optional()
        ).as((start, end) -> {
            // Ensure start is before end if both are present
            if (start.isPresent() && end.isPresent()) {
                LocalDateTime s = start.get();
                LocalDateTime e = end.get();
                if (s.isAfter(e)) {
                    return new TimeRange(e, s);
                }
            }
            return new TimeRange(start.orElse(null), end.orElse(null));
        });
    }
    
    /**
     * Helper class to represent a time range
     */
    static class TimeRange {
        final LocalDateTime start;
        final LocalDateTime end;
        
        TimeRange(LocalDateTime start, LocalDateTime end) {
            this.start = start;
            this.end = end;
        }
    }
}
