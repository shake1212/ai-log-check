# 规则引擎UI配置功能

## 📖 概述

本功能实现了通过前端UI配置启用/禁用规则引擎，Python采集器会自动从Java后端读取配置并应用规则引擎分析。

**核心价值**:
- 已实现 无需手动修改Python代码
- 已实现 通过前端UI即可配置
- 已实现 配置实时生效
- 已实现 自动威胁检测和评分

## 🎯 功能特性

### 1. 前端UI配置
- 在日志采集器配置界面添加规则引擎开关
- 支持配置规则引擎超时时间
- 配置保存到数据库持久化

### 2. 自动配置加载
- Python采集器启动时自动从Java后端读取配置
- 根据配置动态启用/禁用规则引擎
- 支持运行时重新加载配置

### 3. 事件增强
- 自动对采集的安全事件进行威胁分析
- 添加威胁分数（0-100分）
- 添加威胁等级（LOW/MEDIUM/HIGH/CRITICAL）
- 添加匹配的规则详情

### 4. 统计监控
- 规则引擎分析统计
- 规则匹配统计
- 失败统计

## 📁 文件清单

### 文档
- 已实现 `规则引擎UI配置使用说明.md` - 详细使用指南
- 已实现 `快速启动指南.md` - 5分钟快速上手
- 已实现 `实现总结.md` - 技术实现细节
- 已实现 `规则引擎集成状态分析.md` - 现状分析
- 已实现 `规则引擎集成方案.md` - 详细方案

### 代码修改
- 已实现 `back-system/src/main/resources/db/migration/V1.0.5__add_rule_engine_config.sql` - 数据库迁移
- 已实现 `back-system/src/main/java/com/security/ailogsystem/entity/LogCollectorConfig.java` - Java实体类
- 已实现 `ai-log-system/src/services/LogCollectorService.ts` - 前端服务接口
- 已实现 `ai-log-system/src/pages/log-collector/index.tsx` - 前端UI界面
- 已实现 `back-system/src/scripts/unified_log_collector.py` - Python采集器
- 已实现 `back-system/src/scripts/test_rule_engine_integration.py` - 测试脚本

## 🚀 快速开始

### 1. 数据库迁移
```bash
# 启动Java后端时会自动执行
cd back-system
mvn spring-boot:run
```

### 2. 启动服务
```bash
# 终端1 - Java后端
cd back-system
mvn spring-boot:run

# 终端2 - 前端
cd ai-log-system
npm start

# 终端3 - Python采集器
cd back-system/src/scripts
python unified_log_collector.py
```

### 3. 配置规则引擎
1. 访问 `http://localhost:8000/#/log-collector`
2. 点击"配置"按钮
3. 启用"规则引擎分析"开关
4. 设置超时时间（默认10秒）
5. 保存配置
6. 重启Python采集器

### 4. 验证
```bash
# 运行测试脚本
cd back-system/src/scripts
python test_rule_engine_integration.py
```

## 📊 数据对比

### 启用前
```json
{
  "timestamp": "2024-03-30T10:00:00",
  "event_type": "LOGIN_FAILED",
  "severity": "WARN",
  "message": "登录失败"
}
```

### 启用后
```json
{
  "timestamp": "2024-03-30T10:00:00",
  "event_type": "LOGIN_FAILED",
  "severity": "WARN",
  "message": "登录失败",
  "threat_score": 75.5,
  "threat_level": "HIGH",
  "rule_matched": true,
  "matched_rule_count": 2,
  "matched_rules": [
    {
      "rule_id": 1,
      "rule_name": "暴力破解检测",
      "threat_type": "BRUTE_FORCE",
      "severity": "HIGH",
      "score": 80
    }
  ]
}
```

## 🔧 配置说明

### 启用规则引擎分析
- **作用**: 控制是否对采集的事件进行规则引擎分析
- **默认值**: 启用
- **建议**: 生产环境启用，测试/开发环境可选

### 规则引擎超时
- **作用**: 控制规则引擎分析单个事件的最大等待时间
- **默认值**: 10秒
- **范围**: 1-60秒
- **建议**: 根据规则数量调整（规则越多，超时时间越长）

## 🔍 故障排查

### 问题1: 规则引擎未启用
**症状**: 采集器日志显示"规则引擎已禁用"

**解决方案**:
1. 在前端UI打开"启用规则引擎分析"开关
2. 保存配置
3. 重启Python采集器

### 问题2: 规则引擎模块不可用
**症状**: 采集器日志显示"规则引擎集成模块未找到"

**解决方案**:
1. 确保 `rule_engine_integration.py` 文件存在
2. 检查文件路径：`back-system/src/scripts/rule_engine_integration.py`
3. 重启Python采集器

### 问题3: 规则引擎连接失败
**症状**: 采集器日志显示"规则引擎分析失败"

**解决方案**:
1. 确保Java后端正在运行
2. 测试API：`curl http://localhost:8080/api/rule-engine/statistics`
3. 检查防火墙设置

### 问题4: 规则引擎超时
**症状**: 采集器日志显示"规则引擎分析超时"

**解决方案**:
1. 在前端UI增加超时时间（如改为20秒）
2. 检查规则数量，考虑优化规则
3. 检查Java后端性能

## 📈 性能影响

- 每个事件增加约 50-100ms 处理时间
- 取决于规则数量和复杂度
- 可通过调整超时时间控制

## 🎓 最佳实践

### 生产环境
- 已实现 启用规则引擎
- 已实现 超时时间: 10-15秒
- 已实现 定期检查规则引擎统计
- 已实现 监控性能影响

### 测试环境
- ⚠️ 可选启用规则引擎
- ⚠️ 超时时间: 5-10秒
- ⚠️ 用于测试规则效果

### 开发环境
- ⚠️ 可选启用规则引擎
- ⚠️ 超时时间: 5秒
- ⚠️ 快速迭代测试

## 📞 获取帮助

### 查看文档
- `规则引擎UI配置使用说明.md` - 详细使用指南
- `快速启动指南.md` - 快速上手
- `实现总结.md` - 技术细节

### 运行测试
```bash
cd back-system/src/scripts
python test_rule_engine_integration.py
```

### 查看日志
- Python采集器日志：`back-system/src/scripts/security_collector.log`
- Java后端日志：控制台输出
- 前端日志：浏览器控制台

## 🎉 总结

现在你可以：
- 已实现 通过前端UI配置规则引擎（无需修改代码）
- 已实现 动态启用/禁用规则引擎
- 已实现 调整规则引擎超时时间
- 已实现 实时查看规则引擎分析结果
- 已实现 监控规则引擎统计信息

**不再需要：**
- 未实现 手动运行补丁脚本
- 未实现 修改Python代码
- 未实现 重新部署采集器

一切都通过前端UI配置完成！🎉

---

**实现时间**: 2024-03-30
**版本**: 1.0.0
**状态**: 已实现 完成
