# AI网络安全日志异常检测与预警系统

基于深度学习的网络安全日志异常检测与预警系统，包含完整的前后端实现。专为大学生大创项目设计，提供简化版和完整版两种实现方案。

## 技术栈

- **前端框架**：UmiJS、React、TypeScript
- **UI组件库**：Ant Design
- **图表库**：Ant Design Charts
- **后端框架**：Spring Boot
- **数据库**：MySQL（兼容达梦数据库）
- **构建工具**：Maven、pnpm
- **实时通信**：WebSocket（简化版和完整版）

## 核心功能

### 🎯 事件查询和统计
- 综合统计信息展示
- 时间范围统计分析
- 来源和级别统计
- 用户和IP分布统计
- 异常趋势分析

### 📊 批量操作管理
- 批量日志保存和更新
- 异步批量处理
- 批量删除和清理
- 批量异常标记
- 高效查询和统计

### 🔧 WMI采集系统
- **完整版**：WMI数据自动采集、异常处理和重试机制
- **简化版**：轻量级WMI数据模拟采集，适合大创项目
- 采集任务管理
- 主机配置管理

### 🌐 实时通信系统
- **完整版**：企业级WebSocket实现，支持自动重连、心跳机制
- **简化版**：轻量级WebSocket实现，基础实时通信功能
- 实时消息推送
- 广播消息功能

### 🛡️ 数据库事务管理
- 完善的事务管理机制
- 自定义异常处理
- 全局异常处理器
- 数据完整性保护
- 连接池优化

## 项目结构

```
ai-log-check/
├── ai-log-system/          # 前端React项目
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── components/    # 通用组件
│   │   ├── services/      # API服务
│   │   └── utils/         # 工具函数
│   └── package.json
├── back-system/           # 后端Spring Boot项目
│   ├── src/main/java/    # Java源码
│   │   ├── controller/   # 控制器层
│   │   ├── service/      # 服务层
│   │   ├── repository/   # 数据访问层
│   │   ├── model/        # 数据模型
│   │   └── config/       # 配置类
│   └── pom.xml
└── README.md
```

## 快速开始

### 后端启动

```bash
cd back-system
mvn clean install
mvn spring-boot:run
```

### 前端启动

```bash
cd ai-log-system
pnpm install
pnpm dev
```

## API接口

### 事件查询统计
- `GET /api/events/statistics/comprehensive` - 获取综合统计
- `GET /api/events/statistics/range` - 获取时间范围统计
- `GET /api/events/statistics/sources` - 获取来源统计

### 批量操作
- `POST /api/logs/batch/save` - 批量保存日志
- `POST /api/logs/batch/update` - 批量更新日志
- `DELETE /api/logs/batch/delete` - 批量删除日志

### WMI采集
- `GET /api/wmi/hosts` - 获取WMI主机列表
- `POST /api/wmi/tasks` - 创建采集任务
- `GET /api/wmi/results` - 获取采集结果

### 简化版WMI采集
- `POST /api/simple-wmi/collect` - 采集WMI数据
- `POST /api/simple-wmi/batch-collect` - 批量采集WMI数据
- `GET /api/simple-wmi/data/page` - 分页查询WMI数据
- `GET /api/simple-wmi/statistics` - 获取统计信息

### WebSocket实时通信
- `GET /api/websocket/status` - 获取连接状态
- `POST /api/websocket/broadcast` - 广播消息
- `POST /api/websocket/test-connection` - 测试连接

### 简化版WebSocket
- `GET /api/simple-websocket/status` - 获取连接状态
- `POST /api/simple-websocket/broadcast` - 广播消息
- `POST /api/simple-websocket/test` - 测试连接

## 部署说明

### 生产环境部署

1. **后端部署**：
   ```bash
   cd back-system
   mvn clean package -Pprod
   java -jar target/ai-log-system.jar
   ```

2. **前端部署**：
   ```bash
   cd ai-log-system
   pnpm build
   # 将dist目录部署到Web服务器
   ```

### 数据库配置

修改 `back-system/src/main/resources/application.yml` 中的数据库连接配置。

## 项目特色

### 🎓 大创项目友好
- **双版本设计**：提供完整版和简化版两种实现
- **技术门槛适中**：使用主流技术栈，学习价值高
- **文档完整**：详细的实现文档和使用说明
- **易于扩展**：模块化设计，便于功能扩展

### 📚 学习资源
- **完整文档**：每个功能模块都有详细的实现总结
- **代码注释**：代码注释完整，便于学习理解
- **测试用例**：包含完整的测试用例
- **最佳实践**：遵循Spring Boot和React最佳实践

## 开发团队

- **全栈开发**：AI Assistant
- **项目架构**：Spring Boot + React
- **数据库设计**：MySQL/OceanBase
- **项目定位**：大学生大创项目

## 许可证

[MIT](LICENSE)
