// websocket/WebSocketMessage.java
package com.security.ailogsystem.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;

/**
 * WebSocket消息实体类
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketMessage {

    /**
     * 消息类型枚举
     */
    public enum MessageType {
        LOGS_BATCH("日志批量更新"),
        LOG_SINGLE("单条日志更新"),
        ALERT_SECURITY("安全告警"),
        STATS_UPDATE("统计更新"),
        NOTIFY_SYSTEM("系统通知"),
        HEARTBEAT("心跳消息"),
        TEST_MESSAGE("测试消息"),
        SYSTEM_INFO("系统信息"),
        SYSTEM_ERROR("系统错误"),
        SECURITY_ALERT("安全警报"),
        LOG_UPDATE("日志更新"),
        STATISTICS_UPDATE("统计更新"),
        PING("连接探测"),
        PONG("连接响应"),
        CUSTOM("自定义消息");

        private final String description;

        MessageType(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }

        public static MessageType fromValue(String rawType) {
            if (rawType == null || rawType.trim().isEmpty()) {
                return CUSTOM;
            }

            String normalized = rawType.trim().toUpperCase(Locale.ROOT).replace('-', '_');
            switch (normalized) {
                case "NEW_LOGS":
                    return LOGS_BATCH;
                case "SINGLE_LOG":
                    return LOG_SINGLE;
                case "SECURITY_ALERT":
                    return ALERT_SECURITY;
                case "STATISTICS":
                case "STATISTICS_UPDATE":
                case "STATS_UPDATE":
                    return STATS_UPDATE;
                case "SYSTEM_NOTIFICATION":
                    return NOTIFY_SYSTEM;
                case "TEST":
                    return TEST_MESSAGE;
                default:
                    return MessageType.valueOf(normalized);
            }
        }
    }

    /**
     * 消息类型
     */
    private MessageType type;

    /**
     * 消息内容
     */
    private String content;

    /**
     * 消息时间戳
     */
    private LocalDateTime timestamp;

    /**
     * 发送者
     */
    private String sender;

    /**
     * 接收者（可选，为空表示广播）
     */
    private String receiver;

    /**
     * 扩展数据
     */
    private Map<String, Object> extraData;

    /**
     * 消息ID
     */
    private String messageId;

    /**
     * 优先级（1-10，10为最高）
     */
    private Integer priority;
}