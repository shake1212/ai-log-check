// TrafficStatsDTO.java
package com.security.ailogsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TrafficStatsDTO {
    private Double normalTraffic;          // 正常流量
    private Double anomalyTraffic;         // 异常流量
    private Double peakTraffic;           // 峰值流量
    private Double avgLatency;            // 平均延迟
    private Double currentTraffic;        // 当前流量
}