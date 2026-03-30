package com.security.ailogsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 规则匹配结果
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RuleMatchResult {
    
    @Builder.Default
    private List<MatchedRule> matchedRules = new ArrayList<>();
    
    private Double maxScore;
    private String highestThreatType;
    
    @Builder.Default
    private Boolean hasMatch = false;
    
    /**
     * 单个匹配的规则
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatchedRule {
        private Long ruleId;
        private String ruleName;
        private String ruleCategory;
        private String threatType;
        private Double score;
        private Double confidence;
        private String matchedPattern;
        private String matchedValue;
        private String severity;
    }
}
