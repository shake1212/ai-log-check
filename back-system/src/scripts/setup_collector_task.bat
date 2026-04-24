@echo off
:: ============================================================
:: 安全日志采集器 - Windows任务计划程序注册（可选，生产环境增强）
::
:: 说明：
::   - 开发环境：无需运行此脚本，Java后端会自动定时触发采集
::   - 生产/演示环境：运行此脚本可获得完整的Windows安全日志采集
::     （需要管理员权限才能读取Windows安全事件日志）
::
:: 使用方法：右键 → 以管理员身份运行
:: 卸载方法：运行 remove_collector_task.bat
:: ============================================================

echo ============================================
echo  安全日志采集器 - 任务计划程序注册（可选）
echo ============================================

:: 获取当前脚本所在目录（back-system/src/scripts）
set SCRIPT_DIR=%~dp0
:: 向上两级到 back-system 目录
pushd %SCRIPT_DIR%..\..
set BACK_SYSTEM_DIR=%CD%
popd

set PYTHON_EXE=%BACK_SYSTEM_DIR%\.venv\Scripts\python.exe
set COLLECTOR_SCRIPT=%SCRIPT_DIR%unified_log_collector.py
set TASK_NAME=AiLogSystem_SecurityCollector

echo Python路径: %PYTHON_EXE%
echo 脚本路径:   %COLLECTOR_SCRIPT%
echo 任务名称:   %TASK_NAME%
echo.

:: 检查 Python 是否存在
if not exist "%PYTHON_EXE%" (
    echo [错误] 未找到Python: %PYTHON_EXE%
    echo 请先在 back-system 目录执行: python -m venv .venv
    pause
    exit /b 1
)

:: 检查脚本是否存在
if not exist "%COLLECTOR_SCRIPT%" (
    echo [错误] 未找到采集脚本: %COLLECTOR_SCRIPT%
    pause
    exit /b 1
)

:: 删除已有同名任务（忽略错误）
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

:: 注册新任务：每5分钟执行一次，以SYSTEM账户（最高权限）运行
schtasks /create ^
  /tn "%TASK_NAME%" ^
  /tr "\"%PYTHON_EXE%\" \"%COLLECTOR_SCRIPT%\" --once --java-url http://localhost:8080" ^
  /sc MINUTE ^
  /mo 5 ^
  /ru SYSTEM ^
  /rl HIGHEST ^
  /f

if %errorlevel% equ 0 (
    echo.
    echo [成功] 任务已注册，每5分钟自动采集一次安全日志
    echo.
    echo 立即执行一次测试:
    schtasks /run /tn "%TASK_NAME%"
    echo.
    echo 查看任务状态:
    schtasks /query /tn "%TASK_NAME%" /fo LIST
) else (
    echo.
    echo [失败] 任务注册失败，请确认以管理员身份运行此脚本
)

pause
