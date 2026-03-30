package com.security.ailogsystem.service.matcher;

import com.security.ailogsystem.model.ThreatSignature;
import com.security.ailogsystem.model.UnifiedSecurityEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 关键词匹配器
 */
@Slf4j
@Component
public class KeywordMatcher implements RuleMatcher {
    
    @Override
    public boolean matches(ThreatSignature rule, UnifiedSecurityEvent event) {
        if (!"KEYWORD".equalsIgnoreCase(rule.getPatternType())) {
            return false;
        }
        
        String[] keywords = rule.getPattern().split("[,|]");
        String eventText = buildEventText(event).toLowerCase();
        
        for (String keyword : keywords) {
            String trimmedKeyword = keyword.trim().toLowerCase();
            if (!trimmedKeyword.isEmpty() && eventText.contains(trimmedKeyword)) {
                log.debug("关键词匹配成功: 规则={}, 关键词={}", rule.getName(), trimmedKeyword);
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 构建事件文本用于匹配
     */
    private String buildEventText(UnifiedSecurityEvent event) {
        StringBuilder sb = new StringBuilder();
        
        if (event.getProcessName() != null) {
            sb.append(event.getProcessName()).append(" ");
        }
        if (event.getNormalizedMessage() != null) {
            sb.append(event.getNormalizedMessage()).append(" ");
        }
        if (event.getRawMessage() != null) {
            sb.append(event.getRawMessage()).append(" ");
        }
        if (event.getUserName() != null) {
            sb.append(event.getUserName()).append(" ");
        }
        if (event.getEventType() != null) {
            sb.append(event.getEventType()).append(" ");
        }
        
        return sb.toString();
    }
    
    @Override
    public String getSupportedPatternType() {
        return "KEYWORD";
    }
}
