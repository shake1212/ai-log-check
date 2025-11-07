package com.security.ailogsystem.dto;


import lombok.Data;

@Data
public class EventSearchCriteria {
    private String startTime;
    private String endTime;
    private String source;
    private String level;
    private String keyword;
    private Boolean isAnomaly;
    private String category;
    private Integer page = 0;
    private Integer size = 20;
}