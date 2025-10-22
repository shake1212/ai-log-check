package com.security.ailogsystem.controller;

import com.security.ailogsystem.dto.AlertDTO;
import com.security.ailogsystem.model.Alert;
import com.security.ailogsystem.service.AlertService;
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

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/alerts")
@Tag(name = "告警管理", description = "异常预警管理接口")
public class AlertController {

    private final AlertService alertService;

    @Autowired
    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @PostMapping
    @Operation(summary = "创建告警", description = "创建新的告警")
    public ResponseEntity<AlertDTO> createAlert(@Valid @RequestBody AlertDTO alertDTO) {
        return ResponseEntity.status(HttpStatus.CREATED).body(alertService.createAlert(alertDTO));
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取告警详情", description = "根据ID获取告警详情")
    public ResponseEntity<AlertDTO> getAlertById(@PathVariable String id) {
        return ResponseEntity.ok(alertService.getAlertById(id));
    }

    @GetMapping
    @Operation(summary = "获取所有告警", description = "分页获取所有告警")
    public ResponseEntity<Page<AlertDTO>> getAllAlerts(Pageable pageable) {
        return ResponseEntity.ok(alertService.getAllAlerts(pageable));
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "按状态获取告警", description = "根据状态分页获取告警")
    public ResponseEntity<Page<AlertDTO>> getAlertsByStatus(
            @PathVariable Alert.AlertStatus status, Pageable pageable) {
        return ResponseEntity.ok(alertService.getAlertsByStatus(status, pageable));
    }

    @GetMapping("/search")
    @Operation(summary = "搜索告警", description = "根据条件搜索告警")
    public ResponseEntity<Page<AlertDTO>> searchAlerts(
            @Parameter(description = "告警来源") @RequestParam(required = false) String source,
            @Parameter(description = "告警类型") @RequestParam(required = false) String type,
            @Parameter(description = "告警级别") @RequestParam(required = false) String level,
            @Parameter(description = "告警状态") @RequestParam(required = false) Alert.AlertStatus status,
            @Parameter(description = "开始时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @Parameter(description = "关键字") @RequestParam(required = false) String keyword,
            Pageable pageable) {
        return ResponseEntity.ok(alertService.searchAlerts(source, type, level, status, startTime, endTime, keyword, pageable));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "更新告警状态", description = "更新告警的状态、处理人和解决方案")
    public ResponseEntity<AlertDTO> updateAlertStatus(
            @PathVariable String id,
            @Parameter(description = "告警状态") @RequestParam Alert.AlertStatus status,
            @Parameter(description = "处理人") @RequestParam(required = false) String assignee,
            @Parameter(description = "解决方案") @RequestParam(required = false) String resolution) {
        return ResponseEntity.ok(alertService.updateAlertStatus(id, status, assignee, resolution));
    }

    @GetMapping("/recent")
    @Operation(summary = "获取最近告警", description = "获取最近的N条告警")
    public ResponseEntity<List<AlertDTO>> getRecentAlerts(
            @Parameter(description = "数量限制") @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(alertService.getRecentAlerts(limit));
    }

    @GetMapping("/statistics")
    @Operation(summary = "获取告警统计", description = "获取告警统计信息")
    public ResponseEntity<Map<String, Long>> getAlertStatistics() {
        return ResponseEntity.ok(alertService.getAlertStatistics());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除告警", description = "根据ID删除告警")
    public ResponseEntity<Void> deleteAlert(@PathVariable String id) {
        alertService.deleteAlert(id);
        return ResponseEntity.noContent().build();
    }
} 