package com.security.ailogsystem.controller;

import com.security.ailogsystem.model.ThreatSignature;
import com.security.ailogsystem.repository.ThreatSignatureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 规则管理控制器
 * 提供规则的增删改查接口
 */
@Slf4j
@RestController
@RequestMapping("/rules")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RuleManagementController {
    
    private final ThreatSignatureRepository threatSignatureRepository;
    
    /**
     * 查询规则列表（分页）
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getRules(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String severity
    ) {
        try {
            // 创建分页对象，按ID降序排序
            Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
            
            // 查询所有规则（后续可以添加过滤条件）
            Page<ThreatSignature> rulePage = threatSignatureRepository.findAll(pageable);
            
            Map<String, Object> response = new HashMap<>();
            response.put("content", rulePage.getContent());
            response.put("totalElements", rulePage.getTotalElements());
            response.put("totalPages", rulePage.getTotalPages());
            response.put("currentPage", rulePage.getNumber());
            response.put("pageSize", rulePage.getSize());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("查询规则列表失败", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    /**
     * 获取规则详情
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getRuleById(@PathVariable Long id) {
        try {
            ThreatSignature rule = threatSignatureRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("规则不存在"));
            
            Map<String, Object> response = new HashMap<>();
            response.put("rule", rule);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("获取规则详情失败", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    /**
     * 启用/禁用规则
     */
    @PutMapping("/{id}/toggle")
    public ResponseEntity<Map<String, Object>> toggleRule(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> request
    ) {
        try {
            ThreatSignature rule = threatSignatureRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("规则不存在"));
            
            Boolean enabled = request.get("enabled");
            if (enabled == null) {
                throw new RuntimeException("缺少enabled参数");
            }
            
            rule.setEnabled(enabled);
            threatSignatureRepository.save(rule);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", enabled ? "规则已启用" : "规则已禁用");
            response.put("rule", rule);
            
            log.info("规则状态更新: id={}, enabled={}", id, enabled);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("更新规则状态失败", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
}
