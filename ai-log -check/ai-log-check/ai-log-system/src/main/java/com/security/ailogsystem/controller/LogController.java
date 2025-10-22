package com.security.ailogsystem.controller;

import com.security.ailogsystem.dto.LogEntryDTO;
import com.security.ailogsystem.service.LogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/logs")
@Tag(name = "日志管理", description = "日志收集、查询和分析接口")
public class LogController {

    private final LogService logService;

    @Autowired
    public LogController(LogService logService) {
        this.logService = logService;
    }

    @PostMapping
    @Operation(summary = "保存日志", description = "保存单条日志记录")
    public ResponseEntity<LogEntryDTO> saveLog(@Valid @RequestBody LogEntryDTO logEntryDTO) {
        return ResponseEntity.status(HttpStatus.CREATED).body(logService.saveLog(logEntryDTO));
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取日志详情", description = "根据ID获取日志详情")
    public ResponseEntity<LogEntryDTO> getLogById(@PathVariable String id) {
        return ResponseEntity.ok(logService.getLogById(id));
    }

    @GetMapping
    @Operation(summary = "获取所有日志", description = "分页获取所有日志")
    public ResponseEntity<Page<LogEntryDTO>> getAllLogs(Pageable pageable) {
        return ResponseEntity.ok(logService.getAllLogs(pageable));
    }

    @GetMapping("/anomalies")
    @Operation(summary = "获取异常日志", description = "分页获取所有被标记为异常的日志")
    public ResponseEntity<Page<LogEntryDTO>> getAnomalyLogs(Pageable pageable) {
        return ResponseEntity.ok(logService.getAnomalyLogs(pageable));
    }

    @GetMapping("/search")
    @Operation(summary = "搜索日志", description = "根据条件搜索日志")
    public ResponseEntity<Page<LogEntryDTO>> searchLogs(
            @Parameter(description = "日志来源") @RequestParam(required = false) String source,
            @Parameter(description = "日志级别") @RequestParam(required = false) String level,
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @Parameter(description = "关键字") @RequestParam(required = false) String keyword,
            Pageable pageable) {
        return ResponseEntity.ok(logService.searchLogs(source, level, startTime, endTime, keyword, pageable));
    }

    @GetMapping("/recent")
    @Operation(summary = "获取最近日志", description = "获取最近的N条日志")
    public ResponseEntity<List<LogEntryDTO>> getRecentLogs(
            @Parameter(description = "数量限制") @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(logService.getRecentLogs(limit));
    }

    @GetMapping("/statistics")
    @Operation(summary = "获取日志统计", description = "获取日志统计信息")
    public ResponseEntity<Map<String, Long>> getLogStatistics() {
        return ResponseEntity.ok(logService.getLogStatistics());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除日志", description = "根据ID删除日志")
    public ResponseEntity<Void> deleteLog(@PathVariable String id) {
        logService.deleteLog(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @Operation(summary = "批量删除日志", description = "删除指定日期之前的所有日志")
    public ResponseEntity<Void> deleteLogsBefore(
            @Parameter(description = "截止日期") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime date) {
        logService.deleteLogsBefore(date);
        return ResponseEntity.noContent().build();
    }
} 