@echo off
echo ========================================
echo   安全监控系统 - 计划任务部署工具
echo ========================================

REM 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo 错误：请使用管理员权限运行此脚本！
    pause
    exit /b 1
)

REM 设置基础路径（基于脚本位置）
set "DEPLOY_DIR=%~dp0"
set "PROJECT_ROOT=%DEPLOY_DIR%.."
set "SCRIPTS_DIR=%PROJECT_ROOT%\scripts"
set "PYTHON_EXE=%PROJECT_ROOT%\venv\Scripts\python.exe"

echo 项目根目录: %PROJECT_ROOT%
echo Python路径: %PYTHON_EXE%
echo 脚本目录: %SCRIPTS_DIR%

REM 检查必要文件是否存在
if not exist "%PYTHON_EXE%" (
    echo 错误：未找到Python解释器，请先创建虚拟环境
    pause
    exit /b 1
)

if not exist "%SCRIPTS_DIR%\system_info_collector.py" (
    echo 错误：未找到采集脚本
    pause
    exit /b 1
)

REM 创建采集批处理文件
echo 创建采集批处理文件...
(
echo @echo off
echo REM 自动生成的采集批处理
echo set LOGS_DIR=%PROJECT_ROOT%\logs
echo if not exist "%LOGS_DIR%" mkdir "%LOGS_DIR%"
echo "%PYTHON_EXE%" "%SCRIPTS_DIR%\system_info_collector.py" ^>^> "%LOGS_DIR%\system_info.log" 2^>^&1
echo "%PYTHON_EXE%" "%SCRIPTS_DIR%\unified_log_collector.py" ^>^> "%LOGS_DIR%\security_log.log" 2^>^&1
) > "%DEPLOY_DIR%\collect_all.bat"

REM 创建计划任务
echo 创建计划任务...
schtasks /create /tn "AI-Log System Info Collector" /tr "%DEPLOY_DIR%\collect_all.bat" /sc minute /mo 5 /ru SYSTEM /f

echo.
echo ========================================
echo   部署完成！
echo ========================================
echo 计划任务已创建：AI-Log System Info Collector
echo 执行频率：每5分钟
echo 日志目录：%PROJECT_ROOT%\logs
echo.
echo 验证命令：schtasks /query /tn "AI-Log System Info Collector"
echo 手动测试：%DEPLOY_DIR%\collect_all.bat
echo ========================================
pause