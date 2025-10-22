package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.LogEntryDTO;
import com.security.ailogsystem.repository.LogEntryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 批量日志服务测试类
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class BatchLogServiceTest {

    @Autowired
    private BatchLogService batchLogService;

    @Autowired
    private LogEntryRepository logEntryRepository;

    @Test
    void testBatchSaveLogs() {
        // 准备测试数据
        List<LogEntryDTO> logEntries = createTestLogEntries(100);
        
        // 执行批量保存
        int savedCount = batchLogService.batchSaveLogs(logEntries);
        
        // 验证结果
        assertEquals(100, savedCount);
        assertEquals(100, logEntryRepository.count());
    }

    @Test
    void testBatchUpdateLogs() {
        // 先保存一些数据
        List<LogEntryDTO> logEntries = createTestLogEntries(50);
        batchLogService.batchSaveLogs(logEntries);
        
        // 修改数据
        for (LogEntryDTO dto : logEntries) {
            dto.setContent("Updated: " + dto.getContent());
        }
        
        // 执行批量更新
        int updatedCount = batchLogService.batchUpdateLogs(logEntries);
        
        // 验证结果
        assertEquals(50, updatedCount);
    }

    @Test
    void testBatchDeleteLogs() {
        // 先保存一些数据
        List<LogEntryDTO> logEntries = createTestLogEntries(30);
        batchLogService.batchSaveLogs(logEntries);
        
        // 获取保存的ID
        List<Long> ids = new ArrayList<>();
        for (int i = 1; i <= 30; i++) {
            ids.add((long) i);
        }
        
        // 执行批量删除
        int deletedCount = batchLogService.batchDeleteLogs(ids);
        
        // 验证结果
        assertEquals(30, deletedCount);
        assertEquals(0, logEntryRepository.count());
    }

    @Test
    void testBatchMarkAnomaly() {
        // 先保存一些数据
        List<LogEntryDTO> logEntries = createTestLogEntries(20);
        batchLogService.batchSaveLogs(logEntries);
        
        // 获取保存的ID
        List<Long> ids = new ArrayList<>();
        for (int i = 1; i <= 20; i++) {
            ids.add((long) i);
        }
        
        // 执行批量标记异常
        int updatedCount = batchLogService.batchMarkAnomaly(ids, true, 0.95, "Test anomaly");
        
        // 验证结果
        assertEquals(20, updatedCount);
    }

    @Test
    void testBatchFindByIds() {
        // 先保存一些数据
        List<LogEntryDTO> logEntries = createTestLogEntries(15);
        batchLogService.batchSaveLogs(logEntries);
        
        // 获取保存的ID
        List<Long> ids = new ArrayList<>();
        for (int i = 1; i <= 15; i++) {
            ids.add((long) i);
        }
        
        // 执行批量查询
        List<LogEntryDTO> result = batchLogService.batchFindByIds(ids);
        
        // 验证结果
        assertEquals(15, result.size());
    }

    @Test
    void testGetBatchOperationStats() {
        // 先保存一些数据
        List<LogEntryDTO> logEntries = createTestLogEntries(25);
        batchLogService.batchSaveLogs(logEntries);
        
        // 获取统计信息
        Map<String, Object> stats = batchLogService.getBatchOperationStats();
        
        // 验证结果
        assertNotNull(stats);
        assertTrue(stats.containsKey("totalLogs"));
        assertEquals(25L, stats.get("totalLogs"));
    }

    @Test
    void testBatchImportLogs() {
        // 准备大量测试数据
        List<LogEntryDTO> logEntries = createTestLogEntries(1000);
        
        // 执行批量导入
        Map<String, Object> result = batchLogService.batchImportLogs(logEntries, 100);
        
        // 验证结果
        assertNotNull(result);
        assertTrue((Boolean) result.get("success"));
        assertEquals(1000, result.get("totalCount"));
        assertEquals(1000, result.get("successCount"));
    }

    @Test
    void testCleanupExpiredLogs() {
        // 先保存一些数据
        List<LogEntryDTO> logEntries = createTestLogEntries(10);
        batchLogService.batchSaveLogs(logEntries);
        
        // 清理过期日志（清理1小时前的数据）
        LocalDateTime beforeDate = LocalDateTime.now().minusHours(1);
        int deletedCount = batchLogService.cleanupExpiredLogs(beforeDate);
        
        // 验证结果（由于刚创建的数据，应该不会被清理）
        assertEquals(0, deletedCount);
    }

    /**
     * 创建测试日志数据
     */
    private List<LogEntryDTO> createTestLogEntries(int count) {
        List<LogEntryDTO> logEntries = new ArrayList<>();
        
        for (int i = 0; i < count; i++) {
            LogEntryDTO dto = LogEntryDTO.builder()
                    .timestamp(LocalDateTime.now())
                    .source("test-source-" + (i % 5))
                    .level(i % 2 == 0 ? "INFO" : "ERROR")
                    .content("Test log message " + i)
                    .ipAddress("192.168.1." + (i % 255))
                    .userId("user" + (i % 10))
                    .action("action" + (i % 3))
                    .isAnomaly(i % 10 == 0)
                    .anomalyScore(i % 10 == 0 ? 0.95 : null)
                    .anomalyReason(i % 10 == 0 ? "Test anomaly" : null)
                    .rawData("{\"test\": \"data" + i + "\"}")
                    .build();
            
            logEntries.add(dto);
        }
        
        return logEntries;
    }
}
