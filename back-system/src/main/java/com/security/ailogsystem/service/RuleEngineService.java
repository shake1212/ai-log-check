package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.RuleMatchResult;
import com.security.ailogsystem.dto.ThreatLevel;
import com.security.ailogsystem.model.UnifiedSecurityEvent;

import java.util.Map;

/**
 * 规则引擎服务接口
 * 负责加载规则、匹配规则、计算威胁分数
 */
public interface RuleEngineService {
    
    /**
     * 加载所有启用的规则到缓存
     */
    void loadRules();
    
    /**
     * 刷新规则缓存
     */
    void refreshRules();
    
    /**
     * 对安全事件进行规则匹配
     * 
     * @param event 安全事件
     * @return 规则匹配结果
     */
    RuleMatchResult matchRules(UnifiedSecurityEvent event);
    
    /**
     * 计算威胁分数
     * 
     * @param event 安全事件
     * @param ruleMatch 规则匹配结果
     * @return 威胁分数 (0-100)
     */
    Double calculateThreatScore(UnifiedSecurityEvent event, RuleMatchResult ruleMatch);
    
    /**
     * 根据威胁分数确定威胁等级
     * 
     * @param score 威胁分数
     * @return 威胁等级
     */
    ThreatLevel determineThreatLevel(Double score);
    
    /**
     * 获取规则统计信息
     * 
     * @return 统计信息Map
     */
    Map<String, Object> getRuleStatistics();
    
    /**
     * 更新规则命中统计
     * 
     * @param ruleId 规则ID
     */
    void updateRuleHitCount(Long ruleId);
}
