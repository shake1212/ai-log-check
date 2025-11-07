// service/impl/WindowsLogServiceImpl.java
package com.security.ailogsystem.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.security.ailogsystem.entity.SecurityLog;
import com.security.ailogsystem.repository.SecurityLogRepository;
import com.security.ailogsystem.service.ThreatDetectionService;
import com.security.ailogsystem.service.WindowsLogService;
import com.security.ailogsystem.service.WebSocketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class WindowsLogServiceImpl implements WindowsLogService {

    private static final Logger logger = LoggerFactory.getLogger(WindowsLogServiceImpl.class);
    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Autowired
    private SecurityLogRepository logRepository;

    @Autowired
    private ThreatDetectionService threatDetectionService;

    @Autowired
    private WebSocketService webSocketService;

    @Value("${log.collection.batch-size:100}")
    private int batchSize;

    @Value("${log.collection.enabled:true}")
    private boolean collectionEnabled;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AtomicBoolean isMonitoring = new AtomicBoolean(false);
    private Process monitoringProcess;

    @Override
    public List<SecurityLog> collectSecurityLogs() {
        if (!collectionEnabled) {
            logger.warn("日志采集功能已禁用");
            return Collections.emptyList();
        }

        try {
            // 使用PowerShell命令获取安全日志
            String powerShellCommand = "Get-EventLog -LogName Security -After (Get-Date).AddHours(-1) | " +
                    "Select-Object TimeGenerated, EventID, EntryType, Source, Message, InstanceId, " +
                    "ReplacementStrings, MachineName | ConvertTo-Json";

            Process process = Runtime.getRuntime().exec(new String[]{"powershell", "-Command", powerShellCommand});

            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line);
                }
            }

            process.waitFor();

            if (output.length() > 0) {
                return parseSecurityLogs(output.toString());
            }

        } catch (Exception e) {
            logger.error("采集安全日志失败", e);
            webSocketService.sendSystemNotification("日志采集失败: " + e.getMessage(), "ERROR");
        }

        return Collections.emptyList();
    }

    @Override
    public List<SecurityLog> collectLogsByTimeRange(LocalDateTime startTime, LocalDateTime endTime) {
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM/dd/yyyy HH:mm:ss");
            String startStr = startTime.format(formatter);
            String endStr = endTime.format(formatter);

            String powerShellCommand = String.format(
                    "Get-EventLog -LogName Security -After \"%s\" -Before \"%s\" | " +
                            "Select-Object TimeGenerated, EventID, EntryType, Source, Message, MachineName | ConvertTo-Json",
                    startStr, endStr
            );

            Process process = Runtime.getRuntime().exec(new String[]{"powershell", "-Command", powerShellCommand});

            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line);
                }
            }

            process.waitFor();

            if (output.length() > 0) {
                return parseSecurityLogs(output.toString());
            }

        } catch (Exception e) {
            logger.error("按时间范围采集日志失败", e);
        }

        return Collections.emptyList();
    }

    @Override
    public void startRealTimeMonitoring() {
        if (isMonitoring.get()) {
            logger.warn("实时监控已在运行");
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                isMonitoring.set(true);
                logger.info("启动实时日志监控");
                webSocketService.sendSystemNotification("启动实时日志监控", "INFO");

                // 使用Windows事件查询进行实时监控
                String query = "SELECT * FROM Win32_NTLogEvent WHERE LogFile='Security'";
                String powerShellCommand =
                        "Get-WinEvent -FilterHashtable @{LogName='Security'} -MaxEvents 1 | " +
                                "ForEach-Object { $_.Message }";

                while (isMonitoring.get()) {
                    try {
                        List<SecurityLog> newLogs = collectSecurityLogs();
                        Thread.sleep(5000); // 5秒间隔
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    } catch (Exception e) {
                        logger.error("实时监控异常", e);
                        Thread.sleep(10000); // 异常时等待10秒
                    }
                }

            } catch (Exception e) {
                logger.error("实时监控任务失败", e);
            } finally {
                isMonitoring.set(false);
                logger.info("实时日志监控已停止");
                webSocketService.sendSystemNotification("实时日志监控已停止", "INFO");
            }
        });
    }

    @Override
    public void stopRealTimeMonitoring() {
        if (isMonitoring.compareAndSet(true, false)) {
            logger.info("停止实时日志监控");
            if (monitoringProcess != null) {
                monitoringProcess.destroy();
            }
        }
    }

    @Override
    public Map<String, Object> getCollectionStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("enabled", collectionEnabled);
        status.put("monitoring", isMonitoring.get());
        status.put("lastCollectionTime", LocalDateTime.now());
        status.put("batchSize", batchSize);

        // 获取最近采集统计
        LocalDateTime lastHour = LocalDateTime.now().minusHours(1);
        Long recentLogCount = logRepository.countByEventTimeAfter(lastHour);
        status.put("recentLogCount", recentLogCount);

        return status;
    }

    @Override
    public int cleanupExpiredLogs(int retentionDays) {
        try {
            LocalDateTime threshold = LocalDateTime.now().minusDays(retentionDays);
            List<SecurityLog> expiredLogs = logRepository.findByEventTimeBefore(threshold);

            if (!expiredLogs.isEmpty()) {
                logRepository.deleteAll(expiredLogs);
                logger.info("清理了 {} 条过期日志", expiredLogs.size());
                return expiredLogs.size();
            }
        } catch (Exception e) {
            logger.error("清理过期日志失败", e);
        }

        return 0;
    }

    /**
     * 解析安全日志
     */
    @SuppressWarnings("unchecked")
    private List<SecurityLog> parseSecurityLogs(String jsonOutput) {
        List<SecurityLog> logs = new ArrayList<>();

        try {
            Object jsonData = objectMapper.readValue(jsonOutput, Object.class);
            List<Map<String, Object>> events;

            if (jsonData instanceof List) {
                events = (List<Map<String, Object>>) jsonData;
            } else {
                events = Collections.singletonList((Map<String, Object>) jsonData);
            }

            for (Map<String, Object> event : events) {
                SecurityLog log = parseEventData(event);
                if (log != null) {
                    // 威胁检测
                    threatDetectionService.analyzeThreat(log);
                    logs.add(log);
                }
            }

            // 批量保存
            if (!logs.isEmpty()) {
                logRepository.saveAll(logs);
                logger.info("成功保存 {} 条安全日志", logs.size());

                // 实时推送新日志
                webSocketService.broadcastNewLogs(logs);
            }

        } catch (Exception e) {
            logger.error("解析安全日志失败", e);
        }

        return logs;
    }

    /**
     * 解析单个事件数据
     */
    private SecurityLog parseEventData(Map<String, Object> event) {
        try {
            Integer eventId = getIntegerValue(event, "EventID");
            String timeGenerated = getStringValue(event, "TimeGenerated");
            String source = getStringValue(event, "Source");
            String message = getStringValue(event, "Message");
            String machineName = getStringValue(event, "MachineName");

            if (eventId == null) {
                return null;
            }

            LocalDateTime eventTime = parseEventTime(timeGenerated);
            SecurityLog log = new SecurityLog(eventId, eventTime, machineName, source, message);

            // 解析详细信息
            extractEventDetails(log, event);

            return log;

        } catch (Exception e) {
            logger.warn("解析事件数据失败: {}", event, e);
            return null;
        }
    }

    /**
     * 解析事件时间
     */
    private LocalDateTime parseEventTime(String timeString) {
        try {
            // 处理PowerShell返回的时间格式
            if (timeString.contains("/")) {
                timeString = timeString.replace("T", " ").split("\\.")[0];
            }
            return LocalDateTime.parse(timeString.replace("T", " "), DATE_FORMATTER);
        } catch (Exception e) {
            logger.warn("解析时间失败: {}, 使用当前时间", timeString);
            return LocalDateTime.now();
        }
    }

    /**
     * 提取事件详细信息
     */
    private void extractEventDetails(SecurityLog log, Map<String, Object> event) {
        Integer eventId = log.getEventId();
        String message = log.getRawMessage();

        // 登录事件分析
        if (eventId == 4624 || eventId == 4625) {
            extractLogonDetails(log, message);
        }
        // 账户管理事件
        else if (eventId >= 4720 && eventId <= 4738) {
            extractAccountManagementDetails(log, message);
        }
    }

    /**
     * 提取登录详情
     */
    private void extractLogonDetails(SecurityLog log, String message) {
        try {
            // 提取IP地址
            if (message.contains("Source Network Address:")) {
                String[] parts = message.split("Source Network Address:");
                if (parts.length > 1) {
                    String ip = parts[1].split("\\s+")[1].trim();
                    log.setIpAddress(ip);
                }
            }

            // 提取登录类型
            if (message.contains("Logon Type:")) {
                String[] parts = message.split("Logon Type:");
                if (parts.length > 1) {
                    String typeStr = parts[1].split("\\s+")[1].trim();
                    log.setLogonType(Integer.parseInt(typeStr));
                }
            }

            // 提取用户名
            if (message.contains("Account Name:")) {
                String[] parts = message.split("Account Name:");
                if (parts.length > 1) {
                    String user = parts[1].split("\\s+")[1].trim();
                    log.setUserName(user);
                }
            }

            // 提取结果代码
            if (message.contains("Result Code:")) {
                String[] parts = message.split("Result Code:");
                if (parts.length > 1) {
                    String codeStr = parts[1].split("\\s+")[1].trim();
                    log.setResultCode(Integer.parseInt(codeStr));
                }
            }

        } catch (Exception e) {
            logger.debug("提取登录详情失败: {}", e.getMessage());
        }
    }

    /**
     * 提取账户管理详情
     */
    private void extractAccountManagementDetails(SecurityLog log, String message) {
        try {
            // 提取目标用户名
            if (message.contains("Target User Name:")) {
                String[] parts = message.split("Target User Name:");
                if (parts.length > 1) {
                    String user = parts[1].split("\\s+")[1].trim();
                    log.setUserName(user);
                }
            }

            log.setThreatLevel("HIGH");

        } catch (Exception e) {
            logger.debug("提取账户管理详情失败: {}", e.getMessage());
        }
    }

    // 工具方法
    private Integer getIntegerValue(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Integer) return (Integer) value;
        if (value instanceof String) {
            try { return Integer.parseInt((String) value); }
            catch (NumberFormatException e) { return null; }
        }
        return null;
    }

    private String getStringValue(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value != null ? value.toString() : null;
    }

    /**
     * 定时采集任务
     */
    @Scheduled(fixedRateString = "${log.collection.interval:30000}")
    public void scheduledLogCollection() {
        if (!collectionEnabled || isMonitoring.get()) {
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                List<SecurityLog> newLogs = collectSecurityLogs();
                if (!newLogs.isEmpty()) {
                    logger.debug("定时采集到 {} 条新日志", newLogs.size());
                }
            } catch (Exception e) {
                logger.error("定时采集任务失败", e);
            }
        });
    }

    /**
     * 定时清理任务
     */
    @Scheduled(cron = "0 0 2 * * ?") // 每天凌晨2点执行
    public void scheduledCleanup() {
        CompletableFuture.runAsync(() -> {
            try {
                int cleanedCount = cleanupExpiredLogs(30); // 保留30天
                if (cleanedCount > 0) {
                    logger.info("定时清理任务完成，清理了 {} 条过期日志", cleanedCount);
                }
            } catch (Exception e) {
                logger.error("定时清理任务失败", e);
            }
        });
    }
}