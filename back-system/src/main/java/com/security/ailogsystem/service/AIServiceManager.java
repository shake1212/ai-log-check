package com.security.ailogsystem.service;


import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class AIServiceManager {

    @Value("${ai.service.script.path:src/scripts/ai_service/ai_service.py}")
    private String scriptPath;

    @Value("${ai.service.python.command:python}")
    private String pythonCommand;

    @Value("${ai.service.auto-start:true}")
    private boolean autoStart;

    private Process aiProcess;

    @PostConstruct
    public void startAiService() {
        if (!autoStart) {
            log.info("AI 服务自动启动已禁用");
            return;
        }

        try {
            // 获取脚本的绝对路径（相对于工作目录）
            String workDir = System.getProperty("user.dir");
            String fullScriptPath = workDir + "/" + scriptPath;

            ProcessBuilder pb = new ProcessBuilder(pythonCommand, fullScriptPath);
            pb.directory(new java.io.File(workDir));
            pb.redirectErrorStream(true); // 合并错误流到标准输出

            aiProcess = pb.start();

            // 可选：读取输出日志到单独线程，防止缓冲区阻塞
            Thread outputReader = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(aiProcess.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        log.info("[AI Service] {}", line);
                    }
                } catch (Exception e) {
                    log.warn("读取AI服务输出失败", e);
                }
            });
            outputReader.setDaemon(true);
            outputReader.start();

            // 等待几秒确认进程启动成功
            boolean started = aiProcess.waitFor(3, TimeUnit.SECONDS);
            if (aiProcess.isAlive()) {
                log.info("✅ AI 服务已启动，PID: {}", aiProcess.pid());
            } else {
                log.error("❌ AI 服务启动失败，退出码: {}", aiProcess.exitValue());
            }
        } catch (Exception e) {
            log.error("启动 AI 服务失败", e);
        }
    }

    @PreDestroy
    public void stopAiService() {
        if (aiProcess != null && aiProcess.isAlive()) {
            log.info("正在停止 AI 服务...");
            aiProcess.destroy();
            try {
                boolean terminated = aiProcess.waitFor(5, TimeUnit.SECONDS);
                if (!terminated) {
                    aiProcess.destroyForcibly();
                    log.warn("强制终止 AI 服务");
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("等待 AI 服务停止时被中断");
            }
            log.info("AI 服务已停止");
        }
    }
}
