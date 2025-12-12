// AlertRequest.java - 请求DTO
package com.security.ailogsystem.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertRequest {

    @NotBlank(message = "告警ID不能为空")
    private String alertId;

    @NotNull(message = "时间戳不能为空")
    private String timestamp;

    @NotBlank(message = "告警来源不能为空")
    private String source;

    @NotBlank(message = "告警类型不能为空")
    private String alertType;

    @NotBlank(message = "告警级别不能为空")
    private String alertLevel;

    @NotBlank(message = "告警描述不能为空")
    private String description;

    private String status;

    private String assignee;

    private String resolution;

    private BigDecimal aiConfidence;

    private Long logEntryId;

    private String eventId;

    private Integer processId;

    private String ipAddress;

    private Integer port;
}