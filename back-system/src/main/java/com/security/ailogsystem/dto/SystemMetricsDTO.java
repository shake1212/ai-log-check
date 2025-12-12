// SystemMetricsDTO.java
package com.security.ailogsystem.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SystemMetricsDTO {
    private Double systemHealth;           // 系统健康度百分比
    private Double uptime;                 // 正常运行时间百分比
    private Double storageUsed;            // 存储使用量（TB）
    private Double storageTotal;           // 总存储量（TB）
    private Throughput throughput;         // 吞吐量
    private Double latency;                // 数据延迟（ms）
    private String systemVersion;          // 系统版本
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastUpdate;      // 最后更新时间
    private Integer currentConnections;    // 当前连接数
    private Integer activeSessions;        // 活跃会话数

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Throughput {
        private Double normal;             // 正常流量（条/秒）
        private Double abnormal;           // 异常流量（条/秒）
        private Double peak;               // 峰值流量（条/秒）
    }
}