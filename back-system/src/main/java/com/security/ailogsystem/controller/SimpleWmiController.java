package com.security.ailogsystem.controller;

import com.security.ailogsystem.model.SimpleWmiData;
import com.security.ailogsystem.service.SimpleWmiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 简单WMI控制器
 * 轻量级实现，适合大创项目
 * 
 * @author AI Log System
 * @version 1.0
 */
@Slf4j
@RestController
@RequestMapping("/api/simple-wmi")
@Tag(name = "简单WMI管理", description = "轻量级WMI数据采集和管理接口")
public class SimpleWmiController {

    @Autowired
    private SimpleWmiService simpleWmiService;

    @PostMapping("/collect")
    @Operation(summary = "采集WMI数据", description = "采集指定主机的WMI数据")
    public ResponseEntity<SimpleWmiData> collectWmiData(
            @Parameter(description = "主机名") @RequestParam String hostname,
            @Parameter(description = "IP地址") @RequestParam String ipAddress,
            @Parameter(description = "数据类型") @RequestParam SimpleWmiData.DataType dataType) {
        
        try {
            SimpleWmiData wmiData = simpleWmiService.collectWmiData(hostname, ipAddress, dataType);
            return ResponseEntity.ok(wmiData);
        } catch (Exception e) {
            log.error("采集WMI数据失败: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/batch-collect")
    @Operation(summary = "批量采集WMI数据", description = "批量采集指定主机的多种WMI数据")
    public ResponseEntity<List<SimpleWmiData>> batchCollectWmiData(
            @Parameter(description = "主机名") @RequestParam String hostname,
            @Parameter(description = "IP地址") @RequestParam String ipAddress) {
        
        try {
            List<SimpleWmiData> wmiDataList = simpleWmiService.batchCollectWmiData(hostname, ipAddress);
            return ResponseEntity.ok(wmiDataList);
        } catch (Exception e) {
            log.error("批量采集WMI数据失败: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/data/{id}")
    @Operation(summary = "获取WMI数据", description = "根据ID获取WMI数据")
    public ResponseEntity<SimpleWmiData> getWmiDataById(@PathVariable Long id) {
        SimpleWmiData wmiData = simpleWmiService.getWmiDataById(id);
        if (wmiData != null) {
            return ResponseEntity.ok(wmiData);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/data/hostname/{hostname}")
    @Operation(summary = "根据主机名查询", description = "根据主机名查询WMI数据")
    public ResponseEntity<List<SimpleWmiData>> getWmiDataByHostname(@PathVariable String hostname) {
        List<SimpleWmiData> wmiDataList = simpleWmiService.getWmiDataByHostname(hostname);
        return ResponseEntity.ok(wmiDataList);
    }

    @GetMapping("/data/ip/{ipAddress}")
    @Operation(summary = "根据IP地址查询", description = "根据IP地址查询WMI数据")
    public ResponseEntity<List<SimpleWmiData>> getWmiDataByIpAddress(@PathVariable String ipAddress) {
        List<SimpleWmiData> wmiDataList = simpleWmiService.getWmiDataByIpAddress(ipAddress);
        return ResponseEntity.ok(wmiDataList);
    }

    @GetMapping("/data/type/{dataType}")
    @Operation(summary = "根据数据类型查询", description = "根据数据类型查询WMI数据")
    public ResponseEntity<List<SimpleWmiData>> getWmiDataByType(@PathVariable SimpleWmiData.DataType dataType) {
        List<SimpleWmiData> wmiDataList = simpleWmiService.getWmiDataByType(dataType);
        return ResponseEntity.ok(wmiDataList);
    }

    @GetMapping("/data/time-range")
    @Operation(summary = "根据时间范围查询", description = "根据时间范围查询WMI数据")
    public ResponseEntity<List<SimpleWmiData>> getWmiDataByTimeRange(
            @Parameter(description = "开始时间") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @Parameter(description = "结束时间") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        
        List<SimpleWmiData> wmiDataList = simpleWmiService.getWmiDataByTimeRange(startTime, endTime);
        return ResponseEntity.ok(wmiDataList);
    }

    @GetMapping("/data/page")
    @Operation(summary = "分页查询WMI数据", description = "分页查询WMI数据")
    public ResponseEntity<Page<SimpleWmiData>> getWmiDataPage(
            @Parameter(description = "主机名（可选）") @RequestParam(required = false) String hostname,
            @Parameter(description = "页码") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "每页大小") @RequestParam(defaultValue = "10") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<SimpleWmiData> wmiDataPage = simpleWmiService.getWmiDataPage(hostname, pageable);
        return ResponseEntity.ok(wmiDataPage);
    }

    @GetMapping("/data/latest")
    @Operation(summary = "获取最新数据", description = "获取指定主机和数据类型的最新数据")
    public ResponseEntity<List<SimpleWmiData>> getLatestWmiData(
            @Parameter(description = "主机名") @RequestParam String hostname,
            @Parameter(description = "数据类型") @RequestParam SimpleWmiData.DataType dataType,
            @Parameter(description = "限制数量") @RequestParam(defaultValue = "10") int limit) {
        
        List<SimpleWmiData> wmiDataList = simpleWmiService.getLatestWmiData(hostname, dataType, limit);
        return ResponseEntity.ok(wmiDataList);
    }

    @GetMapping("/statistics")
    @Operation(summary = "获取WMI统计信息", description = "获取WMI数据统计信息")
    public ResponseEntity<Map<String, Object>> getWmiStatistics() {
        Map<String, Object> statistics = simpleWmiService.getWmiStatistics();
        return ResponseEntity.ok(statistics);
    }

    @GetMapping("/statistics/host/{hostname}")
    @Operation(summary = "获取主机统计信息", description = "获取指定主机的统计信息")
    public ResponseEntity<Map<String, Object>> getHostStatistics(@PathVariable String hostname) {
        Map<String, Object> statistics = simpleWmiService.getHostStatistics(hostname);
        return ResponseEntity.ok(statistics);
    }

    @DeleteMapping("/data/expired")
    @Operation(summary = "删除过期数据", description = "删除指定天数前的过期数据")
    public ResponseEntity<Map<String, String>> deleteExpiredData(
            @Parameter(description = "保留天数") @RequestParam(defaultValue = "30") int days) {
        
        try {
            simpleWmiService.deleteExpiredData(days);
            Map<String, String> response = Map.of(
                    "status", "success",
                    "message", "删除过期数据成功，保留" + days + "天内的数据"
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("删除过期数据失败: {}", e.getMessage(), e);
            Map<String, String> response = Map.of(
                    "status", "error",
                    "message", "删除过期数据失败: " + e.getMessage()
            );
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/data-types")
    @Operation(summary = "获取支持的数据类型", description = "获取所有支持的WMI数据类型")
    public ResponseEntity<Map<String, String>> getDataTypes() {
        Map<String, String> dataTypes = new java.util.HashMap<>();
        for (SimpleWmiData.DataType type : SimpleWmiData.DataType.values()) {
            dataTypes.put(type.name(), type.getDescription());
        }
        return ResponseEntity.ok(dataTypes);
    }

    @GetMapping("/status-types")
    @Operation(summary = "获取支持的状态类型", description = "获取所有支持的WMI数据状态类型")
    public ResponseEntity<Map<String, String>> getStatusTypes() {
        Map<String, String> statusTypes = new java.util.HashMap<>();
        for (SimpleWmiData.Status status : SimpleWmiData.Status.values()) {
            statusTypes.put(status.name(), status.getDescription());
        }
        return ResponseEntity.ok(statusTypes);
    }
}
