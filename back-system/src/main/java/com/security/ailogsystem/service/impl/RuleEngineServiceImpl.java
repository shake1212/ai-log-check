package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.dto.RuleMatchResult;
import com.security.ailogsystem.dto.ThreatLevel;
import com.security.ailogsystem.model.ThreatSignature;
import com.security.ailogsystem.model.UnifiedSecurityEvent;
import com.security.ailogsystem.repository.ThreatSignatureRepository;
import com.security.ailogsystem.service.RuleEngineService;
import com.security.ailogsystem.service.matcher.RuleMatcher;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 规则引擎服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RuleEngineServiceImpl implements RuleEngineService {
    
    private final ThreatSignatureRepository threatSignatureRepository;
    private final List<RuleMatcher> ruleMatchers;
    
    // 规则缓存
    private final Map<Long, ThreatSignature> ruleCache = new ConcurrentHashMap<>();
    private LocalDateTime lastLoadTime;
    
    /**
     * 应用启动时加载规则
     */
    @PostConstruct
    @Override
    public void loadRules() {
        log.info("开始加载威胁检测规则...");
        
        try {
            List<ThreatSignature> rules = threatSignatureRepository.findByEnabledTrue();
            
            ruleCache.clear();
            for (ThreatSignature rule : rules) {
                ruleCache.put(rule.getId(), rule);
            }
            
            lastLoadTime = LocalDateTime.now();
            log.info("规则加载完成，共加载 {} 条规则", ruleCache.size());
            
        } catch (Exception e) {
            log.error("加载规则失败", e);
        }
    }
    
    /**
     * 定时刷新规则缓存（每5分钟）
     */
    @Scheduled(fixedRate = 300000)
    @Override
    public void refreshRules() {
        log.debug("定时刷新规则缓存...");
        loadRules();
    }
    
    @Override
    public RuleMatchResult matchRules(UnifiedSecurityEvent event) {
        RuleMatchResult result = RuleMatchResult.builder()
                .matchedRules(new ArrayList<>())
                .hasMatch(false)
                .maxScore(0.0)
                .build();
        
        if (event == null) {
            return result;
        }
        
        // 遍历所有规则进行匹配
        for (ThreatSignature rule : ruleCache.values()) {
            if (matchSingleRule(rule, event)) {
                // 创建匹配结果
                RuleMatchResult.MatchedRule matchedRule = RuleMatchResult.MatchedRule.builder()
                        .ruleId(rule.getId())
                        .ruleName(rule.getName())
                        .ruleCategory(rule.getCategory())
                        .threatType(rule.getThreatType())
                        .score(rule.getScore())
                        .confidence(0.9) // 默认置信度
                        .matchedPattern(rule.getPattern())
                        .severity(rule.getSeverity())
                        .build();
                
                result.getMatchedRules().add(matchedRule);
                result.setHasMatch(true);
                
                // 更新最高分数和威胁类型
                if (rule.getScore() != null && rule.getScore() > result.getMaxScore()) {
                    result.setMaxScore(rule.getScore());
                    result.setHighestThreatType(rule.getThreatType());
                }
                
                // 异步更新规则命中统计
                updateRuleHitCount(rule.getId());
            }
        }
        
        log.debug("规则匹配完成: 事件ID={}, 匹配规则数={}", 
                event.getId(), result.getMatchedRules().size());
        
        return result;
    }
    
    /**
     * 使用合适的匹配器匹配单个规则
     */
    private boolean matchSingleRule(ThreatSignature rule, UnifiedSecurityEvent event) {
        for (RuleMatcher matcher : ruleMatchers) {
            if (matcher.getSupportedPatternType().equalsIgnoreCase(rule.getPatternType())) {
                try {
                    return matcher.matches(rule, event);
                } catch (Exception e) {
                    log.error("规则匹配异常: 规则={}, 匹配器={}", 
                            rule.getName(), matcher.getClass().getSimpleName(), e);
                    return false;
                }
            }
        }
        
        log.warn("未找到支持的匹配器: 规则={}, 模式类型={}", 
                rule.getName(), rule.getPatternType());
        return false;
    }
    
    @Override
    public Double calculateThreatScore(UnifiedSecurityEvent event, RuleMatchResult ruleMatch) {
        if (!ruleMatch.getHasMatch()) {
            return 0.0;
        }
        
        // 威胁分数计算模型：
        // 1. 规则匹配分数 (40%)
        // 2. 规则数量加权 (30%)
        // 3. 严重程度加权 (30%)
        
        double ruleScore = ruleMatch.getMaxScore() != null ? ruleMatch.getMaxScore() : 0.0;
        double ruleWeight = 0.4;
        
        // 规则数量加权：匹配的规则越多，威胁越高
        int matchCount = ruleMatch.getMatchedRules().size();
        double countScore = Math.min(matchCount * 0.15, 0.3); // 最多0.3
        
        // 严重程度加权
        double severityScore = calculateSeverityScore(ruleMatch);
        
        double totalScore = (ruleScore * ruleWeight) + countScore + severityScore;
        
        // 确保分数在0-1之间
        return Math.min(Math.max(totalScore, 0.0), 1.0);
    }
    
    /**
     * 计算严重程度分数
     */
    private double calculateSeverityScore(RuleMatchResult ruleMatch) {
        long criticalCount = ruleMatch.getMatchedRules().stream()
                .filter(r -> "CRITICAL".equalsIgnoreCase(r.getSeverity()))
                .count();
        
        long highCount = ruleMatch.getMatchedRules().stream()
                .filter(r -> "HIGH".equalsIgnoreCase(r.getSeverity()))
                .count();
        
        return (criticalCount * 0.15) + (highCount * 0.10);
    }
    
    @Override
    public ThreatLevel determineThreatLevel(Double score) {
        if (score == null || score < 0.3) {
            return ThreatLevel.LOW;
        } else if (score < 0.6) {
            return ThreatLevel.MEDIUM;
        } else if (score < 0.85) {
            return ThreatLevel.HIGH;
        } else {
            return ThreatLevel.CRITICAL;
        }
    }
    
    @Override
    public Map<String, Object> getRuleStatistics() {
        Map<String, Object> stats = new HashMap<>();
        
        stats.put("totalRules", ruleCache.size());
        stats.put("lastLoadTime", lastLoadTime);
        
        // 按分类统计
        Map<String, Long> categoryStats = new HashMap<>();
        for (ThreatSignature rule : ruleCache.values()) {
            categoryStats.merge(rule.getCategory(), 1L, Long::sum);
        }
        stats.put("categoryStats", categoryStats);
        
        // 按严重程度统计
        Map<String, Long> severityStats = new HashMap<>();
        for (ThreatSignature rule : ruleCache.values()) {
            severityStats.merge(rule.getSeverity(), 1L, Long::sum);
        }
        stats.put("severityStats", severityStats);
        
        return stats;
    }
    
    @Override
    @Transactional
    public void updateRuleHitCount(Long ruleId) {
        try {
            threatSignatureRepository.findById(ruleId).ifPresent(rule -> {
                rule.setHitCount(rule.getHitCount() != null ? rule.getHitCount() + 1 : 1L);
                rule.setLastHitTime(LocalDateTime.now());
                threatSignatureRepository.save(rule);
            });
        } catch (Exception e) {
            log.error("更新规则命中统计失败: ruleId={}", ruleId, e);
        }
    }
}
