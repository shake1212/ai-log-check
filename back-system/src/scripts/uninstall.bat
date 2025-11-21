@echo off
echo 卸载安全监控计划任务...

schtasks /delete /tn "AI-Log System Info Collector" /f

echo 计划任务已删除
pause