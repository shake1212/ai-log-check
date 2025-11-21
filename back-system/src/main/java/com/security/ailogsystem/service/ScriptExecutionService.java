package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.ScriptDescriptor;
import com.security.ailogsystem.dto.ScriptExecutionRecord;
import com.security.ailogsystem.dto.ScriptRunResponse;
import com.security.ailogsystem.dto.ScheduledTaskStatus;

import java.util.Collection;
import java.util.List;

public interface ScriptExecutionService {
    ScriptRunResponse triggerScript(String scriptKey, List<String> args);

    Collection<ScriptDescriptor> getAvailableScripts();

    List<ScriptExecutionRecord> getRecentExecutions();
    
    ScheduledTaskStatus getScheduledTaskStatus(String taskName);
    
    List<ScheduledTaskStatus> getAllScheduledTaskStatuses();
}

