package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.LogEntryDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 批量日志服务接口
 * 提供高效的批量操作和查询优化功能
 */
public interface BatchLogService {
    
    /**
     * 批量保存日志
     * @param logEntries 日志条目列表
     * @return 保存成功的数量
     */
    int batchSaveLogs(List<LogEntryDTO> logEntries);
    
    /**
     * 异步批量保存日志
     * @param logEntries 日志条目列表
     */
    void batchSaveLogsAsync(List<LogEntryDTO> logEntries);
    
    /**
     * 批量更新日志
     * @param logEntries 日志条目列表
     * @return 更新成功的数量
     */
    int batchUpdateLogs(List<LogEntryDTO> logEntries);
    
    /**
     * 批量删除日志
     * @param ids 日志ID列表
     * @return 删除成功的数量
     */
    int batchDeleteLogs(List<Long> ids);
    
    /**
     * 批量标记异常
     * @param ids 日志ID列表
     * @param isAnomaly 是否异常
     * @param anomalyScore 异常分数
     * @param anomalyReason 异常原因
     * @return 更新成功的数量
     */
    int batchMarkAnomaly(List<Long> ids, boolean isAnomaly, Double anomalyScore, String anomalyReason);
    
    /**
     * 高效分页查询
     * @param pageable 分页参数
     * @return 分页结果
     */
    Page<LogEntryDTO> efficientPageQuery(Pageable pageable);
    
    /**
     * 批量查询指定ID的日志
     * @param ids 日志ID列表
     * @return 日志列表
     */
    List<LogEntryDTO> batchFindByIds(List<Long> ids);
    
    /**
     * 获取批量操作统计
     * @return 统计信息
     */
    Map<String, Object> getBatchOperationStats();
    
    /**
     * 清理过期日志
     * @param beforeDate 清理此日期之前的数据
     * @return 清理的记录数
     */
    int cleanupExpiredLogs(LocalDateTime beforeDate);
    
    /**
     * 批量导入日志（支持大文件）
     * @param logEntries 日志条目列表
     * @param batchSize 批次大小
     * @return 导入结果统计
     */
    Map<String, Object> batchImportLogs(List<LogEntryDTO> logEntries, int batchSize);
}
