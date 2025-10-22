# 数据库连接池配置说明

## 概述

本项目使用HikariCP作为数据库连接池，提供了高性能、可监控的MySQL数据库连接管理功能。

## 核心组件

### 1. 数据库配置类 (`DatabaseConfig.java`)
- 配置HikariCP连接池参数
- 设置JPA实体管理器
- 配置事务管理器
- 性能优化配置

### 2. 数据库监控服务 (`DatabaseMonitoringService.java`)
- 连接池状态监控
- 性能指标收集
- 健康检查功能
- 慢查询统计

### 3. 数据库配置服务 (`DatabaseConfigService.java`)
- 配置动态管理
- 配置验证
- 连接测试
- 配置推荐

### 4. 数据库控制器
- `DatabaseController.java`: 监控API
- `DatabaseConfigController.java`: 配置管理API

### 5. 健康检查 (`DatabaseHealthIndicator.java`)
- Spring Boot Actuator集成
- 详细的健康状态信息

### 6. 指标监控 (`DatabaseMetricsConfig.java`)
- Micrometer指标集成
- Prometheus监控支持

## 连接池配置

### 基本配置
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20          # 最大连接数
      minimum-idle: 5                # 最小空闲连接数
      connection-timeout: 30000      # 连接超时时间(毫秒)
      idle-timeout: 600000          # 空闲超时时间(毫秒)
      max-lifetime: 1800000         # 连接最大生命周期(毫秒)
      leak-detection-threshold: 60000 # 连接泄露检测阈值(毫秒)
      auto-commit: false            # 自动提交
      pool-name: "AiLogSystem-Pool" # 连接池名称
```

### 性能优化配置
```yaml
spring:
  datasource:
    hikari:
      data-source-properties:
        cachePrepStmts: true                    # 缓存预编译语句
        prepStmtCacheSize: 250                  # 预编译语句缓存大小
        prepStmtCacheSqlLimit: 2048             # 预编译语句缓存SQL限制
        useServerPrepStmts: true                # 使用服务器端预编译语句
        useLocalSessionState: true              # 使用本地会话状态
        rewriteBatchedStatements: true          # 重写批量语句
        cacheResultSetMetadata: true            # 缓存结果集元数据
        cacheServerConfiguration: true          # 缓存服务器配置
        elideSetAutoCommits: true               # 省略设置自动提交
        maintainTimeStats: false                # 维护时间统计
```

## 监控功能

### 1. 连接池状态监控
- 活跃连接数
- 空闲连接数
- 总连接数
- 等待连接的线程数

### 2. 性能指标
- 连接超时时间
- 空闲超时时间
- 连接最大生命周期
- 连接泄露检测

### 3. 健康检查
- 数据库连接测试
- 连接池状态检查
- 详细错误信息

### 4. 慢查询监控
- 慢查询日志配置
- 慢查询阈值设置
- 慢查询统计

## API接口

### 监控接口
- `GET /api/database/status` - 获取数据库状态概览
- `GET /api/database/pool/status` - 获取连接池状态
- `GET /api/database/performance` - 获取性能指标
- `GET /api/database/health` - 健康检查
- `GET /api/database/slow-queries` - 慢查询统计
- `GET /api/database/tables` - 表统计信息

### 配置管理接口
- `GET /api/database/config` - 获取当前配置
- `POST /api/database/config/validate` - 验证配置
- `POST /api/database/config/test-connection` - 测试连接配置
- `GET /api/database/config/recommendations` - 获取推荐配置
- `PUT /api/database/config` - 更新配置
- `POST /api/database/config/reset` - 重置配置

## 监控端点

### Spring Boot Actuator
- `/actuator/health` - 健康检查
- `/actuator/metrics` - 指标信息
- `/actuator/prometheus` - Prometheus指标

### 自定义健康检查
- 数据库连接状态
- 连接池状态
- 详细错误信息

## 性能优化建议

### 1. 连接池大小
- 根据并发量设置合适的连接池大小
- 建议最大连接数不超过50
- 最小空闲连接数设置为最大连接数的1/4

### 2. 超时设置
- 连接超时时间：10-30秒
- 空闲超时时间：10-30分钟
- 连接最大生命周期：30分钟-1小时

### 3. 监控配置
- 启用连接泄露检测
- 设置合理的泄露检测阈值
- 定期监控连接池状态

### 4. 数据库优化
- 启用预编译语句缓存
- 使用服务器端预编译语句
- 启用批量语句重写

## 故障排查

### 1. 连接超时
- 检查数据库服务器状态
- 验证网络连接
- 调整连接超时时间

### 2. 连接池耗尽
- 检查是否有连接泄露
- 增加连接池大小
- 优化查询性能

### 3. 性能问题
- 监控慢查询
- 优化数据库索引
- 调整连接池参数

### 4. 连接泄露
- 启用连接泄露检测
- 检查代码中的连接关闭
- 使用try-with-resources

## 部署配置

### 1. 环境变量
```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ai_log_system
DB_USER=root
DB_PASSWORD=your_password

# 连接池配置
DB_MAX_POOL_SIZE=20
DB_MIN_IDLE=5
DB_CONNECTION_TIMEOUT=30000
DB_IDLE_TIMEOUT=600000
DB_MAX_LIFETIME=1800000
```

### 2. Docker配置
```yaml
version: '3.8'
services:
  app:
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=ai_log_system
      - DB_USER=root
      - DB_PASSWORD=password
    depends_on:
      - mysql

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=ai_log_system
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
```

## 最佳实践

### 1. 连接池配置
- 根据系统负载调整连接池大小
- 设置合理的超时时间
- 启用连接泄露检测

### 2. 监控告警
- 设置连接池使用率告警
- 监控慢查询
- 定期检查健康状态

### 3. 性能优化
- 使用连接池预热
- 优化数据库查询
- 定期清理过期数据

### 4. 安全配置
- 使用环境变量存储敏感信息
- 启用SSL连接
- 定期更新数据库密码

## 总结

通过完善的数据库连接池配置和监控功能，系统能够：

1. **高性能**: 使用HikariCP提供高性能的连接池管理
2. **可监控**: 提供详细的监控指标和健康检查
3. **可配置**: 支持动态配置管理和验证
4. **可扩展**: 支持多种监控和指标系统
5. **可维护**: 提供完善的故障排查和优化建议

这套数据库连接池解决方案为AI日志异常检测与预警系统提供了稳定、高效的数据访问基础。
