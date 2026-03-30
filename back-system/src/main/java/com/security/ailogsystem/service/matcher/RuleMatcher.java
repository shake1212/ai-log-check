package com.security.ailogsystem.service.matcher;

import com.security.ailogsystem.model.ThreatSignature;
import com.security.ailogsystem.model.UnifiedSecurityEvent;

/**
 * 规则匹配器接口
 */
public interface RuleMatcher {
    
    /**
     * 检查规则是否匹配事件
     * 
     * @param rule 威胁特征规则
     * @param event 安全事件
     * @return 是否匹配
     */
    boolean matches(ThreatSignature rule, UnifiedSecurityEvent event);
    
    /**
     * 获取匹配器支持的模式类型
     * 
     * @return 模式类型
     */
    String getSupportedPatternType();
}
