# MySQL数据库连接池和数据源配置指南

## 概述

本文档介绍如何配置MySQL数据库连接池和数据源，为AI日志异常检测与预警系统提供数据持久化支持。

## 目录结构

```
src/
├── config/
│   └── database.ts          # 数据库配置管理
├── services/
│   ├── DatabasePool.ts      # 连接池管理器
│   └── DatabaseService.ts   # 数据库服务
├── database/
│   ├── schema.sql          # 数据库表结构
│   └── migrations.ts       # 迁移管理器
└── pages/
    └── database/
        └── index.tsx       # 数据库管理页面
```

## 配置说明

### 1. 数据库连接配置

```typescript
interface DatabaseConfig {
  host: string;              // 数据库主机地址
  port: number;              // 数据库端口
  database: string;          // 数据库名称
  username: string;          // 用户名
  password: string;          // 密码
  charset: string;           // 字符集
  timezone: string;          // 时区
  connectionLimit: number;   // 连接池大小
  acquireTimeout: number;    // 获取连接超时时间
  timeout: number;           // 连接超时时间
  reconnect: boolean;        // 是否自动重连
  queryTimeout: number;      // 查询超时时间
  debug: boolean;            // 调试模式
  ssl?: {                    // SSL配置
    enabled: boolean;
    rejectUnauthorized: boolean;
  };
}
```

### 2. 连接池配置

```typescript
interface PoolConfig {
  min: number;               // 最小连接数
  max: number;               // 最大连接数
  idle: number;              // 空闲超时时间
  acquire: number;           // 获取连接超时时间
  evict: number;             // 驱逐间隔时间
  handleDisconnects: boolean; // 处理断开连接
}
```

## 环境变量配置

创建 `.env` 文件：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ai_log_system
DB_USER=root
DB_PASSWORD=your_password_here
DB_SSL=false

# 连接池配置
DB_CONNECTION_LIMIT=20
DB_ACQUIRE_TIMEOUT=60000
DB_TIMEOUT=60000
DB_QUERY_TIMEOUT=30000
```

## 数据库表结构

### 核心表

1. **用户表 (users)**
   - 存储系统用户信息
   - 支持角色权限管理

2. **WMI连接表 (wmi_connections)**
   - 存储WMI连接配置
   - 监控连接状态

3. **日志数据表 (log_entries)**
   - 存储采集的日志数据
   - 支持分区存储

4. **性能指标表 (performance_metrics)**
   - 存储系统性能数据
   - 支持趋势分析

5. **告警表 (alerts)**
   - 存储系统告警信息
   - 支持告警处理流程

### 分区策略

- **日志表按月分区**：提高查询性能
- **性能指标表按天分区**：便于数据清理

## 连接池管理

### 1. 连接池初始化

```typescript
import { initializeDatabaseService } from './services/DatabaseService';

const dbService = await initializeDatabaseService({
  autoMigrate: true,
  healthCheckInterval: 30000,
  reconnectOnError: true
});
```

### 2. 连接池监控

```typescript
// 获取连接池状态
const status = dbService.getStatus();

// 获取连接池统计
const stats = dbService.getPoolStats();

// 健康检查
const isHealthy = await dbService.isHealthy();
```

### 3. 查询操作

```typescript
// 简单查询
const result = await dbService.query('SELECT * FROM users WHERE id = ?', [userId]);

// 事务操作
await dbService.transaction(async (transaction) => {
  await transaction.query('INSERT INTO users (name) VALUES (?)', ['John']);
  await transaction.query('INSERT INTO audit_logs (action) VALUES (?)', ['user_created']);
});

// 批量操作
const queries = [
  { sql: 'INSERT INTO users (name) VALUES (?)', params: ['User1'] },
  { sql: 'INSERT INTO users (name) VALUES (?)', params: ['User2'] }
];
await dbService.batchQuery(queries);
```

## 数据库迁移

### 1. 迁移管理

```typescript
import MigrationManager from './database/migrations';

const migrationManager = new MigrationManager(pool);

// 初始化迁移表
await migrationManager.initialize();

// 执行迁移到最新版本
await migrationManager.migrate();

// 执行迁移到指定版本
await migrationManager.migrateTo('1.0.2');

// 回滚到指定版本
await migrationManager.rollbackTo('1.0.1');
```

### 2. 迁移状态

```typescript
// 获取迁移状态
const status = await migrationManager.getStatus();

// 获取已执行的迁移
const applied = await migrationManager.getAppliedMigrations();

// 获取待执行的迁移
const pending = migrationManager.getPendingMigrations();
```

## 性能优化

### 1. 索引优化

```sql
-- 为日志表添加复合索引
CREATE INDEX idx_log_timestamp_source ON log_entries(timestamp, source);
CREATE INDEX idx_log_event_type_severity ON log_entries(event_type, severity);

-- 为性能指标表添加索引
CREATE INDEX idx_perf_timestamp ON performance_metrics(timestamp);
CREATE INDEX idx_perf_cpu_memory ON performance_metrics(cpu_usage, memory_usage);
```

### 2. 查询优化

```sql
-- 使用分区裁剪
SELECT * FROM log_entries 
WHERE timestamp >= '2024-01-01' AND timestamp < '2024-02-01';

-- 使用覆盖索引
SELECT id, timestamp, source FROM log_entries 
WHERE event_type = 'authentication';

-- 避免全表扫描
SELECT * FROM log_entries 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR);
```

### 3. 连接池调优

```typescript
// 生产环境配置
const productionConfig = {
  database: {
    connectionLimit: 50,
    acquireTimeout: 30000,
    timeout: 30000,
    queryTimeout: 15000
  },
  pool: {
    min: 10,
    max: 50,
    idle: 30000,
    acquire: 30000
  }
};
```

## 监控和告警

### 1. 连接池监控

- 活跃连接数
- 空闲连接数
- 等待连接数
- 连接错误数
- 平均查询时间

### 2. 性能监控

- 查询响应时间
- 事务处理时间
- 锁等待时间
- 慢查询统计

### 3. 告警配置

```typescript
// 连接池告警
if (activeConnections > maxConnections * 0.8) {
  // 发送告警
}

// 慢查询告警
if (queryTime > 5000) {
  // 记录慢查询
}
```

## 故障处理

### 1. 连接超时

```typescript
// 自动重连机制
if (error.code === 'PROTOCOL_CONNECTION_LOST') {
  await pool.reconnect();
}
```

### 2. 查询超时

```typescript
// 查询超时处理
try {
  const result = await pool.query(sql, params);
} catch (error) {
  if (error.code === 'PROTOCOL_TIMEOUT') {
    // 记录超时查询
    logger.warn('Query timeout', { sql, params });
  }
}
```

### 3. 连接池耗尽

```typescript
// 连接池监控
if (waitingConnections > 0) {
  // 发送告警
  alertService.sendAlert({
    type: 'warning',
    message: '连接池等待连接数过多'
  });
}
```

## 安全配置

### 1. 连接加密

```typescript
const sslConfig = {
  ssl: {
    enabled: true,
    rejectUnauthorized: true,
    ca: fs.readFileSync('ca-cert.pem'),
    key: fs.readFileSync('client-key.pem'),
    cert: fs.readFileSync('client-cert.pem')
  }
};
```

### 2. 密码加密

```typescript
// 使用环境变量存储密码
const password = process.env.DB_PASSWORD;

// 密码加密存储
const hashedPassword = bcrypt.hashSync(password, 10);
```

### 3. 访问控制

```sql
-- 创建专用数据库用户
CREATE USER 'ai_log_user'@'localhost' IDENTIFIED BY 'secure_password';

-- 授予最小权限
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_log_system.* TO 'ai_log_user'@'localhost';
```

## 部署配置

### 1. Docker部署

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
EXPOSE 8000

CMD ["npm", "start"]
```

### 2. Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8000:8000"
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
      - ./src/database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "3306:3306"

volumes:
  mysql_data:
```

## 最佳实践

### 1. 连接池配置

- 根据并发量设置合适的连接池大小
- 监控连接池使用情况
- 设置合理的超时时间

### 2. 查询优化

- 使用索引优化查询性能
- 避免全表扫描
- 合理使用分区表

### 3. 监控告警

- 设置关键指标监控
- 配置告警阈值
- 建立故障处理流程

### 4. 数据备份

- 定期备份数据库
- 测试备份恢复流程
- 建立灾难恢复计划

## 故障排查

### 1. 连接问题

```bash
# 检查数据库连接
mysql -h localhost -P 3306 -u root -p

# 检查端口占用
netstat -tlnp | grep 3306
```

### 2. 性能问题

```sql
-- 查看慢查询
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';

-- 查看连接状态
SHOW PROCESSLIST;

-- 查看表状态
SHOW TABLE STATUS;
```

### 3. 日志分析

```bash
# 查看MySQL错误日志
tail -f /var/log/mysql/error.log

# 查看应用日志
tail -f ./logs/app.log
```

## 总结

MySQL数据库连接池和数据源配置是系统稳定运行的基础。通过合理的配置、监控和优化，可以确保系统的高可用性和高性能。

关键要点：
- 合理配置连接池参数
- 实施数据库迁移管理
- 建立监控告警机制
- 定期进行性能优化
- 制定故障处理预案
