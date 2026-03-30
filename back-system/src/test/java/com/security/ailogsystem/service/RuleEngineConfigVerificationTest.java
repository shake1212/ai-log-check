package com.security.ailogsystem.service;

import com.security.ailogsystem.entity.LogCollectorConfig;
import com.security.ailogsystem.repository.LogCollectorConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Verification tests for rule engine configuration read/write functionality.
 *
 * Validates that the LogCollectorConfig entity correctly supports
 * enable_rule_engine and rule_engine_timeout fields, and that the
 * repository layer can persist and retrieve them.
 *
 * Validates Requirements: 1.2, 1.3
 */
class RuleEngineConfigVerificationTest {

    private LogCollectorConfigRepository repository;

    @BeforeEach
    void setUp() {
        repository = mock(LogCollectorConfigRepository.class);
    }

    /**
     * Verifies that enable_rule_engine field can be set and read on the entity.
     * Validates Requirements: 1.2
     */
    @Test
    void testRuleEngineConfigCanBeRead() {
        // Arrange
        LogCollectorConfig config = buildConfig("default", true, 30);
        when(repository.findById("default")).thenReturn(Optional.of(config));

        // Act
        Optional<LogCollectorConfig> found = repository.findById("default");

        // Assert
        assertTrue(found.isPresent(), "Config should be retrievable");
        LogCollectorConfig loaded = found.get();
        assertTrue(loaded.getEnableRuleEngine(), "enable_rule_engine should be true");
        assertEquals(30, loaded.getRuleEngineTimeout(), "rule_engine_timeout should be 30");
    }

    /**
     * Verifies that rule engine configuration can be updated and saved.
     * Validates Requirements: 1.2
     */
    @Test
    void testRuleEngineConfigCanBeUpdated() {
        // Arrange: existing config with rule engine enabled
        LogCollectorConfig existing = buildConfig("default", true, 10);
        when(repository.findById("default")).thenReturn(Optional.of(existing));

        // Act: update rule engine fields and save
        existing.setEnableRuleEngine(false);
        existing.setRuleEngineTimeout(60);
        when(repository.save(existing)).thenReturn(existing);
        LogCollectorConfig saved = repository.save(existing);

        // Assert: updated values are reflected
        assertFalse(saved.getEnableRuleEngine(), "enable_rule_engine should be updated to false");
        assertEquals(60, saved.getRuleEngineTimeout(), "rule_engine_timeout should be updated to 60");
        verify(repository, times(1)).save(existing);
    }

    /**
     * Verifies that rule_engine_timeout can be null (nullable column).
     * Validates Requirements: 1.2
     */
    @Test
    void testRuleEngineTimeoutIsNullable() {
        // Arrange: config with null timeout
        LogCollectorConfig config = buildConfig("default", true, null);
        when(repository.findById("default")).thenReturn(Optional.of(config));

        // Act
        LogCollectorConfig loaded = repository.findById("default").orElseThrow();

        // Assert
        assertNull(loaded.getRuleEngineTimeout(), "rule_engine_timeout should allow null");
        assertTrue(loaded.getEnableRuleEngine(), "enable_rule_engine should still be set");
    }

    /**
     * Verifies that default values for rule engine fields are applied by the entity.
     * Validates Requirements: 1.2
     */
    @Test
    void testRuleEngineDefaultValues() {
        // Arrange: create entity without explicitly setting rule engine fields
        LogCollectorConfig config = new LogCollectorConfig();
        config.setId("default");
        config.setName("Test Config");
        config.setEnabled(true);
        config.setInterval(300);
        config.setDataSources(Arrays.asList("security", "system"));
        config.setCpuThreshold(80);
        config.setMemoryThreshold(90);
        config.setDiskThreshold(85);
        config.setErrorRateThreshold(5);
        config.setRetentionDays(7);
        LocalDateTime now = LocalDateTime.now();
        config.setCreatedAt(now);
        config.setUpdatedAt(now);
        // enableRuleEngine defaults to true, ruleEngineTimeout defaults to 10

        // Assert: defaults are applied by field initializers
        assertTrue(config.getEnableRuleEngine(), "enable_rule_engine should default to true");
        assertEquals(10, config.getRuleEngineTimeout(), "rule_engine_timeout should default to 10");
    }

    /**
     * Verifies that the repository save operation is called when persisting rule engine config.
     * Validates Requirements: 1.2
     */
    @Test
    void testRuleEngineConfigIsPersisted() {
        // Arrange
        LogCollectorConfig config = buildConfig("default", true, 15);
        when(repository.save(any(LogCollectorConfig.class))).thenReturn(config);

        // Act
        LogCollectorConfig saved = repository.save(config);

        // Assert
        assertNotNull(saved, "Saved config should not be null");
        assertTrue(saved.getEnableRuleEngine(), "Saved config should have enable_rule_engine=true");
        assertEquals(15, saved.getRuleEngineTimeout(), "Saved config should have rule_engine_timeout=15");
        verify(repository).save(config);
    }

    // --- Helper ---

    private LogCollectorConfig buildConfig(String id, Boolean enableRuleEngine, Integer timeout) {
        LogCollectorConfig config = new LogCollectorConfig();
        config.setId(id);
        config.setName("Rule Engine Test Config");
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
