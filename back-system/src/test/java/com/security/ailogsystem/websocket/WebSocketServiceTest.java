package com.security.ailogsystem.websocket;

import com.security.ailogsystem.service.WebSocketService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import static org.junit.jupiter.api.Assertions.*;

/**
 * WebSocket服务测试
 * 
 * @author AI Log System
 * @version 1.0
 */
@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:testdb",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect"
})
class WebSocketServiceTest {

    @Autowired
    private WebSocketService webSocketService;

    @Test
    void testWebSocketServiceBean() {
        assertNotNull(webSocketService, "WebSocket服务应该被正确创建");
    }

    @Test
    void testGetConnectionCount() {
        int connectionCount = webSocketService.getConnectionCount();
        assertTrue(connectionCount >= 0, "连接数应该大于等于0");
    }

    @Test
    void testGetOnlineUserCount() {
        int onlineUserCount = webSocketService.getOnlineUserCount();
        assertTrue(onlineUserCount >= 0, "在线用户数应该大于等于0");
    }

    @Test
    void testSendSystemInfo() {
        // 测试发送系统信息（不会抛出异常）
        assertDoesNotThrow(() -> {
            webSocketService.sendSystemInfo("测试系统信息");
        });
    }

    @Test
    void testSendSystemError() {
        // 测试发送系统错误（不会抛出异常）
        assertDoesNotThrow(() -> {
            webSocketService.sendSystemError("测试系统错误");
        });
    }

    @Test
    void testSendLogUpdate() {
        // 测试发送日志更新（不会抛出异常）
        assertDoesNotThrow(() -> {
            webSocketService.sendLogUpdate("测试日志数据");
        });
    }

    @Test
    void testSendLogAnomaly() {
        // 测试发送异常日志（不会抛出异常）
        assertDoesNotThrow(() -> {
            webSocketService.sendLogAnomaly("测试异常日志数据");
        });
    }

    @Test
    void testSendNewAlert() {
        // 测试发送新预警（不会抛出异常）
        assertDoesNotThrow(() -> {
            webSocketService.sendNewAlert("测试预警数据");
        });
    }

    @Test
    void testSendAlertUpdate() {
        // 测试发送预警更新（不会抛出异常）
        assertDoesNotThrow(() -> {
            webSocketService.sendAlertUpdate("测试预警更新数据");
        });
    }

    @Test
    void testSendAlertResolved() {
        // 测试发送预警解决（不会抛出异常）
        assertDoesNotThrow(() -> {
            webSocketService.sendAlertResolved("测试预警解决数据");
        });
    }

    @Test
    void testSendMonitorData() {
        // 测试发送监控数据（不会抛出异常）
        assertDoesNotThrow(() -> {
            webSocketService.sendMonitorData("cpu", "测试CPU监控数据");
            webSocketService.sendMonitorData("memory", "测试内存监控数据");
            webSocketService.sendMonitorData("disk", "测试磁盘监控数据");
            webSocketService.sendMonitorData("network", "测试网络监控数据");
            webSocketService.sendMonitorData("unknown", "测试未知监控数据");
        });
    }

    @Test
    void testBroadcastMessage() {
        // 测试广播消息（不会抛出异常）
        assertDoesNotThrow(() -> {
            WebSocketMessage message = WebSocketMessage.systemInfo("测试广播消息");
            webSocketService.broadcastMessage(message);
        });
    }

    @Test
    void testSendMessageToUser() {
        // 测试发送消息给指定用户（不会抛出异常）
        assertDoesNotThrow(() -> {
            WebSocketMessage message = WebSocketMessage.systemInfo("测试用户消息");
            webSocketService.sendMessageToUser("testUser", message);
        });
    }

    @Test
    void testBroadcastMessageToUsers() {
        // 测试广播消息给指定用户类型（不会抛出异常）
        assertDoesNotThrow(() -> {
            WebSocketMessage message = WebSocketMessage.systemInfo("测试用户类型广播消息");
            webSocketService.broadcastMessageToUsers("admin", message);
        });
    }
}
