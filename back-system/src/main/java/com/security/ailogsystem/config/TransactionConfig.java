package com.security.ailogsystem.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;

import jakarta.persistence.EntityManagerFactory;

/**
 * 数据库事务管理配置
 * 
 * @author AI Log System
 * @version 1.0
 */
@Configuration
@EnableTransactionManagement
public class TransactionConfig {

    /**
     * 配置JPA事务管理器
     * 
     * @param entityManagerFactory 实体管理器工厂
     * @return JPA事务管理器
     */
    @Bean
    public PlatformTransactionManager transactionManager(EntityManagerFactory entityManagerFactory) {
        JpaTransactionManager transactionManager = new JpaTransactionManager();
        transactionManager.setEntityManagerFactory(entityManagerFactory);
        
        // 设置事务超时时间（秒）
        transactionManager.setDefaultTimeout(30);
        
        // 设置回滚规则
        transactionManager.setRollbackOnCommitFailure(true);
        
        // 设置事务传播行为
        transactionManager.setNestedTransactionAllowed(true);
        
        return transactionManager;
    }

    /**
     * 配置编程式事务模板
     * 
     * @param transactionManager 事务管理器
     * @return 事务模板
     */
    @Bean
    public TransactionTemplate transactionTemplate(PlatformTransactionManager transactionManager) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        
        // 设置事务超时时间（秒）
        template.setTimeout(30);
        
        // 设置只读事务
        template.setReadOnly(false);
        
        // 设置事务隔离级别
        template.setIsolationLevel(TransactionTemplate.ISOLATION_READ_COMMITTED);
        
        return template;
    }

    /**
     * 配置只读事务模板
     * 
     * @param transactionManager 事务管理器
     * @return 只读事务模板
     */
    @Bean("readOnlyTransactionTemplate")
    public TransactionTemplate readOnlyTransactionTemplate(PlatformTransactionManager transactionManager) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        
        // 设置只读事务
        template.setReadOnly(true);
        
        // 设置较短的超时时间
        template.setTimeout(10);
        
        // 设置事务隔离级别
        template.setIsolationLevel(TransactionTemplate.ISOLATION_READ_COMMITTED);
        
        return template;
    }

    /**
     * 配置批量操作事务模板
     * 
     * @param transactionManager 事务管理器
     * @return 批量操作事务模板
     */
    @Bean("batchTransactionTemplate")
    public TransactionTemplate batchTransactionTemplate(PlatformTransactionManager transactionManager) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        
        // 设置较长的超时时间用于批量操作
        template.setTimeout(300);
        
        // 设置只读事务
        template.setReadOnly(false);
        
        // 设置事务隔离级别
        template.setIsolationLevel(TransactionTemplate.ISOLATION_READ_COMMITTED);
        
        return template;
    }
}
