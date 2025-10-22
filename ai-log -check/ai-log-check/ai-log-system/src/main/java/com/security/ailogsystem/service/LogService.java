package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.LogEntryDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface LogService {
    
    LogEntryDTO saveLog(LogEntryDTO logEntryDTO);
    
    LogEntryDTO getLogById(String id);
    
    Page<LogEntryDTO> getAllLogs(Pageable pageable);
    
    Page<LogEntryDTO> getAnomalyLogs(Pageable pageable);
    
    Page<LogEntryDTO> searchLogs(
            String source, 
            String level, 
            LocalDateTime startTime, 
            LocalDateTime endTime, 
            String keyword, 
            Pageable pageable);
    
    List<LogEntryDTO> getRecentLogs(int limit);
    
    Map<String, Long> getLogStatistics();
    
    void deleteLog(String id);
    
    void deleteLogsBefore(LocalDateTime date);
} 