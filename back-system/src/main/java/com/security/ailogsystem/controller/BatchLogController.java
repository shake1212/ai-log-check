package com.security.ailogsystem.controller;

import com.security.ailogsystem.dto.LogEntryDTO;
import com.security.ailogsystem.service.BatchLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 批量日志操作控制器
 * 提供高效的批量操作和查询优化功能
 */
@Slf4j
@RestController
@RequestMapping("/api/logs/batch")
@Tag(name = "批量日志操作", description = "批量日志操作和查询优化接口")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BatchLogController {

    private final BatchLogService batchLogService;

    /**
     * 批量保存日志
     */
    @PostMapping("/save")
    @Operation(summary = "批量保存日志", description = "批量保存多条日志记录，支持大量数据的高效处理")
    public ResponseEntity<Map<String, Object>> batchSaveLogs(
            @Valid @RequestBody List<LogEntryDTO> logEntries) {
        log.info("接收到批量保存请求，数量: {}", logEntries.size());
        
        try {
            int savedCount = batchLogService.batchSaveLogs(logEntries);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("savedCount", savedCount);
            result.put("totalCount", logEntries.size());
            result.put("message", String.format("成功保存 %d 条日志记录", savedCount));
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("批量保存日志失败", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 异步批量保存日志
     */
    @PostMapping("/save/async")
    @Operation(summary = "异步批量保存日志", description = "异步批量保存日志，立即返回，适合大量数据处理")
    public ResponseEntity<Map<String, Object>> batchSaveLogsAsync(
            @Valid @RequestBody List<LogEntryDTO> logEntries) {
        log.info("接收到异步批量保存请求，数量: {}", logEntries.size());
        
        try {
            batchLogService.batchSaveLogsAsync(logEntries);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "异步批量保存任务已启动");
            result.put("totalCount", logEntries.size());
            
            return ResponseEntity.accepted().body(result);
            
        } catch (Exception e) {
            log.error("启动异步批量保存失败", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 批量更新日志
     */
    @PutMapping("/update")
    @Operation(summary = "批量更新日志", description = "批量更新多条日志记录")
    public ResponseEntity<Map<String, Object>> batchUpdateLogs(
            @Valid @RequestBody List<LogEntryDTO> logEntries) {
        log.info("接收到批量更新请求，数量: {}", logEntries.size());
        
        try {
            int updatedCount = batchLogService.batchUpdateLogs(logEntries);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("updatedCount", updatedCount);
            result.put("totalCount", logEntries.size());
            result.put("message", String.format("成功更新 %d 条日志记录", updatedCount));
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("批量更新日志失败", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 批量删除日志
     */
    @DeleteMapping("/delete")
    @Operation(summary = "批量删除日志", description = "根据ID列表批量删除日志记录")
    public ResponseEntity<Map<String, Object>> batchDeleteLogs(
            @RequestBody List<Long> ids) {
        log.info("接收到批量删除请求，数量: {}", ids.size());
        
        try {
            int deletedCount = batchLogService.batchDeleteLogs(ids);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("deletedCount", deletedCount);
            result.put("totalCount", ids.size());
            result.put("message", String.format("成功删除 %d 条日志记录", deletedCount));
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("批量删除日志失败", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 批量标记异常
     */
    @PutMapping("/mark-anomaly")
    @Operation(summary = "批量标记异常", description = "批量标记日志为异常或正常")
    public ResponseEntity<Map<String, Object>> batchMarkAnomaly(
            @RequestBody Map<String, Object> request) {
        
        @SuppressWarnings("unchecked")
        List<Long> ids = (List<Long>) request.get("ids");
        Boolean isAnomaly = (Boolean) request.get("isAnomaly");
        Double anomalyScore = request.get("anomalyScore") != null ? 
                Double.valueOf(request.get("anomalyScore").toString()) : null;
        String anomalyReason = (String) request.get("anomalyReason");
        
        log.info("接收到批量标记异常请求，数量: {}, 异常: {}", ids.size(), isAnomaly);
        
        try {
            int updatedCount = batchLogService.batchMarkAnomaly(ids, isAnomaly, anomalyScore, anomalyReason);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("updatedCount", updatedCount);
            result.put("totalCount", ids.size());
            result.put("message", String.format("成功标记 %d 条日志记录", updatedCount));
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("批量标记异常失败", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 高效分页查询
     */
    @GetMapping("/query/efficient")
    @Operation(summary = "高效分页查询", description = "使用优化的查询方法进行分页查询")
    public ResponseEntity<Page<LogEntryDTO>> efficientPageQuery(Pageable pageable) {
        log.debug("接收到高效分页查询请求，页码: {}, 大小: {}", pageable.getPageNumber(), pageable.getPageSize());
        
        try {
            Page<LogEntryDTO> result = batchLogService.efficientPageQuery(pageable);
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("高效分页查询失败", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 批量查询指定ID的日志
     */
    @PostMapping("/query/by-ids")
    @Operation(summary = "批量查询日志", description = "根据ID列表批量查询日志记录")
    public ResponseEntity<List<LogEntryDTO>> batchFindByIds(
            @RequestBody List<Long> ids) {
        log.debug("接收到批量查询请求，ID数量: {}", ids.size());
        
        try {
            List<LogEntryDTO> result = batchLogService.batchFindByIds(ids);
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("批量查询日志失败", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * 获取批量操作统计
     */
    @GetMapping("/stats")
    @Operation(summary = "获取批量操作统计", description = "获取批量操作的统计信息")
    public ResponseEntity<Map<String, Object>> getBatchOperationStats() {
        log.debug("获取批量操作统计信息");
        
        try {
            Map<String, Object> stats = batchLogService.getBatchOperationStats();
            return ResponseEntity.ok(stats);
            
        } catch (Exception e) {
            log.error("获取批量操作统计失败", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 清理过期日志
     */
    @DeleteMapping("/cleanup")
    @Operation(summary = "清理过期日志", description = "清理指定日期之前的过期日志")
    public ResponseEntity<Map<String, Object>> cleanupExpiredLogs(
            @Parameter(description = "清理此日期之前的数据") 
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime beforeDate) {
        log.info("接收到清理过期日志请求，清理日期: {}", beforeDate);
        
        try {
            int deletedCount = batchLogService.cleanupExpiredLogs(beforeDate);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("deletedCount", deletedCount);
            result.put("beforeDate", beforeDate);
            result.put("message", String.format("成功清理 %d 条过期日志记录", deletedCount));
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("清理过期日志失败", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 批量导入日志
     */
    @PostMapping("/import")
    @Operation(summary = "批量导入日志", description = "批量导入大量日志数据，支持自定义批次大小")
    public ResponseEntity<Map<String, Object>> batchImportLogs(
            @Valid @RequestBody List<LogEntryDTO> logEntries,
            @Parameter(description = "批次大小，默认1000，最大5000") 
            @RequestParam(defaultValue = "1000") int batchSize) {
        log.info("接收到批量导入请求，数量: {}, 批次大小: {}", logEntries.size(), batchSize);
        
        try {
            Map<String, Object> result = batchLogService.batchImportLogs(logEntries, batchSize);
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("批量导入日志失败", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 获取批量操作帮助信息
     */
    @GetMapping("/help")
    @Operation(summary = "获取批量操作帮助", description = "获取批量操作功能的帮助信息")
    public ResponseEntity<Map<String, Object>> getBatchOperationHelp() {
        log.debug("获取批量操作帮助信息");
        
        Map<String, Object> help = new HashMap<>();
        help.put("description", "批量日志操作API帮助信息");
        
        Map<String, String> endpoints = new HashMap<>();
        endpoints.put("batchSave", "POST /api/logs/batch/save - 批量保存日志");
        endpoints.put("batchSaveAsync", "POST /api/logs/batch/save/async - 异步批量保存日志");
        endpoints.put("batchUpdate", "PUT /api/logs/batch/update - 批量更新日志");
        endpoints.put("batchDelete", "DELETE /api/logs/batch/delete - 批量删除日志");
        endpoints.put("batchMarkAnomaly", "PUT /api/logs/batch/mark-anomaly - 批量标记异常");
        endpoints.put("efficientQuery", "GET /api/logs/batch/query/efficient - 高效分页查询");
        endpoints.put("batchQuery", "POST /api/logs/batch/query/by-ids - 批量查询日志");
        endpoints.put("stats", "GET /api/logs/batch/stats - 获取批量操作统计");
        endpoints.put("cleanup", "DELETE /api/logs/batch/cleanup - 清理过期日志");
        endpoints.put("import", "POST /api/logs/batch/import - 批量导入日志");
        help.put("endpoints", endpoints);
        
        Map<String, String> parameters = new HashMap<>();
        parameters.put("batchSize", "批次大小，默认1000，最大5000");
        parameters.put("beforeDate", "清理日期，ISO 8601格式");
        parameters.put("isAnomaly", "是否异常，true/false");
        parameters.put("anomalyScore", "异常分数，0.0-1.0");
        parameters.put("anomalyReason", "异常原因描述");
        help.put("parameters", parameters);
        
        Map<String, String> examples = new HashMap<>();
        examples.put("batchSave", "POST /api/logs/batch/save - Body: LogEntryDTO[]");
        examples.put("batchDelete", "DELETE /api/logs/batch/delete - Body: [1,2,3,4,5]");
        examples.put("markAnomaly", "PUT /api/logs/batch/mark-anomaly - Body: {\"ids\":[1,2,3],\"isAnomaly\":true}");
        examples.put("cleanup", "DELETE /api/logs/batch/cleanup?beforeDate=2024-01-01T00:00:00");
        help.put("examples", examples);
        
        return ResponseEntity.ok(help);
    }
}
