package com.security.ailogsystem.controller;

import com.security.ailogsystem.dto.ScriptDescriptor;
import com.security.ailogsystem.dto.ScriptExecutionRecord;
import com.security.ailogsystem.dto.ScriptRunRequest;
import com.security.ailogsystem.dto.ScriptRunResponse;
import com.security.ailogsystem.dto.ScheduledTaskStatus;
import com.security.ailogsystem.service.ScriptExecutionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/scripts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ScriptController {

    private final ScriptExecutionService scriptExecutionService;

    @PostMapping("/run")
    public ResponseEntity<ScriptRunResponse> triggerScript(@Valid @RequestBody ScriptRunRequest request) {
        log.info("收到脚本执行请求: {}", request.getScriptKey());
        ScriptRunResponse response = scriptExecutionService.triggerScript(request.getScriptKey(), request.getArgs());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/available")
    public ResponseEntity<Collection<ScriptDescriptor>> availableScripts() {
        return ResponseEntity.ok(scriptExecutionService.getAvailableScripts());
    }

    @GetMapping("/history")
    public ResponseEntity<List<ScriptExecutionRecord>> executionHistory() {
        return ResponseEntity.ok(scriptExecutionService.getRecentExecutions());
    }

    @GetMapping("/scheduled-tasks")
    public ResponseEntity<List<ScheduledTaskStatus>> getScheduledTaskStatuses() {
        return ResponseEntity.ok(scriptExecutionService.getAllScheduledTaskStatuses());
    }

    @GetMapping("/scheduled-tasks/{taskName}")
    public ResponseEntity<ScheduledTaskStatus> getScheduledTaskStatus(@PathVariable String taskName) {
        return ResponseEntity.ok(scriptExecutionService.getScheduledTaskStatus(taskName));
    }
}

