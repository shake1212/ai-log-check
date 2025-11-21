package com.security.ailogsystem.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

//自动化脚本配置类
@Data
@Component
@ConfigurationProperties(prefix = "scripts")
public class ScriptProperties {

    /**
     * 后端脚本所在目录
     */
    private String basePath = "back-system/src/scripts";

    private PythonProperties python = new PythonProperties();

    /**
     * 白名单脚本
     */
    private Map<String, ScriptDefinition> allowed = new HashMap<>();

    @Data
    public static class PythonProperties {
        /**
         * Python 可执行文件
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

