package com.security.ailogsystem.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScriptDescriptor {
    private String key;
    private String name;
    private String description;
    private long cooldownSeconds;
    private boolean allowManualTrigger;
}

