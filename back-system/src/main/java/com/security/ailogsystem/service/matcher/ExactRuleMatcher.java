package com.security.ailogsystem.service.matcher;

import com.security.ailogsystem.model.ThreatSignature;
import com.security.ailogsystem.model.UnifiedSecurityEvent;
import org.springframework.stereotype.Component;

@Component
public class ExactRuleMatcher implements RuleMatcher {

    @Override
    public String getSupportedPatternType() {
        return "EXACT";
    }

    @Override
    public boolean matches(ThreatSignature rule, UnifiedSecurityEvent event) {
        String pattern = rule.getPattern();
        if (pattern == null || pattern.isEmpty()) {
            return false;
        }

        // 选择匹配的文本：优先使用 normalizedMessage，否则 rawMessage
        String text = event.getNormalizedMessage();
        if (text == null || text.isEmpty()) {
            text = event.getRawMessage();
        }
        if (text == null) {
            return false;
        }

        // 完全相等匹配
        return pattern.equals(text);
    }

}
