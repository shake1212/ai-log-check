package com.security.ailogsystem.repository;

import com.security.ailogsystem.model.LogEntry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * LogEntryRepository 测试类
 */
@DataJpaTest
@ActiveProfiles("test")
class LogEntryRepositoryTest {

    @Autowired
    private LogEntryRepository logEntryRepository;

    @Test
    void testFindTopIps() {
        // 测试findTopIps方法是否能正常执行
        List<Object[]> results = logEntryRepository.findTopIps(10);
        assertNotNull(results);
        // 由于是空数据库，结果应该为空列表
        assertTrue(results.isEmpty());
    }

    @Test
    void testFindTopUsers() {
        // 测试findTopUsers方法是否能正常执行
        List<Object[]> results = logEntryRepository.findTopUsers(10);
        assertNotNull(results);
        assertTrue(results.isEmpty());
    }

    @Test
    void testFindTopActionsForUser() {
        // 测试findTopActionsForUser方法是否能正常执行
        List<Object[]> results = logEntryRepository.findTopActionsForUser("testUser", 5);
        assertNotNull(results);
        assertTrue(results.isEmpty());
    }

    @Test
    void testFindSourceStatistics() {
        // 测试findSourceStatistics方法是否能正常执行
        List<Object[]> results = logEntryRepository.findSourceStatistics();
        assertNotNull(results);
        assertTrue(results.isEmpty());
    }

    @Test
    void testCountByTimestampBetween() {
        // 测试countByTimestampBetween方法是否能正常执行
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime yesterday = now.minusDays(1);
        
        long count = logEntryRepository.countByTimestampBetween(yesterday, now);
        assertEquals(0, count);
    }

    @Test
    void testFindFirstEventTime() {
        // 测试findFirstEventTime方法是否能正常执行
        LocalDateTime firstTime = logEntryRepository.findFirstEventTime();
        assertNull(firstTime); // 空数据库应该返回null
    }

    @Test
    void testFindLastEventTime() {
        // 测试findLastEventTime方法是否能正常执行
        LocalDateTime lastTime = logEntryRepository.findLastEventTime();
        assertNull(lastTime); // 空数据库应该返回null
    }
}
