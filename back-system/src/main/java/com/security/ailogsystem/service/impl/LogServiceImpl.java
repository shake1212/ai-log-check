package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.dto.LogEntryDTO;
import com.security.ailogsystem.model.LogEntry;
import com.security.ailogsystem.repository.LogEntryRepository;
import com.security.ailogsystem.service.LogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class LogServiceImpl implements LogService {

    @Autowired
    private LogEntryRepository logEntryRepository;

    @Override
    public LogEntryDTO saveLog(LogEntryDTO logEntryDTO) {
        LogEntry logEntry = new LogEntry();
        logEntry.setTimestamp(logEntryDTO.getTimestamp());
        logEntry.setSource(logEntryDTO.getSource());
        logEntry.setLevel(logEntryDTO.getLevel());
        logEntry.setContent(logEntryDTO.getContent());
        logEntry.setIpAddress(logEntryDTO.getIpAddress());
        logEntry.setUserId(logEntryDTO.getUserId());
        logEntry.setAction(logEntryDTO.getAction());
        logEntry.setAnomaly(logEntryDTO.isAnomaly());
        logEntry.setAnomalyScore(logEntryDTO.getAnomalyScore());
        logEntry.setAnomalyReason(logEntryDTO.getAnomalyReason());
        logEntry.setRawData(logEntryDTO.getRawData());
        
        LogEntry savedLogEntry = logEntryRepository.save(logEntry);
        return convertToDTO(savedLogEntry);
    }

    @Override
    @Transactional(readOnly = true)
    public LogEntryDTO getLogById(String id) {
        LogEntry logEntry = logEntryRepository.findById(Long.parseLong(id))
                .orElseThrow(() -> new RuntimeException("Log entry not found with id: " + id));
        return convertToDTO(logEntry);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<LogEntryDTO> getAllLogs(Pageable pageable) {
        Page<LogEntry> logEntries = logEntryRepository.findAll(pageable);
        return logEntries.map(this::convertToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<LogEntryDTO> getAnomalyLogs(Pageable pageable) {
        Page<LogEntry> logEntries = logEntryRepository.findByIsAnomalyTrue(pageable);
        return logEntries.map(this::convertToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<LogEntryDTO> searchLogs(String source, String level, LocalDateTime startTime, 
                                       LocalDateTime endTime, String keyword, Pageable pageable) {
        // 这里可以实现更复杂的搜索逻辑
        Page<LogEntry> logEntries = logEntryRepository.findAll(pageable);
        return logEntries.map(this::convertToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LogEntryDTO> getRecentLogs(int limit) {
        List<LogEntry> logEntries = logEntryRepository.findTop10ByOrderByTimestampDesc();
        return logEntries.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> getLogStatistics() {
        Map<String, Long> statistics = new HashMap<>();
        
        // 按级别统计
        statistics.put("level_info", logEntryRepository.countByLevel("INFO"));
        statistics.put("level_warn", logEntryRepository.countByLevel("WARN"));
        statistics.put("level_error", logEntryRepository.countByLevel("ERROR"));
        statistics.put("level_debug", logEntryRepository.countByLevel("DEBUG"));
        
        // 按来源统计
        statistics.put("source_web", logEntryRepository.countBySource("web-server"));
        statistics.put("source_database", logEntryRepository.countBySource("database"));
        statistics.put("source_api", logEntryRepository.countBySource("api-gateway"));
        
        // 异常日志统计
        statistics.put("anomaly_count", logEntryRepository.countByIsAnomalyTrue());
        statistics.put("normal_count", logEntryRepository.countByIsAnomalyFalse());
        
        return statistics;
    }

    @Override
    public void deleteLog(String id) {
        LogEntry logEntry = logEntryRepository.findById(Long.parseLong(id))
                .orElseThrow(() -> new RuntimeException("Log entry not found with id: " + id));
        logEntryRepository.delete(logEntry);
    }

    @Override
    public void deleteLogsBefore(LocalDateTime date) {
        logEntryRepository.deleteByTimestampBefore(date);
    }

    private LogEntryDTO convertToDTO(LogEntry logEntry) {
        LogEntryDTO dto = new LogEntryDTO();
        dto.setId(logEntry.getId().toString());
        dto.setTimestamp(logEntry.getTimestamp());
        dto.setSource(logEntry.getSource());
        dto.setLevel(logEntry.getLevel());
        dto.setContent(logEntry.getContent());
        dto.setIpAddress(logEntry.getIpAddress());
        dto.setUserId(logEntry.getUserId());
        dto.setAction(logEntry.getAction());
        dto.setAnomaly(logEntry.isAnomaly());
        dto.setAnomalyScore(logEntry.getAnomalyScore());
        dto.setAnomalyReason(logEntry.getAnomalyReason());
        dto.setRawData(logEntry.getRawData());
        dto.setCreatedAt(logEntry.getCreatedAt());
        dto.setUpdatedAt(logEntry.getUpdatedAt());
        return dto;
    }
}
