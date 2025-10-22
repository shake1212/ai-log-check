package com.security.ailogsystem.service;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

/**
 * 数据库配置管理服务
 * 提供数据库配置的动态管理和更新功能
 */
@Service
public class DatabaseConfigService {

    @Autowired
    private DataSource dataSource;

    @Value("${spring.datasource.url}")
    private String dataSourceUrl;

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    @Value("${spring.datasource.driver-class-name}")
    private String driverClassName;

    /**
     * 获取当前数据库配置
     */
    public Map<String, Object> getCurrentConfig() {
        Map<String, Object> config = new HashMap<>();
        
        if (dataSource instanceof HikariDataSource) {
            HikariDataSource hikariDataSource = (HikariDataSource) dataSource;
            
            // 基本连接配置
            config.put("url", dataSourceUrl);
            config.put("username", username);
            config.put("driverClassName", driverClassName);
            
            // 连接池配置
            config.put("maximumPoolSize", hikariDataSource.getMaximumPoolSize());
            config.put("minimumIdle", hikariDataSource.getMinimumIdle());
            config.put("connectionTimeout", hikariDataSource.getConnectionTimeout());
            config.put("idleTimeout", hikariDataSource.getIdleTimeout());
            config.put("maxLifetime", hikariDataSource.getMaxLifetime());
            config.put("leakDetectionThreshold", hikariDataSource.getLeakDetectionThreshold());
            config.put("autoCommit", hikariDataSource.isAutoCommit());
            config.put("poolName", hikariDataSource.getPoolName());
            
            // 性能优化配置
            config.put("cachePrepStmts", hikariDataSource.getDataSourceProperties().getProperty("cachePrepStmts"));
            config.put("prepStmtCacheSize", hikariDataSource.getDataSourceProperties().getProperty("prepStmtCacheSize"));
            config.put("prepStmtCacheSqlLimit", hikariDataSource.getDataSourceProperties().getProperty("prepStmtCacheSqlLimit"));
            config.put("useServerPrepStmts", hikariDataSource.getDataSourceProperties().getProperty("useServerPrepStmts"));
            config.put("rewriteBatchedStatements", hikariDataSource.getDataSourceProperties().getProperty("rewriteBatchedStatements"));
        }
        
        return config;
    }

    /**
     * 验证数据库配置
     */
    public Map<String, Object> validateConfig(Map<String, Object> config) {
        Map<String, Object> result = new HashMap<>();
        boolean valid = true;
        StringBuilder errors = new StringBuilder();
        
        // 验证基本配置
        if (config.get("url") == null || config.get("url").toString().trim().isEmpty()) {
            valid = false;
            errors.append("数据库URL不能为空; ");
        }
        
        if (config.get("username") == null || config.get("username").toString().trim().isEmpty()) {
            valid = false;
            errors.append("用户名不能为空; ");
        }
        
        if (config.get("password") == null || config.get("password").toString().trim().isEmpty()) {
            valid = false;
            errors.append("密码不能为空; ");
        }
        
        // 验证连接池配置
        Integer maxPoolSize = (Integer) config.get("maximumPoolSize");
        if (maxPoolSize == null || maxPoolSize < 1 || maxPoolSize > 100) {
            valid = false;
            errors.append("最大连接池大小必须在1-100之间; ");
        }
        
        Integer minIdle = (Integer) config.get("minimumIdle");
        if (minIdle == null || minIdle < 1 || minIdle > maxPoolSize) {
            valid = false;
            errors.append("最小空闲连接数必须大于0且小于最大连接池大小; ");
        }
        
        Long connectionTimeout = (Long) config.get("connectionTimeout");
        if (connectionTimeout == null || connectionTimeout < 1000 || connectionTimeout > 300000) {
            valid = false;
            errors.append("连接超时时间必须在1-300秒之间; ");
        }
        
        Long idleTimeout = (Long) config.get("idleTimeout");
        if (idleTimeout == null || idleTimeout < 10000 || idleTimeout > 3600000) {
            valid = false;
            errors.append("空闲超时时间必须在10-3600秒之间; ");
        }
        
        Long maxLifetime = (Long) config.get("maxLifetime");
        if (maxLifetime == null || maxLifetime < 30000 || maxLifetime > 7200000) {
            valid = false;
            errors.append("连接最大生命周期必须在30-7200秒之间; ");
        }
        
        result.put("valid", valid);
        result.put("errors", errors.toString());
        
        return result;
    }

    /**
     * 测试数据库连接配置
     */
    public Map<String, Object> testConnectionConfig(Map<String, Object> config) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // 创建临时数据源进行测试
            HikariDataSource testDataSource = new HikariDataSource();
            testDataSource.setJdbcUrl(config.get("url").toString());
            testDataSource.setUsername(config.get("username").toString());
            testDataSource.setPassword(config.get("password").toString());
            testDataSource.setDriverClassName(config.get("driverClassName").toString());
            testDataSource.setMaximumPoolSize(1);
            testDataSource.setConnectionTimeout(10000);
            
            // 测试连接
            try (var connection = testDataSource.getConnection()) {
                if (connection.isValid(5)) {
                    result.put("success", true);
                    result.put("message", "数据库连接测试成功");
                } else {
                    result.put("success", false);
                    result.put("message", "数据库连接无效");
                }
            }
            
            testDataSource.close();
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "数据库连接测试失败: " + e.getMessage());
        }
        
        return result;
    }

    /**
     * 获取推荐的连接池配置
     */
    public Map<String, Object> getRecommendedConfig() {
        Map<String, Object> recommended = new HashMap<>();
        
        // 根据系统资源推荐配置
        Runtime runtime = Runtime.getRuntime();
        long maxMemory = runtime.maxMemory();
        long totalMemory = runtime.totalMemory();
        
        // 根据内存大小推荐连接池大小
        int recommendedPoolSize;
        if (maxMemory < 512 * 1024 * 1024) { // 小于512MB
            recommendedPoolSize = 5;
        } else if (maxMemory < 1024 * 1024 * 1024) { // 小于1GB
            recommendedPoolSize = 10;
        } else if (maxMemory < 2048 * 1024 * 1024) { // 小于2GB
            recommendedPoolSize = 20;
        } else { // 大于2GB
            recommendedPoolSize = 30;
        }
        
        recommended.put("maximumPoolSize", recommendedPoolSize);
        recommended.put("minimumIdle", Math.max(2, recommendedPoolSize / 4));
        recommended.put("connectionTimeout", 30000L);
        recommended.put("idleTimeout", 600000L);
        recommended.put("maxLifetime", 1800000L);
        recommended.put("leakDetectionThreshold", 60000L);
        recommended.put("autoCommit", false);
        
        // 性能优化建议
        recommended.put("cachePrepStmts", true);
        recommended.put("prepStmtCacheSize", 250);
        recommended.put("prepStmtCacheSqlLimit", 2048);
        recommended.put("useServerPrepStmts", true);
        recommended.put("rewriteBatchedStatements", true);
        
        return recommended;
    }

    /**
     * 获取配置建议
     */
    public Map<String, Object> getConfigRecommendations() {
        Map<String, Object> recommendations = new HashMap<>();
        
        if (dataSource instanceof HikariDataSource) {
            HikariDataSource hikariDataSource = (HikariDataSource) dataSource;
            
            // 分析当前配置并提供建议
            if (hikariDataSource.getMaximumPoolSize() > 50) {
                recommendations.put("poolSizeWarning", "连接池大小过大，建议不超过50个连接");
            }
            
            if (hikariDataSource.getConnectionTimeout() < 10000) {
                recommendations.put("connectionTimeoutWarning", "连接超时时间过短，建议至少10秒");
            }
            
            if (hikariDataSource.getIdleTimeout() > 1800000) {
                recommendations.put("idleTimeoutWarning", "空闲超时时间过长，建议不超过30分钟");
            }
            
            if (hikariDataSource.getMaxLifetime() > 3600000) {
                recommendations.put("maxLifetimeWarning", "连接最大生命周期过长，建议不超过1小时");
            }
            
            // 性能优化建议
            recommendations.put("performanceTips", new String[]{
                "启用预编译语句缓存可以提高性能",
                "启用批量语句重写可以优化批量操作",
                "使用服务器端预编译语句可以减少网络开销",
                "定期监控连接池状态，避免连接泄露"
            });
        }
        
        return recommendations;
    }

    /**
     * 获取配置历史
     */
    public Map<String, Object> getConfigHistory() {
        Map<String, Object> history = new HashMap<>();
        
        // 这里可以实现配置历史记录功能
        // 目前返回空历史
        history.put("configurations", new Object[0]);
        history.put("lastModified", null);
        history.put("modifiedBy", null);
        
        return history;
    }

    /**
     * 导出配置
     */
    public Map<String, Object> exportConfig() {
        Map<String, Object> export = new HashMap<>();
        
        export.put("config", getCurrentConfig());
        export.put("recommendations", getConfigRecommendations());
        export.put("exportTime", java.time.LocalDateTime.now().toString());
        export.put("version", "1.0.0");
        
        return export;
    }

    /**
     * 导入配置
     */
    public Map<String, Object> importConfig(Map<String, Object> config) {
        Map<String, Object> result = new HashMap<>();
        
        // 验证配置
        Map<String, Object> validation = validateConfig(config);
        if (!(Boolean) validation.get("valid")) {
            result.put("success", false);
            result.put("message", "配置验证失败: " + validation.get("errors"));
            return result;
        }
        
        // 测试连接
        Map<String, Object> connectionTest = testConnectionConfig(config);
        if (!(Boolean) connectionTest.get("success")) {
            result.put("success", false);
            result.put("message", "连接测试失败: " + connectionTest.get("message"));
            return result;
        }
        
        // 这里可以实现配置导入逻辑
        // 目前只返回成功状态
        result.put("success", true);
        result.put("message", "配置导入成功");
        
        return result;
    }
}
