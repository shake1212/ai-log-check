package com.security.ailogsystem.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 事务管理配置测试
 * 
 * @author AI Log System
 * @version 1.0
 */
@SpringBootTest
@ActiveProfiles("test")
class TransactionConfigTest {

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Autowired
    private TransactionTemplate readOnlyTransactionTemplate;

    @Autowired
    private TransactionTemplate batchTransactionTemplate;

    @Test
    void testTransactionManagerBean() {
        assertNotNull(transactionManager, "事务管理器应该被正确配置");
        assertTrue(transactionManager instanceof org.springframework.orm.jpa.JpaTransactionManager, 
                "应该是JPA事务管理器");
    }

    @Test
    void testTransactionTemplateBean() {
        assertNotNull(transactionTemplate, "事务模板应该被正确配置");
        assertEquals(30, transactionTemplate.getTimeout(), "默认超时时间应该是30秒");
        assertFalse(transactionTemplate.isReadOnly(), "默认事务模板不应该是只读的");
    }

    @Test
    void testReadOnlyTransactionTemplateBean() {
        assertNotNull(readOnlyTransactionTemplate, "只读事务模板应该被正确配置");
        assertTrue(readOnlyTransactionTemplate.isReadOnly(), "只读事务模板应该是只读的");
        assertEquals(10, readOnlyTransactionTemplate.getTimeout(), "只读事务超时时间应该是10秒");
    }

    @Test
    void testBatchTransactionTemplateBean() {
        assertNotNull(batchTransactionTemplate, "批量操作事务模板应该被正确配置");
        assertEquals(300, batchTransactionTemplate.getTimeout(), "批量操作超时时间应该是300秒");
        assertFalse(batchTransactionTemplate.isReadOnly(), "批量操作事务模板不应该是只读的");
    }

    @Test
    void testTransactionExecution() {
        // 测试事务正常执行
        String result = transactionTemplate.execute(status -> {
            assertFalse(status.isRollbackOnly(), "事务不应该被标记为回滚");
            return "success";
        });
        
        assertEquals("success", result, "事务应该正常执行并返回结果");
    }

    @Test
    void testTransactionRollback() {
        // 测试事务回滚
        assertThrows(RuntimeException.class, () -> {
            transactionTemplate.execute(status -> {
                status.setRollbackOnly();
                throw new RuntimeException("测试回滚");
            });
        }, "事务应该回滚并抛出异常");
    }

    @Test
    void testReadOnlyTransaction() {
        // 测试只读事务
        String result = readOnlyTransactionTemplate.execute(status -> {
            assertTrue(status.isReadOnly(), "只读事务应该被标记为只读");
            return "readonly-success";
        });
        
        assertEquals("readonly-success", result, "只读事务应该正常执行");
    }
}
