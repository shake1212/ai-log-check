// src/main/java/com/security/ailogsystem/service/impl/AnalysisServiceImpl.java
package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.dto.SecurityAnalysisItemDTO;
import com.security.ailogsystem.dto.ThreatIntelItemDTO;
import com.security.ailogsystem.repository.AlertRepository;
import com.security.ailogsystem.repository.SecurityLogRepository;
import com.security.ailogsystem.service.AnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalysisServiceImpl implements AnalysisService {
    private final SecurityLogRepository securityLogRepository;
    private final AlertRepository alertRepository;

    @Override
    public List<SecurityAnalysisItemDTO> getSecurityAnalyses() {
        log.info("获取安全分析数据");
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        long critical = Optional.ofNullable(securityLogRepository.countByThreatLevelAndEventTimeAfter("CRITICAL", since)).orElse(0L);
        long high = Optional.ofNullable(securityLogRepository.countByThreatLevelAndEventTimeAfter("HIGH", since)).orElse(0L);
        long medium = Optional.ofNullable(securityLogRepository.countByThreatLevelAndEventTimeAfter("MEDIUM", since)).orElse(0L);
        long failedLogins = Optional.ofNullable(securityLogRepository.countByEventIdAndEventTimeBetween(4625, since, LocalDateTime.now())).orElse(0L);

        List<SecurityAnalysisItemDTO> analyses = new ArrayList<>();
        analyses.add(new SecurityAnalysisItemDTO(
                UUID.randomUUID().toString(),
                "anomaly_detection",
                "异常登录检测",
                "基于最近7天登录失败事件进行风险分析",
                (int) Math.min(100, failedLogins),
                List.of("近7天登录失败次数: " + failedLogins),
                List.of("启用双因素认证", "锁定高频失败来源IP"),
                LocalDateTime.now().minusHours(1),
                LocalDateTime.now().plusHours(1),
                "completed"
        ));
        analyses.add(new SecurityAnalysisItemDTO(
                UUID.randomUUID().toString(),
                "threat_hunting",
                "威胁狩猎分析",
                "基于高危威胁等级日志发现潜在攻击行为",
                (int) Math.min(100, high + critical),
                List.of("HIGH事件: " + high, "CRITICAL事件: " + critical),
                List.of("优先排查CRITICAL事件来源", "关联分析相同IP行为"),
                LocalDateTime.now().minusHours(1),
                LocalDateTime.now().plusHours(2),
                "completed"
        ));
        analyses.add(new SecurityAnalysisItemDTO(
                UUID.randomUUID().toString(),
                "risk_assessment",
                "风险评估报告",
                "基于日志与告警总量计算整体风险",
                (int) Math.min(100, medium + high + critical),
                List.of("MEDIUM事件: " + medium, "总告警数: " + alertRepository.count()),
                List.of("降低中危积压事件", "优化安全规则准确率"),
                LocalDateTime.now().minusHours(2),
                LocalDateTime.now().plusDays(1),
                "completed"
        ));
        return analyses;
    }

    @Override
    public SecurityAnalysisItemDTO runThreatAnalysis() {
        log.info("运行威胁分析");
        // 实际执行威胁分析的逻辑
        return new SecurityAnalysisItemDTO(
                UUID.randomUUID().toString(),
                "threat_hunting",
                "实时威胁分析",
                "执行实时威胁分析任务",
                0,
                new ArrayList<>(),
                new ArrayList<>(),
                LocalDateTime.now(),
                LocalDateTime.now().plusDays(1),
                "running"
        );
    }

    @Override
    public SecurityAnalysisItemDTO runComplianceScan() {
        log.info("运行合规扫描");
        // 实际执行合规扫描的逻辑
        return new SecurityAnalysisItemDTO(
                UUID.randomUUID().toString(),
                "compliance",
                "合规性扫描",
                "执行合规性检查扫描",
                0,
                new ArrayList<>(),
                new ArrayList<>(),
                LocalDateTime.now(),
                LocalDateTime.now().plusDays(1),
                "running"
        );
    }

    @Override
    public SecurityAnalysisItemDTO runAnomalyDetection() {
        log.info("运行异常检测");
        // 实际执行异常检测的逻辑
        return new SecurityAnalysisItemDTO(
                UUID.randomUUID().toString(),
                "anomaly_detection",
                "异常行为检测",
                "检测系统中的异常行为",
                0,
                new ArrayList<>(),
                new ArrayList<>(),
                LocalDateTime.now(),
                LocalDateTime.now().plusDays(1),
                "running"
        );
    }

    @Override
    public Map<String, Object> getAnalysisStats() {
        log.info("获取分析统计");

        List<SecurityAnalysisItemDTO> analyses = getSecurityAnalyses();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalAnalyses", analyses.size());
        stats.put("completed", analyses.stream().filter(a -> "completed".equals(a.getStatus())).count());
        stats.put("running", analyses.stream().filter(a -> "running".equals(a.getStatus())).count());
        stats.put("highRiskCount", analyses.stream().filter(a -> a.getRiskScore() >= 80).count());
        stats.put("avgRiskScore", analyses.stream().mapToInt(SecurityAnalysisItemDTO::getRiskScore).average().orElse(0));
        stats.put("lastRun", LocalDateTime.now().minusHours(2));

        return stats;
    }

    @Override
    public List<ThreatIntelItemDTO> getThreatIntelligence() {
        log.info("获取威胁情报数据");
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        long critical = Optional.ofNullable(securityLogRepository.countByThreatLevelAndEventTimeAfter("CRITICAL", since)).orElse(0L);
        long high = Optional.ofNullable(securityLogRepository.countByThreatLevelAndEventTimeAfter("HIGH", since)).orElse(0L);
        long medium = Optional.ofNullable(securityLogRepository.countByThreatLevelAndEventTimeAfter("MEDIUM", since)).orElse(0L);

        List<ThreatIntelItemDTO> threats = new ArrayList<>();
        if (critical > 0) {
            threats.add(new ThreatIntelItemDTO(UUID.randomUUID().toString(), "malware", "critical", "internal-db",
                    "检测到高危威胁日志事件", List.of("Windows Host"), LocalDateTime.now().minusHours(2),
                    (int) critical, 90, "active", List.of("critical-threat-pattern")));
        }
        if (high > 0) {
            threats.add(new ThreatIntelItemDTO(UUID.randomUUID().toString(), "phishing", "high", "internal-db",
                    "检测到高风险可疑访问行为", List.of("Web Service"), LocalDateTime.now().minusHours(4),
                    (int) high, 85, "active", List.of("high-threat-pattern")));
        }
        if (medium > 0) {
            threats.add(new ThreatIntelItemDTO(UUID.randomUUID().toString(), "vulnerability", "medium", "internal-db",
                    "检测到中风险安全事件", List.of("Application"), LocalDateTime.now().minusHours(8),
                    (int) medium, 75, "mitigated", List.of("medium-threat-pattern")));
        }
        return threats;
    }

    @Override
    public Map<String, Object> syncCloudThreatIntel() {
        log.info("同步云端威胁情报");
        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("syncedCount", getThreatIntelligence().size());
        result.put("message", "已完成基于数据库数据的威胁情报同步");

        return result;
    }

    @Override
    public Map<String, Object> getThreatIntelStats() {
        log.info("获取威胁情报统计");

        List<ThreatIntelItemDTO> threats = getThreatIntelligence();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalThreats", threats.size());
        stats.put("activeThreats", threats.stream().filter(t -> "active".equals(t.getStatus())).count());
        stats.put("malwareCount", threats.stream().filter(t -> "malware".equals(t.getType())).count());
        stats.put("phishingCount", threats.stream().filter(t -> "phishing".equals(t.getType())).count());
        stats.put("criticalCount", threats.stream().filter(t -> "critical".equals(t.getSeverity())).count());
        stats.put("lastUpdate", LocalDateTime.now());

        return stats;
    }
}