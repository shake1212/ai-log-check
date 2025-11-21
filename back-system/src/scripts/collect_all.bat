@echo off
set PY="D:\app\Git\ai-log -check\ai-log-check\back-system\venv\Scripts\python.exe"
%PY% "D:\app\Git\ai-log -check\ai-log-check\back-system\src\scripts\system_info_collector.py" >> D:\logs\system_info.log 2>&1
%PY% "D:\app\Git\ai-log -check\ai-log-check\back-system\src\scripts\unified_log_collector.py" >> D:\logs\security_log.log 2>&1