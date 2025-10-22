package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.SecurityEventDTO;
import com.security.ailogsystem.dto.SecurityEventQueryDTO;
import com.security.ailogsystem.model.SecurityEvent;
import com.security.ailogsystem.repository.SecurityEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 安全事件服务类
 * 提供安全事件相关的业务逻辑
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SecurityEventService {

    private final SecurityEventRepository securityEventRepository;

    /**
     * 创建安全事件
     */
    @Transactional
    public SecurityEventDTO createSecurityEvent(SecurityEventDTO eventDTO) {
        log.info("Creating security event: {}", eventDTO.getSource());
        
        SecurityEvent event = eventDTO.toEntity();
        SecurityEvent savedEvent = securityEventRepository.save(event);
        
        log.info("Security event created with ID: {}", savedEvent.getId());
        return SecurityEventDTO.fromEntity(savedEvent);
    }

    /**
     * 批量创建安全事件
     */
    @Transactional
    public List<SecurityEventDTO> createSecurityEvents(List<SecurityEventDTO> eventDTOs) {
        log.info("Creating {} security events", eventDTOs.size());
        
        List<SecurityEvent> events = eventDTOs.stream()
                .map(SecurityEventDTO::toEntity)
                .collect(Collectors.toList());
        
        List<SecurityEvent> savedEvents = securityEventRepository.saveAll(events);
        
        log.info("Created {} security events", savedEvents.size());
        return savedEvents.stream()
                .map(SecurityEventDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 根据ID获取安全事件
     */
    public Optional<SecurityEventDTO> getSecurityEventById(Long id) {
        log.debug("Getting security event by ID: {}", id);
        
        return securityEventRepository.findById(id)
                .map(SecurityEventDTO::fromEntity);
    }

    /**
     * 分页查询安全事件
     */
    public Page<SecurityEventDTO> getSecurityEvents(SecurityEventQueryDTO queryDTO) {
        log.debug("Querying security events with conditions: {}", queryDTO);
        
        queryDTO.validatePagination();
        
        Sort sort = Sort.by(
            Sort.Direction.fromString(queryDTO.getSafeSortDirection()),
            queryDTO.getSafeSortBy()
        );
        
        Pageable pageable = PageRequest.of(queryDTO.getPage(), queryDTO.getSize(), sort);
        
        Page<SecurityEvent> events = securityEventRepository.findByMultipleConditions(
                queryDTO.getStartTime(),
                queryDTO.getEndTime(),
                queryDTO.getLevel(),
                queryDTO.getSource(),
                queryDTO.getHostIp(),
                queryDTO.getUserId(),
                queryDTO.getEventType(),
                queryDTO.getCategory(),
                queryDTO.getThreatLevel(),
                queryDTO.getStatus(),
                queryDTO.getIsAnomaly(),
                queryDTO.getKeyword(),
                pageable
        );
        
        return events.map(SecurityEventDTO::fromEntity);
    }

    /**
     * 获取最近的安全事件
     */
    public List<SecurityEventDTO> getRecentSecurityEvents(int limit) {
        log.debug("Getting recent {} security events", limit);
        
        List<SecurityEvent> events = securityEventRepository.findTop10ByOrderByTimestampDesc();
        return events.stream()
                .map(SecurityEventDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 获取最近的异常事件
     */
    public List<SecurityEventDTO> getRecentAnomalyEvents(int limit) {
        log.debug("Getting recent {} anomaly events", limit);
        
        List<SecurityEvent> events = securityEventRepository.findTop10ByIsAnomalyTrueOrderByTimestampDesc();
        return events.stream()
                .map(SecurityEventDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 更新安全事件
     */
    @Transactional
    public Optional<SecurityEventDTO> updateSecurityEvent(Long id, SecurityEventDTO eventDTO) {
        log.info("Updating security event with ID: {}", id);
        
        Optional<SecurityEvent> existingEvent = securityEventRepository.findById(id);
        if (existingEvent.isEmpty()) {
            log.warn("Security event not found with ID: {}", id);
            return Optional.empty();
        }
        
        SecurityEvent event = existingEvent.get();
        
        // 更新字段
        if (eventDTO.getStatus() != null) {
            event.setStatus(eventDTO.getStatus());
        }
        if (eventDTO.getAssignedTo() != null) {
            event.setAssignedTo(eventDTO.getAssignedTo());
        }
        if (eventDTO.getResolutionNotes() != null) {
            event.setResolutionNotes(eventDTO.getResolutionNotes());
        }
        if (eventDTO.getThreatLevel() != null) {
            event.setThreatLevel(eventDTO.getThreatLevel());
        }
        if (eventDTO.getIsAnomaly() != null) {
            event.setIsAnomaly(eventDTO.getIsAnomaly());
        }
        if (eventDTO.getAnomalyScore() != null) {
            event.setAnomalyScore(eventDTO.getAnomalyScore());
        }
        if (eventDTO.getAnomalyReason() != null) {
            event.setAnomalyReason(eventDTO.getAnomalyReason());
        }
        
        // 如果状态改为已解决，设置解决时间
        if (SecurityEvent.EventStatus.RESOLVED.equals(eventDTO.getStatus()) && 
            event.getResolvedAt() == null) {
            event.setResolvedAt(LocalDateTime.now());
        }
        
        SecurityEvent savedEvent = securityEventRepository.save(event);
        log.info("Security event updated successfully");
        
        return Optional.of(SecurityEventDTO.fromEntity(savedEvent));
    }

    /**
     * 删除安全事件
     */
    @Transactional
    public boolean deleteSecurityEvent(Long id) {
        log.info("Deleting security event with ID: {}", id);
        
        if (!securityEventRepository.existsById(id)) {
            log.warn("Security event not found with ID: {}", id);
            return false;
        }
        
        securityEventRepository.deleteById(id);
        log.info("Security event deleted successfully");
        return true;
    }

    /**
     * 获取威胁等级统计
     */
    public Map<String, Long> getThreatLevelStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("Getting threat level statistics from {} to {}", startTime, endTime);
        
        List<Object[]> results = securityEventRepository.countByThreatLevel(startTime, endTime);
        return results.stream()
                .collect(Collectors.toMap(
                    row -> row[0] != null ? row[0].toString() : "UNKNOWN",
                    row -> (Long) row[1]
                ));
    }

    /**
     * 获取事件类型统计
     */
    public Map<String, Long> getEventTypeStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("Getting event type statistics from {} to {}", startTime, endTime);
        
        List<Object[]> results = securityEventRepository.countByEventType(startTime, endTime);
        return results.stream()
                .collect(Collectors.toMap(
                    row -> row[0] != null ? row[0].toString() : "UNKNOWN",
                    row -> (Long) row[1]
                ));
    }

    /**
     * 获取主机统计
     */
    public List<Map<String, Object>> getHostStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("Getting host statistics from {} to {}", startTime, endTime);
        
        List<Object[]> results = securityEventRepository.countByHost(startTime, endTime);
        return results.stream()
                .map(row -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("hostIp", row[0] != null ? row[0].toString() : "Unknown");
                    map.put("count", (Long) row[1]);
                    return (Map<String, Object>) map;
                })
                .collect(Collectors.toList());
    }

    /**
     * 获取异常事件数量
     */
    public Long getAnomalyEventCount(LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("Getting anomaly event count from {} to {}", startTime, endTime);
        
        return securityEventRepository.countAnomalyEvents(startTime, endTime);
    }

    /**
     * 获取事件状态统计
     */
    public Map<String, Long> getEventStatusStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("Getting event status statistics from {} to {}", startTime, endTime);
        
        List<Object[]> results = securityEventRepository.countByStatus(startTime, endTime);
        return results.stream()
                .collect(Collectors.toMap(
                    row -> row[0] != null ? row[0].toString() : "UNKNOWN",
                    row -> (Long) row[1]
                ));
    }

    /**
     * 获取高频事件源
     */
    public List<Map<String, Object>> getTopEventSources(LocalDateTime startTime, LocalDateTime endTime, int limit) {
        log.debug("Getting top {} event sources from {} to {}", limit, startTime, endTime);
        
        Pageable pageable = PageRequest.of(0, limit);
        List<Object[]> results = securityEventRepository.findTopEventSources(startTime, endTime, pageable);
        
        return results.stream()
                .map(row -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("source", row[0] != null ? row[0].toString() : "Unknown");
                    map.put("count", (Long) row[1]);
                    return (Map<String, Object>) map;
                })
                .collect(Collectors.toList());
    }

    /**
     * 获取高风险用户
     */
    public List<Map<String, Object>> getHighRiskUsers(LocalDateTime startTime, LocalDateTime endTime, int limit) {
        log.debug("Getting top {} high risk users from {} to {}", limit, startTime, endTime);
        
        Pageable pageable = PageRequest.of(0, limit);
        List<Object[]> results = securityEventRepository.findHighRiskUsers(startTime, endTime, pageable);
        
        return results.stream()
                .map(row -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("userId", row[0] != null ? row[0].toString() : "Unknown");
                    map.put("count", (Long) row[1]);
                    return (Map<String, Object>) map;
                })
                .collect(Collectors.toList());
    }

    /**
     * 获取待处理事件
     */
    public List<SecurityEventDTO> getPendingEvents() {
        log.debug("Getting pending security events");
        
        List<SecurityEvent.EventStatus> pendingStatuses = List.of(
            SecurityEvent.EventStatus.NEW,
            SecurityEvent.EventStatus.IN_PROGRESS
        );
        
        List<SecurityEvent> events = securityEventRepository.findByStatusInOrderByTimestampDesc(pendingStatuses);
        return events.stream()
                .map(SecurityEventDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 获取分配给特定用户的事件
     */
    public Page<SecurityEventDTO> getEventsByAssignee(String assignedTo, int page, int size) {
        log.debug("Getting events assigned to: {}", assignedTo);
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"));
        Page<SecurityEvent> events = securityEventRepository.findByAssignedTo(assignedTo, pageable);
        
        return events.map(SecurityEventDTO::fromEntity);
    }

    /**
     * 获取相似事件
     */
    public List<SecurityEventDTO> getSimilarEvents(Long eventId, SecurityEvent.EventType eventType, String messagePattern, int limit) {
        log.debug("Getting similar events for event ID: {}", eventId);
        
        Pageable pageable = PageRequest.of(0, limit);
        List<SecurityEvent> events = securityEventRepository.findSimilarEvents(eventType, messagePattern, eventId, pageable);
        
        return events.stream()
                .map(SecurityEventDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 标记事件为已解决
     */
    @Transactional
    public boolean resolveEvent(Long id, String resolutionNotes, String assignedTo) {
        log.info("Resolving security event with ID: {}", id);
        
        Optional<SecurityEvent> eventOpt = securityEventRepository.findById(id);
        if (eventOpt.isEmpty()) {
            log.warn("Security event not found with ID: {}", id);
            return false;
        }
        
        SecurityEvent event = eventOpt.get();
        event.setStatus(SecurityEvent.EventStatus.RESOLVED);
        event.setResolutionNotes(resolutionNotes);
        event.setAssignedTo(assignedTo);
        event.setResolvedAt(LocalDateTime.now());
        
        securityEventRepository.save(event);
        log.info("Security event resolved successfully");
        
        return true;
    }

    /**
     * 标记事件为误报
     */
    @Transactional
    public boolean markAsFalsePositive(Long id, String reason) {
        log.info("Marking security event as false positive with ID: {}", id);
        
        Optional<SecurityEvent> eventOpt = securityEventRepository.findById(id);
        if (eventOpt.isEmpty()) {
            log.warn("Security event not found with ID: {}", id);
            return false;
        }
        
        SecurityEvent event = eventOpt.get();
        event.setStatus(SecurityEvent.EventStatus.FALSE_POSITIVE);
        event.setResolutionNotes(reason);
        event.setResolvedAt(LocalDateTime.now());
        
        securityEventRepository.save(event);
        log.info("Security event marked as false positive");
        
        return true;
    }
}
