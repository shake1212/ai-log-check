package com.security.ailogsystem.service.matcher;

import com.security.ailogsystem.model.ThreatSignature;
import com.security.ailogsystem.model.UnifiedSecurityEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/**
 * 正则表达式匹配器
 */
@Slf4j
@Component
public class RegexMatcher implements RuleMatcher {
    
    @Override
    public boolean matches(ThreatSignature rule, UnifiedSecurityEvent event) {
        if (!"REGEX".equalsIgnoreCase(rule.getPatternType())) {
            return false;
        }
        
        try {
            Pattern pattern = Pattern.compile(rule.getPattern(), Pattern.CASE_INSENSITIVE);
            
            // 检查多个字段
            String[] fieldsToCheck = {
                event.getProcessName(),
                event.getNormalizedMessage(),
                event.getRawMessage(),
                event.getUserName(),
                event.getSourceIp(),
                event.getDestinationIp(),
                event.getEventType()
            };
            
            for (String field : fieldsToCheck) {
                if (field != null && pattern.matcher(field).find()) {
                    log.debug("正则匹配成功: 规则={}, 字段值={}", rule.getName(), field);
                    return true;
                }
            }
            
        } catch (PatternSyntaxException e) {
            log.error("正则表达式语法错误: 规则={}, 模式={}", rule.getName(), rule.getPattern(), e);
        }
        
        return false;
    }
    
    @Override
    public String getSupportedPatternType() {
        return "REGEX";
    }
}
