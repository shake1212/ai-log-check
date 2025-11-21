## 🚀 快速部署

### 自动部署（推荐）
1. 以**管理员身份**打开命令提示符
2. 进入项目目录：`cd ai-log-check`
3. 运行：`deploy\setup_tasks.bat`

### 手动部署
```cmd
schtasks /create /tn "AI-Log System Info Collector" /tr "路径\to\collect_all.bat" /sc minute /mo 5 /ru SYSTEM /f