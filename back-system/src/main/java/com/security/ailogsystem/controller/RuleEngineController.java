package com.security.ailogsystem.controller;

import com.security.ailogsystem.dto.RuleMatchResult;
import com.security.ailogsystem.dto.ThreatLevel;
import com.security.ailogsystem.model.UnifiedSecurityEvent;
import com.security.ailogsystem.service.RuleEngineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 规则引擎控制器
 * 提供规则管理和事件分析接口
 */
@Slf4j
@RestController
@RequestMapping("/api/rule-engine")
@RequiredArgsConstructor
public class RuleEngineController {
    
    private final RuleEngineService ruleEngineService;
    
    /**
     * 分析安全事件
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeEvent(@RequestBody UnifiedSecurityEvent event) {
        log.info("收到事件分析请求: eventId={}", event.getId());
        
        try {
            // 1. 规则匹配
            RuleMatchResult ruleMatch = ruleEngineService.matchRules(event);
            
            // 2. 计算威胁分数
            Double threatScore = ruleEngineService.calculateThreatScore(event, ruleMatch);
            
            // 3. 确定威胁等级
            ThreatLevel threatLevel = ruleEngineService.determineThreatLevel(threatScore);
            
            // 4. 构建响应
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("eventId", event.getId());
            response.put("ruleMatches", ruleMatch);
            response.put("threatScore", threatScore * 100); // 转换为0-100分
            response.put("threatLevel", threatLevel);
            response.put("hasMatch", ruleMatch.getHasMatch());
            response.put("matchedRuleCount", ruleMatch.getMatchedRules().size());
            
            log.info("事件分析完成: eventId={}, 威胁等级={}, 分数={}", 
                    event.getId(), threatLevel, threatScore * 100);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("事件分析失败", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    /**
     * 刷新规则缓存
     */
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refreshRules() {
        log.info("手动刷新规则缓存");
        
        try {
            ruleEngineService.refreshRules();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "规则缓存刷新成功");
            response.put("statistics", ruleEngineService.getRuleStatistics());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("刷新规则缓存失败", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    /**
     * 获取规则统计信息
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getStatistics() {
        try {
            Map<String, Object> stats = ruleEngineService.getRuleStatistics();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("statistics", stats);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("获取规则统计失败", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
}
