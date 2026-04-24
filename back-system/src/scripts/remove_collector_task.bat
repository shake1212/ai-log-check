@echo off
:: 删除安全日志采集定时任务

set TASK_NAME=AiLogSystem_SecurityCollector

echo 删除任务: %TASK_NAME%
schtasks /delete /tn "%TASK_NAME%" /f

if %errorlevel% equ 0 (
    echo [成功] 任务已删除
) else (
    echo [提示] 任务不存在或删除失败
)
pause
