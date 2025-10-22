package com.security.ailogsystem.controller;

import com.security.ailogsystem.service.SimpleWebSocketService;
import com.security.ailogsystem.websocket.SimpleWebSocketMessage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 简化版WebSocket控制器
 * 核心设计理念：功能聚焦、快速上手
 * 
 * @author AI Log System
 * @version 1.0
 */
@Slf4j
@RestController
@RequestMapping("/api/simple-websocket")
@Tag(name = "简化版WebSocket管理", description = "轻量级WebSocket实时通信接口")
public class SimpleWebSocketController {

    @Autowired
    private SimpleWebSocketService simpleWebSocketService;

    @GetMapping("/status")
    @Operation(summary = "获取WebSocket连接状态", description = "获取当前WebSocket连接数")
    public ResponseEntity<Map<String, Object>> getWebSocketStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("connectionCount", simpleWebSocketService.getConnectionCount());
        status.put("timestamp", java.time.LocalDateTime.now());
        status.put("status", "running");
        
        return ResponseEntity.ok(status);
    }

    @PostMapping("/broadcast")
    @Operation(summary = "广播消息", description = "向所有连接的WebSocket客户端广播消息")
    public ResponseEntity<Map<String, String>> broadcastMessage(
            @Parameter(description = "消息内容") @RequestParam String content,
            @Parameter(description = "消息类型") @RequestParam(defaultValue = "system") String type) {
        
        try {
            simpleWebSocketService.sendCustomMessage(type, content, null);
            
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "消息广播成功");
            response.put("targetCount", String.valueOf(simpleWebSocketService.getConnectionCount()));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("广播消息失败: {}", e.getMessage(), e);
            Map<String, String> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "广播消息失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/system-message")
    @Operation(summary = "发送系统消息", description = "向所有客户端发送系统消息")
    public ResponseEntity<Map<String, String>> sendSystemMessage(
            @Parameter(description = "系统消息内容") @RequestParam String content) {
        
        try {
            simpleWebSocketService.sendSystemMessage(content);
            
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "系统消息发送成功");
            response.put("targetCount", String.valueOf(simpleWebSocketService.getConnectionCount()));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("发送系统消息失败: {}", e.getMessage(), e);
            Map<String, String> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "发送系统消息失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/log-message")
    @Operation(summary = "发送日志消息", description = "向所有客户端发送日志消息")
    public ResponseEntity<Map<String, String>> sendLogMessage(
            @Parameter(description = "日志消息内容") @RequestParam String content,
            @Parameter(description = "日志数据") @RequestParam(required = false) String data) {
        
        try {
            simpleWebSocketService.sendLogMessage(content, data);
            
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "日志消息发送成功");
            response.put("targetCount", String.valueOf(simpleWebSocketService.getConnectionCount()));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("发送日志消息失败: {}", e.getMessage(), e);
            Map<String, String> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "发送日志消息失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/alert-message")
    @Operation(summary = "发送预警消息", description = "向所有客户端发送预警消息")
    public ResponseEntity<Map<String, String>> sendAlertMessage(
            @Parameter(description = "预警消息内容") @RequestParam String content,
            @Parameter(description = "预警数据") @RequestParam(required = false) String data) {
        
        try {
            simpleWebSocketService.sendAlertMessage(content, data);
            
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "预警消息发送成功");
            response.put("targetCount", String.valueOf(simpleWebSocketService.getConnectionCount()));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("发送预警消息失败: {}", e.getMessage(), e);
            Map<String, String> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "发送预警消息失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/heartbeat")
    @Operation(summary = "发送心跳", description = "向所有客户端发送心跳消息")
    public ResponseEntity<Map<String, String>> sendHeartbeat() {
        try {
            simpleWebSocketService.sendHeartbeat();
            
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "心跳发送成功");
            response.put("targetCount", String.valueOf(simpleWebSocketService.getConnectionCount()));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("发送心跳失败: {}", e.getMessage(), e);
            Map<String, String> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "发送心跳失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/test")
    @Operation(summary = "测试WebSocket连接", description = "发送测试消息验证WebSocket连接")
    public ResponseEntity<Map<String, String>> testConnection() {
        try {
            simpleWebSocketService.sendSystemMessage("WebSocket连接测试消息");
            
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "WebSocket连接测试成功");
            response.put("connectionCount", String.valueOf(simpleWebSocketService.getConnectionCount()));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("WebSocket连接测试失败: {}", e.getMessage(), e);
            Map<String, String> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "WebSocket连接测试失败: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
