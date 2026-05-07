package com.security.ailogsystem.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.security.ailogsystem.entity.SecurityLog;
import com.security.ailogsystem.entity.SystemMetrics;
import com.security.ailogsystem.model.Alert;
import com.security.ailogsystem.model.LogEntry;
import com.security.ailogsystem.model.UnifiedSecurityEvent;
import com.security.ailogsystem.repository.*;
import com.security.ailogsystem.service.DataExportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import jakarta.persistence.criteria.Predicate;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class DataExportServiceImpl implements DataExportService {

    private final LogEntryRepository logEntryRepository;
    private final AlertRepository alertRepository;
    private final UnifiedEventRepository eventRepository;
    private final SecurityLogRepository securityLogRepository;
    private final MetricsRepository metricsRepository;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final int MAX_EXPORT_ROWS = 50000;
    private static final String CSV_BOM = "\uFEFF";

    // ==================== exportLogs ====================

    @Override
    public Resource exportLogs(String format, LocalDateTime startTime, LocalDateTime endTime,
                               String level, String keyword) {
        Specification<LogEntry> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (startTime != null) predicates.add(cb.greaterThanOrEqualTo(root.get("timestamp"), startTime));
            if (endTime != null)   predicates.add(cb.lessThanOrEqualTo(root.get("timestamp"), endTime));
            if (level != null && !level.isEmpty()) predicates.add(cb.equal(root.get("level"), level));
            if (keyword != null && !keyword.isEmpty()) predicates.add(cb.like(root.get("content"), "%" + keyword + "%"));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        List<LogEntry> logs = logEntryRepository.findAll(spec);
        if (logs.size() > MAX_EXPORT_ROWS) {
            log.warn("导出日志超限 {} 条，截断为 {} 条", logs.size(), MAX_EXPORT_ROWS);
            logs = logs.subList(0, MAX_EXPORT_ROWS);
        }
        log.info("导出日志 {} 条", logs.size());
        return switch (format.toLowerCase()) {
            case "excel" -> exportLogsToExcel(logs);
            case "json"  -> toJson(logs);
            default      -> exportLogsToCsv(logs);
        };
    }

    // ==================== exportAlerts ====================

    @Override
    public Resource exportAlerts(String format, LocalDateTime startTime, LocalDateTime endTime,
                                 String alertLevel, String alertType, String status) {
        Specification<Alert> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (startTime != null)  predicates.add(cb.greaterThanOrEqualTo(root.get("timestamp"), startTime));
            if (endTime != null)    predicates.add(cb.lessThanOrEqualTo(root.get("timestamp"), endTime));
            if (alertLevel != null && !alertLevel.isEmpty()) predicates.add(cb.equal(root.get("alertLevel"), alertLevel));
            if (alertType  != null && !alertType.isEmpty())  predicates.add(cb.equal(root.get("alertType"), alertType));
            if (status != null && !status.isEmpty())
                predicates.add(cb.equal(root.get("status"), Alert.AlertStatus.valueOf(status)));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        List<Alert> alerts = alertRepository.findAll(spec);
        if (alerts.size() > MAX_EXPORT_ROWS) {
            log.warn("导出告警超限 {} 条，截断为 {} 条", alerts.size(), MAX_EXPORT_ROWS);
            alerts = alerts.subList(0, MAX_EXPORT_ROWS);
        }
        log.info("导出告警 {} 条", alerts.size());
        return switch (format.toLowerCase()) {
            case "excel" -> exportAlertsToExcel(alerts);
            case "json"  -> toJson(alerts);
            default      -> exportAlertsToCsv(alerts);
        };
    }

    // ==================== exportEvents ====================

    @Override
    public Resource exportEvents(String format, LocalDateTime startTime, LocalDateTime endTime,
                                 String eventType, String severity) {
        Specification<UnifiedSecurityEvent> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (startTime != null) predicates.add(cb.greaterThanOrEqualTo(root.get("timestamp"), startTime));
            if (endTime != null)   predicates.add(cb.lessThanOrEqualTo(root.get("timestamp"), endTime));
            if (eventType != null && !eventType.isEmpty()) predicates.add(cb.equal(root.get("eventType"), eventType));
            if (severity  != null && !severity.isEmpty())  predicates.add(cb.equal(root.get("severity"), severity));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        List<UnifiedSecurityEvent> events = eventRepository.findAll(spec);
        if (events.size() > MAX_EXPORT_ROWS) {
            log.warn("导出事件超限 {} 条，截断为 {} 条", events.size(), MAX_EXPORT_ROWS);
            events = events.subList(0, MAX_EXPORT_ROWS);
        }
        log.info("导出安全事件 {} 条", events.size());
        return switch (format.toLowerCase()) {
            case "excel" -> exportEventsToExcel(events);
            case "json"  -> toJson(events);
            default      -> exportEventsToCsv(events);
        };
    }

    // ==================== exportSecurityLogs ====================

    @Override
    public Resource exportSecurityLogs(String format, LocalDateTime startTime, LocalDateTime endTime,
                                       Integer eventId, String username) {
        Specification<SecurityLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (startTime != null) predicates.add(cb.greaterThanOrEqualTo(root.get("eventTime"), startTime));
            if (endTime != null)   predicates.add(cb.lessThanOrEqualTo(root.get("eventTime"), endTime));
            if (eventId != null)   predicates.add(cb.equal(root.get("eventId"), eventId));
            if (username != null && !username.isEmpty()) predicates.add(cb.like(root.get("userName"), "%" + username + "%"));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        List<SecurityLog> logs = securityLogRepository.findAll(spec);
        if (logs.size() > MAX_EXPORT_ROWS) {
            log.warn("导出安全日志超限 {} 条，截断为 {} 条", logs.size(), MAX_EXPORT_ROWS);
            logs = logs.subList(0, MAX_EXPORT_ROWS);
        }
        log.info("导出Windows安全日志 {} 条", logs.size());
        return switch (format.toLowerCase()) {
            case "excel" -> exportSecurityLogsToExcel(logs);
            case "json"  -> toJson(logs);
            default      -> exportSecurityLogsToCsv(logs);
        };
    }

    // ==================== exportSystemMetrics ====================

    @Override
    public Resource exportSystemMetrics(String format, LocalDateTime startTime, LocalDateTime endTime,
                                        String metricType) {
        Specification<SystemMetrics> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (startTime != null) predicates.add(cb.greaterThanOrEqualTo(root.get("timestamp"), startTime));
            if (endTime != null)   predicates.add(cb.lessThanOrEqualTo(root.get("timestamp"), endTime));
            if (metricType != null && !metricType.isEmpty()) predicates.add(cb.equal(root.get("metricType"), metricType));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        List<SystemMetrics> metrics = metricsRepository.findAll(spec);
        if (metrics.size() > MAX_EXPORT_ROWS) {
            log.warn("导出指标超限 {} 条，截断为 {} 条", metrics.size(), MAX_EXPORT_ROWS);
            metrics = metrics.subList(0, MAX_EXPORT_ROWS);
        }
        log.info("导出系统性能指标 {} 条", metrics.size());
        return switch (format.toLowerCase()) {
            case "excel" -> exportMetricsToExcel(metrics);
            case "json"  -> toJson(metrics);
            default      -> exportMetricsToCsv(metrics);
        };
    }

    // ==================== batchExport ====================

    @Override
    public Resource batchExport(String format, List<String> dataTypes,
                                LocalDateTime startTime, LocalDateTime endTime) {
        if ("excel".equalsIgnoreCase(format)) {
            return batchExportToExcel(dataTypes, startTime, endTime);
        }
        return batchExportToZip(dataTypes, startTime, endTime);
    }

    // ==================== CSV ====================

    private Resource exportLogsToCsv(List<LogEntry> logs) {
        StringBuilder csv = new StringBuilder(CSV_BOM).append("ID,时间戳,日志级别,内容,来源,用户ID,IP地址\n");
        for (LogEntry e : logs) {
            csv.append(String.format("%d,%s,%s,\"%s\",%s,%s,%s\n",
                    e.getId(), fmt(e.getTimestamp()), e.getLevel(),
                    esc(e.getContent()), e.getSource(), e.getUserId(), e.getIpAddress()));
        }
        return bytes(csv.toString());
    }

    private Resource exportAlertsToCsv(List<Alert> alerts) {
        StringBuilder csv = new StringBuilder(CSV_BOM).append("告警ID,告警类型,告警级别,状态,来源,描述,创建时间,处理人\n");
        for (Alert a : alerts) {
            csv.append(String.format("%s,%s,%s,%s,%s,\"%s\",%s,%s\n",
                    a.getAlertId(), zhEventType(a.getAlertType()), zhSeverity(a.getAlertLevel().toString()),
                    zhAlertStatus(a.getStatus().toString()), zhSource(a.getSource()), esc(a.getDescription()),
                    fmt(a.getCreatedTime()), nvl(a.getAssignee())));
        }
        return bytes(csv.toString());
    }

    private Resource exportEventsToCsv(List<UnifiedSecurityEvent> events) {
        StringBuilder csv = new StringBuilder(CSV_BOM).append("ID,事件类型,严重程度,来源系统,来源IP,目标IP,时间戳,威胁等级\n");
        for (UnifiedSecurityEvent e : events) {
            csv.append(String.format("%d,%s,%s,%s,%s,%s,%s,%s\n",
                    e.getId(), zhEventType(e.getEventType()), zhSeverity(e.getSeverity()), zhSource(e.getSourceSystem()),
                    nvl(e.getSourceIp()), nvl(e.getDestinationIp()),
                    fmt(e.getTimestamp()), zhSeverity(nvl(e.getThreatLevel()))));
        }
        return bytes(csv.toString());
    }

    private Resource exportSecurityLogsToCsv(List<SecurityLog> logs) {
        StringBuilder csv = new StringBuilder(CSV_BOM).append("事件ID,时间,计算机名,来源,用户名,IP地址,登录类型,威胁等级\n");
        for (SecurityLog l : logs) {
            csv.append(String.format("%d,%s,%s,%s,%s,%s,%s,%s\n",
                    l.getEventId(), fmt(l.getEventTime()), nvl(l.getComputerName()),
                    nvl(l.getSourceName()), nvl(l.getUserName()), nvl(l.getIpAddress()),
                    nvl(l.getLogonType() != null ? l.getLogonType().toString() : null),
                    zhSeverity(nvl(l.getThreatLevel()))));
        }
        return bytes(csv.toString());
    }

    private Resource exportMetricsToCsv(List<SystemMetrics> metrics) {
        StringBuilder csv = new StringBuilder(CSV_BOM).append("时间戳,主机名,IP,CPU使用率,内存使用率,磁盘使用率,网络发送,网络接收\n");
        for (SystemMetrics m : metrics) {
            csv.append(String.format("%s,%s,%s,%.2f,%.2f,%.2f,%d,%d\n",
                    fmt(m.getTimestamp()), nvl(m.getHostname()), nvl(m.getIpAddress()),
                    nvl(m.getCpuUsage()), nvl(m.getMemoryUsage()), nvl(m.getDiskUsage()),
                    nvl(m.getNetworkSent()), nvl(m.getNetworkReceived())));
        }
        return bytes(csv.toString());
    }

    // ==================== Excel ====================

    private Resource exportLogsToExcel(List<LogEntry> logs) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("日志数据");
            String[] headers = {"ID", "时间戳", "日志级别", "内容", "来源", "用户ID", "IP地址"};
            writeHeader(wb, sheet, headers);
            int row = 1;
            for (LogEntry e : logs) {
                Row r = sheet.createRow(row++);
                r.createCell(0).setCellValue(e.getId());
                r.createCell(1).setCellValue(fmt(e.getTimestamp()));
                r.createCell(2).setCellValue(e.getLevel());
                r.createCell(3).setCellValue(nvl(e.getContent()));
                r.createCell(4).setCellValue(e.getSource());
                r.createCell(5).setCellValue(nvl(e.getUserId()));
                r.createCell(6).setCellValue(nvl(e.getIpAddress()));
            }
            autoSize(sheet, headers.length);
            wb.write(out);
            return new ByteArrayResource(out.toByteArray());
        } catch (IOException e) { throw new RuntimeException("Excel导出失败", e); }
    }

    private Resource exportAlertsToExcel(List<Alert> alerts) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("告警数据");
            String[] headers = {"告警ID", "告警类型", "告警级别", "状态", "来源", "描述", "创建时间", "处理人"};
            writeHeader(wb, sheet, headers);
            int row = 1;
            for (Alert a : alerts) {
                Row r = sheet.createRow(row++);
                r.createCell(0).setCellValue(a.getAlertId());
                r.createCell(1).setCellValue(zhEventType(a.getAlertType()));
                r.createCell(2).setCellValue(zhSeverity(a.getAlertLevel().toString()));
                r.createCell(3).setCellValue(zhAlertStatus(a.getStatus().toString()));
                r.createCell(4).setCellValue(zhSource(a.getSource()));
                r.createCell(5).setCellValue(nvl(a.getDescription()));
                r.createCell(6).setCellValue(fmt(a.getCreatedTime()));
                r.createCell(7).setCellValue(nvl(a.getAssignee()));
            }
            autoSize(sheet, headers.length);
            wb.write(out);
            return new ByteArrayResource(out.toByteArray());
        } catch (IOException e) { throw new RuntimeException("Excel导出失败", e); }
    }

    private Resource exportEventsToExcel(List<UnifiedSecurityEvent> events) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("安全事件");
            String[] headers = {"ID", "事件类型", "严重程度", "来源系统", "来源IP", "目标IP", "时间戳", "威胁等级"};
            writeHeader(wb, sheet, headers);
            int row = 1;
            for (UnifiedSecurityEvent e : events) {
                Row r = sheet.createRow(row++);
                r.createCell(0).setCellValue(e.getId());
                r.createCell(1).setCellValue(zhEventType(e.getEventType()));
                r.createCell(2).setCellValue(zhSeverity(e.getSeverity()));
                r.createCell(3).setCellValue(zhSource(e.getSourceSystem()));
                r.createCell(4).setCellValue(nvl(e.getSourceIp()));
                r.createCell(5).setCellValue(nvl(e.getDestinationIp()));
                r.createCell(6).setCellValue(fmt(e.getTimestamp()));
                r.createCell(7).setCellValue(zhSeverity(nvl(e.getThreatLevel())));
            }
            autoSize(sheet, headers.length);
            wb.write(out);
            return new ByteArrayResource(out.toByteArray());
        } catch (IOException e) { throw new RuntimeException("Excel导出失败", e); }
    }

    private Resource exportSecurityLogsToExcel(List<SecurityLog> logs) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Windows安全日志");
            String[] headers = {"事件ID", "时间", "计算机名", "来源", "用户名", "IP地址", "登录类型", "威胁等级"};
            writeHeader(wb, sheet, headers);
            int row = 1;
            for (SecurityLog l : logs) {
                Row r = sheet.createRow(row++);
                r.createCell(0).setCellValue(l.getEventId());
                r.createCell(1).setCellValue(fmt(l.getEventTime()));
                r.createCell(2).setCellValue(nvl(l.getComputerName()));
                r.createCell(3).setCellValue(nvl(l.getSourceName()));
                r.createCell(4).setCellValue(nvl(l.getUserName()));
                r.createCell(5).setCellValue(nvl(l.getIpAddress()));
                r.createCell(6).setCellValue(l.getLogonType() != null ? l.getLogonType().toString() : "");
                r.createCell(7).setCellValue(zhSeverity(nvl(l.getThreatLevel())));
            }
            autoSize(sheet, headers.length);
            wb.write(out);
            return new ByteArrayResource(out.toByteArray());
        } catch (IOException e) { throw new RuntimeException("Excel导出失败", e); }
    }

    private Resource exportMetricsToExcel(List<SystemMetrics> metrics) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("系统性能指标");
            String[] headers = {"时间戳", "主机名", "IP", "CPU使用率", "内存使用率", "磁盘使用率", "网络发送", "网络接收"};
            writeHeader(wb, sheet, headers);
            int row = 1;
            for (SystemMetrics m : metrics) {
                Row r = sheet.createRow(row++);
                r.createCell(0).setCellValue(fmt(m.getTimestamp()));
                r.createCell(1).setCellValue(nvl(m.getHostname()));
                r.createCell(2).setCellValue(nvl(m.getIpAddress()));
                r.createCell(3).setCellValue(nvl(m.getCpuUsage()));
                r.createCell(4).setCellValue(nvl(m.getMemoryUsage()));
                r.createCell(5).setCellValue(nvl(m.getDiskUsage()));
                r.createCell(6).setCellValue(m.getNetworkSent() != null ? m.getNetworkSent() : 0L);
                r.createCell(7).setCellValue(m.getNetworkReceived() != null ? m.getNetworkReceived() : 0L);
            }
            autoSize(sheet, headers.length);
            wb.write(out);
            return new ByteArrayResource(out.toByteArray());
        } catch (IOException e) { throw new RuntimeException("Excel导出失败", e); }
    }

    // ==================== JSON ====================

    private Resource toJson(Object data) {
        try {
            return bytes(objectMapper.writeValueAsString(data));
        } catch (Exception e) { throw new RuntimeException("JSON导出失败", e); }
    }

    // ==================== Batch ====================

    private Resource batchExportToExcel(List<String> dataTypes, LocalDateTime startTime, LocalDateTime endTime) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            for (String type : dataTypes) {
                switch (type.toLowerCase()) {
                    case "logs"          -> fillLogsSheet(wb, startTime, endTime);
                    case "alerts"        -> fillAlertsSheet(wb, startTime, endTime);
                    case "events"        -> fillEventsSheet(wb, startTime, endTime);
                    case "security-logs" -> fillSecurityLogsSheet(wb, startTime, endTime);
                    case "metrics"       -> fillMetricsSheet(wb, startTime, endTime);
                }
            }
            wb.write(out);
            return new ByteArrayResource(out.toByteArray());
        } catch (IOException e) { throw new RuntimeException("批量Excel导出失败", e); }
    }

    private Resource batchExportToZip(List<String> dataTypes, LocalDateTime startTime, LocalDateTime endTime) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (String type : dataTypes) {
                Resource r = switch (type.toLowerCase()) {
                    case "logs"          -> exportLogs("csv", startTime, endTime, null, null);
                    case "alerts"        -> exportAlerts("csv", startTime, endTime, null, null, null);
                    case "events"        -> exportEvents("csv", startTime, endTime, null, null);
                    case "security-logs" -> exportSecurityLogs("csv", startTime, endTime, null, null);
                    case "metrics"       -> exportSystemMetrics("csv", startTime, endTime, null);
                    default -> null;
                };
                if (r != null) {
                    zos.putNextEntry(new ZipEntry(type + ".csv"));
                    zos.write(r.getContentAsByteArray());
                    zos.closeEntry();
                }
            }
            zos.finish();
            return new ByteArrayResource(baos.toByteArray());
        } catch (IOException e) { throw new RuntimeException("批量ZIP导出失败", e); }
    }

    private void fillLogsSheet(Workbook wb, LocalDateTime s, LocalDateTime e) {
        List<LogEntry> data = logEntryRepository.findAll(timeSpec("timestamp", s, e, LogEntry.class));
        Sheet sheet = wb.createSheet("日志数据");
        String[] h = {"ID", "时间戳", "日志级别", "内容", "来源", "用户ID", "IP地址"};
        writeHeader(wb, sheet, h);
        int row = 1;
        for (LogEntry item : data) {
            Row r = sheet.createRow(row++);
            r.createCell(0).setCellValue(item.getId());
            r.createCell(1).setCellValue(fmt(item.getTimestamp()));
            r.createCell(2).setCellValue(item.getLevel());
            r.createCell(3).setCellValue(nvl(item.getContent()));
            r.createCell(4).setCellValue(item.getSource());
            r.createCell(5).setCellValue(nvl(item.getUserId()));
            r.createCell(6).setCellValue(nvl(item.getIpAddress()));
        }
        autoSize(sheet, h.length);
    }

    private void fillAlertsSheet(Workbook wb, LocalDateTime s, LocalDateTime e) {
        List<Alert> data = alertRepository.findAll(timeSpec("timestamp", s, e, Alert.class));
        Sheet sheet = wb.createSheet("告警数据");
        String[] h = {"告警ID", "告警类型", "告警级别", "状态", "来源", "描述", "创建时间"};
        writeHeader(wb, sheet, h);
        int row = 1;
        for (Alert item : data) {
            Row r = sheet.createRow(row++);
            r.createCell(0).setCellValue(item.getAlertId());
            r.createCell(1).setCellValue(zhEventType(item.getAlertType()));
            r.createCell(2).setCellValue(zhSeverity(item.getAlertLevel().toString()));
            r.createCell(3).setCellValue(zhAlertStatus(item.getStatus().toString()));
            r.createCell(4).setCellValue(zhSource(item.getSource()));
            r.createCell(5).setCellValue(nvl(item.getDescription()));
            r.createCell(6).setCellValue(fmt(item.getCreatedTime()));
        }
        autoSize(sheet, h.length);
    }

    private void fillEventsSheet(Workbook wb, LocalDateTime s, LocalDateTime e) {
        List<UnifiedSecurityEvent> data = eventRepository.findAll(timeSpec("timestamp", s, e, UnifiedSecurityEvent.class));
        Sheet sheet = wb.createSheet("安全事件");
        String[] h = {"ID", "事件类型", "严重程度", "来源系统", "来源IP", "目标IP", "时间戳"};
        writeHeader(wb, sheet, h);
        int row = 1;
        for (UnifiedSecurityEvent item : data) {
            Row r = sheet.createRow(row++);
            r.createCell(0).setCellValue(item.getId());
            r.createCell(1).setCellValue(zhEventType(item.getEventType()));
            r.createCell(2).setCellValue(zhSeverity(item.getSeverity()));
            r.createCell(3).setCellValue(zhSource(item.getSourceSystem()));
            r.createCell(4).setCellValue(nvl(item.getSourceIp()));
            r.createCell(5).setCellValue(nvl(item.getDestinationIp()));
            r.createCell(6).setCellValue(fmt(item.getTimestamp()));
        }
        autoSize(sheet, h.length);
    }

    private void fillSecurityLogsSheet(Workbook wb, LocalDateTime s, LocalDateTime e) {
        List<SecurityLog> data = securityLogRepository.findAll(timeSpec("eventTime", s, e, SecurityLog.class));
        Sheet sheet = wb.createSheet("Windows安全日志");
        String[] h = {"事件ID", "时间", "计算机名", "用户名", "IP地址", "威胁等级"};
        writeHeader(wb, sheet, h);
        int row = 1;
        for (SecurityLog item : data) {
            Row r = sheet.createRow(row++);
            r.createCell(0).setCellValue(item.getEventId());
            r.createCell(1).setCellValue(fmt(item.getEventTime()));
            r.createCell(2).setCellValue(nvl(item.getComputerName()));
            r.createCell(3).setCellValue(nvl(item.getUserName()));
            r.createCell(4).setCellValue(nvl(item.getIpAddress()));
            r.createCell(5).setCellValue(zhSeverity(nvl(item.getThreatLevel())));
        }
        autoSize(sheet, h.length);
    }

    private void fillMetricsSheet(Workbook wb, LocalDateTime s, LocalDateTime e) {
        List<SystemMetrics> data = metricsRepository.findAll(timeSpec("timestamp", s, e, SystemMetrics.class));
        Sheet sheet = wb.createSheet("系统性能指标");
        String[] h = {"时间戳", "主机名", "IP", "CPU使用率", "内存使用率", "磁盘使用率"};
        writeHeader(wb, sheet, h);
        int row = 1;
        for (SystemMetrics item : data) {
            Row r = sheet.createRow(row++);
            r.createCell(0).setCellValue(fmt(item.getTimestamp()));
            r.createCell(1).setCellValue(nvl(item.getHostname()));
            r.createCell(2).setCellValue(nvl(item.getIpAddress()));
            r.createCell(3).setCellValue(nvl(item.getCpuUsage()));
            r.createCell(4).setCellValue(nvl(item.getMemoryUsage()));
            r.createCell(5).setCellValue(nvl(item.getDiskUsage()));
        }
        autoSize(sheet, h.length);
    }

    // ==================== 工具方法 ====================

    /** 通用时间范围 Specification */
    private <T> Specification<T> timeSpec(String field, LocalDateTime s, LocalDateTime e, Class<T> clazz) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (s != null) p.add(cb.greaterThanOrEqualTo(root.get(field), s));
            if (e != null) p.add(cb.lessThanOrEqualTo(root.get(field), e));
            return cb.and(p.toArray(new Predicate[0]));
        };
    }

    private void writeHeader(Workbook wb, Sheet sheet, String[] headers) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        Row row = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(style);
        }
    }

    private void autoSize(Sheet sheet, int cols) {
        for (int i = 0; i < cols; i++) sheet.autoSizeColumn(i);
    }

    private ByteArrayResource bytes(String text) {
        return new ByteArrayResource(text.getBytes(StandardCharsets.UTF_8));
    }

    private String fmt(LocalDateTime dt) {
        return dt != null ? dt.format(DATE_FORMATTER) : "";
    }

    private String esc(String v) {
        return v == null ? "" : v.replace("\"", "\"\"");
    }

    private String nvl(String v) { return v != null ? v : ""; }
    private double nvl(Double v) { return v != null ? v : 0.0; }
    private long   nvl(Long v)   { return v != null ? v : 0L; }

    private static final java.util.Map<String, String> SEVERITY_ZH = java.util.Map.of(
            "CRITICAL", "严重", "HIGH", "高危", "MEDIUM", "中危", "LOW", "低危", "INFO", "信息"
    );

    private static final java.util.Map<String, String> EVENT_TYPE_ZH = java.util.Map.ofEntries(
            java.util.Map.entry("LOGIN_FAILURE", "登录失败"), java.util.Map.entry("LOGIN_SUCCESS", "登录成功"),
            java.util.Map.entry("AUTH_FAILURE", "认证失败"), java.util.Map.entry("AUTH_SUCCESS", "认证成功"),
            java.util.Map.entry("LOGOFF", "注销"), java.util.Map.entry("BRUTE_FORCE", "暴力破解"),
            java.util.Map.entry("BRUTE_FORCE_ATTACK", "暴力破解攻击"), java.util.Map.entry("PRIVILEGE_ESCALATION", "权限提升"),
            java.util.Map.entry("SUSPICIOUS_ACTIVITY", "可疑活动"), java.util.Map.entry("SUSPICIOUS_LOGIN", "可疑登录"),
            java.util.Map.entry("OFF_HOURS_LOGIN", "非工作时间登录"), java.util.Map.entry("ACCOUNT_LOCKOUT", "账户锁定"),
            java.util.Map.entry("SECURITY_POLICY_CHANGE", "安全策略变更"), java.util.Map.entry("MALWARE", "恶意软件"),
            java.util.Map.entry("NETWORK_ATTACK", "网络攻击"), java.util.Map.entry("DATA_EXFILTRATION", "数据渗出"),
            java.util.Map.entry("COMMAND_INJECTION", "命令注入"), java.util.Map.entry("SQL_INJECTION", "SQL注入"),
            java.util.Map.entry("XSS_ATTACK", "跨站脚本攻击"), java.util.Map.entry("UNAUTHORIZED_ACCESS", "未授权访问"),
            java.util.Map.entry("MEMORY_USAGE", "内存使用异常"), java.util.Map.entry("CPU_USAGE", "CPU使用异常"),
            java.util.Map.entry("DISK_USAGE", "磁盘使用异常"), java.util.Map.entry("PROCESS_ANOMALY", "进程异常"),
            java.util.Map.entry("SCRIPT_EXECUTION_FAILURE", "脚本执行失败"), java.util.Map.entry("PORT_SCAN", "端口扫描"),
            java.util.Map.entry("LATERAL_MOVEMENT", "横向移动"), java.util.Map.entry("PERSISTENCE", "持久化"),
            java.util.Map.entry("EXPLOIT", "漏洞利用"), java.util.Map.entry("BACKDOOR", "后门程序"),
            java.util.Map.entry("RANSOMWARE", "勒索软件"), java.util.Map.entry("CRYPTO_MINING", "加密货币挖矿"),
            java.util.Map.entry("ANOMALY_DETECTED", "异常检测"), java.util.Map.entry("POLICY_VIOLATION", "策略违规"),
            java.util.Map.entry("SYSTEM_ANOMALY", "系统异常"), java.util.Map.entry("SECURITY_ANOMALY", "安全异常")
    );

    private static final java.util.Map<String, String> SOURCE_ZH = java.util.Map.of(
            "WINDOWS", "Windows系统", "APPLICATION", "应用程序", "NETWORK", "网络设备",
            "LINUX", "Linux系统", "DATABASE", "数据库", "FIREWALL", "防火墙",
            "IDS", "入侵检测", "ANTIVIRUS", "防病毒", "安全日志采集脚本", "安全日志采集脚本"
    );

    private static final java.util.Map<String, String> ALERT_STATUS_ZH = java.util.Map.of(
            "PENDING", "待处理", "PROCESSING", "处理中", "RESOLVED", "已解决", "FALSE_POSITIVE", "误报"
    );

    private String zhSeverity(String v) { return v != null ? SEVERITY_ZH.getOrDefault(v.toUpperCase(), v) : ""; }
    private String zhEventType(String v) { return v != null ? EVENT_TYPE_ZH.getOrDefault(v, EVENT_TYPE_ZH.getOrDefault(v.toUpperCase(), v)) : ""; }
    private String zhSource(String v) { return v != null ? SOURCE_ZH.getOrDefault(v, SOURCE_ZH.getOrDefault(v.toUpperCase(), v)) : ""; }
    private String zhAlertStatus(String v) { return v != null ? ALERT_STATUS_ZH.getOrDefault(v.toUpperCase(), v) : ""; }
}
