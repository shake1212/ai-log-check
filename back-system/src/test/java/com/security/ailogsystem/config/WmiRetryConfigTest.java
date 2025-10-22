package com.security.ailogsystem.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.retry.support.RetryTemplate;
import org.springframework.test.context.TestPropertySource;

import static org.junit.jupiter.api.Assertions.*;

/**
 * WMI重试机制配置测试
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
class WmiRetryConfigTest {

    @Autowired
    private RetryTemplate wmiRetryTemplate;

    @Autowired
    private RetryTemplate wmiExponentialRetryTemplate;

    @Autowired
    private RetryTemplate wmiQuickRetryTemplate;

    @Autowired
    private RetryTemplate wmiLongRetryTemplate;

    @Test
    void testWmiRetryTemplateBean() {
        assertNotNull(wmiRetryTemplate, "WMI重试模板应该被正确创建");
        // RetryTemplate没有isReadOnly方法，直接验证不为null即可
    }

    @Test
    void testWmiExponentialRetryTemplateBean() {
        assertNotNull(wmiExponentialRetryTemplate, "WMI指数退避重试模板应该被正确创建");
        // RetryTemplate没有isReadOnly方法，直接验证不为null即可
    }

    @Test
    void testWmiQuickRetryTemplateBean() {
        assertNotNull(wmiQuickRetryTemplate, "WMI快速重试模板应该被正确创建");
        // RetryTemplate没有isReadOnly方法，直接验证不为null即可
    }

    @Test
    void testWmiLongRetryTemplateBean() {
        assertNotNull(wmiLongRetryTemplate, "WMI长时间重试模板应该被正确创建");
        // RetryTemplate没有isReadOnly方法，直接验证不为null即可
    }

    @Test
    void testRetryTemplateExecution() {
        // 测试重试模板执行
        int attemptCount = 0;
        
        try {
            wmiRetryTemplate.execute(context -> {
                // 模拟失败操作
                throw new RuntimeException("模拟WMI连接失败");
            });
        } catch (RuntimeException e) {
            // 预期会抛出异常
            assertTrue(e.getMessage().contains("模拟WMI连接失败"));
        }
    }

    @Test
    void testRetryTemplateWithSuccess() {
        // 测试重试模板成功执行
        String result = wmiRetryTemplate.execute(context -> {
            // 模拟成功操作
            return "WMI连接成功";
        });
        
        assertEquals("WMI连接成功", result);
    }

    @Test
    void testExponentialRetryTemplate() {
        // 测试指数退避重试模板
        long startTime = System.currentTimeMillis();
        
        try {
            wmiExponentialRetryTemplate.execute(context -> {
                // 模拟失败操作
                throw new RuntimeException("模拟WMI查询失败");
            });
        } catch (RuntimeException e) {
            // 预期会抛出异常
            assertTrue(e.getMessage().contains("模拟WMI查询失败"));
        }
        
        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;
        
        // 验证指数退避延迟（应该比固定延迟更长）
        assertTrue(duration > 1000, "指数退避重试应该有延迟");
    }

    @Test
    void testQuickRetryTemplate() {
        // 测试快速重试模板
        long startTime = System.currentTimeMillis();
        
        try {
            wmiQuickRetryTemplate.execute(context -> {
                // 模拟失败操作
                throw new RuntimeException("模拟WMI连接测试失败");
            });
        } catch (RuntimeException e) {
            // 预期会抛出异常
            assertTrue(e.getMessage().contains("模拟WMI连接测试失败"));
        }
        
        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;
        
        // 验证快速重试延迟（应该比较短）
        assertTrue(duration < 2000, "快速重试延迟应该比较短");
    }

    @Test
    void testLongRetryTemplate() {
        // 测试长时间重试模板
        long startTime = System.currentTimeMillis();
        
        try {
            wmiLongRetryTemplate.execute(context -> {
                // 模拟失败操作
                throw new RuntimeException("模拟WMI批量操作失败");
            });
        } catch (RuntimeException e) {
            // 预期会抛出异常
            assertTrue(e.getMessage().contains("模拟WMI批量操作失败"));
        }
        
        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;
        
        // 验证长时间重试延迟（应该比较长）
        assertTrue(duration > 2000, "长时间重试应该有较长的延迟");
    }

    @Test
    void testRetryTemplateWithPartialSuccess() {
        // 测试部分成功的重试场景
        int[] attemptCount = {0};
        
        String result = wmiRetryTemplate.execute(context -> {
            attemptCount[0]++;
            if (attemptCount[0] < 2) {
                // 前两次尝试失败
                throw new RuntimeException("模拟WMI连接失败，尝试次数: " + attemptCount[0]);
            }
            // 第三次尝试成功
            return "WMI连接成功，尝试次数: " + attemptCount[0];
        });
        
        assertEquals("WMI连接成功，尝试次数: 2", result);
        assertEquals(2, attemptCount[0], "应该重试了2次");
    }

    @Test
    void testRetryTemplateMaxAttempts() {
        // 测试最大重试次数
        int[] attemptCount = {0};
        
        try {
            wmiRetryTemplate.execute(context -> {
                attemptCount[0]++;
                // 始终失败
                throw new RuntimeException("模拟WMI连接持续失败，尝试次数: " + attemptCount[0]);
            });
        } catch (RuntimeException e) {
            // 预期会抛出异常
            assertTrue(e.getMessage().contains("模拟WMI连接持续失败"));
        }
        
        // 验证重试次数（默认最大重试3次，总共执行4次）
        assertEquals(4, attemptCount[0], "应该达到最大重试次数");
    }
}
