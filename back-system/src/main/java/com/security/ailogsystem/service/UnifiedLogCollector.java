package com.security.ailogsystem.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.security.ailogsystem.model.UnifiedSecurityEvent;
import com.security.ailogsystem.repository.UnifiedEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@Component
@RequiredArgsConstructor
public class UnifiedLogCollector {

    private final UnifiedEventRepository eventRepository;
    private final AdvancedAnomalyDetector anomalyDetector;
    private final ObjectMapper objectMapper;

    // 可疑端口列表
    private static final Set<Integer> SUSPICIOUS_PORTS = Set.of(23, 4444, 5555, 6666, 6667, 1337, 31337, 12345, 27374, 54320);

    /**
     * 统一日志收集入口
     */
    @Scheduled(fixedRate = 300000) // 每5分钟执行一次
    public void collectAllLogs() {
        log.info("开始统一日志收集...");

        List<CompletableFuture<Void>> futures = new ArrayList<>();

        // 并行收集不同来源的日志
        futures.add(CompletableFuture.runAsync(this::collectWindowsEvents));
        futures.add(CompletableFuture.runAsync(this::collectUnixEvents));
        futures.add(CompletableFuture.runAsync(this::collectNetworkEvents));
        futures.add(CompletableFuture.runAsync(this::collectProcessEvents));
        futures.add(CompletableFuture.runAsync(this::collectApplicationEvents));

        // 等待所有任务完成
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .thenRun(() -> log.info("统一日志收集完成"))
                .exceptionally(e -> {
                    log.error("日志收集过程中发生错误", e);
                    return null;
                });
    }

    /**
     * 收集Windows事件日志
     */
    public void collectWindowsEvents() {
        try {
            log.debug("开始收集Windows事件日志...");

            String powerShellCommand =
                    "Get-WinEvent -FilterHashtable @{LogName='Security','System','Application'; StartTime=(Get-Date).AddHours(-1)} | " +
                            "Select-Object TimeCreated, Id, LevelDisplayName, LogName, ProviderName, Message, MachineName, UserId | " +
                            "ConvertTo-Json -Depth 3";

            Process process = Runtime.getRuntime().exec(new String[]{"powershell", "-Command", powerShellCommand});
            String output = readProcessOutput(process);

            if (output != null && !output.trim().isEmpty()) {
                JsonNode events = objectMapper.readTree(output);
                List<UnifiedSecurityEvent> securityEvents = new ArrayList<>();

                if (events.isArray()) {
                    for (JsonNode event : events) {
                        UnifiedSecurityEvent securityEvent = parseWindowsEvent(event);
                        if (securityEvent != null) {
                            anomalyDetector.detectAnomalies(securityEvent);
                            securityEvents.add(securityEvent);
                        }
                    }
                }

                if (!securityEvents.isEmpty()) {
                    eventRepository.saveAll(securityEvents);
                    log.info("成功收集 {} 个Windows安全事件", securityEvents.size());
                }
            }

        } catch (Exception e) {
            log.error("收集Windows事件失败", e);
            // 记录错误事件
            saveErrorEvent("WINDOWS_COLLECTOR", e.getMessage());
        }
    }

    /**
     * 收集Unix/Linux系统日志
     */
    public void collectUnixEvents() {
        try {
            log.debug("开始收集Unix系统日志...");

            String[] logFiles = {"/var/log/auth.log", "/var/log/syslog", "/var/log/messages"};
            List<UnifiedSecurityEvent> securityEvents = new ArrayList<>();

            for (String logFile : logFiles) {
                Path logPath = Paths.get(logFile);
                if (Files.exists(logPath)) {
                    List<String> lines = Files.readAllLines(logPath);
                    // 只取最后50行
                    int startIndex = Math.max(0, lines.size() - 50);
                    List<String> recentLines = lines.subList(startIndex, lines.size());

                    for (String line : recentLines) {
                        UnifiedSecurityEvent event = parseUnixLogLine(line, logFile);
                        if (event != null) {
                            anomalyDetector.detectAnomalies(event);
                            securityEvents.add(event);
                        }
                    }
                }
            }

            if (!securityEvents.isEmpty()) {
                eventRepository.saveAll(securityEvents);
                log.info("成功收集 {} 个Unix安全事件", securityEvents.size());
            }

        } catch (Exception e) {
            log.error("收集Unix系统事件失败", e);
            saveErrorEvent("UNIX_COLLECTOR", e.getMessage());
        }
    }

    /**
     * 收集网络事件
     */
    public void collectNetworkEvents() {
        try {
            log.debug("开始收集网络事件...");

            boolean isWindows = System.getProperty("os.name").toLowerCase().contains("windows");
            String[] commands = isWindows ?
                    new String[]{"netstat", "-an"} :
                    new String[]{"netstat", "-tuln"};

            Process process = Runtime.getRuntime().exec(commands);
            List<String> lines = readProcessOutputLines(process);
            List<UnifiedSecurityEvent> securityEvents = new ArrayList<>();

            for (String line : lines) {
                if (line.contains("ESTABLISHED") || line.contains("LISTEN")) {
                    UnifiedSecurityEvent event = parseNetworkConnection(line);
                    if (event != null) {
                        anomalyDetector.detectAnomalies(event);
                        securityEvents.add(event);
                    }
                }
            }

            if (!securityEvents.isEmpty()) {
                eventRepository.saveAll(securityEvents);
                log.info("成功收集 {} 个网络连接事件", securityEvents.size());
            }

        } catch (Exception e) {
            log.error("收集网络事件失败", e);
            saveErrorEvent("NETWORK_COLLECTOR", e.getMessage());
        }
    }

    /**
     * 收集进程事件
     */
    public void collectProcessEvents() {
        try {
            log.debug("开始收集进程事件...");

            boolean isWindows = System.getProperty("os.name").toLowerCase().contains("windows");
            String[] commands = isWindows ?
                    new String[]{"tasklist", "/FO", "CSV"} :
                    new String[]{"ps", "aux"};

            Process process = Runtime.getRuntime().exec(commands);
            List<String> lines = readProcessOutputLines(process);
            List<UnifiedSecurityEvent> securityEvents = new ArrayList<>();

            for (String line : lines) {
                UnifiedSecurityEvent event = parseProcessInfo(line);
                if (event != null) {
                    anomalyDetector.detectAnomalies(event);
                    securityEvents.add(event);
                }
            }

            if (!securityEvents.isEmpty()) {
                eventRepository.saveAll(securityEvents);
                log.info("成功收集 {} 个进程事件", securityEvents.size());
            }

        } catch (Exception e) {
            log.error("收集进程事件失败", e);
            saveErrorEvent("PROCESS_COLLECTOR", e.getMessage());
        }
    }



    /**
     * 收集应用性能事件
     */
    public void collectApplicationEvents() {
        try {
            log.debug("开始收集应用性能事件...");

            List<UnifiedSecurityEvent> securityEvents = new ArrayList<>();

            // JVM内存监控
            Runtime runtime = Runtime.getRuntime();
            long maxMemory = runtime.maxMemory() / (1024 * 1024);
            long totalMemory = runtime.totalMemory() / (1024 * 1024);
            long freeMemory = runtime.freeMemory() / (1024 * 1024);
            long usedMemory = totalMemory - freeMemory;
            double memoryUsage = (double) usedMemory / totalMemory;

            UnifiedSecurityEvent memoryEvent = UnifiedSecurityEvent.builder()
                    .timestamp(LocalDateTime.now())
                    .sourceSystem("APPLICATION")
                    .eventType("MEMORY_USAGE")
                    .category("PERFORMANCE")
                    .severity(memoryUsage > 0.8 ? "WARN" : "INFO")
                    .normalizedMessage(String.format("JVM内存使用: %dMB/%dMB (%.1f%%)",
                            usedMemory, totalMemory, memoryUsage * 100))
                    .build();

            // 设置 eventData
            Map<String, Object> eventData = Map.of(
                    "maxMemory", maxMemory,
                    "totalMemory", totalMemory,
                    "usedMemory", usedMemory,
                    "freeMemory", freeMemory,
                    "usagePercentage", memoryUsage
            );
            memoryEvent.setEventData(eventData);

            if (memoryUsage > 0.8) {
                memoryEvent.setIsAnomaly(true);
                memoryEvent.setAnomalyScore(0.7);
                memoryEvent.setAnomalyReason("内存使用率超过80%");
            }

            securityEvents.add(memoryEvent);

            // 保存事件
            eventRepository.saveAll(securityEvents);
            log.info("成功收集 {} 个应用性能事件", securityEvents.size());

        } catch (Exception e) {
            log.error("收集应用性能事件失败", e);
            saveErrorEvent("APPLICATION_COLLECTOR", e.getMessage());
        }
    }

    /**
     * 解析Windows事件
     */
    private UnifiedSecurityEvent parseWindowsEvent(JsonNode event) {
        try {
            return UnifiedSecurityEvent.builder()
                    .timestamp(LocalDateTime.parse(event.get("TimeCreated").asText().replace("Z", "")))
                    .sourceSystem("WINDOWS")
                    .eventType("WINDOWS_EVENT")
                    .category(mapWindowsLogName(event.get("LogName").asText()))
                    .severity(mapWindowsLevel(event.get("LevelDisplayName").asText()))
                    .eventCode(event.get("Id").asInt())
                    .rawMessage(event.get("Message").asText())
                    .normalizedMessage(String.format("Windows事件[%d]: %s",
                            event.get("Id").asInt(),
                            event.get("ProviderName").asText()))
                    .hostName(event.get("MachineName").asText())
                    .userId(event.get("UserId") != null ? event.get("UserId").asText() : null)
                    .rawData(event.toString())
                    .build();
        } catch (Exception e) {
            log.warn("解析Windows事件失败: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 解析Unix日志行
     */
    private UnifiedSecurityEvent parseUnixLogLine(String line, String logFile) {
        try {
            return UnifiedSecurityEvent.builder()
                    .timestamp(LocalDateTime.now())
                    .sourceSystem("LINUX")
                    .eventType("SYSTEM_LOG")
                    .category(mapUnixLogFile(logFile))
                    .severity(detectUnixLogLevel(line))
                    .rawMessage(line)
                    .normalizedMessage(line.length() > 200 ? line.substring(0, 200) + "..." : line)
                    .rawData(line)
                    .build();
        } catch (Exception e) {
            log.warn("解析Unix日志行失败: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 解析网络连接信息
     */
    private UnifiedSecurityEvent parseNetworkConnection(String line) {
        try {
            // 简单的网络连接解析逻辑
            // Windows和Linux的netstat输出格式不同
            boolean isWindows = System.getProperty("os.name").toLowerCase().contains("windows");

            UnifiedSecurityEvent.UnifiedSecurityEventBuilder builder = UnifiedSecurityEvent.builder()
                    .timestamp(LocalDateTime.now())
                    .sourceSystem("NETWORK")
                    .eventType("NETWORK_CONNECTION")
                    .category("NETWORK")
                    .severity("INFO")
                    .rawMessage(line)
                    .normalizedMessage("网络连接: " + line.trim());

            if (isWindows) {
                // Windows netstat 输出解析
                String[] parts = line.trim().split("\\s+");
                if (parts.length >= 3) {
                    // 协议类型
                    builder.protocol(parts[0]);

                    // 本地地址和端口
                    if (parts[1].contains(":")) {
                        String[] localParts = parts[1].split(":");
                        if (localParts.length == 2) {
                            builder.hostIp(localParts[0]);
                            try {
                                builder.sourcePort(Integer.parseInt(localParts[1]));
                            } catch (NumberFormatException e) {
                                // 忽略端口解析错误
                            }
                        }
                    }

                    // 远程地址和端口
                    if (parts[2].contains(":")) {
                        String[] remoteParts = parts[2].split(":");
                        if (remoteParts.length == 2) {
                            builder.destinationIp(remoteParts[0]);
                            try {
                                builder.destinationPort(Integer.parseInt(remoteParts[1]));
                            } catch (NumberFormatException e) {
                                // 忽略端口解析错误
                            }
                        }
                    }

                    // 状态
                    if (parts.length >= 4) {
                        String state = parts[3];
                        builder.eventSubType(state);

                        // 检测可疑状态
                        if ("LISTENING".equals(state) || "ESTABLISHED".equals(state)) {
                            // 检查是否可疑端口
                            if (builder.build().getDestinationPort() != null &&
                                    SUSPICIOUS_PORTS.contains(builder.build().getDestinationPort())) {
                                builder.severity("WARN")
                                        .isAnomaly(true)
                                        .anomalyScore(0.8)
                                        .anomalyReason("连接到可疑端口: " + builder.build().getDestinationPort());
                            }
                        }
                    }
                }
            } else {
                // Linux netstat 输出解析
                String[] parts = line.trim().split("\\s+");
                if (parts.length >= 6) {
                    // 协议类型 (tcp/udp)
                    builder.protocol(parts[0]);

                    // 本地地址和端口
                    if (parts[3].contains(":")) {
                        String[] localParts = parts[3].split(":");
                        if (localParts.length >= 2) {
                            builder.hostIp(localParts[0].equals("0.0.0.0") ? "localhost" : localParts[0]);
                            try {
                                builder.sourcePort(Integer.parseInt(localParts[1]));
                            } catch (NumberFormatException e) {
                                // 忽略端口解析错误
                            }
                        }
                    }

                    // 远程地址和端口
                    if (parts[4].contains(":")) {
                        String[] remoteParts = parts[4].split(":");
                        if (remoteParts.length >= 2) {
                            builder.destinationIp(remoteParts[0]);
                            try {
                                builder.destinationPort(Integer.parseInt(remoteParts[1]));
                            } catch (NumberFormatException e) {
                                // 忽略端口解析错误
                            }
                        }
                    }

                    // 状态
                    String state = parts[5];
                    builder.eventSubType(state);

                    // 检测可疑连接
                    if (("LISTEN".equals(state) || "ESTABLISHED".equals(state)) &&
                            builder.build().getDestinationPort() != null &&
                            SUSPICIOUS_PORTS.contains(builder.build().getDestinationPort())) {
                        builder.severity("WARN")
                                .isAnomaly(true)
                                .anomalyScore(0.8)
                                .anomalyReason("连接到可疑端口: " + builder.build().getDestinationPort());
                    }
                }
            }

            return builder.build();

        } catch (Exception e) {
            log.warn("解析网络连接信息失败: {}", line, e);
            return null;
        }
    }

    /**
     * 解析进程信息
     */
    private UnifiedSecurityEvent parseProcessInfo(String line) {
        try {
            boolean isWindows = System.getProperty("os.name").toLowerCase().contains("windows");

            UnifiedSecurityEvent.UnifiedSecurityEventBuilder builder = UnifiedSecurityEvent.builder()
                    .timestamp(LocalDateTime.now())
                    .sourceSystem("SYSTEM")
                    .eventType("PROCESS_INFO")
                    .category("PROCESS")
                    .severity("INFO")
                    .rawMessage(line)
                    .normalizedMessage("进程信息: " + line.trim());

            if (isWindows) {
                // Windows tasklist CSV格式解析
                if (line.startsWith("\"")) {
                    // CSV格式: "进程名","PID","会话名","会话#","内存使用"
                    String[] parts = parseCSVLine(line);
                    if (parts.length >= 2) {
                        builder.processName(parts[0]);
                        try {
                            builder.processId(Integer.parseInt(parts[1]));
                        } catch (NumberFormatException e) {
                            // 忽略PID解析错误
                        }

                        // 检测可疑进程
                        if (isSuspiciousProcess(parts[0])) {
                            builder.severity("WARN")
                                    .isAnomaly(true)
                                    .anomalyScore(0.9)
                                    .anomalyReason("可疑进程: " + parts[0])
                                    .threatLevel("HIGH");
                        }
                    }
                }
            } else {
                // Linux ps aux 输出解析
                String[] parts = line.trim().split("\\s+", 11); // 最多分割成11部分
                if (parts.length >= 11) {
                    // 格式: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
                    builder.userId(parts[0]);
                    try {
                        builder.processId(Integer.parseInt(parts[1]));
                    } catch (NumberFormatException e) {
                        // 忽略PID解析错误
                    }

                    String command = parts[10];
                    builder.processName(command.length() > 50 ? command.substring(0, 50) : command);

                    // 检测可疑进程
                    if (isSuspiciousProcess(command)) {
                        builder.severity("WARN")
                                .isAnomaly(true)
                                .anomalyScore(0.9)
                                .anomalyReason("可疑进程: " + command)
                                .threatLevel("HIGH");
                    }
                }
            }

            return builder.build();

        } catch (Exception e) {
            log.warn("解析进程信息失败: {}", line, e);
            return null;
        }
    }

    /**
     * 解析CSV格式的行
     */
    private String[] parseCSVLine(String line) {
        List<String> result = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder field = new StringBuilder();

        for (char c : line.toCharArray()) {
            if (c == '\"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                result.add(field.toString());
                field.setLength(0);
            } else {
                field.append(c);
            }
        }

        // 添加最后一个字段
        if (field.length() > 0) {
            result.add(field.toString());
        }

        return result.toArray(new String[0]);
    }

    /**
     * 检测可疑进程
     */
    private boolean isSuspiciousProcess(String processName) {
        if (processName == null) return false;

        String lowerName = processName.toLowerCase();

        // 可疑进程关键词
        String[] suspiciousKeywords = {
                "miner", "bitcoin", "eth", "monero", "crypto", "coin",
                "backdoor", "trojan", "malware", "virus", "ransomware",
                "keylogger", "spyware", "rootkit", "exploit",
                "mimikatz", "metasploit", "payload", "shellcode"
        };

        for (String keyword : suspiciousKeywords) {
            if (lowerName.contains(keyword)) {
                return true;
            }
        }

        // 检查隐藏或异常进程名
        if (lowerName.contains("..") || lowerName.contains("cmd.exe") && lowerName.contains("/c")) {
            return true;
        }

        return false;
    }

    // 映射辅助方法
    private String mapWindowsLogName(String logName) {
        return switch (logName) {
            case "Security" -> "AUTHENTICATION";
            case "System" -> "SYSTEM";
            case "Application" -> "APPLICATION";
            default -> "OTHER";
        };
    }

    private String mapWindowsLevel(String level) {
        return switch (level) {
            case "Error" -> "ERROR";
            case "Warning" -> "WARN";
            case "Information" -> "INFO";
            default -> "INFO";
        };
    }

    private String detectUnixLogLevel(String line) {
        line = line.toLowerCase();
        if (line.contains("error") || line.contains("failed")) return "ERROR";
        if (line.contains("warn") || line.contains("warning")) return "WARN";
        return "INFO";
    }

    private String mapUnixLogFile(String logFile) {
        if (logFile.contains("auth")) return "AUTHENTICATION";
        if (logFile.contains("syslog")) return "SYSTEM";
        return "OTHER";
    }

    private void saveErrorEvent(String collector, String error) {
        UnifiedSecurityEvent errorEvent = UnifiedSecurityEvent.builder()
                .timestamp(LocalDateTime.now())
                .sourceSystem("COLLECTOR")
                .eventType("COLLECTOR_ERROR")
                .category("SYSTEM")
                .severity("ERROR")
                .normalizedMessage(String.format("收集器 %s 错误: %s", collector, error))
                .isAnomaly(false)
                .build();
        eventRepository.save(errorEvent);
    }

    private String readProcessOutput(Process process) {
        try {
            return String.join("\n", readProcessOutputLines(process));
        } catch (Exception e) {
            log.error("读取进程输出失败", e);
            return null;
        }
    }

    private List<String> readProcessOutputLines(Process process) {
        List<String> lines = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                lines.add(line);
            }
        } catch (Exception e) {
            log.error("读取进程输出行失败", e);
        }
        return lines;
    }

    private LocalDateTime parseWindowsEventTime(String timeStr) {
        try {
            if (timeStr.startsWith("/Date(") && timeStr.endsWith(")/")) {
                // 提取毫秒数：/Date(1762513464541)/
                String millisStr = timeStr.substring(6, timeStr.length() - 3);
                long millis = Long.parseLong(millisStr);
                return Instant.ofEpochMilli(millis)
                        .atZone(ZoneId.systemDefault())
                        .toLocalDateTime();
            } else {
                // 尝试其他格式
                return LocalDateTime.parse(timeStr, DateTimeFormatter.ISO_DATE_TIME);
            }
        } catch (Exception e) {
            log.warn("解析时间格式失败: {}, 使用当前时间", timeStr);
            return LocalDateTime.now();
        }
    }
}