package com.security.ailogsystem.service.matcher;

import com.security.ailogsystem.model.ThreatSignature;
import com.security.ailogsystem.model.UnifiedSecurityEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * 端口列表匹配器
 */
@Slf4j
@Component
public class PortListMatcher implements RuleMatcher {
    
    @Override
    public boolean matches(ThreatSignature rule, UnifiedSecurityEvent event) {
        if (!"PORT_LIST".equalsIgnoreCase(rule.getPatternType())) {
            return false;
        }
        
        // 解析端口列表
        Set<String> suspiciousPorts = new HashSet<>();
        String[] ports = rule.getPattern().split("[,|]");
        for (String port : ports) {
            suspiciousPorts.add(port.trim());
        }
        
        // 检查事件中的端口
        boolean matched = false;
        
        if (event.getSourcePort() != null) {
            String sourcePort = event.getSourcePort().toString();
            if (suspiciousPorts.contains(sourcePort)) {
                log.debug("端口匹配成功: 规则={}, 源端口={}", rule.getName(), sourcePort);
                matched = true;
            }
        }
        
        if (event.getDestinationPort() != null) {
            String destPort = event.getDestinationPort().toString();
            if (suspiciousPorts.contains(destPort)) {
                log.debug("端口匹配成功: 规则={}, 目标端口={}", rule.getName(), destPort);
                matched = true;
            }
        }
        
        return matched;
    }
    
    @Override
    public String getSupportedPatternType() {
        return "PORT_LIST";
    }
}
