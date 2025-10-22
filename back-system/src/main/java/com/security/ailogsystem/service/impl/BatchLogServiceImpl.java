package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.dto.LogEntryDTO;
import com.security.ailogsystem.exception.BatchOperationException;
import com.security.ailogsystem.exception.DatabaseException;
import com.security.ailogsystem.model.LogEntry;
import com.security.ailogsystem.repository.LogEntryRepository;
import com.security.ailogsystem.service.BatchLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * 批量日志服务实现类
 * 提供高效的批量操作和查询优化功能
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class BatchLogServiceImpl implements BatchLogService {

    private final LogEntryRepository logEntryRepository;
    
    // 默认批次大小
    private static final int DEFAULT_BATCH_SIZE = 1000;
    
    // 最大批次大小
    private static final int MAX_BATCH_SIZE = 5000;

    @Override
    @Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class, timeout = 300)
    public int batchSaveLogs(List<LogEntryDTO> logEntries) {
        if (logEntries == null || logEntries.isEmpty()) {
            return 0;
        }
        
        log.info("开始批量保存日志，数量: {}", logEntries.size());
        long startTime = System.currentTimeMillis();
        
        try {
            // 分批处理，避免内存溢出
            List<List<LogEntryDTO>> batches = partitionList(logEntries, DEFAULT_BATCH_SIZE);
            int totalSaved = 0;
            
            for (List<LogEntryDTO> batch : batches) {
                try {
                    List<LogEntry> entities = batch.stream()
                            .map(this::convertToEntity)
                            .collect(Collectors.toList());
                    
                    List<LogEntry> savedEntities = logEntryRepository.saveAll(entities);
                    totalSaved += savedEntities.size();
                    
                    log.debug("批次保存完成，数量: {}", savedEntities.size());
                } catch (DataAccessException e) {
                    log.error("批次保存失败，批次大小: {}", batch.size(), e);
                    throw new DatabaseException("批次保存失败: " + e.getMessage(), e);
                }
            }
            
            long endTime = System.currentTimeMillis();
            log.info("批量保存完成，总数量: {}, 耗时: {}ms, 平均: {}ms/条", 
                    totalSaved, (endTime - startTime), totalSaved > 0 ? (endTime - startTime) / totalSaved : 0);
            
            return totalSaved;
            
        } catch (DatabaseException e) {
            throw e;
        } catch (Exception e) {
            log.error("批量保存日志失败", e);
            throw new BatchOperationException("批量保存日志失败: " + e.getMessage(), e, 0, logEntries.size(), logEntries.size());
        }
    }

    @Override
    @Async("batchOperationExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class, timeout = 300)
    public void batchSaveLogsAsync(List<LogEntryDTO> logEntries) {
        log.info("开始异步批量保存日志，数量: {}", logEntries.size());
        
        CompletableFuture.runAsync(() -> {
            try {
                batchSaveLogs(logEntries);
                log.info("异步批量保存完成");
            } catch (Exception e) {
                log.error("异步批量保存失败", e);
            }
        });
    }

    @Override
    public int batchUpdateLogs(List<LogEntryDTO> logEntries) {
        if (logEntries == null || logEntries.isEmpty()) {
            return 0;
        }
        
        log.info("开始批量更新日志，数量: {}", logEntries.size());
        long startTime = System.currentTimeMillis();
        
        try {
            // 分批处理
            List<List<LogEntryDTO>> batches = partitionList(logEntries, DEFAULT_BATCH_SIZE);
            int totalUpdated = 0;
            
            for (List<LogEntryDTO> batch : batches) {
                List<LogEntry> entities = batch.stream()
                        .map(this::convertToEntity)
                        .collect(Collectors.toList());
                
                List<LogEntry> updatedEntities = logEntryRepository.saveAll(entities);
                totalUpdated += updatedEntities.size();
            }
            
            long endTime = System.currentTimeMillis();
            log.info("批量更新完成，总数量: {}, 耗时: {}ms", totalUpdated, (endTime - startTime));
            
            return totalUpdated;
            
        } catch (Exception e) {
            log.error("批量更新日志失败", e);
            throw new RuntimeException("批量更新日志失败: " + e.getMessage(), e);
        }
    }

    @Override
    public int batchDeleteLogs(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return 0;
        }
        
        log.info("开始批量删除日志，数量: {}", ids.size());
        long startTime = System.currentTimeMillis();
        
        try {
            // 分批删除，避免SQL语句过长
            List<List<Long>> batches = partitionList(ids, DEFAULT_BATCH_SIZE);
            int totalDeleted = 0;
            
            for (List<Long> batch : batches) {
                logEntryRepository.deleteAllById(batch);
                totalDeleted += batch.size();
            }
            
            long endTime = System.currentTimeMillis();
            log.info("批量删除完成，总数量: {}, 耗时: {}ms", totalDeleted, (endTime - startTime));
            
            return totalDeleted;
            
        } catch (Exception e) {
            log.error("批量删除日志失败", e);
            throw new RuntimeException("批量删除日志失败: " + e.getMessage(), e);
        }
    }

    @Override
    public int batchMarkAnomaly(List<Long> ids, boolean isAnomaly, Double anomalyScore, String anomalyReason) {
        if (ids == null || ids.isEmpty()) {
            return 0;
        }
        
        log.info("开始批量标记异常，数量: {}, 异常: {}", ids.size(), isAnomaly);
        long startTime = System.currentTimeMillis();
        
        try {
            // 分批处理
            List<List<Long>> batches = partitionList(ids, DEFAULT_BATCH_SIZE);
            int totalUpdated = 0;
            
            for (List<Long> batch : batches) {
                List<LogEntry> entities = logEntryRepository.findAllById(batch);
                
                for (LogEntry entity : entities) {
                    entity.setAnomaly(isAnomaly);
                    entity.setAnomalyScore(anomalyScore);
                    entity.setAnomalyReason(anomalyReason);
                    entity.setUpdatedAt(LocalDateTime.now());
                }
                
                logEntryRepository.saveAll(entities);
                totalUpdated += entities.size();
            }
            
            long endTime = System.currentTimeMillis();
            log.info("批量标记异常完成，总数量: {}, 耗时: {}ms", totalUpdated, (endTime - startTime));
            
            return totalUpdated;
            
        } catch (Exception e) {
            log.error("批量标记异常失败", e);
            throw new RuntimeException("批量标记异常失败: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<LogEntryDTO> efficientPageQuery(Pageable pageable) {
        log.debug("执行高效分页查询，页码: {}, 大小: {}", pageable.getPageNumber(), pageable.getPageSize());
        
        long startTime = System.currentTimeMillis();
        
        try {
            Page<LogEntry> page = logEntryRepository.findAll(pageable);
            Page<LogEntryDTO> result = page.map(this::convertToDTO);
            
            long endTime = System.currentTimeMillis();
            log.debug("高效分页查询完成，耗时: {}ms", (endTime - startTime));
            
            return result;
            
        } catch (Exception e) {
            log.error("高效分页查询失败", e);
            throw new RuntimeException("高效分页查询失败: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<LogEntryDTO> batchFindByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyList();
        }
        
        log.debug("批量查询日志，ID数量: {}", ids.size());
        long startTime = System.currentTimeMillis();
        
        try {
            List<LogEntry> entities = logEntryRepository.findAllById(ids);
            List<LogEntryDTO> result = entities.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());
            
            long endTime = System.currentTimeMillis();
            log.debug("批量查询完成，返回数量: {}, 耗时: {}ms", result.size(), (endTime - startTime));
            
            return result;
            
        } catch (Exception e) {
            log.error("批量查询日志失败", e);
            throw new RuntimeException("批量查询日志失败: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getBatchOperationStats() {
        Map<String, Object> stats = new HashMap<>();
        
        try {
            // 获取数据库统计信息
            long totalLogs = logEntryRepository.count();
            long anomalyLogs = logEntryRepository.countByIsAnomalyTrue();
            long normalLogs = logEntryRepository.countByIsAnomalyFalse();
            
            // 获取最近24小时的统计
            LocalDateTime last24Hours = LocalDateTime.now().minusHours(24);
            long recentLogs = logEntryRepository.countByTimestampBetween(last24Hours, LocalDateTime.now());
            
            stats.put("totalLogs", totalLogs);
            stats.put("anomalyLogs", anomalyLogs);
            stats.put("normalLogs", normalLogs);
            stats.put("recent24HoursLogs", recentLogs);
            stats.put("anomalyRate", totalLogs > 0 ? (double) anomalyLogs / totalLogs : 0.0);
            stats.put("lastUpdated", LocalDateTime.now());
            
        } catch (Exception e) {
            log.error("获取批量操作统计失败", e);
            stats.put("error", e.getMessage());
        }
        
        return stats;
    }

    @Override
    public int cleanupExpiredLogs(LocalDateTime beforeDate) {
        log.info("开始清理过期日志，清理日期: {}", beforeDate);
        long startTime = System.currentTimeMillis();
        
        try {
            // 分批删除过期日志
            int batchSize = 1000;
            int totalDeleted = 0;
            int deletedInBatch;
            
            do {
                // 查询要删除的ID
                List<LogEntry> expiredLogs = logEntryRepository.findTop1000ByTimestampBefore(beforeDate);
                if (expiredLogs.isEmpty()) {
                    break;
                }
                
                List<Long> idsToDelete = expiredLogs.stream()
                        .map(LogEntry::getId)
                        .collect(Collectors.toList());
                
                logEntryRepository.deleteAllById(idsToDelete);
                deletedInBatch = idsToDelete.size();
                totalDeleted += deletedInBatch;
                
                log.debug("清理批次完成，删除数量: {}", deletedInBatch);
                
            } while (deletedInBatch == batchSize);
            
            long endTime = System.currentTimeMillis();
            log.info("清理过期日志完成，总删除数量: {}, 耗时: {}ms", totalDeleted, (endTime - startTime));
            
            return totalDeleted;
            
        } catch (Exception e) {
            log.error("清理过期日志失败", e);
            throw new RuntimeException("清理过期日志失败: " + e.getMessage(), e);
        }
    }

    @Override
    public Map<String, Object> batchImportLogs(List<LogEntryDTO> logEntries, int batchSize) {
        if (logEntries == null || logEntries.isEmpty()) {
            return Map.of("success", true, "totalCount", 0, "message", "没有数据需要导入");
        }
        
        // 限制批次大小
        int actualBatchSize = Math.min(Math.max(batchSize, 100), MAX_BATCH_SIZE);
        
        log.info("开始批量导入日志，总数量: {}, 批次大小: {}", logEntries.size(), actualBatchSize);
        long startTime = System.currentTimeMillis();
        
        Map<String, Object> result = new HashMap<>();
        int totalProcessed = 0;
        int successCount = 0;
        int errorCount = 0;
        List<String> errors = new ArrayList<>();
        
        try {
            // 分批处理
            List<List<LogEntryDTO>> batches = partitionList(logEntries, actualBatchSize);
            
            for (int i = 0; i < batches.size(); i++) {
                List<LogEntryDTO> batch = batches.get(i);
                
                try {
                    int saved = batchSaveLogs(batch);
                    successCount += saved;
                    totalProcessed += batch.size();
                    
                    log.debug("批次 {} 导入完成，成功: {}/{}", i + 1, saved, batch.size());
                    
                } catch (Exception e) {
                    errorCount += batch.size();
                    totalProcessed += batch.size();
                    errors.add(String.format("批次 %d 导入失败: %s", i + 1, e.getMessage()));
                    log.error("批次 {} 导入失败", i + 1, e);
                }
            }
            
            long endTime = System.currentTimeMillis();
            
            result.put("success", errorCount == 0);
            result.put("totalCount", logEntries.size());
            result.put("processedCount", totalProcessed);
            result.put("successCount", successCount);
            result.put("errorCount", errorCount);
            result.put("batchCount", batches.size());
            result.put("batchSize", actualBatchSize);
            result.put("duration", endTime - startTime);
            result.put("errors", errors);
            result.put("message", String.format("导入完成，成功: %d, 失败: %d", successCount, errorCount));
            
            log.info("批量导入完成，总数量: {}, 成功: {}, 失败: {}, 耗时: {}ms", 
                    logEntries.size(), successCount, errorCount, (endTime - startTime));
            
        } catch (Exception e) {
            log.error("批量导入日志失败", e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        
        return result;
    }

    // 私有辅助方法
    
    /**
     * 将列表分割成指定大小的批次
     */
    private <T> List<List<T>> partitionList(List<T> list, int batchSize) {
        List<List<T>> batches = new ArrayList<>();
        for (int i = 0; i < list.size(); i += batchSize) {
            batches.add(list.subList(i, Math.min(i + batchSize, list.size())));
        }
        return batches;
    }
    
    /**
     * 转换DTO为实体
     */
    private LogEntry convertToEntity(LogEntryDTO dto) {
        return LogEntry.builder()
                .id(dto.getId() != null ? Long.parseLong(dto.getId()) : null)
                .timestamp(dto.getTimestamp())
                .source(dto.getSource())
                .level(dto.getLevel())
                .content(dto.getContent())
                .ipAddress(dto.getIpAddress())
                .userId(dto.getUserId())
                .action(dto.getAction())
                .isAnomaly(dto.isAnomaly())
                .anomalyScore(dto.getAnomalyScore())
                .anomalyReason(dto.getAnomalyReason())
                .rawData(dto.getRawData())
                .features(dto.getFeatures())
                .createdAt(dto.getCreatedAt())
                .updatedAt(dto.getUpdatedAt())
                .build();
    }
    
    /**
     * 转换实体为DTO
     */
    private LogEntryDTO convertToDTO(LogEntry entity) {
        return LogEntryDTO.builder()
                .id(entity.getId() != null ? entity.getId().toString() : null)
                .timestamp(entity.getTimestamp())
                .source(entity.getSource())
                .level(entity.getLevel())
                .content(entity.getContent())
                .ipAddress(entity.getIpAddress())
                .userId(entity.getUserId())
                .action(entity.getAction())
                .isAnomaly(entity.isAnomaly())
                .anomalyScore(entity.getAnomalyScore())
                .anomalyReason(entity.getAnomalyReason())
                .rawData(entity.getRawData())
                .features(entity.getFeatures())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
