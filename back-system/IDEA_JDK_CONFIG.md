 IDEA JDK 21 配置指南

**问题**: `java: 无法编译为 JVM 目标 21 配置的模块 'ai-log-system': 指定的回退 SDK 版本 8 不支持所需 jvm 目标 21`

**原因**: IDEA没有正确配置JDK 21

**系统检测**: ✅ 已安装 OpenJDK 21.0.5 (Alibaba Dragonwell)

---

## 🔧 解决方案

### 方法1: 配置项目SDK (推荐)

#### 步骤1: 打开项目结构
```
File → Project Structure (Ctrl+Alt+Shift+S)
```

#### 步骤2: 配置项目SDK
1. 选择左侧 **Project**
2. 在 **SDK** 下拉框中:
   - 如果看到 JDK 21，直接选择
   - 如果没有，点击 **Add SDK → JDK**

#### 步骤3: 添加JDK 21
如果需要添加JDK，常见路径:
```
Windows:
C:\Program Files\Java\jdk-21
C:\Program Files\OpenJDK\jdk-21
C:\Users\<用户名>\.jdks\openjdk-21

或者让IDEA自动检测:
点击 "Download JDK" → 选择 OpenJDK 21 → 下载并安装
```

#### 步骤4: 设置语言级别
- **Language level**: 选择 **21 - Record patterns, pattern matching for switch**

#### 步骤5: 配置模块SDK
1. 选择左侧 **Modules**
2. 选择 **ai-log-system** 模块
3. 在 **Language level** 中选择 **21**
4. 点击 **Apply** → **OK**

---

### 方法2: 使用Maven配置 (备选)

如果方法1不行，可以让IDEA使用Maven的JDK配置:

#### 步骤1: 配置Maven JDK
```
File → Settings (Ctrl+Alt+S)
→ Build, Execution, Deployment
→ Build Tools
→ Maven
→ Runner
```

#### 步骤2: 设置JRE
- **JRE**: 选择 **Use Project JDK** 或直接选择 JDK 21

#### 步骤3: 重新导入Maven项目
```
右键 pom.xml → Maven → Reload Project
```

---

### 方法3: 修改.idea配置 (高级)

如果上述方法都不行，可以直接修改IDEA配置文件:

#### 编辑 .idea/misc.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="ProjectRootManager" version="2" languageLevel="JDK_21" default="true" project-jdk-name="21" project-jdk-type="JavaSDK">
    <output url="file://$PROJECT_DIR$/out" />
  </component>
</project>
```

#### 编辑 .idea/compiler.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="CompilerConfiguration">
    <bytecodeTargetLevel target="21" />
  </component>
</project>
```

---

## 🔍 验证配置

### 检查1: 查看项目SDK
```
File → Project Structure → Project
确认 SDK 显示为 21
```

### 检查2: 查看模块设置
```
File → Project Structure → Modules → ai-log-system
确认 Language level 为 21
```

### 检查3: 查看Maven设置
```
File → Settings → Build Tools → Maven → Runner
确认 JRE 为 JDK 21
```

### 检查4: 重新编译
```
Build → Rebuild Project
```

应该能看到编译成功，没有JDK版本错误。

---

## 🚀 快速修复步骤

如果你想快速解决，按以下顺序操作:

### 1. 让IDEA自动下载JDK 21
```
File → Project Structure → Project → SDK
→ Add SDK → Download JDK
→ 选择 Oracle OpenJDK 21 或 Amazon Corretto 21
→ Download
```

### 2. 应用到项目
```
SDK: 选择刚下载的 JDK 21
Language level: 21
→ Apply → OK
```

### 3. 重新导入Maven
```
右键 pom.xml → Maven → Reload Project
```

### 4. 重新编译
```
Build → Rebuild Project
```

---

## 📋 常见问题

### Q1: 找不到JDK 21选项
**A**: 点击 "Download JDK" 让IDEA自动下载

### Q2: 下载JDK失败
**A**: 手动下载并安装:
- Oracle JDK 21: https://www.oracle.com/java/technologies/downloads/#java21
- OpenJDK 21: https://jdk.java.net/21/
- Amazon Corretto 21: https://aws.amazon.com/corretto/

安装后在IDEA中添加:
```
File → Project Structure → Platform Settings → SDKs
→ + → JDK → 选择安装目录
```

### Q3: 设置后仍然报错
**A**: 尝试以下操作:
1. 关闭IDEA
2. 删除 `.idea` 文件夹
3. 重新打开项目
4. 重新配置JDK

### Q4: Maven编译正常，IDEA编译失败
**A**: 配置IDEA使用Maven编译:
```
File → Settings → Build Tools → Build Tools
→ Build and run using: Maven
→ Run tests using: Maven
```

---

## 🎯 推荐配置

### 项目结构配置
```
Project SDK: 21 (java version "21.0.5")
Project language level: 21 - Record patterns, pattern matching for switch
Project compiler output: back-system/target/classes
```

### Maven配置
```
Maven home directory: (使用bundled)
JRE for importer: Use Project JDK (21)
JRE for runner: Use Project JDK (21)
```

### 编译器配置
```
File → Settings → Build, Execution, Deployment → Compiler → Java Compiler
Project bytecode version: 21
Per-module bytecode version: 21 for ai-log-system
```

---

## 🔄 完整配置流程

### 1. 配置SDK
```
File → Project Structure (Ctrl+Alt+Shift+S)
→ Platform Settings → SDKs
→ + → Download JDK
→ Version: 21
→ Vendor: Oracle OpenJDK 或 Amazon Corretto
→ Download
```

### 2. 配置项目
```
Project Settings → Project
→ SDK: 21
→ Language level: 21
→ Apply
```

### 3. 配置模块
```
Project Settings → Modules
→ 选择 ai-log-system
→ Language level: 21
→ Apply
```

### 4. 配置Maven
```
File → Settings (Ctrl+Alt+S)
→ Build, Execution, Deployment → Build Tools → Maven
→ Importing: JDK for importer: Use Project JDK
→ Runner: JRE: Use Project JDK
→ Apply → OK
```

### 5. 重新加载
```
右键 pom.xml → Maven → Reload Project
Build → Rebuild Project
```

---

## ✅ 验证成功

配置成功后，你应该能看到:

1. **项目结构**显示 SDK 21
2. **Maven窗口**显示使用 JDK 21
3. **编译输出**没有JDK版本错误
4. **运行配置**显示 JRE 21

---

## 🎉 启动应用

配置完成后，可以通过以下方式启动:

### 方式1: IDEA运行
```
找到 AiLogSystemApplication.java
右键 → Run 'AiLogSystemApplication'
```

### 方式2: Maven命令
```
mvn spring-boot:run
```

### 方式3: 命令行
```
cd back-system
mvn clean package -DskipTests
java -jar target/ai-log-system-0.0.1-SNAPSHOT.jar
```

---

**配置完成后，Java后端就可以正常启动了！**

然后Python采集器就能成功发送数据到后端。
