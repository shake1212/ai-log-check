// controller/WebSocketController.java
package com.security.ailogsystem.controller;

import com.security.ailogsystem.service.WebSocketService;
import com.security.ailogsystem.websocket.WebSocketMessage;
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

/**
 * WebSocket控制器
 * 提供WebSocket相关的REST API接口
 *
 * @author AI Log System
 * @version 1.0
 */
@Slf4j
@RestController
@RequestMapping("/api/websocket")
@Tag(name = "WebSocket管理", description = "WebSocket连接和消息推送管理接口")
public class WebSocketController {

    @Autowired
    private WebSocketService webSocketService;

    @GetMapping("/status")
    @Operation(summary = "获取WebSocket连接状态", description = "获取当前WebSocket连接数和在线用户数")
    public ResponseEntity<Map<String, Object>> getWebSocketStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("connectionCount", webSocketService.getConnectionCount());
        status.put("onlineUserCount", webSocketService.getOnlineUserCount());
        status.put("timestamp", LocalDateTime.now());
        status.put("status", "active");

        return ResponseEntity.ok(status);
    }

    @PostMapping("/broadcast")
    @Operation(summary = "广播消息", description = "向所有连接的WebSocket客户端广播消息")
    public ResponseEntity<Map<String, Object>> broadcastMessage(
            @Parameter(description = "消息内容") @RequestParam String content,
            @Parameter(description = "消息类型") @RequestParam(defaultValue = "SYSTEM_INFO") String messageType) {

        try {
            WebSocketMessage.MessageType type = WebSocketMessage.MessageType.valueOf(messageType);
            WebSocketMessage message = WebSocketMessage.builder()
                    .type(type)
                    .content(content)
                    .timestamp(LocalDateTime.now())
                    .sender("admin")
                    .build();

            webSocketService.broadcastMessage(message);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "消息广播成功");
            response.put("targetCount", webSocketService.getConnectionCount());
            response.put("timestamp", LocalDateTime.now());

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "无效的消息类型: " + messageType);
            response.put("timestamp", LocalDateTime.now());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            log.error("广播消息失败: {}", e.getMessage(), e);
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "广播消息失败: " + e.getMessage());
            response.put("timestamp", LocalDateTime.now());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/send-to-user")
    @Operation(summary = "发送消息给指定用户", description = "向指定用户发送WebSocket消息")
    public ResponseEntity<Map<String, Object>> sendMessageToUser(
            @Parameter(description = "用户ID") @RequestParam String userId,
            @Parameter(description = "消息内容") @RequestParam String content,
            @Parameter(description = "消息类型") @RequestParam(defaultValue = "CUSTOM") String messageType) {

        try {
            WebSocketMessage.MessageType type = WebSocketMessage.MessageType.valueOf(messageType);
            WebSocketMessage message = WebSocketMessage.builder()
                    .type(type)
                    .content(content)
                    .timestamp(LocalDateTime.now())
                    .sender("admin")
                    .receiver(userId)
                    .build();

            webSocketService.sendMessageToUser(userId, message);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "消息发送成功");
            response.put("targetUser", userId);
            response.put("timestamp", LocalDateTime.now());

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "无效的消息类型: " + messageType);
            response.put("timestamp", LocalDateTime.now());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            log.error("发送消息给用户失败: {}", e.getMessage(), e);
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "发送消息失败: " + e.getMessage());
            response.put("timestamp", LocalDateTime.now());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/system-info")
    @Operation(summary = "发送系统信息", description = "向所有客户端发送系统信息")
    public ResponseEntity<Map<String, Object>> sendSystemInfo(
            @Parameter(description = "系统信息内容") @RequestParam String content) {

        try {
            webSocketService.sendSystemInfo(content);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "系统信息发送成功");
            response.put("targetCount", webSocketService.getConnectionCount());
            response.put("timestamp", LocalDateTime.now());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("发送系统信息失败: {}", e.getMessage(), e);
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "发送系统信息失败: " + e.getMessage());
            response.put("timestamp", LocalDateTime.now());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/system-error")
    @Operation(summary = "发送系统错误", description = "向所有客户端发送系统错误信息")
    public ResponseEntity<Map<String, Object>> sendSystemError(
            @Parameter(description = "系统错误内容") @RequestParam String content) {

        try {
            webSocketService.sendSystemError(content);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "系统错误信息发送成功");
            response.put("targetCount", webSocketService.getConnectionCount());
            response.put("timestamp", LocalDateTime.now());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("发送系统错误失败: {}", e.getMessage(), e);
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "发送系统错误失败: " + e.getMessage());
            response.put("timestamp", LocalDateTime.now());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/test-connection")
    @Operation(summary = "测试WebSocket连接", description = "发送测试消息验证WebSocket连接")
    public ResponseEntity<Map<String, Object>> testConnection() {
        try {
            webSocketService.sendSystemInfo("WebSocket连接测试消息");

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "WebSocket连接测试成功");
            response.put("connectionCount", webSocketService.getConnectionCount());
            response.put("onlineUserCount", webSocketService.getOnlineUserCount());
            response.put("timestamp", LocalDateTime.now());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("WebSocket连接测试失败: {}", e.getMessage(), e);
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "WebSocket连接测试失败: " + e.getMessage());
            response.put("timestamp", LocalDateTime.now());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/message-types")
    @Operation(summary = "获取支持的消息类型", description = "获取所有支持的WebSocket消息类型")
    public ResponseEntity<Map<String, Object>> getMessageTypes() {
        Map<String, Object> response = new HashMap<>();

        Map<String, String> messageTypes = new HashMap<>();
        for (WebSocketMessage.MessageType type : WebSocketMessage.MessageType.values()) {
            messageTypes.put(type.name(), type.getDescription());
        }

        response.put("messageTypes", messageTypes);
        response.put("totalCount", messageTypes.size());
        response.put("timestamp", LocalDateTime.now());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/connection-details")
    @Operation(summary = "获取连接详情", description = "获取详细的WebSocket连接信息")
    public ResponseEntity<Map<String, Object>> getConnectionDetails() {
        try {
            Map<String, Object> connectionStatus = webSocketService.getConnectionStatus();
            connectionStatus.put("timestamp", LocalDateTime.now());
            return ResponseEntity.ok(connectionStatus);
        } catch (Exception e) {
            log.error("获取连接详情失败: {}", e.getMessage(), e);
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "获取连接详情失败: " + e.getMessage());
            response.put("timestamp", LocalDateTime.now());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}