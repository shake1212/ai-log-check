package com.security.ailogsystem.controller;

import com.security.ailogsystem.service.WebSocketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/websocket")
@Tag(name = "WebSocket管理", description = "WebSocket连接和消息推送管理接口")
public class WebSocketController {

    @Autowired
    private WebSocketService webSocketService;

    @GetMapping("/status")
    @Operation(summary = "获取WebSocket连接状态")
    public ResponseEntity<Map<String, Object>> getWebSocketStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("connectionCount", webSocketService.getConnectionCount());
        status.put("onlineUserCount", webSocketService.getOnlineUserCount());
        status.put("timestamp", LocalDateTime.now());
        status.put("status", "active");
        return ResponseEntity.ok(status);
    }

    @PostMapping("/broadcast")
    @Operation(summary = "广播消息到/topic/events")
    public ResponseEntity<Map<String, Object>> broadcastMessage(
            @Parameter(description = "消息类型") @RequestParam(defaultValue = "NOTIFICATION") String type,
            @Parameter(description = "消息内容") @RequestParam String content) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("message", content);
            webSocketService.broadcastMessage(type, data);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("type", type);
            response.put("targetCount", webSocketService.getConnectionCount());
            response.put("timestamp", LocalDateTime.now());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("广播消息失败: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "status", "error", "message", e.getMessage(), "timestamp", LocalDateTime.now()));
        }
    }

    @PostMapping("/send-to-user")
    @Operation(summary = "发送消息给指定用户")
    public ResponseEntity<Map<String, Object>> sendMessageToUser(
            @RequestParam String userId,
            @RequestParam String content,
            @RequestParam(defaultValue = "NOTIFICATION") String type) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("message", content);
            webSocketService.sendMessageToUser(userId, type, data);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("targetUser", userId);
            response.put("timestamp", LocalDateTime.now());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("发送消息给用户失败: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "status", "error", "message", e.getMessage(), "timestamp", LocalDateTime.now()));
        }
    }

    @PostMapping("/notification")
    @Operation(summary = "发送系统通知")
    public ResponseEntity<Map<String, Object>> sendNotification(
            @RequestParam String message,
            @RequestParam(defaultValue = "INFO") String level) {
        try {
            webSocketService.sendNotification(message, level);
            return ResponseEntity.ok(Map.of(
                    "status", "success", "timestamp", LocalDateTime.now()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "status", "error", "message", e.getMessage()));
        }
    }

    @PostMapping("/test-connection")
    @Operation(summary = "测试WebSocket连接")
    public ResponseEntity<Map<String, Object>> testConnection() {
        try {
            webSocketService.sendNotification("WebSocket连接测试消息", "INFO");
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "connectionCount", webSocketService.getConnectionCount(),
                    "onlineUserCount", webSocketService.getOnlineUserCount(),
                    "timestamp", LocalDateTime.now()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "status", "error", "message", e.getMessage()));
        }
    }

    @GetMapping("/message-types")
    @Operation(summary = "获取支持的消息类型")
    public ResponseEntity<Map<String, Object>> getMessageTypes() {
        return ResponseEntity.ok(Map.of(
                "messageTypes", java.util.List.of("LOG", "ALERT", "STATS", "PROCESS", "NOTIFICATION"),
                "topic", "/topic/events",
                "timestamp", LocalDateTime.now()));
    }

    @GetMapping("/connection-details")
    @Operation(summary = "获取连接详情")
    public ResponseEntity<Map<String, Object>> getConnectionDetails() {
        try {
            Map<String, Object> status = webSocketService.getConnectionStatus();
            status.put("timestamp", LocalDateTime.now());
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "status", "error", "message", e.getMessage()));
        }
    }
}
