# HikariCP MBean冲突解决方案

## 问题描述
```
MXBean already registered with name com.zaxxer.hikari:type=PoolConfig (AiLogSystem-Pool) 
Unable to register MBean [HikariDataSource (AiLogSystem-Pool)] with key 'dataSource'
```

## 问题原因
这个错误通常发生在以下情况：
1. Spring Boot自动配置和手动配置HikariCP冲突
2. 多个DataSource Bean被注册
3. MBean名称重复

## 解决方案

### 1. 使用Spring Boot自动配置（推荐）
```yaml
# application.yml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/ai_log_system?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true
    username: root
    password: 123456
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
      leak-detection-threshold: 60000
      auto-commit: false
      pool-name: "AiLogSystem-Pool"
      register-mbeans: false  # 禁用MBean注册
```

### 2. 避免手动配置DataSource Bean
```java
// 不要手动创建DataSource Bean
// @Configuration
// public class DatabaseConfig {
//     @Bean
//     public DataSource dataSource() { ... }
// }
```

### 3. 使用简化的配置类
```java
@Configuration
@EnableJpaRepositories(basePackages = "com.security.ailogsystem.repository")
@EnableTransactionManagement
public class SimpleDatabaseConfig {
    // 使用Spring Boot自动配置
    // 通过application.yml配置HikariCP
}
```

## 当前状态
- ✅ 已禁用手动DataSource配置
- ✅ 已设置register-mbeans: false
- ✅ 使用Spring Boot自动配置
- ✅ 应用可以正常启动

## 验证方法
1. 检查应用启动日志，确认没有MBean冲突错误
2. 访问健康检查接口：`GET /api/database/health`
3. 检查连接池状态：`GET /api/database/pool/status`

## 注意事项
1. 使用Spring Boot自动配置更稳定
2. 避免手动配置DataSource Bean
3. 如需自定义配置，通过application.yml进行
4. MBean监控功能已禁用，但基本监控功能仍然可用

## 后续优化
如果需要启用MBean监控，可以考虑：
1. 使用JMX配置
2. 集成Micrometer指标
3. 使用Spring Boot Actuator端点
