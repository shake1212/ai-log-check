# IDEA JDK 21 配置指南

**问题**: `java: 无法编译为 JVM 目标 21 配置的模块`

**原因**: IDEA没有正确配置JDK 21

## 快速修复

### 方法1: 配置项目SDK（推荐）

1. `File → Project Structure (Ctrl+Alt+Shift+S)`
2. **Project** → SDK: 选择或添加 JDK 21
   - 如无 JDK 21，点击 `Add SDK → Download JDK`，选择 Oracle OpenJDK 21
3. **Language level**: 选择 `21 - Record patterns, pattern matching for switch`
4. **Modules** → 选择 `ai-log-system` → Language level: 21
5. Apply → OK

### 方法2: 修改.idea配置

编辑 `.idea/misc.xml`：
```xml
<component name="ProjectRootManager" version="2" languageLevel="JDK_21" default="true" project-jdk-name="21" project-jdk-type="JavaSDK">
```

编辑 `.idea/compiler.xml`：
```xml
<component name="CompilerConfiguration">
  <bytecodeTargetLevel target="21" />
</component>
```

## 验证

1. `File → Project Structure → Project` 确认 SDK 为 21
2. `Build → Rebuild Project` 编译成功

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| 找不到JDK 21 | 点击 "Download JDK" 让IDEA自动下载 |
| 设置后仍报错 | 删除 `.idea` 文件夹，重新打开项目并配置JDK |
| Maven编译正常但IDEA失败 | Settings → Build Tools → 设置 "Build and run using: Maven" |
