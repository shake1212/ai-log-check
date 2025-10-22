package com.security.ailogsystem.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * WebSocket握手拦截器
 * 用于在WebSocket连接建立前进行验证和处理
 * 
 * @author AI Log System
 * @version 1.0
 */
@Slf4j
@Component
public class WebSocketInterceptor implements HandshakeInterceptor {

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
        
        log.info("WebSocket握手开始: {}", request.getURI());
        
        // 获取请求参数
        String query = request.getURI().getQuery();
        if (query != null) {
            // 解析查询参数
            String[] params = query.split("&");
            for (String param : params) {
                String[] keyValue = param.split("=");
                if (keyValue.length == 2) {
                    attributes.put(keyValue[0], keyValue[1]);
                }
            }
        }
        
        // 获取客户端IP
        String clientIp = getClientIp(request);
        attributes.put("clientIp", clientIp);
        
        // 获取User-Agent
        String userAgent = request.getHeaders().getFirst("User-Agent");
        attributes.put("userAgent", userAgent);
        
        // 记录连接信息
        log.info("WebSocket连接信息 - IP: {}, User-Agent: {}", clientIp, userAgent);
        
        // 这里可以添加身份验证逻辑
        // 例如：验证token、检查权限等
        
        return true; // 允许连接
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        if (exception != null) {
            log.error("WebSocket握手失败: {}", exception.getMessage(), exception);
        } else {
            log.info("WebSocket握手成功: {}", request.getURI());
        }
    }
    
    /**
     * 获取客户端真实IP地址
     */
    private String getClientIp(ServerHttpRequest request) {
        String xForwardedFor = request.getHeaders().getFirst("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeaders().getFirst("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }
        
        return request.getRemoteAddress() != null ? request.getRemoteAddress().getAddress().getHostAddress() : "unknown";
    }
}
