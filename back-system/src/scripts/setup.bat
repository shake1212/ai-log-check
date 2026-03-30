@echo off
REM ============================================
REM 日志采集器安装脚本
REM ============================================

echo ============================================
echo 日志采集器安装向导
echo ============================================
echo.

REM 切换到项目根目录
cd /d "%~dp0..\.."

REM 检查Python是否安装
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到Python,请先安装Python 3.11+
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/5] Python已安装
python --version

REM 创建虚拟环境
echo.
echo [2/5] 创建虚拟环境...
if exist venv (
    echo 虚拟环境已存在,跳过创建
) else (
    python -m venv venv
    if %ERRORLEVEL% NEQ 0 (
        echo [错误] 创建虚拟环境失败
        pause
        exit /b 1
    )
    echo 虚拟环境创建成功
)

REM 激活虚拟环境并安装依赖
echo.
echo [3/5] 安装依赖包...
call venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 安装依赖包失败
    pause
    exit /b 1
)
echo 依赖包安装成功

REM 创建日志目录
echo.
echo [4/5] 创建日志目录...
if not exist logs mkdir logs
echo 日志目录: %CD%\logs

REM 测试采集器
echo.
echo [5/5] 测试采集器...
python src\scripts\system_info_collector_v2.py performance
if %ERRORLEVEL% NEQ 0 (
    echo [警告] 采集器测试失败,但安装已完成
) else (
    echo 采集器测试成功
)

echo.
echo ============================================
echo 安装完成!
echo ============================================
echo.
echo 使用方法:
echo   1. 手动运行: src\scripts\collect_all_v2.bat
echo   2. 定时任务: 使用Windows任务计划程序
echo.
echo 配置文件: src\scripts\collector_config.ini
echo 日志目录: logs\
echo.
pause
