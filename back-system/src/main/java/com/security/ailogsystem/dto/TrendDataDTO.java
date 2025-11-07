package com.security.ailogsystem.dto;



import lombok.Data;

@Data
public class TrendDataDTO {
    private String timestamp;
    private Integer eventCount;
    private Integer anomalyCount;
    private Double anomalyRate;

    public TrendDataDTO(String timestamp, Long eventCount, Long anomalyCount) {
        this.timestamp = timestamp;
        this.eventCount = eventCount != null ? eventCount.intValue() : 0;
        this.anomalyCount = anomalyCount != null ? anomalyCount.intValue() : 0;
        this.anomalyRate = eventCount != null && eventCount > 0 ?
                anomalyCount.doubleValue() / eventCount.doubleValue() : 0.0;
    }
}