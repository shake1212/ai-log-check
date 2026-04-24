package com.security.ailogsystem.controller;

import com.security.ailogsystem.service.DataExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * 数据导出控制器
 * 支持导出日志、告警、事件等数据为CSV、Excel、JSON格式
 */
@Slf4j
@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
@Tag(name = "数据导出", description = "数据导出相关接口")
public class DataExportController {

    private final DataExportService dataExportService;

    @GetMapping("/logs")
    @Operation(summary = "导出日志数据", description = "根据条件导出日志数据")
    public ResponseEntity<Resource> exportLogs(
            @Parameter(description = "导出格式: csv, excel, json") @RequestParam(defaultValue = "csv") String format,
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @Parameter(description = "日志级别") @RequestParam(required = false) String level,
            @Parameter(description = "关键词") @RequestParam(required = false) String keyword
    ) {
        log.info("导出日志数据: format={}, startTime={}, endTime={}, level={}, keyword={}", 
                format, startTime, endTime, level, keyword);
        
        Resource resource = dataExportService.exportLogs(format, startTime, endTime, level, keyword);
        
        return buildResponse(resource, format, "logs");
    }

    @GetMapping("/alerts")
    @Operation(summary = "导出告警数据", description = "根据条件导出告警数据")
    public ResponseEntity<Resource> exportAlerts(
            @Parameter(description = "导出格式: csv, excel, json") @RequestParam(defaultValue = "csv") String format,
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @Parameter(description = "告警级别") @RequestParam(required = false) String alertLevel,
            @Parameter(description = "告警类型") @RequestParam(required = false) String alertType,
            @Parameter(description = "状态") @RequestParam(required = false) String status
    ) {
        log.info("导出告警数据: format={}, startTime={}, endTime={}, alertLevel={}, alertType={}, status={}", 
                format, startTime, endTime, alertLevel, alertType, status);
        
        Resource resource = dataExportService.exportAlerts(format, startTime, endTime, alertLevel, alertType, status);
        
        return buildResponse(resource, format, "alerts");
    }

    @GetMapping("/events")
    @Operation(summary = "导出安全事件数据", description = "根据条件导出安全事件数据")
    public ResponseEntity<Resource> exportEvents(
            @Parameter(description = "导出格式: csv, excel, json") @RequestParam(defaultValue = "csv") String format,
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @Parameter(description = "事件类型") @RequestParam(required = false) String eventType,
            @Parameter(description = "严重程度") @RequestParam(required = false) String severity
    ) {
        log.info("导出安全事件数据: format={}, startTime={}, endTime={}, eventType={}, severity={}", 
                format, startTime, endTime, eventType, severity);
        
        Resource resource = dataExportService.exportEvents(format, startTime, endTime, eventType, severity);
        
        return buildResponse(resource, format, "events");
    }

    @GetMapping("/security-logs")
    @Operation(summary = "导出Windows安全日志", description = "根据条件导出Windows安全日志")
    public ResponseEntity<Resource> exportSecurityLogs(
            @Parameter(description = "导出格式: csv, excel, json") @RequestParam(defaultValue = "csv") String format,
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @Parameter(description = "事件ID") @RequestParam(required = false) Integer eventId,
            @Parameter(description = "用户名") @RequestParam(required = false) String username
    ) {
        log.info("导出Windows安全日志: format={}, startTime={}, endTime={}, eventId={}, username={}", 
                format, startTime, endTime, eventId, username);
        
        Resource resource = dataExportService.exportSecurityLogs(format, startTime, endTime, eventId, username);
        
        return buildResponse(resource, format, "security-logs");
    }

    @GetMapping("/system-metrics")
    @Operation(summary = "导出系统性能指标", description = "根据条件导出系统性能指标数据")
    public ResponseEntity<Resource> exportSystemMetrics(
            @Parameter(description = "导出格式: csv, excel, json") @RequestParam(defaultValue = "csv") String format,
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @Parameter(description = "指标类型") @RequestParam(required = false) String metricType
    ) {
        log.info("导出系统性能指标: format={}, startTime={}, endTime={}, metricType={}", 
                format, startTime, endTime, metricType);
        
        Resource resource = dataExportService.exportSystemMetrics(format, startTime, endTime, metricType);
        
        return buildResponse(resource, format, "system-metrics");
    }

    @PostMapping("/batch")
    @Operation(summary = "批量导出多种数据", description = "一次性导出多种类型的数据")
    public ResponseEntity<Resource> batchExport(
            @Parameter(description = "导出格式: excel, zip") @RequestParam(defaultValue = "excel") String format,
            @Parameter(description = "数据类型列表") @RequestBody List<String> dataTypes,
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime
    ) {
        log.info("批量导出数据: format={}, dataTypes={}, startTime={}, endTime={}", 
                format, dataTypes, startTime, endTime);
        
        Resource resource = dataExportService.batchExport(format, dataTypes, startTime, endTime);
        
        return buildResponse(resource, format, "batch-export");
    }

    /**
     * 数据类型 → 中文名称映射
     */
    private static final Map<String, String> TYPE_NAMES = Map.of(
            "logs",           "日志数据",
            "alerts",         "告警数据",
            "events",         "安全事件",
            "security-logs",  "Windows安全日志",
            "system-metrics", "系统性能指标",
            "batch-export",   "批量导出"
    );

    private static final DateTimeFormatter FILE_DT = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

    /**
     * 构建响应，文件名使用中文并做 RFC 5987 编码
     */
    private ResponseEntity<Resource> buildResponse(Resource resource, String format, String typeKey) {
        String chineseName = TYPE_NAMES.getOrDefault(typeKey, typeKey);
        String timestamp   = LocalDateTime.now().format(FILE_DT);
        String ext         = getFileExtension(format);
        String filename    = chineseName + "_" + timestamp + "." + ext;

        // RFC 5987：filename* 使用 UTF-8 百分号编码，兼容所有现代浏览器
        String encodedName = URLEncoder.encode(filename, StandardCharsets.UTF_8)
                .replace("+", "%20");

        String disposition = "attachment; filename=\"" + filename + "\"; "
                           + "filename*=UTF-8''" + encodedName;

        return ResponseEntity.ok()
                .contentType(getMediaType(format))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .body(resource);
    }

    /**
     * 获取文件扩展名
     */
    private String getFileExtension(String format) {
        return switch (format.toLowerCase()) {
            case "excel" -> "xlsx";
            case "json" -> "json";
            case "zip" -> "zip";
            default -> "csv";
        };
    }

    /**
     * 获取媒体类型
     */
    private MediaType getMediaType(String format) {
        return switch (format.toLowerCase()) {
            case "excel" -> MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            case "json" -> MediaType.APPLICATION_JSON;
            case "zip" -> MediaType.parseMediaType("application/zip");
            default -> MediaType.parseMediaType("text/csv");
        };
    }
}
