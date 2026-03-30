package com.security.ailogsystem.config;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.io.File;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

//自动化脚本配置类
@Slf4j
@Data
@Component
@ConfigurationProperties(prefix = "scripts")
public class ScriptProperties {

    /**
     * 后端脚本所在目录（支持相对路径，相对于项目根目录）
     */
    private String basePath = "back-system/src/scripts";

    private PythonProperties python = new PythonProperties();

    /**
     * 白名单脚本
     */
    private Map<String, ScriptDefinition> allowed = new HashMap<>();

    /**
     * 获取解析后的脚本绝对路径
     * 优先使用配置值，如果是相对路径则相对于项目根目录解析
     */
    public String getResolvedBasePath() {
        return resolvePath(basePath);
    }

    /**
     * 获取解析后的 Python 可执行文件路径
     * 如果配置的路径不存在，自动降级到系统 python/python3
     */
    public String getResolvedPythonExecutable() {
        String configured = python.getExecutable();

        // 如果是绝对路径且文件存在，直接使用
        File configuredFile = new File(configured);
        if (configuredFile.isAbsolute() && configuredFile.exists()) {
            return configured;
        }

        // 如果是相对路径，尝试相对项目根目录解析
        if (!configuredFile.isAbsolute()) {
            String resolved = resolvePath(configured);
            if (new File(resolved).exists()) {
                return resolved;
            }
        }

        // 降级：尝试 venv 相对路径
        String projectRoot = getProjectRoot();
        String[] fallbackPaths = {
            projectRoot + "/back-system/.venv/Scripts/python.exe",  // Windows venv
            projectRoot + "/back-system/.venv/bin/python",           // Linux/Mac venv
            projectRoot + "/back-system/venv/Scripts/python.exe",    // Windows venv (另一种命名)
            projectRoot + "/back-system/venv/bin/python",            // Linux/Mac venv
            "python",   // 系统 PATH 中的 python
            "python3",  // 系统 PATH 中的 python3
        };

        for (String path : fallbackPaths) {
            File f = new File(path);
            if (f.exists() || path.equals("python") || path.equals("python3")) {
                log.info("Python 可执行文件使用: {}", path);
                return path;
            }
        }

        log.warn("未找到 Python 可执行文件，使用默认 'python'");
        return "python";
    }

    private String resolvePath(String path) {
        if (path == null || path.isEmpty()) return path;
        File f = new File(path);
        if (f.isAbsolute()) return path;
        // 相对路径：相对于项目根目录
        return getProjectRoot() + File.separator + path;
    }

    /**
     * 获取项目根目录
     * 优先使用 JAR 包所在目录，开发环境使用 user.dir
     */
    private String getProjectRoot() {
        try {
            // 尝试获取 JAR 包所在目录
            File jarFile = new File(
                ScriptProperties.class.getProtectionDomain()
                    .getCodeSource().getLocation().toURI()
            );
            File jarDir = jarFile.isFile() ? jarFile.getParentFile() : jarFile;
            // 如果是 target/classes（开发环境），向上找到项目根
            if (jarDir.getPath().contains("target")) {
                return jarDir.getParentFile().getParentFile().getAbsolutePath();
            }
            return jarDir.getAbsolutePath();
        } catch (URISyntaxException e) {
            return System.getProperty("user.dir");
        }
    }

    @Data
    public static class PythonProperties {
        /**
         * Python 可执行文件路径（绝对路径或相对路径）
         */
        private String executable = "python";
    }

    @Data
    public static class ScriptDefinition {
        private String name;
        private String description;
        private String file;
        private long cooldownSeconds = 300;
        private boolean allowManualTrigger = true;
        private List<String> defaultArgs = new ArrayList<>();
        private int maxParallel = 1;
    }
}

