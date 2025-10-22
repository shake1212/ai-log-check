package com.security.ailogsystem.exception;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 全局异常处理器测试
 * 
 * @author AI Log System
 * @version 1.0
 */
@SpringBootTest
@ActiveProfiles("test")
class GlobalExceptionHandlerTest {

    @Autowired
    private GlobalExceptionHandler globalExceptionHandler;

    @Test
    void testHandleDatabaseException() {
        // 测试数据库异常处理
        DatabaseException ex = new DatabaseException("数据库连接失败");
        ResponseEntity<GlobalExceptionHandler.ErrorResponse> response = 
                globalExceptionHandler.handleDatabaseException(ex);
        
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("数据库操作失败: 数据库连接失败", response.getBody().getMessage());
    }

    @Test
    void testHandleTransactionException() {
        // 测试事务异常处理
        TransactionException ex = new TransactionException("事务提交失败");
        ResponseEntity<GlobalExceptionHandler.ErrorResponse> response = 
                globalExceptionHandler.handleTransactionException(ex);
        
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("事务操作失败: 事务提交失败", response.getBody().getMessage());
    }

    @Test
    void testHandleBatchOperationException() {
        // 测试批量操作异常处理
        BatchOperationException ex = new BatchOperationException("批量操作部分失败", 5, 2, 7);
        ResponseEntity<GlobalExceptionHandler.BatchErrorResponse> response = 
                globalExceptionHandler.handleBatchOperationException(ex);
        
        assertEquals(HttpStatus.PARTIAL_CONTENT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("批量操作部分失败: 批量操作部分失败", response.getBody().getMessage());
        assertEquals(5, response.getBody().getSuccessCount());
        assertEquals(2, response.getBody().getErrorCount());
        assertEquals(7, response.getBody().getTotalCount());
    }

    @Test
    void testHandleDataIntegrityException() {
        // 测试数据完整性异常处理
        DataIntegrityException ex = new DataIntegrityException("外键约束违反");
        ResponseEntity<GlobalExceptionHandler.ErrorResponse> response = 
                globalExceptionHandler.handleDataIntegrityException(ex);
        
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("数据完整性错误: 外键约束违反", response.getBody().getMessage());
    }

    @Test
    void testHandleSQLException() {
        // 测试SQL异常处理
        SQLException ex = new SQLException("SQL语法错误");
        ResponseEntity<GlobalExceptionHandler.ErrorResponse> response = 
                globalExceptionHandler.handleSQLException(ex);
        
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("数据库SQL错误: SQL语法错误", response.getBody().getMessage());
    }

    @Test
    void testHandleGlobalException() {
        // 测试全局异常处理
        RuntimeException ex = new RuntimeException("未知错误");
        ResponseEntity<GlobalExceptionHandler.ErrorResponse> response = 
                globalExceptionHandler.handleGlobalException(ex);
        
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("系统内部错误: 未知错误", response.getBody().getMessage());
    }

    @Test
    void testErrorResponseStructure() {
        // 测试错误响应结构
        DatabaseException ex = new DatabaseException("测试错误");
        ResponseEntity<GlobalExceptionHandler.ErrorResponse> response = 
                globalExceptionHandler.handleDatabaseException(ex);
        
        GlobalExceptionHandler.ErrorResponse errorResponse = response.getBody();
        assertNotNull(errorResponse);
        assertNotNull(errorResponse.getTimestamp());
        assertTrue(errorResponse.getStatus() > 0);
        assertNotNull(errorResponse.getMessage());
    }

    @Test
    void testBatchErrorResponseStructure() {
        // 测试批量操作错误响应结构
        BatchOperationException ex = new BatchOperationException("批量操作测试", 3, 1, 4);
        ResponseEntity<GlobalExceptionHandler.BatchErrorResponse> response = 
                globalExceptionHandler.handleBatchOperationException(ex);
        
        GlobalExceptionHandler.BatchErrorResponse errorResponse = response.getBody();
        assertNotNull(errorResponse);
        assertEquals(3, errorResponse.getSuccessCount());
        assertEquals(1, errorResponse.getErrorCount());
        assertEquals(4, errorResponse.getTotalCount());
        assertEquals(0.75, errorResponse.getSuccessRate(), 0.01);
        assertEquals(0.25, errorResponse.getErrorRate(), 0.01);
    }
}
