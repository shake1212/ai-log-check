package com.security.ailogsystem.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;

/**
 * WMI异常处理测试
 * 
 * @author AI Log System
 * @version 1.0
 */
class WmiExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    void testHandleWmiCollectionException() {
        // 准备测试数据
        WmiCollectionException ex = new WmiCollectionException(
                "WMI采集失败", 
                "test-host", 
                "Win32_ComputerSystem", 
                2, 
                5000L
        );

        // 执行测试
        ResponseEntity<GlobalExceptionHandler.WmiErrorResponse> response = 
                handler.handleWmiCollectionException(ex);

        // 验证结果
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        
        GlobalExceptionHandler.WmiErrorResponse errorResponse = response.getBody();
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR.value(), errorResponse.getStatus());
        assertTrue(errorResponse.getMessage().contains("WMI采集错误"));
        assertEquals("test-host", errorResponse.getTargetHost());
        assertEquals("Win32_ComputerSystem", errorResponse.getWmiClass());
        assertEquals(2, errorResponse.getRetryCount());
        assertEquals(5000L, errorResponse.getDuration());
    }

    @Test
    void testHandleWmiConnectionException() {
        // 准备测试数据
        WmiConnectionException ex = new WmiConnectionException(
                "WMI连接失败", 
                "test-host", 
                "\\\\test-host\\root\\cimv2", 
                135, 
                "DCOM"
        );

        // 执行测试
        ResponseEntity<GlobalExceptionHandler.WmiConnectionErrorResponse> response = 
                handler.handleWmiConnectionException(ex);

        // 验证结果
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertNotNull(response.getBody());
        
        GlobalExceptionHandler.WmiConnectionErrorResponse errorResponse = response.getBody();
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE.value(), errorResponse.getStatus());
        assertTrue(errorResponse.getMessage().contains("WMI连接错误"));
        assertEquals("test-host", errorResponse.getTargetHost());
        assertEquals("\\\\test-host\\root\\cimv2", errorResponse.getConnectionString());
        assertEquals(135, errorResponse.getPort());
        assertEquals("DCOM", errorResponse.getProtocol());
    }

    @Test
    void testHandleWmiAuthenticationException() {
        // 准备测试数据
        WmiAuthenticationException ex = new WmiAuthenticationException(
                "WMI认证失败", 
                "test-host", 
                "admin", 
                "WORKGROUP"
        );

        // 执行测试
        ResponseEntity<GlobalExceptionHandler.WmiAuthenticationErrorResponse> response = 
                handler.handleWmiAuthenticationException(ex);

        // 验证结果
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        
        GlobalExceptionHandler.WmiAuthenticationErrorResponse errorResponse = response.getBody();
        assertEquals(HttpStatus.UNAUTHORIZED.value(), errorResponse.getStatus());
        assertTrue(errorResponse.getMessage().contains("WMI认证错误"));
        assertEquals("test-host", errorResponse.getTargetHost());
        assertEquals("admin", errorResponse.getUsername());
        assertEquals("WORKGROUP", errorResponse.getDomain());
    }

    @Test
    void testWmiCollectionExceptionWithCause() {
        // 准备测试数据
        RuntimeException cause = new RuntimeException("底层连接错误");
        WmiCollectionException ex = new WmiCollectionException(
                "WMI采集失败", 
                "test-host", 
                "Win32_ComputerSystem", 
                1, 
                3000L, 
                cause
        );

        // 执行测试
        ResponseEntity<GlobalExceptionHandler.WmiErrorResponse> response = 
                handler.handleWmiCollectionException(ex);

        // 验证结果
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        
        GlobalExceptionHandler.WmiErrorResponse errorResponse = response.getBody();
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR.value(), errorResponse.getStatus());
        assertTrue(errorResponse.getMessage().contains("WMI采集错误"));
        assertEquals("test-host", errorResponse.getTargetHost());
        assertEquals("Win32_ComputerSystem", errorResponse.getWmiClass());
        assertEquals(1, errorResponse.getRetryCount());
        assertEquals(3000L, errorResponse.getDuration());
    }

    @Test
    void testWmiConnectionExceptionWithCause() {
        // 准备测试数据
        RuntimeException cause = new RuntimeException("网络连接超时");
        WmiConnectionException ex = new WmiConnectionException(
                "WMI连接失败", 
                "test-host", 
                "\\\\test-host\\root\\cimv2", 
                135, 
                "DCOM", 
                cause
        );

        // 执行测试
        ResponseEntity<GlobalExceptionHandler.WmiConnectionErrorResponse> response = 
                handler.handleWmiConnectionException(ex);

        // 验证结果
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertNotNull(response.getBody());
        
        GlobalExceptionHandler.WmiConnectionErrorResponse errorResponse = response.getBody();
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE.value(), errorResponse.getStatus());
        assertTrue(errorResponse.getMessage().contains("WMI连接错误"));
        assertEquals("test-host", errorResponse.getTargetHost());
        assertEquals("\\\\test-host\\root\\cimv2", errorResponse.getConnectionString());
        assertEquals(135, errorResponse.getPort());
        assertEquals("DCOM", errorResponse.getProtocol());
    }

    @Test
    void testWmiAuthenticationExceptionWithCause() {
        // 准备测试数据
        RuntimeException cause = new RuntimeException("用户名或密码错误");
        WmiAuthenticationException ex = new WmiAuthenticationException(
                "WMI认证失败", 
                "test-host", 
                "admin", 
                "WORKGROUP", 
                cause
        );

        // 执行测试
        ResponseEntity<GlobalExceptionHandler.WmiAuthenticationErrorResponse> response = 
                handler.handleWmiAuthenticationException(ex);

        // 验证结果
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        
        GlobalExceptionHandler.WmiAuthenticationErrorResponse errorResponse = response.getBody();
        assertEquals(HttpStatus.UNAUTHORIZED.value(), errorResponse.getStatus());
        assertTrue(errorResponse.getMessage().contains("WMI认证错误"));
        assertEquals("test-host", errorResponse.getTargetHost());
        assertEquals("admin", errorResponse.getUsername());
        assertEquals("WORKGROUP", errorResponse.getDomain());
    }

    @Test
    void testWmiCollectionExceptionMinimal() {
        // 准备测试数据（最小参数）
        WmiCollectionException ex = new WmiCollectionException("WMI采集失败");

        // 执行测试
        ResponseEntity<GlobalExceptionHandler.WmiErrorResponse> response = 
                handler.handleWmiCollectionException(ex);

        // 验证结果
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        
        GlobalExceptionHandler.WmiErrorResponse errorResponse = response.getBody();
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR.value(), errorResponse.getStatus());
        assertTrue(errorResponse.getMessage().contains("WMI采集错误"));
        assertNull(errorResponse.getTargetHost());
        assertNull(errorResponse.getWmiClass());
        assertEquals(0, errorResponse.getRetryCount());
        assertEquals(0L, errorResponse.getDuration());
    }

    @Test
    void testWmiConnectionExceptionMinimal() {
        // 准备测试数据（最小参数）
        WmiConnectionException ex = new WmiConnectionException("WMI连接失败", "test-host");

        // 执行测试
        ResponseEntity<GlobalExceptionHandler.WmiConnectionErrorResponse> response = 
                handler.handleWmiConnectionException(ex);

        // 验证结果
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertNotNull(response.getBody());
        
        GlobalExceptionHandler.WmiConnectionErrorResponse errorResponse = response.getBody();
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE.value(), errorResponse.getStatus());
        assertTrue(errorResponse.getMessage().contains("WMI连接错误"));
        assertEquals("test-host", errorResponse.getTargetHost());
        assertNull(errorResponse.getConnectionString());
        assertEquals(0, errorResponse.getPort());
        assertNull(errorResponse.getProtocol());
    }

    @Test
    void testWmiAuthenticationExceptionMinimal() {
        // 准备测试数据（最小参数）
        WmiAuthenticationException ex = new WmiAuthenticationException("WMI认证失败", "test-host");

        // 执行测试
        ResponseEntity<GlobalExceptionHandler.WmiAuthenticationErrorResponse> response = 
                handler.handleWmiAuthenticationException(ex);

        // 验证结果
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        
        GlobalExceptionHandler.WmiAuthenticationErrorResponse errorResponse = response.getBody();
        assertEquals(HttpStatus.UNAUTHORIZED.value(), errorResponse.getStatus());
        assertTrue(errorResponse.getMessage().contains("WMI认证错误"));
        assertEquals("test-host", errorResponse.getTargetHost());
        assertNull(errorResponse.getUsername());
        assertNull(errorResponse.getDomain());
    }
}
