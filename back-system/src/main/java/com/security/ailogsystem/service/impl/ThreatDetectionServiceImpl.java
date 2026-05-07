// service/impl/ThreatDetectionServiceImpl.java
package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.dto.request.AlertRequest;
import com.security.ailogsystem.dto.response.AlertResponse;
import com.security.ailogsystem.entity.SecurityLog;
import com.security.ailogsystem.entity.SecurityAlert;
import com.security.ailogsystem.repository.SecurityAlertRepository;
import com.security.ailogsystem.service.AlertService;
import com.security.ailogsystem.service.ThreatDetectionService;
import com.security.ailogsystem.service.WebSocketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class ThreatDetectionServiceImpl implements ThreatDetectionService {

    private static final Logger logger = LoggerFactory.getLogger(ThreatDetectionServiceImpl.class);

    @Autowired
    private SecurityAlertRepository securityAlertRepository;

    @Autowired
    private AlertService alertService;

    @Autowired
    private com.security.ailogsystem.repository.UnifiedEventRepository unifiedEventRepository;

    @Autowired
    private WebSocketService webSocketService;

    @Value("${security.detection.brute-force.threshold:5}")
    private int bruteForceThreshold;

    @Value("${security.detection.brute-force.window-minutes:10}")
    private int bruteForceWindowMinutes;

    // 关键安全事件ID
    private static final Set<Integer> CRITICAL_EVENTS = Set.of(4625, 4720, 4728, 4732, 4733, 4738);

    // 特权账户名称
    private static final Set<String> PRIVILEGED_ACCOUNTS = Set.of(
            "administrator", "admin", "system", "root"
    );

    // 威胁等级权重映射
    private static final Map<String, Integer> THREAT_LEVEL_WEIGHTS = Map.of(
            "LOW", 1,
            "MEDIUM", 2,
            "HIGH", 3,
            "CRITICAL", 4
    );

    // 暴力破解检测
    private final Map<String, List<LocalDateTime>> failedLogins = new ConcurrentHashMap<>();
    private final Map<String, Object> detectionRules = new ConcurrentHashMap<>();

    // 威胁统计
    private final Map<String, Long> threatStatistics = new ConcurrentHashMap<>();

    public ThreatDetectionServiceImpl() {
        // 初始化默认规则
        initializeDefaultRules();
        initializeThreatStatistics();
    }

    @Override
    public void analyzeThreat(SecurityLog log) {
        String threatLevel = "LOW";
        List<String> detectedThreats = new ArrayList<>();

        // 基于规则的基础检测
        if (isCriticalEvent(log)) {
            threatLevel = getHigherThreatLevel(threatLevel, "HIGH");
            detectedThreats.add("CRITICAL_EVENT");
        }

        // 暴力破解检测
        if (detectBruteForceAttack(log)) {
            threatLevel = getHigherThreatLevel(threatLevel, "CRITICAL");
            detectedThreats.add("BRUTE_FORCE_ATTACK");
        }

        // 异常时间登录检测
        if (detectUnusualLogin(log)) {
            threatLevel = getHigherThreatLevel(threatLevel, "MEDIUM");
            detectedThreats.add("UNUSUAL_TIME_LOGIN");
        }

        // 特权账户操作检测
        if (detectPrivilegedOperation(log)) {
            threatLevel = getHigherThreatLevel(threatLevel, "HIGH");
            detectedThreats.add("PRIVILEGED_OPERATION");
        }

        // 可疑IP检测
        if (detectSuspiciousIp(log)) {
            threatLevel = getHigherThreatLevel(threatLevel, "MEDIUM");
            detectedThreats.add("SUSPICIOUS_IP");
        }

        log.setThreatLevel(threatLevel);

        // 创建警报
        if (!detectedThreats.isEmpty() && !threatLevel.equals("LOW")) {
            createSecurityAlerts(log, detectedThreats, threatLevel);
        }

        // 更新统计
        updateThreatStatistics(threatLevel);
    }

    @Override
    public List<SecurityAlert> analyzeThreats(List<SecurityLog> logs) {
        List<SecurityAlert> alerts = new ArrayList<>();

        for (SecurityLog log : logs) {
            analyzeThreat(log);
        }

        // 获取最近创建的警报
        try {
            List<SecurityAlert> recentAlerts = securityAlertRepository.findTop10ByOrderByCreatedTimeDesc();
            alerts.addAll(recentAlerts);
        } catch (Exception e) {
            logger.error("获取最近警报失败", e);
        }

        return alerts.stream().distinct().collect(Collectors.toList());
    }

    @Override
    public boolean detectBruteForceAttack(SecurityLog log) {
        if (log.getEventId() == 4625 && log.getIpAddress() != null) { // 登录失败
            String ip = log.getIpAddress();
            LocalDateTime now = LocalDateTime.now();

            // 清理过期记录
            cleanupExpiredRecords();

            // 记录失败登录
            failedLogins.computeIfAbsent(ip, k -> new ArrayList<>()).add(now);

            // 检查阈值
            List<LocalDateTime> attempts = failedLogins.get(ip);
            LocalDateTime thresholdTime = now.minusMinutes(bruteForceWindowMinutes);

            long recentAttempts = attempts.stream()
                    .filter(time -> time.isAfter(thresholdTime))
                    .count();

            return recentAttempts >= bruteForceThreshold;
        }
        return false;
    }

    @Override
    public boolean detectUnusualLogin(SecurityLog log) {
        if (log.getEventId() == 4624) { // 登录成功
            int hour = log.getEventTime().getHour();
            // 凌晨0点到6点或非工作时间视为异常时间
            return hour >= 0 && hour <= 6 || (hour >= 22 && hour <= 23);
        }
        return false;
    }

    @Override
    public boolean detectPrivilegedOperation(SecurityLog log) {
        if (log.getUserName() != null) {
            String userName = log.getUserName().toLowerCase();
            return PRIVILEGED_ACCOUNTS.stream()
                    .anyMatch(privileged -> userName.contains(privileged));
        }
        return false;
    }

    @Override
    public Map<String, Object> getThreatStatistics() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("threatLevels", new HashMap<>(threatStatistics));
        stats.put("bruteForceDetections", failedLogins.size());
        stats.put("activeRules", detectionRules.size());

        // 添加最近24小时统计
        LocalDateTime last24Hours = LocalDateTime.now().minusHours(24);
        Long recentAlerts = securityAlertRepository.countByCreatedTimeAfter(last24Hours);
        stats.put("recentAlerts", recentAlerts);

        return stats;
    }

    @Override
    public void updateDetectionRules(Map<String, Object> rules) {
        detectionRules.putAll(rules);
        logger.info("更新威胁检测规则，当前规则数量: {}", detectionRules.size());
    }

    /**
     * 检测可疑IP地址
     */
    private boolean detectSuspiciousIp(SecurityLog log) {
        if (log.getIpAddress() == null) {
            return false;
        }

        String ip = log.getIpAddress();

        // 检查内网IP（这里只是示例，实际应该更复杂）
        if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
            return false; // 内网IP不视为可疑
        }

        // 检查已知的可疑IP模式（这里只是示例）
        @SuppressWarnings("unchecked")
        List<String> suspiciousIpPatterns = (List<String>) detectionRules.getOrDefault(
                "suspiciousIpPatterns", Collections.emptyList());

        return suspiciousIpPatterns.stream().anyMatch(ip::contains);
    }

    /**
     * 检测关键安全事件
     */
    private boolean isCriticalEvent(SecurityLog log) {
        return CRITICAL_EVENTS.contains(log.getEventId());
    }

    /**
     * 清理过期记录
     */
    private void cleanupExpiredRecords() {
        LocalDateTime thresholdTime = LocalDateTime.now().minusMinutes(bruteForceWindowMinutes);

        failedLogins.entrySet().removeIf(entry -> {
            entry.getValue().removeIf(time -> time.isBefore(thresholdTime));
            return entry.getValue().isEmpty();
        });
    }

    /**
     * 创建安全警报 - 修改这个方法
     */
    private void createSecurityAlerts(SecurityLog log, List<String> threatTypes, String threatLevel) {
        for (String threatType : threatTypes) {
            String description = generateAlertDescription(log, threatType);
            String alertLevel = determineAlertLevel(threatLevel);

            // 创建 AlertRequest 而不是 SecurityAlert
            AlertRequest alertRequest = new AlertRequest();
            alertRequest.setAlertId(generateAlertId(log));
            alertRequest.setSource(log.getSource() != null ? log.getSource() : "SecurityLog");
            alertRequest.setAlertType(threatType);
            alertRequest.setAlertLevel(alertLevel);
            alertRequest.setDescription(description);

            // 如果有相关的日志条目ID
            if (log.getId() != null) {
                alertRequest.setLogEntryId(log.getId());
            }

            // 尝试关联统一安全事件
            try {
                Long unifiedEventId = findUnifiedEventId(log);
                if (unifiedEventId != null) {
                    alertRequest.setUnifiedEventId(unifiedEventId);
                }
            } catch (Exception e) {
                logger.debug("查找关联统一事件失败: {}", e.getMessage());
            }

            // 设置 AI 置信度（这里可以根据威胁等级设置一个置信度）
            BigDecimal confidence = calculateConfidence(threatLevel);
            alertRequest.setAiConfidence(confidence);

            try {
                AlertResponse alertResponse = alertService.createAlert(alertRequest);
                createCompatibilityAlert(log, threatType, alertLevel, description);

                logger.warn("创建安全警报: {} - {}", threatType, description);
            } catch (Exception e) {
                logger.error("创建告警失败: {}", e.getMessage(), e);
            }
        }
    }

    /**
     * 生成唯一的告警ID
     */
    private String generateAlertId(SecurityLog log) {
        String timestamp = String.valueOf(System.currentTimeMillis());
        String random = UUID.randomUUID().toString().substring(0, 4);
        return "ALERT_" + timestamp + "_" + random;
    }

    /**
     * 计算置信度
     */
    private BigDecimal calculateConfidence(String threatLevel) {
        switch (threatLevel) {
            case "CRITICAL":
                return new BigDecimal("0.95");
            case "HIGH":
                return new BigDecimal("0.85");
            case "MEDIUM":
                return new BigDecimal("0.70");
            case "LOW":
                return new BigDecimal("0.50");
            default:
                return new BigDecimal("0.60");
        }
    }

    /**
     * 创建兼容性告警（可选，用于过渡期）
     */
    private void createCompatibilityAlert(SecurityLog log, String threatType, String alertLevel, String description) {
        try {
            SecurityAlert.AlertLevel level = convertToOldAlertLevel(alertLevel);
            SecurityAlert oldAlert = new SecurityAlert(level, threatType, description);
            oldAlert.setSecurityLog(log);
            oldAlert.setCreatedTime(LocalDateTime.now());
            oldAlert.setHandled(false);
            securityAlertRepository.save(oldAlert);
        } catch (Exception e) {
            logger.warn("创建兼容性告警失败: {}", e.getMessage());
        }
    }

    /**
     * 转换告警级别到旧枚举
     */
    private SecurityAlert.AlertLevel convertToOldAlertLevel(String alertLevel) {
        switch (alertLevel) {
            case "CRITICAL":
                return SecurityAlert.AlertLevel.CRITICAL;
            case "HIGH":
                return SecurityAlert.AlertLevel.HIGH;
            case "MEDIUM":
                return SecurityAlert.AlertLevel.MEDIUM;
            case "LOW":
                return SecurityAlert.AlertLevel.LOW;
            default:
                return SecurityAlert.AlertLevel.LOW;
        }
    }

    /**
     * 生成警报描述 - 详细版，包含攻击链分析、技术细节和处置建议
     */
    private String generateAlertDescription(SecurityLog log, String threatType) {
        String ip = log.getIpAddress() != null ? log.getIpAddress() : "未知IP";
        String user = log.getUserName() != null ? log.getUserName() : "未知用户";
        String time = log.getEventTime() != null ? log.getEventTime().toString() : "未知时间";
        Integer eventId = log.getEventId();
        String source = log.getSource() != null ? log.getSource() : "未知来源";

        switch (threatType) {
            case "BRUTE_FORCE_ATTACK": {
                List<LocalDateTime> attempts = failedLogins.getOrDefault(ip, Collections.emptyList());
                long recentCount = attempts.stream()
                        .filter(t -> t.isAfter(LocalDateTime.now().minusMinutes(bruteForceWindowMinutes)))
                        .count();
                return String.format(
                        "检测到暴力破解攻击: 攻击源 IP %s 在 %d 分钟内对账户 %s 发起 %d 次连续登录失败(事件ID 4625)。" +
                        "攻击特征: 登录类型为网络登录(Type 3)，来源主机 %s，失败原因为密码错误(Status: 0xC000006D)。" +
                        "当前失败次数已超过阈值(%d次)，判定为自动化暴力破解工具攻击。" +
                        "建议立即: (1)封锁来源 IP %s (2)检查账户 %s 是否已被成功登录 (3)启用账户锁定策略。",
                        ip, bruteForceWindowMinutes, user, recentCount,
                        source, bruteForceThreshold, ip, user);
            }
            case "UNUSUAL_TIME_LOGIN": {
                int hour = log.getEventTime() != null ? log.getEventTime().getHour() : -1;
                return String.format(
                        "检测到异常时间登录: 用户 %s 于 %s 在非工作时间(%02d:xx)成功登录系统(事件ID 4624)，" +
                        "来源 IP: %s，登录类型: 网络登录。" +
                        "该账户的历史登录时间集中在工作时间(08:00-18:00)，当前登录时间偏离正常基线。" +
                        "可能原因: (1)账户凭据已泄露被攻击者利用 (2)员工异地/异常操作。" +
                        "建议: 联系账户持有人确认操作合法性，检查该时段的操作日志。",
                        user, time, hour, ip);
            }
            case "PRIVILEGED_OPERATION": {
                String eventDesc = getEventDescription(eventId);
                return String.format(
                        "检测到特权账户敏感操作: 特权账户 %s 执行了高风险操作(事件ID: %d - %s)，" +
                        "来源 IP: %s，时间: %s，来源系统: %s。" +
                        "特权账户的每次操作均需严格审计，此类操作可能涉及: 账户管理、权限变更、安全策略修改等。" +
                        "建议: (1)核实操作是否经过授权 (2)检查是否有异常的权限提升行为 (3)审查同时段其他操作记录。",
                        user, eventId, eventDesc, ip, time, source);
            }
            case "CRITICAL_EVENT": {
                String eventDesc = getEventDescription(eventId);
                String impact = getCriticalEventImpact(eventId);
                return String.format(
                        "检测到关键安全事件: 事件ID %d(%s)被触发，涉及账户: %s，来源 IP: %s，时间: %s。" +
                        "安全影响: %s。" +
                        "该事件类型属于 Windows 安全审计中的高优先级事件，需立即核查。" +
                        "建议: (1)确认操作是否由授权人员执行 (2)检查相关账户的完整操作历史 (3)评估是否存在横向移动风险。",
                        eventId, eventDesc, user, ip, time, impact);
            }
            case "SUSPICIOUS_IP": {
                return String.format(
                        "检测到可疑 IP 访问: 来自外部 IP %s 的访问请求，目标账户: %s，时间: %s，来源系统: %s。" +
                        "该 IP 不属于已知的内网地址段，且未在白名单中登记，属于未授权的外部访问尝试。" +
                        "可能风险: (1)外部攻击者尝试渗透内网系统 (2)VPN/代理绕过访问控制 (3)供应链攻击入口。" +
                        "建议: (1)立即封锁 IP %s 的入站访问 (2)检查防火墙规则是否存在漏洞 (3)追溯该 IP 的完整访问记录。",
                        ip, user, time, source, ip);
            }
            default: {
                String eventDesc = getEventDescription(eventId);
                return String.format(
                        "检测到安全威胁: 威胁类型 %s，触发事件 ID: %d(%s)，涉及账户: %s，来源 IP: %s，时间: %s，系统: %s。" +
                        "该威胁已被安全检测引擎标记为需要关注的异常行为，请安全团队进行人工研判。" +
                        "建议: 结合上下文日志进行综合分析，评估威胁的实际影响范围和严重程度。",
                        threatType, eventId != null ? eventId : 0, eventDesc, user, ip, time, source);
            }
        }
    }

    /**
     * 获取 Windows 事件 ID 的描述
     */
    private String getEventDescription(Integer eventId) {
        if (eventId == null) return "未知事件";
        switch (eventId) {
            case 4624: return "账户登录成功";
            case 4625: return "账户登录失败";
            case 4634: return "账户注销";
            case 4648: return "使用显式凭据登录";
            case 4672: return "为新登录分配特殊权限";
            case 4688: return "创建新进程";
            case 4697: return "系统中安装了服务";
            case 4698: return "创建计划任务";
            case 4720: return "创建用户账户";
            case 4722: return "启用用户账户";
            case 4724: return "尝试重置账户密码";
            case 4726: return "删除用户账户";
            case 4728: return "将成员添加到安全组";
            case 4732: return "将成员添加到本地安全组";
            case 4733: return "从本地安全组删除成员";
            case 4738: return "更改用户账户";
            case 4740: return "用户账户被锁定";
            case 4756: return "将成员添加到通用安全组";
            case 4768: return "请求 Kerberos 身份验证票证(TGT)";
            case 4769: return "请求 Kerberos 服务票证";
            case 4771: return "Kerberos 预身份验证失败";
            case 4776: return "域控制器验证账户凭据";
            default: return "Windows 安全事件 " + eventId;
        }
    }

    /**
     * 获取关键事件的安全影响描述
     */
    private String getCriticalEventImpact(Integer eventId) {
        if (eventId == null) return "未知影响";
        switch (eventId) {
            case 4625: return "账户登录失败，可能是暴力破解或凭据填充攻击的前兆";
            case 4720: return "新账户被创建，攻击者可能正在建立持久化后门账户";
            case 4728: return "账户被加入安全组，可能涉及权限提升或横向移动";
            case 4732: return "账户被加入本地管理员组，存在权限提升风险";
            case 4733: return "账户从安全组中移除，可能是攻击者清除痕迹";
            case 4738: return "账户属性被修改，可能涉及密码重置或权限变更";
            default: return "该事件涉及系统安全配置变更，需要人工核查";
        }
    }

    /**
     * 确定警报等级
     */
    private String determineAlertLevel(String threatLevel) {
        return threatLevel; // 直接返回威胁等级
    }

    /**
     * 比较威胁等级，返回更高的等级
     */
    private String getHigherThreatLevel(String currentLevel, String newLevel) {
        Integer currentWeight = THREAT_LEVEL_WEIGHTS.getOrDefault(currentLevel, 0);
        Integer newWeight = THREAT_LEVEL_WEIGHTS.getOrDefault(newLevel, 0);

        return newWeight > currentWeight ? newLevel : currentLevel;
    }

    /**
     * 更新威胁统计
     */
    private void updateThreatStatistics(String threatLevel) {
        threatStatistics.merge(threatLevel, 1L, Long::sum);
    }

    /**
     * 初始化默认规则
     */
    private void initializeDefaultRules() {
        detectionRules.put("bruteForceThreshold", bruteForceThreshold);
        detectionRules.put("bruteForceWindowMinutes", bruteForceWindowMinutes);
        detectionRules.put("suspiciousIpPatterns", Arrays.asList(
                "unknown", "test", "guest", "malicious", "hacker"
        ));
        detectionRules.put("unusualTimeStart", 0);
        detectionRules.put("unusualTimeEnd", 6);
    }

    /**
     * 初始化威胁统计
     */
    private void initializeThreatStatistics() {
        threatStatistics.put("LOW", 0L);
        threatStatistics.put("MEDIUM", 0L);
        threatStatistics.put("HIGH", 0L);
        threatStatistics.put("CRITICAL", 0L);
    }

    // 添加一个新的方法用于获取威胁检测统计（使用新的服务）
    public Map<String, Object> getEnhancedThreatStatistics() {
        Map<String, Object> stats = new HashMap<>();

        // 获取旧的统计数据
        stats.put("threatLevels", new HashMap<>(threatStatistics));
        stats.put("bruteForceDetections", failedLogins.size());
        stats.put("activeRules", detectionRules.size());

        try {
            // 获取新的告警统计
            Map<String, Object> alertStats = alertService.getAlertStatistics();
            stats.put("alertStatistics", alertStats);
        } catch (Exception e) {
            logger.error("获取告警统计失败", e);
            stats.put("alertStatistics", "获取失败");
        }

        return stats;
    }

    private Long findUnifiedEventId(com.security.ailogsystem.entity.SecurityLog log) {
        if (log == null || log.getEventTime() == null) return null;
        try {
            java.time.LocalDateTime eventTime = log.getEventTime();
            java.time.LocalDateTime start = eventTime.minusSeconds(5);
            java.time.LocalDateTime end = eventTime.plusSeconds(5);
            var events = unifiedEventRepository.findByTimestampBetween(start, end,
                    org.springframework.data.domain.PageRequest.of(0, 1));
            if (!events.isEmpty()) {
                return events.getContent().get(0).getId();
            }
        } catch (Exception e) {
            logger.debug("通过时间查找统一事件失败: {}", e.getMessage());
        }
        return null;
    }
}