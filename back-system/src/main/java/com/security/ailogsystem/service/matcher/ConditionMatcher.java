package com.security.ailogsystem.service.matcher;

import com.security.ailogsystem.model.ThreatSignature;
import com.security.ailogsystem.model.UnifiedSecurityEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 条件匹配器
 * 用于匹配特定的事件ID或条件组合
 */
@Slf4j
@Component
public class ConditionMatcher implements RuleMatcher {
    
    @Override
    public boolean matches(ThreatSignature rule, UnifiedSecurityEvent event) {
        if (!"CONDITION".equalsIgnoreCase(rule.getPatternType())) {
            return false;
        }
        
        String pattern = rule.getPattern();
        
        // 解析条件模式，例如: "event_id:4625"
        if (pattern.startsWith("event_id:")) {
            String expectedEventId = pattern.substring("event_id:".length()).trim();
            String actualEventId = event.getEventCode() != null ? event.getEventCode().toString() : "";
            
            boolean matched = actualEventId.equals(expectedEventId);
            if (matched) {
                log.debug("条件匹配成功: 规则={}, EventID={}", rule.getName(), expectedEventId);
            }
            return matched;
        }
        
        // 可以扩展其他条件类型
        // 例如: "severity:high", "category:authentication" 等
        
        return false;
    }
    
    @Override
    public String getSupportedPatternType() {
        return "CONDITION";
    }
}
