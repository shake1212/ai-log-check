@echo off
REM ============================================
REM 日志采集脚本 v2.0 - 使用相对路径
REM ============================================

REM 切换到脚本所在目录
cd /d "%~dp0"

REM 设置路径变量
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..\..
set VENV_PYTHON=%PROJECT_ROOT%\venv\Scripts\python.exe
set LOG_DIR=%PROJECT_ROOT%\logs

REM 显示配置信息
echo ============================================
echo 日志采集脚本 v2.0
echo ============================================
echo 脚本目录: %SCRIPT_DIR%
echo Python路径: %VENV_PYTHON%
echo 日志目录: %LOG_DIR%
echo ============================================

REM 检查Python是否存在
if not exist "%VENV_PYTHON%" (
    echo [错误] 找不到Python虚拟环境
    echo 路径: %VENV_PYTHON%
    echo.
    echo 请先创建虚拟环境:
    echo   cd %PROJECT_ROOT%
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install psutil requests
    pause
    exit /b 1
)

REM 创建日志目录
if not exist "%LOG_DIR%" (
    echo [信息] 创建日志目录: %LOG_DIR%
    mkdir "%LOG_DIR%"
)

REM 执行系统信息采集
echo.
echo [%date% %time%] 开始采集系统信息...
"%VENV_PYTHON%" "%SCRIPT_DIR%system_info_collector.py" >> "%LOG_DIR%\system_info.log" 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [成功] 系统信息采集完成
) else (
    echo [失败] 系统信息采集失败,错误代码: %ERRORLEVEL%
)

REM 执行安全日志采集
echo.
echo [%date% %time%] 开始采集安全日志...
"%VENV_PYTHON%" "%SCRIPT_DIR%unified_log_collector.py" --test >> "%LOG_DIR%\security_log.log" 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [成功] 安全日志采集完成
) else (
    echo [失败] 安全日志采集失败,错误代码: %ERRORLEVEL%
)

echo.
echo ============================================
echo 采集完成: %date% %time%
echo ============================================
echo.

REM 如果是手动运行,暂停以查看结果
if "%1"=="" pause
