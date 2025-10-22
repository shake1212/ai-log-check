package com.security.ailogsystem.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

/**
 * 数据库健康检查服务
 * 提供数据库连接池的健康状态检查
 */
@Component
public class DatabaseHealthIndicator {

    @Autowired
    private DataSource dataSource;

    /**
     * 执行数据库健康检查
     */
    public Map<String, Object> checkHealth() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // 测试数据库连接
            try (Connection connection = dataSource.getConnection()) {
                if (connection.isValid(5)) {
                    result.put("status", "UP");
                    result.put("healthy", true);
                    
                    // 添加连接池信息
                    if (dataSource instanceof HikariDataSource) {
                        HikariDataSource hikariDataSource = (HikariDataSource) dataSource;
                        var poolBean = hikariDataSource.getHikariPoolMXBean();
                        
                        result.put("poolName", hikariDataSource.getPoolName());
                        result.put("activeConnections", poolBean.getActiveConnections());
                        result.put("idleConnections", poolBean.getIdleConnections());
                        result.put("totalConnections", poolBean.getTotalConnections());
                        result.put("threadsAwaitingConnection", poolBean.getThreadsAwaitingConnection());
                        result.put("maximumPoolSize", hikariDataSource.getMaximumPoolSize());
                        result.put("minimumIdle", hikariDataSource.getMinimumIdle());
                        result.put("connectionTimeout", hikariDataSource.getConnectionTimeout());
                        result.put("idleTimeout", hikariDataSource.getIdleTimeout());
                        result.put("maxLifetime", hikariDataSource.getMaxLifetime());
                    }
                    
                    // 添加数据库信息
                    result.put("databaseProductName", connection.getMetaData().getDatabaseProductName());
                    result.put("databaseVersion", connection.getMetaData().getDatabaseProductVersion());
                    result.put("driverName", connection.getMetaData().getDriverName());
                    result.put("driverVersion", connection.getMetaData().getDriverVersion());
                    
                } else {
                    result.put("status", "DOWN");
                    result.put("healthy", false);
                    result.put("error", "Database connection is invalid");
                }
            }
        } catch (SQLException e) {
            result.put("status", "DOWN");
            result.put("healthy", false);
            result.put("error", "Database connection failed: " + e.getMessage());
            result.put("sqlState", e.getSQLState());
            result.put("errorCode", e.getErrorCode());
        } catch (Exception e) {
            result.put("status", "DOWN");
            result.put("healthy", false);
            result.put("error", "Unexpected error: " + e.getMessage());
        }
        
        return result;
    }
}
