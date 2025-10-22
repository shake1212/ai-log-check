package com.security.ailogsystem.service;

import com.security.ailogsystem.config.DatabaseHealthIndicator;
import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 数据库监控服务
 * 提供数据库连接池状态监控和性能指标收集
 */
@Service
public class DatabaseMonitoringService {

    @Autowired
    private DataSource dataSource;
    
    @Autowired
    private DatabaseHealthIndicator healthIndicator;

    /**
     * 获取数据库连接池状态
     */
    public Map<String, Object> getPoolStatus() {
        Map<String, Object> status = new HashMap<>();
        
        if (dataSource instanceof HikariDataSource) {
            HikariDataSource hikariDataSource = (HikariDataSource) dataSource;
            HikariPoolMXBean poolBean = hikariDataSource.getHikariPoolMXBean();
            
            status.put("activeConnections", poolBean.getActiveConnections());
            status.put("idleConnections", poolBean.getIdleConnections());
            status.put("totalConnections", poolBean.getTotalConnections());
            status.put("threadsAwaitingConnection", poolBean.getThreadsAwaitingConnection());
            status.put("maximumPoolSize", hikariDataSource.getMaximumPoolSize());
            status.put("minimumIdle", hikariDataSource.getMinimumIdle());
            status.put("connectionTimeout", hikariDataSource.getConnectionTimeout());
            status.put("idleTimeout", hikariDataSource.getIdleTimeout());
            status.put("maxLifetime", hikariDataSource.getMaxLifetime());
            status.put("leakDetectionThreshold", hikariDataSource.getLeakDetectionThreshold());
            status.put("autoCommit", hikariDataSource.isAutoCommit());
            status.put("poolName", hikariDataSource.getPoolName());
        }
        
        return status;
    }

    /**
     * 获取数据库性能指标
     */
    public Map<String, Object> getPerformanceMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        
        try (Connection connection = dataSource.getConnection()) {
            // 获取数据库版本
            String version = connection.getMetaData().getDatabaseProductVersion();
            metrics.put("databaseVersion", version);
            
            // 获取连接信息
            metrics.put("databaseProductName", connection.getMetaData().getDatabaseProductName());
            metrics.put("driverName", connection.getMetaData().getDriverName());
            metrics.put("driverVersion", connection.getMetaData().getDriverVersion());
            
            // 获取数据库统计信息
            getDatabaseStats(connection, metrics);
            
        } catch (SQLException e) {
            metrics.put("error", "Failed to get performance metrics: " + e.getMessage());
        }
        
        return metrics;
    }

    /**
     * 获取数据库统计信息
     */
    private void getDatabaseStats(Connection connection, Map<String, Object> metrics) throws SQLException {
        // 获取表统计信息
        try (PreparedStatement stmt = connection.prepareStatement(
                "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = DATABASE()")) {
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                metrics.put("tableCount", rs.getInt("table_count"));
            }
        }
        
        // 获取数据库大小
        try (PreparedStatement stmt = connection.prepareStatement(
                "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS db_size_mb " +
                "FROM information_schema.tables WHERE table_schema = DATABASE()")) {
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                metrics.put("databaseSizeMB", rs.getDouble("db_size_mb"));
            }
        }
        
        // 获取连接数统计
        try (PreparedStatement stmt = connection.prepareStatement(
                "SHOW STATUS LIKE 'Threads_connected'")) {
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                metrics.put("threadsConnected", rs.getInt("Value"));
            }
        }
        
        // 获取查询统计
        try (PreparedStatement stmt = connection.prepareStatement(
                "SHOW STATUS LIKE 'Queries'")) {
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                metrics.put("totalQueries", rs.getLong("Value"));
            }
        }
    }

    /**
     * 执行健康检查
     */
    public Map<String, Object> healthCheck() {
        long startTime = System.currentTimeMillis();
        Map<String, Object> result = healthIndicator.checkHealth();
        
        long latency = System.currentTimeMillis() - startTime;
        result.put("latency", latency);
        result.put("timestamp", LocalDateTime.now().toString());
        
        return result;
    }

    /**
     * 获取慢查询统计
     */
    public Map<String, Object> getSlowQueries() {
        Map<String, Object> result = new HashMap<>();
        
        try (Connection connection = dataSource.getConnection()) {
            // 检查慢查询日志是否启用
            try (PreparedStatement stmt = connection.prepareStatement(
                    "SHOW VARIABLES LIKE 'slow_query_log'")) {
                ResultSet rs = stmt.executeQuery();
                if (rs.next()) {
                    result.put("slowQueryLogEnabled", "ON".equals(rs.getString("Value")));
                }
            }
            
            // 获取慢查询阈值
            try (PreparedStatement stmt = connection.prepareStatement(
                    "SHOW VARIABLES LIKE 'long_query_time'")) {
                ResultSet rs = stmt.executeQuery();
                if (rs.next()) {
                    result.put("slowQueryThreshold", rs.getDouble("Value"));
                }
            }
            
            // 获取慢查询计数
            try (PreparedStatement stmt = connection.prepareStatement(
                    "SHOW STATUS LIKE 'Slow_queries'")) {
                ResultSet rs = stmt.executeQuery();
                if (rs.next()) {
                    result.put("slowQueryCount", rs.getLong("Value"));
                }
            }
            
        } catch (SQLException e) {
            result.put("error", "Failed to get slow query stats: " + e.getMessage());
        }
        
        return result;
    }

    /**
     * 获取表统计信息
     */
    public Map<String, Object> getTableStats() {
        Map<String, Object> result = new HashMap<>();
        
        try (Connection connection = dataSource.getConnection()) {
            try (PreparedStatement stmt = connection.prepareStatement(
                    "SELECT " +
                    "table_name, " +
                    "table_rows, " +
                    "ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb, " +
                    "update_time " +
                    "FROM information_schema.tables " +
                    "WHERE table_schema = DATABASE() " +
                    "ORDER BY (data_length + index_length) DESC")) {
                try (ResultSet rs = stmt.executeQuery()) {
                    java.util.List<Map<String, Object>> tables = new java.util.ArrayList<>();
                    while (rs.next()) {
                        Map<String, Object> table = new HashMap<>();
                        table.put("table", rs.getString("table_name"));
                        table.put("records", rs.getLong("table_rows"));
                        table.put("size", rs.getDouble("size_mb") + "MB");
                        table.put("lastUpdate", rs.getTimestamp("update_time") != null ? 
                            rs.getTimestamp("update_time").toString() : "Unknown");
                        tables.add(table);
                    }
                    result.put("tables", tables);
                }
            }
        } catch (SQLException e) {
            result.put("error", "Failed to get table stats: " + e.getMessage());
        }
        
        return result;
    }

    /**
     * 获取连接池配置信息
     */
    public Map<String, Object> getPoolConfig() {
        Map<String, Object> config = new HashMap<>();
        
        if (dataSource instanceof HikariDataSource) {
            HikariDataSource hikariDataSource = (HikariDataSource) dataSource;
            
            config.put("maximumPoolSize", hikariDataSource.getMaximumPoolSize());
            config.put("minimumIdle", hikariDataSource.getMinimumIdle());
            config.put("connectionTimeout", hikariDataSource.getConnectionTimeout());
            config.put("idleTimeout", hikariDataSource.getIdleTimeout());
            config.put("maxLifetime", hikariDataSource.getMaxLifetime());
            config.put("leakDetectionThreshold", hikariDataSource.getLeakDetectionThreshold());
            config.put("autoCommit", hikariDataSource.isAutoCommit());
            config.put("poolName", hikariDataSource.getPoolName());
            config.put("jdbcUrl", hikariDataSource.getJdbcUrl());
            config.put("username", hikariDataSource.getUsername());
        }
        
        return config;
    }

    /**
     * 测试数据库连接
     */
    public boolean testConnection() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(5);
        } catch (SQLException e) {
            return false;
        }
    }

    /**
     * 获取数据库状态摘要
     */
    public Map<String, Object> getDatabaseStatus() {
        Map<String, Object> status = new HashMap<>();
        
        // 连接池状态
        Map<String, Object> poolStatus = getPoolStatus();
        status.put("poolStatus", poolStatus);
        
        // 性能指标
        Map<String, Object> performanceMetrics = getPerformanceMetrics();
        status.put("performanceMetrics", performanceMetrics);
        
        // 健康检查
        Map<String, Object> healthCheck = healthCheck();
        status.put("healthCheck", healthCheck);
        
        // 连接测试
        status.put("connectionTest", testConnection());
        
        // 时间戳
        status.put("timestamp", LocalDateTime.now().toString());
        
        return status;
    }
}
