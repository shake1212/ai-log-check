package com.security.ailogsystem.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.security.ailogsystem.config.ScriptProperties;
import com.security.ailogsystem.dto.ScriptDescriptor;
import com.security.ailogsystem.dto.ScriptExecutionRecord;
import com.security.ailogsystem.dto.ScriptRunResponse;
import com.security.ailogsystem.dto.ScriptStatus;
import com.security.ailogsystem.dto.ScheduledTaskStatus;
import com.security.ailogsystem.dto.UnifiedSecurityEventDTO;
import com.security.ailogsystem.service.ScriptExecutionService;
import com.security.ailogsystem.service.UnifiedEventService;
import com.security.ailogsystem.service.WebSocketService;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScriptExecutionServiceImpl implements ScriptExecutionService {

    private static final int MAX_HISTORY_SIZE = 20;
    private static final int MAX_OUTPUT_CHARS = 4096;

    private final ScriptProperties scriptProperties;
    private final ApplicationEventPublisher eventPublisher;
    private final UnifiedEventService unifiedEventService;
    private final WebSocketService webSocketService;
    private final ObjectMapper objectMapper;

    private final ExecutorService executorService = Executors.newCachedThreadPool();
    private final Deque<ScriptExecutionRecord> history = new ArrayDeque<>();
    private final Map<String, Semaphore> scriptSemaphores = new ConcurrentHashMap<>();
    private final Map<String, Instant> lastTriggerAt = new ConcurrentHashMap<>();

    @Override
    public ScriptRunResponse triggerScript(String scriptKey, List<String> args) {
        ScriptProperties.ScriptDefinition definition = scriptProperties.getAllowed().get(scriptKey);
        if (definition == null) {
            throw new IllegalStateException("未找到脚本: " + scriptKey);
        }
        if (!definition.isAllowManualTrigger()) {
            throw new IllegalStateException("脚本禁止手动触发: " + scriptKey);
        }

        Semaphore semaphore = scriptSemaphores.computeIfAbsent(scriptKey, key ->
                new Semaphore((int) Math.max(1, definition.getMaxParallel()), true));

        List<String> effectiveArgs = args == null ? Collections.emptyList() : args;

        if (!semaphore.tryAcquire()) {
            return ScriptRunResponse.builder()
                    .scriptKey(scriptKey)
                    .scriptName(definition.getName())
                    .status(ScriptStatus.BUSY)
                    .message("脚本正在运行，请稍后再试")
                    .args(new ArrayList<>(effectiveArgs))
                    .build();
        }

        try {
            Instant now = Instant.now();
            Instant lastRun = lastTriggerAt.get(scriptKey);
            long cooldownSeconds = Math.max(0, definition.getCooldownSeconds());
            if (lastRun != null && Duration.between(lastRun, now).getSeconds() < cooldownSeconds) {
                long waitSeconds = cooldownSeconds - Duration.between(lastRun, now).getSeconds();
                semaphore.release();
                return ScriptRunResponse.builder()
                        .scriptKey(scriptKey)
                        .scriptName(definition.getName())
                        .status(ScriptStatus.COOLDOWN)
                        .message(String.format("脚本冷却中，请 %d 秒后重试", waitSeconds))
                        .args(new ArrayList<>(effectiveArgs))
                        .build();
            }

            lastTriggerAt.put(scriptKey, now);

            ScriptExecutionRecord record = ScriptExecutionRecord.builder()
                    .executionId(UUID.randomUUID().toString())
                    .scriptKey(scriptKey)
                    .scriptName(definition.getName())
                    .status(ScriptStatus.RUNNING)
                    .startedAt(LocalDateTime.now())
                    .triggerType("manual")
                    .message("脚本执行中")
                    .args(new ArrayList<>(effectiveArgs))
                    .build();
            addToHistory(record);

            executorService.submit(() -> executeScript(definition, effectiveArgs, record, semaphore));

            return ScriptRunResponse.builder()
                    .executionId(record.getExecutionId())
                    .scriptKey(scriptKey)
                    .scriptName(definition.getName())
                    .status(ScriptStatus.RUNNING)
                    .message("脚本已启动")
                    .startedAt(record.getStartedAt())
                    .args(new ArrayList<>(effectiveArgs))
                    .build();
        } catch (RuntimeException ex) {
            semaphore.release();
            throw ex;
        }
    }

    private void executeScript(ScriptProperties.ScriptDefinition definition,
                               List<String> args,
                               ScriptExecutionRecord record,
                               Semaphore semaphore) {
        try {
            Path scriptPath = resolveScriptPath(definition.getFile());
            if (!Files.exists(scriptPath)) {
                throw new IllegalStateException("脚本文件不存在: " + scriptPath);
            }

            List<String> command = new ArrayList<>();
            command.add(resolvePythonExecutable());
            command.add(scriptPath.toString());

            if (!CollectionUtils.isEmpty(definition.getDefaultArgs())) {
                command.addAll(definition.getDefaultArgs());
            }
            if (!CollectionUtils.isEmpty(args)) {
                command.addAll(args);
            }

            log.info("执行脚本: {}", String.join(" ", command));

            ProcessBuilder processBuilder = new ProcessBuilder(command);
            processBuilder.directory(resolveScriptDirectory().toFile());
            processBuilder.redirectErrorStream(true);

            Process process = processBuilder.start();
            String output = readProcessOutput(process);
            int exitCode = process.waitFor();

            record.setFinishedAt(LocalDateTime.now());
            record.setExitCode(exitCode);
            record.setOutputSnippet(truncateOutput(output));
            boolean success = exitCode == 0;
            record.setStatus(success ? ScriptStatus.SUCCESS : ScriptStatus.FAILED);
            record.setMessage(success ? "脚本执行成功" : "脚本执行失败");

            log.info("脚本 {} 执行完成，退出码: {}", definition.getName(), exitCode);
            if (success) {
                processScriptOutput(definition, record, output);
            } else {
                publishScriptEvent(definition, record, output, true);
            }
        } catch (Exception e) {
            record.setFinishedAt(LocalDateTime.now());
            record.setStatus(ScriptStatus.FAILED);
            record.setMessage(e.getMessage());
            log.error("脚本 {} 执行失败: {}", definition.getName(), e.getMessage(), e);
        } finally {
            semaphore.release();
        }
    }

    @Override
    public Collection<ScriptDescriptor> getAvailableScripts() {
        return scriptProperties.getAllowed().entrySet().stream()
                .map(entry -> ScriptDescriptor.builder()
                        .key(entry.getKey())
                        .name(entry.getValue().getName())
                        .description(entry.getValue().getDescription())
                        .cooldownSeconds(entry.getValue().getCooldownSeconds())
                        .allowManualTrigger(entry.getValue().isAllowManualTrigger())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<ScriptExecutionRecord> getRecentExecutions() {
        synchronized (history) {
            return new ArrayList<>(history);
        }
    }

    private void addToHistory(ScriptExecutionRecord record) {
        synchronized (history) {
            history.addFirst(record);
            truncateHistoryIfNeeded();
        }
    }

    private void truncateHistoryIfNeeded() {
        synchronized (history) {
            while (history.size() > MAX_HISTORY_SIZE) {
                history.removeLast();
            }
        }
    }

    private Path resolveScriptDirectory() {
        return Paths.get(scriptProperties.getBasePath()).toAbsolutePath().normalize();
    }

    private Path resolveScriptPath(String fileName) {
        return resolveScriptDirectory().resolve(fileName).normalize();
    }

    private String resolvePythonExecutable() {
        return scriptProperties.getPython().getExecutable() == null
                ? "python"
                : scriptProperties.getPython().getExecutable();
    }

    private String readProcessOutput(Process process) {
        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append(System.lineSeparator());
            }
        } catch (Exception e) {
            log.warn("读取脚本输出失败: {}", e.getMessage());
        }
        return output.toString();
    }

    private String truncateOutput(String output) {
        if (output == null) {
            return null;
        }
        return output.length() <= MAX_OUTPUT_CHARS
                ? output
                : output.substring(0, MAX_OUTPUT_CHARS) + "...";
    }

    private void processScriptOutput(ScriptProperties.ScriptDefinition definition,
                                     ScriptExecutionRecord record,
                                     String output) {
        if (!StringUtils.hasText(output)) {
            log.debug("脚本 {} 无输出，跳过事件解析", definition.getName());
            return;
        }

        try {
            List<UnifiedSecurityEventDTO> events = extractEventsFromOutput(output, definition, record);
            if (events.isEmpty()) {
                publishScriptEvent(definition, record, output, false);
                return;
            }

            List<UnifiedSecurityEventDTO> savedEvents = unifiedEventService.createEvents(events);
            webSocketService.sendSystemNotification(
                    String.format("脚本 %s 生成 %d 条安全事件", definition.getName(), savedEvents.size()),
                    "info");
            log.info("脚本 {} 输出已转换为 {} 条安全事件", definition.getName(), savedEvents.size());
        } catch (Exception e) {
            log.warn("解析脚本 {} 输出失败，将输出作为普通事件处理: {}", definition.getName(), e.getMessage());
            publishScriptEvent(definition, record, output, false);
        }
    }

    private void publishScriptEvent(ScriptProperties.ScriptDefinition definition,
                                    ScriptExecutionRecord record,
                                    String output,
                                    boolean isError) {
        UnifiedSecurityEventDTO event = buildFallbackEvent(definition, record, output, isError);
        unifiedEventService.createEvent(event);
        webSocketService.sendSystemNotification(event.getNormalizedMessage(), isError ? "error" : "info");
    }

    private List<UnifiedSecurityEventDTO> extractEventsFromOutput(String output,
                                                                  ScriptProperties.ScriptDefinition definition,
                                                                  ScriptExecutionRecord record) {
        List<JsonNode> nodes = parseJsonNodes(output);
        if (nodes.isEmpty()) {
            return Collections.emptyList();
        }

        return nodes.stream()
                .map(node -> buildEventFromNode(node, definition, record))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private List<JsonNode> parseJsonNodes(String output) {
        List<JsonNode> nodes = new ArrayList<>();
        if (!StringUtils.hasText(output)) {
            return nodes;
        }

        try {
            JsonNode root = objectMapper.readTree(output);
            collectNodes(root, nodes);
            if (!nodes.isEmpty()) {
                return nodes;
            }
        } catch (Exception ignored) {
            // fallback to line-by-line parsing
        }

        output.lines()
                .map(String::trim)
                .filter(StringUtils::hasText)
                .forEach(line -> {
                    try {
                        JsonNode node = objectMapper.readTree(line);
                        collectNodes(node, nodes);
                    } catch (Exception ignored) {
                    }
                });
        return nodes;
    }

    private void collectNodes(JsonNode node, List<JsonNode> nodes) {
        if (node == null || node.isNull()) {
            return;
        }
        if (node.isArray()) {
            node.forEach(child -> collectNodes(child, nodes));
            return;
        }
        if (node.has("events") && node.get("events").isArray()) {
            node.get("events").forEach(child -> collectNodes(child, nodes));
            return;
        }
        if (node.has("data") && node.get("data").isArray()) {
            node.get("data").forEach(child -> collectNodes(child, nodes));
            return;
        }
        nodes.add(node);
    }

    private UnifiedSecurityEventDTO buildEventFromNode(JsonNode node,
                                                       ScriptProperties.ScriptDefinition definition,
                                                       ScriptExecutionRecord record) {
        try {
            LocalDateTime timestamp = extractTimestamp(node);
            Map<String, Object> payload = objectMapper.convertValue(node, new TypeReference<>() {});
            Map<String, Double> features = null;
            if (node.has("features") && node.get("features").isObject()) {
                features = objectMapper.convertValue(node.get("features"), new TypeReference<>() {});
            }

            Map<String, Object> eventData = prepareEventData(payload);
            addScriptMetadata(eventData, record);

            return UnifiedSecurityEventDTO.builder()
                    .timestamp(timestamp != null ? timestamp : LocalDateTime.now())
                    .sourceSystem(node.path("sourceSystem").asText(definition.getName()))
                    .eventType(node.path("eventType").asText(definition.getName()))
                    .category(node.path("category").asText("SCRIPT"))
                    .severity(node.path("severity").asText("INFO"))
                    .rawMessage(node.path("rawMessage").asText(record.getMessage()))
                    .normalizedMessage(node.path("normalizedMessage")
                            .asText(String.format("脚本 %s 输出", definition.getName())))
                    .hostIp(node.path("hostIp").asText(null))
                    .hostName(node.path("hostName").asText(null))
                    .userId(node.path("userId").asText(null))
                    .userName(node.path("userName").asText(null))
                    .sessionId(node.path("sessionId").asText(null))
                    .processId(node.path("processId").isNumber() ? node.get("processId").asInt() : null)
                    .processName(node.path("processName").asText(null))
                    .threadId(node.path("threadId").isNumber() ? node.get("threadId").asInt() : null)
                    .sourceIp(node.path("sourceIp").asText(null))
                    .sourcePort(node.path("sourcePort").isNumber() ? node.get("sourcePort").asInt() : null)
                    .destinationIp(node.path("destinationIp").asText(null))
                    .destinationPort(node.path("destinationPort").isNumber() ? node.get("destinationPort").asInt() : null)
                    .protocol(node.path("protocol").asText(null))
                    .eventCode(node.path("eventCode").isInt() ? node.get("eventCode").asInt() : null)
                    .eventSubType(node.path("eventSubType").asText(null))
                    .isAnomaly(node.path("isAnomaly").asBoolean(false))
                    .anomalyScore(node.path("anomalyScore").isNumber() ? node.get("anomalyScore").asDouble() : null)
                    .anomalyReason(node.path("anomalyReason").asText(null))
                    .detectionAlgorithm(node.path("detectionAlgorithm").asText(null))
                    .threatLevel(node.path("threatLevel").asText("LOW"))
                    .status(node.path("status").asText("NEW"))
                    .rawData(node.toString())
                    .eventData(eventData)
                    .features(features)
                    .build();
        } catch (Exception e) {
            log.debug("无法将脚本输出节点转换为事件: {}", e.getMessage());
            return null;
        }
    }

    private UnifiedSecurityEventDTO buildFallbackEvent(ScriptProperties.ScriptDefinition definition,
                                                       ScriptExecutionRecord record,
                                                       String output,
                                                       boolean isError) {
        Map<String, Object> eventData = new HashMap<>();
        addScriptMetadata(eventData, record);
        eventData.put("exitCode", record.getExitCode());
        eventData.put("status", record.getStatus());

        String normalizedMessage = isError
                ? String.format("脚本 %s 执行失败", definition.getName())
                : String.format("脚本 %s 输出已记录", definition.getName());

        return UnifiedSecurityEventDTO.builder()
                .timestamp(LocalDateTime.now())
                .sourceSystem(definition.getName())
                .eventType(isError ? "SCRIPT_EXECUTION_FAILURE" : "SCRIPT_EXECUTION_RESULT")
                .category("SCRIPT")
                .severity(isError ? "ERROR" : "INFO")
                .rawMessage(truncateOutput(output))
                .normalizedMessage(normalizedMessage)
                .eventData(eventData)
                .rawData(output)
                .build();
    }

    private Map<String, Object> prepareEventData(Map<String, Object> payload) {
        if (payload == null) {
            return new HashMap<>();
        }
        Map<String, Object> eventData = new LinkedHashMap<>(payload);
        Set<String> reserved = Set.of(
                "timestamp", "sourceSystem", "eventType", "category", "severity",
                "rawMessage", "normalizedMessage", "hostIp", "hostName", "userId", "userName",
                "sessionId", "processId", "processName", "threadId", "sourceIp", "sourcePort",
                "destinationIp", "destinationPort", "protocol", "eventCode", "eventSubType",
                "isAnomaly", "anomalyScore", "anomalyReason", "detectionAlgorithm",
                "threatLevel", "status", "features", "eventData", "rawData"
        );
        reserved.forEach(eventData::remove);
        return eventData;
    }

    private void addScriptMetadata(Map<String, Object> eventData, ScriptExecutionRecord record) {
        if (eventData == null) {
            return;
        }
        eventData.putIfAbsent("scriptKey", record.getScriptKey());
        eventData.putIfAbsent("scriptName", record.getScriptName());
        eventData.putIfAbsent("executionId", record.getExecutionId());
    }

    private LocalDateTime extractTimestamp(JsonNode node) {
        if (node == null || !node.has("timestamp")) {
            return null;
        }
        JsonNode tsNode = node.get("timestamp");
        if (tsNode.isNumber()) {
            long epochValue = tsNode.asLong();
            Instant instant = epochValue > 3_000_000_000L
                    ? Instant.ofEpochMilli(epochValue)
                    : Instant.ofEpochSecond(epochValue);
            return LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
        }
        String text = tsNode.asText(null);
        if (!StringUtils.hasText(text)) {
            return null;
        }
        try {
            return LocalDateTime.parse(text);
        } catch (DateTimeParseException e) {
            try {
                Instant instant = Instant.parse(text);
                return LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
            } catch (Exception ignored) {
                try {
                    long epoch = Long.parseLong(text);
                    Instant instant = epoch > 3_000_000_000L
                            ? Instant.ofEpochMilli(epoch)
                            : Instant.ofEpochSecond(epoch);
                    return LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
                } catch (Exception ignored2) {
                    return null;
                }
            }
        }
    }

    @Override
    public ScheduledTaskStatus getScheduledTaskStatus(String taskName) {
        ScheduledTaskStatus.ScheduledTaskStatusBuilder builder = ScheduledTaskStatus.builder()
                .taskName(taskName)
                .exists(false);

        try {
            // 使用 schtasks 命令查询任务状态
            ProcessBuilder processBuilder = new ProcessBuilder(
                    "schtasks", "/query", "/tn", taskName, "/fo", "LIST", "/v"
            );
            processBuilder.redirectErrorStream(true);
            Process process = processBuilder.start();

            String output = readProcessOutput(process);
            int exitCode = process.waitFor();

            if (exitCode == 0 && StringUtils.hasText(output)) {
                builder.exists(true);
                parseTaskStatus(output, builder);
            } else {
                builder.error("任务不存在或查询失败");
            }
        } catch (Exception e) {
            log.error("查询计划任务状态失败: {}", e.getMessage(), e);
            builder.error("查询失败: " + e.getMessage());
        }

        return builder.build();
    }

    @Override
    public List<ScheduledTaskStatus> getAllScheduledTaskStatuses() {
        // 定义我们关心的任务名称
        List<String> taskNames = List.of(
                "AI-Log System Info Collector"
        );

        return taskNames.stream()
                .map(this::getScheduledTaskStatus)
                .collect(Collectors.toList());
    }

    private void parseTaskStatus(String output, ScheduledTaskStatus.ScheduledTaskStatusBuilder builder) {
        try {
            // 解析 schtasks 输出
            String[] lines = output.split("\r?\n");
            for (String line : lines) {
                line = line.trim();
                if (line.startsWith("状态:")) {
                    String status = line.substring(line.indexOf(':') + 1).trim();
                    builder.status(status);
                } else if (line.startsWith("下次运行时间:") || line.contains("下次运行时间")) {
                    String timeStr = extractTime(line);
                    if (timeStr != null) {
                        builder.nextRunTime(parseWindowsDateTime(timeStr));
                    }
                } else if (line.startsWith("上次运行时间:") || line.contains("上次运行时间")) {
                    String timeStr = extractTime(line);
                    if (timeStr != null) {
                        builder.lastRunTime(parseWindowsDateTime(timeStr));
                    }
                } else if (line.startsWith("上次运行结果:") || line.contains("上次运行结果")) {
                    String result = line.substring(line.indexOf(':') + 1).trim();
                    builder.lastRunResult(result);
                } else if (line.startsWith("触发器:") || line.contains("触发器")) {
                    String trigger = line.substring(line.indexOf(':') + 1).trim();
                    builder.trigger(trigger);
                } else if (line.startsWith("任务路径:") || line.contains("任务路径")) {
                    String path = line.substring(line.indexOf(':') + 1).trim();
                    builder.taskPath(path);
                }
            }
        } catch (Exception e) {
            log.warn("解析任务状态失败: {}", e.getMessage());
        }
    }

    private String extractTime(String line) {
        // 尝试提取时间字符串，格式可能是 "2025/11/21 20:00:00" 或 "N/A"
        int colonIndex = line.indexOf(':');
        if (colonIndex < 0) {
            return null;
        }
        String timeStr = line.substring(colonIndex + 1).trim();
        if (timeStr.equalsIgnoreCase("N/A") || timeStr.isEmpty()) {
            return null;
        }
        return timeStr;
    }

    private LocalDateTime parseWindowsDateTime(String timeStr) {
        try {
            // Windows schtasks 输出格式: "2025/11/21 20:00:00" 或 "2025-11-21 20:00:00"
            timeStr = timeStr.replace('/', '-');
            // 尝试多种格式
            String[] formats = {
                    "yyyy-MM-dd HH:mm:ss",
                    "yyyy-MM-dd HH:mm",
                    "MM/dd/yyyy HH:mm:ss",
                    "MM/dd/yyyy HH:mm"
            };
            for (String format : formats) {
                try {
                    java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern(format);
                    return LocalDateTime.parse(timeStr, formatter);
                } catch (Exception ignored) {
                }
            }
        } catch (Exception e) {
            log.debug("解析时间失败: {}", timeStr);
        }
        return null;
    }

    @PreDestroy
    public void shutdown() {
        executorService.shutdownNow();
    }
}

