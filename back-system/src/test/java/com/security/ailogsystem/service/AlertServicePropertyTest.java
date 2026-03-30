package com.security.ailogsystem.service;

import com.security.ailogsystem.entity.SecurityAlert;
import com.security.ailogsystem.repository.SecurityAlertRepository;
import com.security.ailogsystem.service.impl.AlertServiceImpl;
import net.jqwik.api.*;
import org.junit.jupiter.api.BeforeEach;
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
 * Property-based tests for AlertService
 * Feature: log-collector-monitoring
 */
@DataJpaTest
@ActiveProfiles("test")
class AlertServicePropertyTest {

    @Autowired
    private SecurityAlertRepository securityAlertRepository;

    @Autowired
    private TestEntityManager entityManager;

    private AlertService alertService;

    @BeforeEach
    void setUp() {
        // Create AlertService instance with the repository
        alertService = new AlertServiceImpl(null, null, securityAlertRepository);
    }

    /**
     * Property 8: Alert Filtering
     * For any filter criteria (status, severity, or both), the alerts endpoint
     * should return only alerts that match all specified filter criteria
     * 
     * Validates: Requirements 4.2, 4.4, 4.5
     */
    @Property(tries = 100)
    @Tag("Feature: log-collector-monitoring, Property 8: Alert Filtering")
    void alertFilteringReturnsOnlyMatchingAlerts(
            @ForAll("alertsWithVariedAttributes") List<SecurityAlert> alerts,
            @ForAll("filterCriteria") FilterCriteria criteria) {
        
        // Clear database and store test alerts
        securityAlertRepository.deleteAll();
        entityManager.flush();
        
        List<SecurityAlert> savedAlerts = new ArrayList<>();
        for (SecurityAlert alert : alerts) {
            SecurityAlert saved = securityAlertRepository.save(alert);
            entityManager.flush();
            savedAlerts.add(saved);
        }
        
        // Query with filter criteria
        List<SecurityAlert> results = alertService.getLogCollectorAlerts(
            criteria.status, criteria.severity);
        
        // Verify all results match the filter criteria
        for (SecurityAlert result : results) {
            assertTrue(matchesFilterCriteria(result, criteria),
                "All returned alerts should match the filter criteria. " +
                "Alert: level=" + result.getAlertLevel() + 
                ", handled=" + result.getHandled() +
                ", Criteria: status=" + criteria.status + 
                ", severity=" + criteria.severity);
        }
        
        // Verify no matching alerts were excluded
        List<SecurityAlert> expectedMatches = savedAlerts.stream()
            .filter(a -> matchesFilterCriteria(a, criteria))
            .collect(Collectors.toList());
        
        assertEquals(expectedMatches.size(), results.size(),
            "Query should return all alerts matching the criteria");
    }

    /**
     * Property 9: Alert Ordering
     * For any set of alerts returned by a query, the results should be
     * ordered by timestamp in descending order (most recent first)
     * 
     * Validates: Requirements 4.3
     */
    @Property(tries = 100)
    @Tag("Feature: log-collector-monitoring, Property 9: Alert Ordering")
    void alertsAreOrderedByTimestampDescending(
            @ForAll("alertsWithVariedTimestamps") List<SecurityAlert> alerts) {
        
        // Clear database and store test alerts
        securityAlertRepository.deleteAll();
        entityManager.flush();
        
        for (SecurityAlert alert : alerts) {
            securityAlertRepository.save(alert);
            entityManager.flush();
        }
        
        // Query all alerts (no filters)
        List<SecurityAlert> results = alertService.getLogCollectorAlerts(null, null);
        
        // Verify ordering - most recent first (descending)
        for (int i = 0; i < results.size() - 1; i++) {
            LocalDateTime current = results.get(i).getCreatedTime();
            LocalDateTime next = results.get(i + 1).getCreatedTime();
            
            assertTrue(current.isAfter(next) || current.isEqual(next),
                "Alerts should be ordered by timestamp in descending order (most recent first). " +
                "Found " + current + " followed by " + next);
        }
    }

    // Helper methods and providers
    
    private boolean matchesFilterCriteria(SecurityAlert alert, FilterCriteria criteria) {
        // Check severity filter
        if (criteria.severity != null && !criteria.severity.trim().isEmpty()) {
            try {
                SecurityAlert.AlertLevel expectedLevel = 
                    SecurityAlert.AlertLevel.valueOf(criteria.severity.toUpperCase());
                if (alert.getAlertLevel() != expectedLevel) {
                    return false;
                }
            } catch (IllegalArgumentException e) {
                // Invalid severity - no alerts should match
                return false;
            }
        }
        
        // Check status filter
        if (criteria.status != null && !criteria.status.trim().isEmpty()) {
            boolean shouldBeHandled = "RESOLVED".equalsIgnoreCase(criteria.status) || 
                                     "HANDLED".equalsIgnoreCase(criteria.status);
            boolean isHandled = alert.getHandled() != null && alert.getHandled();
            
            if (shouldBeHandled != isHandled) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Arbitrary provider for alerts with varied attributes
     */
    @Provide
    Arbitrary<List<SecurityAlert>> alertsWithVariedAttributes() {
        return Arbitraries.integers().between(5, 15).flatMap(size -> {
            List<Arbitrary<SecurityAlert>> alertArbitraries = new ArrayList<>();
            for (int i = 0; i < size; i++) {
                alertArbitraries.add(createAlertWithAttributesArbitrary());
            }
            return Combinators.combine(alertArbitraries).as(list -> list);
        });
    }
    
    /**
     * Arbitrary provider for alerts with varied timestamps
     */
    @Provide
    Arbitrary<List<SecurityAlert>> alertsWithVariedTimestamps() {
        return Arbitraries.integers().between(5, 15).flatMap(size -> {
            List<Arbitrary<SecurityAlert>> alertArbitraries = new ArrayList<>();
            for (int i = 0; i < size; i++) {
                alertArbitraries.add(createAlertWithTimestampArbitrary());
            }
            return Combinators.combine(alertArbitraries).as(list -> list);
        });
    }
    
    private Arbitrary<SecurityAlert> createAlertWithAttributesArbitrary() {
        return Combinators.combine(
            Arbitraries.of(SecurityAlert.AlertLevel.values()),
            Arbitraries.of(true, false, null),
            Arbitraries.strings().alpha().ofMinLength(5).ofMaxLength(20),
            Arbitraries.strings().alpha().ofMinLength(10).ofMaxLength(50)
        ).as((level, handled, alertType, description) -> {
            SecurityAlert alert = new SecurityAlert();
            alert.setAlertLevel(level);
            alert.setHandled(handled);
            alert.setAlertType(alertType);
            alert.setDescription(description);
            alert.setCreatedTime(LocalDateTime.now());
            return alert;
        });
    }
    
    private Arbitrary<SecurityAlert> createAlertWithTimestampArbitrary() {
        return Combinators.combine(
            Arbitraries.integers().between(2020, 2030),  // year
            Arbitraries.integers().between(1, 12),       // month
            Arbitraries.integers().between(1, 28),       // day
            Arbitraries.integers().between(0, 23),       // hour
            Arbitraries.integers().between(0, 59),       // minute
            Arbitraries.of(SecurityAlert.AlertLevel.values()),
            Arbitraries.strings().alpha().ofMinLength(5).ofMaxLength(20)
        ).as((year, month, day, hour, minute, level, alertType) -> {
            SecurityAlert alert = new SecurityAlert();
            alert.setCreatedTime(LocalDateTime.of(year, month, day, hour, minute));
            alert.setAlertLevel(level);
            alert.setAlertType(alertType);
            alert.setDescription("Test alert");
            alert.setHandled(false);
            return alert;
        });
    }

    /**
     * Arbitrary provider for filter criteria
     */
    @Provide
    Arbitrary<FilterCriteria> filterCriteria() {
        Arbitrary<String> statusArbitrary = Arbitraries.of(
            null, "", "PENDING", "RESOLVED", "HANDLED", "pending", "resolved"
        );
        
        Arbitrary<String> severityArbitrary = Arbitraries.of(
            null, "", "LOW", "MEDIUM", "HIGH", "CRITICAL", "low", "high"
        );
        
        return Combinators.combine(statusArbitrary, severityArbitrary)
            .as(FilterCriteria::new);
    }
    
    /**
     * Helper class to represent filter criteria
     */
    static class FilterCriteria {
        final String status;
        final String severity;
        
        FilterCriteria(String status, String severity) {
            this.status = status;
            this.severity = severity;
        }
    }
}
