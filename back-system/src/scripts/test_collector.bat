@echo off
REM ============================================
REM 日志采集器测试脚本
REM ============================================

cd /d "%~dp0..\.."
set VENV_PYTHON=venv\Scripts\python.exe

echo ============================================
echo 日志采集器测试
echo ============================================
echo.

REM 检查Python
if not exist "%VENV_PYTHON%" (
    echo [错误] 虚拟环境不存在,请先运行 setup.bat
    pause
    exit /b 1
)

REM 测试1: 检查依赖
echo [测试1] 检查依赖包...
"%VENV_PYTHON%" -c "import psutil, requests; print('✅ 依赖包正常')"
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 依赖包缺失
    pause
    exit /b 1
)
echo.

REM 测试2: 性能数据采集
echo [测试2] 测试性能数据采集...
"%VENV_PYTHON%" src\scripts\system_info_collector_v2.py performance
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 性能数据采集失败
    pause
    exit /b 1
)
echo ✅ 性能数据采集成功
echo.

REM 测试3: CPU信息采集
echo [测试3] 测试CPU信息采集...
"%VENV_PYTHON%" src\scripts\system_info_collector_v2.py cpu_info
if %ERRORLEVEL% NEQ 0 (
    echo ❌ CPU信息采集失败
    pause
    exit /b 1
)
echo ✅ CPU信息采集成功
echo.

REM 测试4: 内存信息采集
echo [测试4] 测试内存信息采集...
"%VENV_PYTHON%" src\scripts\system_info_collector_v2.py memory_info
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 内存信息采集失败
    pause
    exit /b 1
)
echo ✅ 内存信息采集成功
echo.

REM 测试5: 磁盘信息采集
echo [测试5] 测试磁盘信息采集...
"%VENV_PYTHON%" src\scripts\system_info_collector_v2.py disk_info
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 磁盘信息采集失败
    pause
    exit /b 1
)
echo ✅ 磁盘信息采集成功
echo.

REM 测试6: 进程信息采集
echo [测试6] 测试进程信息采集...
"%VENV_PYTHON%" src\scripts\system_info_collector_v2.py process_info
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 进程信息采集失败
    pause
    exit /b 1
)
echo ✅ 进程信息采集成功
echo.

REM 测试7: 后端连接
echo [测试7] 测试后端连接...
curl -s http://localhost:8080/actuator/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ 后端服务正常
) else (
    echo ⚠️  后端服务未运行或不可访问
    echo    请确保Java后端已启动: http://localhost:8080
)
echo.

echo ============================================
echo 测试完成!
echo ============================================
echo.
echo 所有本地测试通过
echo 如果后端服务正常,可以开始使用采集器
echo.
pause
