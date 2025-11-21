package com.security.ailogsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Windows 计划任务状态
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduledTaskStatus {
    /**
     * 任务名称
     */
    private String taskName;
    
    /**
     * 任务是否存在
     */
    private boolean exists;
    
    /**
     * 任务状态：Ready, Running, Disabled 等
     */
    private String status;
    
    /**
     * 下次运行时间
     */
    private LocalDateTime nextRunTime;
    
    /**
     * 上次运行时间
     */
    private LocalDateTime lastRunTime;
    
    /**
     * 上次运行结果：Success, Failed 等
     */
    private String lastRunResult;
    
    /**
     * 触发器信息（如：每5分钟）
     */
    private String trigger;
    
    /**
     * 任务路径
     */
    private String taskPath;
    
    /**
     * 错误信息（如果查询失败）
     */
    private String error;
}

