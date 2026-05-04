package com.security.ailogsystem.service;

import com.security.ailogsystem.config.ScriptProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class AIServiceManager {

    @Value("${ai.service.script.path:src/scripts/ai_service/ai_service.py}")
    private String scriptPath;

    @Value("${ai.service.auto-start:true}")
    private boolean autoStart;

    private final ScriptProperties scriptProperties;

    private Process aiProcess;

    private boolean running = false;

    public AIServiceManager(ScriptProperties scriptProperties) {
        this.scriptProperties = scriptProperties;
    }

    public boolean isRunning() {
        return running && aiProcess != null && aiProcess.isAlive();
    }

    @PostConstruct
    public void startAiService() {
        if (!autoStart) {
            log.info("AI 服务自动启动已禁用");
            return;
        }

        try {
            String pythonExe = scriptProperties.getResolvedPythonExecutable();
            String basePath = scriptProperties.getResolvedBasePath();
            File scriptFile = new File(basePath, "ai_service/ai_service.py");
            if (!scriptFile.exists()) {
                String workDir = System.getProperty("user.dir");
                scriptFile = new File(workDir, scriptPath);
            }
            if (!scriptFile.exists()) {
                log.warn("AI服务脚本不存在: {}，跳过启动（AI异常检测功能不可用）", scriptFile.getAbsolutePath());
                return;
            }

            File scriptDir = scriptFile.getParentFile();
            String[] requiredModels = {"anomaly_model.pkl", "evt_encoder.pkl", "proc_encoder.pkl"};
            for (String model : requiredModels) {
                if (!new File(scriptDir, model).exists()) {
                    log.warn("AI模型文件不存在: {}/{}，跳过启动（AI异常检测功能不可用）", scriptDir.getAbsolutePath(), model);
                    return;
                }
            }

            log.info("AI服务使用Python路径: {}", pythonExe);
            log.info("AI服务脚本路径: {}", scriptFile.getAbsolutePath());

            ProcessBuilder pb = new ProcessBuilder(pythonExe, scriptFile.getAbsolutePath());
            pb.directory(scriptDir);
            pb.redirectErrorStream(true);

            aiProcess = pb.start();

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

            boolean started = aiProcess.waitFor(5, TimeUnit.SECONDS);
            if (aiProcess.isAlive()) {
                running = true;
                log.info("AI 服务已启动，PID: {}，端口: 5001", aiProcess.pid());
            } else {
                int exitCode = aiProcess.exitValue();
                log.warn("AI 服务启动失败，退出码: {}（AI异常检测功能不可用，主系统正常运行）", exitCode);
                if (exitCode == 1) {
                    log.info("提示：请检查Python依赖是否安装，执行: pip install flask joblib numpy pandas");
                }
            }
        } catch (Exception e) {
            log.warn("启动 AI 服务失败: {}（AI异常检测功能不可用，主系统正常运行）", e.getMessage());
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
            running = false;
            log.info("AI 服务已停止");
        }
    }
}
