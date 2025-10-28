# 系统配置枚举值迁移指南

## 问题描述

在尝试修改 `system_configs` 表的 `config_type` 列为枚举类型时，遇到了以下错误：

```
Error executing DDL "alter table system_configs modify column config_type enum ('STRING','INTEGER','BOOLEAN','ENUM') not null" via JDBC [Data truncated for column 'config_type' at row 1]
```

这个错误表明表中存在与新的枚举值不匹配的现有数据。

## 解决方案

### 方案1：使用SQL迁移脚本（推荐）

1. **执行SQL迁移脚本**：
   ```sql
   -- 文件位置：back-system/src/main/resources/db/migration/V1_1__fix_system_configs_enum.sql
   
   -- 更新不匹配的值
   UPDATE system_configs 
   SET config_type = 'STRING' 
   WHERE config_type IN ('VARCHAR', 'TEXT', 'CHAR', 'string', 'String');

   UPDATE system_configs 
   SET config_type = 'INTEGER' 
   WHERE config_type IN ('INT', 'BIGINT', 'NUMBER', 'NUMERIC', 'integer', 'Integer', 'int');

   UPDATE system_configs 
   SET config_type = 'BOOLEAN' 
   WHERE config_type IN ('BOOL', 'TINYINT', 'boolean', 'Boolean', 'bool');

   UPDATE system_configs 
   SET config_type = 'ENUM' 
   WHERE config_type IN ('ENUMERATION', 'SELECT', 'enum', 'Enum');

   -- 处理其他值，默认为STRING
   UPDATE system_configs 
   SET config_type = 'STRING' 
   WHERE config_type NOT IN ('STRING', 'INTEGER', 'BOOLEAN', 'ENUM');
   ```

2. **验证数据**：
   ```sql
   SELECT DISTINCT config_type FROM system_configs;
   ```

3. **重新启动应用**，让Hibernate执行DDL变更。

### 方案2：使用Java迁移工具

1. **启用迁移**：
   在 `application.properties` 中添加：
   ```properties
   migration.enabled=true
   ```

2. **重启应用**，迁移将自动执行。

### 方案3：手动API调用

1. **启动应用**（不启用自动迁移）

2. **调用迁移API**：
   ```bash
   curl -X POST http://localhost:8080/api/migration/system-config-enum
   ```

## 迁移工具说明

### SystemConfigEnumMigration
- **功能**：自动检测并更新不匹配的枚举值
- **映射规则**：
  - `VARCHAR`, `TEXT`, `CHAR` → `STRING`
  - `INT`, `BIGINT`, `NUMBER` → `INTEGER`
  - `BOOL`, `TINYINT` → `BOOLEAN`
  - `ENUMERATION`, `SELECT` → `ENUM`
  - 其他值 → `STRING`（默认）

### 验证功能
- 自动验证迁移后的数据是否符合新的枚举定义
- 记录迁移过程和结果

## 执行步骤

1. **备份数据库**（重要！）

2. **选择迁移方案**：
   - 如果使用Flyway/Liquibase：使用方案1
   - 如果希望自动化：使用方案2
   - 如果需要手动控制：使用方案3

3. **执行迁移**

4. **验证结果**：
   ```sql
   SELECT DISTINCT config_type FROM system_configs;
   ```

5. **重启应用**，让Hibernate完成DDL变更

## 注意事项

1. **数据备份**：执行前务必备份数据库
2. **测试环境**：先在测试环境验证
3. **监控日志**：关注迁移过程中的日志输出
4. **回滚计划**：准备数据回滚方案

## 故障排除

### 如果迁移失败
1. 检查数据库连接
2. 查看详细错误日志
3. 手动执行SQL验证数据状态
4. 必要时恢复备份

### 如果仍有数据不匹配
1. 检查是否有其他未映射的值
2. 手动更新这些值
3. 重新执行迁移

## 相关文件

- `back-system/src/main/resources/db/migration/V1_1__fix_system_configs_enum.sql`
- `back-system/src/main/java/com/security/ailogsystem/migration/SystemConfigEnumMigration.java`
- `back-system/src/main/java/com/security/ailogsystem/migration/MigrationRunner.java`
- `back-system/src/main/java/com/security/ailogsystem/controller/MigrationController.java`
