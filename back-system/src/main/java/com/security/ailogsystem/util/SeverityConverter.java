package com.security.ailogsystem.util;

import java.util.Map;

public class SeverityConverter {

    private static final Map<String, String> MAPPING = Map.of(
            "INFO", "LOW",
            "WARN", "MEDIUM",
            "WARNING", "MEDIUM",
            "ERROR", "HIGH",
            "DEBUG", "LOW",
            "TRACE", "LOW"
    );

    public static String normalize(String severity) {
        if (severity == null || severity.isBlank()) return "LOW";
        String upper = severity.toUpperCase().trim();
        return MAPPING.getOrDefault(upper, upper);
    }
}
