package com.security.ailogsystem.service;

import com.security.ailogsystem.dto.UnifiedEventQueryDTO;
import com.security.ailogsystem.dto.UnifiedSecurityEventDTO;
import com.security.ailogsystem.model.UnifiedSecurityEvent;
import com.security.ailogsystem.repository.UnifiedEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UnifiedEventService {

    private final UnifiedEventRepository eventRepository;

    /**
     * 创建安全事件
     */
    @Transactional
    public UnifiedSecurityEventDTO createEvent(UnifiedSecurityEventDTO eventDTO) {
        log.debug("创建安全事件: {}", eventDTO.getEventType());

        UnifiedSecurityEvent event = eventDTO.toEntity();
        UnifiedSecurityEvent savedEvent = eventRepository.save(event);

        return UnifiedSecurityEventDTO.fromEntity(savedEvent);
    }

    /**
     * 批量创建安全事件
     */
    @Transactional
    public List<UnifiedSecurityEventDTO> createEvents(List<UnifiedSecurityEventDTO> eventDTOs) {
        log.debug("批量创建 {} 个安全事件", eventDTOs.size());

        List<UnifiedSecurityEvent> events = eventDTOs.stream()
                .map(UnifiedSecurityEventDTO::toEntity)
                .collect(Collectors.toList());

        List<UnifiedSecurityEvent> savedEvents = eventRepository.saveAll(events);

        return savedEvents.stream()
                .map(UnifiedSecurityEventDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 根据ID获取事件
     */
    public Optional<UnifiedSecurityEventDTO> getEventById(Long id) {
        log.debug("根据ID获取事件: {}", id);

        return eventRepository.findById(id)
                .map(UnifiedSecurityEventDTO::fromEntity);
    }

    /**
     * 高级查询事件
     */
    public Page<UnifiedSecurityEventDTO> searchEvents(UnifiedEventQueryDTO queryDTO) {
        log.debug("高级查询事件: {}", queryDTO);

        queryDTO.validatePagination();

        Specification<UnifiedSecurityEvent> spec = buildSpecification(queryDTO);
        Pageable pageable = buildPageable(queryDTO);

        Page<UnifiedSecurityEvent> events = eventRepository.findAll(spec, pageable);

        return events.map(UnifiedSecurityEventDTO::fromEntity);
    }

    /**
     * 获取最近事件
     */
    public List<UnifiedSecurityEventDTO> getRecentEvents(int limit) {
        log.debug("获取最近 {} 个事件", limit);

        Pageable pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "timestamp"));
        Page<UnifiedSecurityEvent> events = eventRepository.findAll(pageable);

        return events.getContent().stream()
                .map(UnifiedSecurityEventDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 获取异常事件
     */
    public Page<UnifiedSecurityEventDTO> getAnomalyEvents(Pageable pageable) {
        log.debug("获取异常事件");

        Page<UnifiedSecurityEvent> events = eventRepository.findByIsAnomalyTrue(pageable);

        return events.map(UnifiedSecurityEventDTO::fromEntity);
    }

    /**
     * 更新事件状态
     */
    @Transactional
    public Optional<UnifiedSecurityEventDTO> updateEventStatus(Long id, String status, String resolutionNotes, String assignedTo) {
        log.debug("更新事件状态: ID={}, 状态={}", id, status);

        Optional<UnifiedSecurityEvent> eventOpt = eventRepository.findById(id);
        if (eventOpt.isEmpty()) {
            return Optional.empty();
        }

        UnifiedSecurityEvent event = eventOpt.get();
        event.setStatus(status);

        if (resolutionNotes != null) {
            event.setResolutionNotes(resolutionNotes);
        }

        if (assignedTo != null) {
            event.setAssignedTo(assignedTo);
        }

        if ("RESOLVED".equals(status) || "FALSE_POSITIVE".equals(status)) {
            event.setResolvedAt(LocalDateTime.now());
        }

        UnifiedSecurityEvent savedEvent = eventRepository.save(event);

        return Optional.of(UnifiedSecurityEventDTO.fromEntity(savedEvent));
    }

    /**
     * 删除事件
     */
    @Transactional
    public boolean deleteEvent(Long id) {
        log.debug("删除事件: {}", id);

        if (!eventRepository.existsById(id)) {
            return false;
        }

        eventRepository.deleteById(id);
        return true;
    }

    /**
     * 获取统计信息
     */
    public Map<String, Object> getStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("获取统计信息: {} - {}", startTime, endTime);

        Map<String, Object> stats = new java.util.HashMap<>();

        // 基本统计
        stats.put("totalEvents", eventRepository.countByTimestampBetween(startTime, endTime));
        stats.put("anomalyEvents", eventRepository.countByIsAnomalyTrueAndTimestampBetween(startTime, endTime));

        // 来源统计
        stats.put("sourceStats", convertToMap(eventRepository.countBySourceSystemGroup(startTime, endTime)));

        // 类型统计
        stats.put("typeStats", convertToMap(eventRepository.countByEventTypeGroup(startTime, endTime)));

        // 分类统计
        stats.put("categoryStats", convertToMap(eventRepository.countByCategoryGroup(startTime, endTime)));

        // 严重级别统计
        stats.put("severityStats", convertToMap(eventRepository.countBySeverityGroup(startTime, endTime)));

        // 威胁等级统计
        stats.put("threatLevelStats", convertToMap(eventRepository.countByThreatLevelGroup(startTime, endTime)));

        // 状态统计
        stats.put("statusStats", convertToMap(eventRepository.countByStatusGroup(startTime, endTime)));

        return stats;
    }

    /**
     * 获取时间序列统计
     */
    public List<Map<String, Object>> getTimeSeriesStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("获取时间序列统计: {} - {}", startTime, endTime);

        List<Object[]> hourlyStats = eventRepository.getHourlyStatistics(startTime, endTime);

        return hourlyStats.stream()
                .map(row -> Map.of(
                        "timestamp", row[0],
                        "count", row[1]
                ))
                .collect(Collectors.toList());
    }

    /**
     * 清理旧数据
     */
    @Transactional
    public void cleanupOldEvents(int daysToKeep) {
        log.info("清理 {} 天前的旧数据", daysToKeep);

        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysToKeep);
        eventRepository.deleteByTimestampBefore(cutoffDate);
    }

    // 私有辅助方法
    private Specification<UnifiedSecurityEvent> buildSpecification(UnifiedEventQueryDTO queryDTO) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 时间范围
            if (queryDTO.getStartTime() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("timestamp"), queryDTO.getStartTime()));
            }
            if (queryDTO.getEndTime() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("timestamp"), queryDTO.getEndTime()));
            }

            // 基本条件
            if (queryDTO.getSourceSystem() != null) {
                predicates.add(cb.equal(root.get("sourceSystem"), queryDTO.getSourceSystem()));
            }
            if (queryDTO.getEventType() != null) {
                predicates.add(cb.equal(root.get("eventType"), queryDTO.getEventType()));
            }
            if (queryDTO.getCategory() != null) {
                predicates.add(cb.equal(root.get("category"), queryDTO.getCategory()));
            }
            if (queryDTO.getSeverity() != null) {
                predicates.add(cb.equal(root.get("severity"), queryDTO.getSeverity()));
            }
            if (queryDTO.getThreatLevel() != null) {
                predicates.add(cb.equal(root.get("threatLevel"), queryDTO.getThreatLevel()));
            }
            if (queryDTO.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), queryDTO.getStatus()));
            }
            if (queryDTO.getIsAnomaly() != null) {
                predicates.add(cb.equal(root.get("isAnomaly"), queryDTO.getIsAnomaly()));
            }

            // 主机和用户条件
            if (queryDTO.getHostIp() != null) {
                predicates.add(cb.equal(root.get("hostIp"), queryDTO.getHostIp()));
            }
            if (queryDTO.getUserId() != null) {
                predicates.add(cb.equal(root.get("userId"), queryDTO.getUserId()));
            }

            // 网络条件
            if (queryDTO.getSourceIp() != null) {
                predicates.add(cb.equal(root.get("sourceIp"), queryDTO.getSourceIp()));
            }

            // 异常评分范围
            if (queryDTO.getMinAnomalyScore() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("anomalyScore"), queryDTO.getMinAnomalyScore()));
            }
            if (queryDTO.getMaxAnomalyScore() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("anomalyScore"), queryDTO.getMaxAnomalyScore()));
            }

            // 关键词搜索
            if (queryDTO.getKeyword() != null && !queryDTO.getKeyword().isEmpty()) {
                String likePattern = "%" + queryDTO.getKeyword() + "%";
                predicates.add(cb.or(
                        cb.like(root.get("rawMessage"), likePattern),
                        cb.like(root.get("normalizedMessage"), likePattern),
                        cb.like(root.get("anomalyReason"), likePattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Pageable buildPageable(UnifiedEventQueryDTO queryDTO) {
        Sort sort = Sort.by(
                Sort.Direction.fromString(queryDTO.getSafeSortDirection()),
                queryDTO.getSafeSortBy()
        );
        return PageRequest.of(queryDTO.getPage(), queryDTO.getSize(), sort);
    }

    private Map<String, Long> convertToMap(List<Object[]> data) {
        return data.stream()
                .collect(Collectors.toMap(
                        item -> (String) item[0],
                        item -> (Long) item[1]
                ));
    }
    /**
     * 获取威胁等级统计
     */
    public Map<String, Long> getThreatLevelStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("获取威胁等级统计: {} - {}", startTime, endTime);

        List<Object[]> results = eventRepository.countByThreatLevelGroup(startTime, endTime);
        return convertToMap(results);
    }

    /**
     * 获取事件类型统计
     */
    public Map<String, Long> getEventTypeStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("获取事件类型统计: {} - {}", startTime, endTime);

        List<Object[]> results = eventRepository.countByEventTypeGroup(startTime, endTime);
        return convertToMap(results);
    }

    /**
     * 获取异常事件数量
     */
    public Long getAnomalyEventCount(LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("获取异常事件数量: {} - {}", startTime, endTime);

        return eventRepository.countAnomalyEvents(startTime, endTime);
    }

    /**
     * 获取事件状态统计
     */
    public Map<String, Long> getEventStatusStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("获取事件状态统计: {} - {}", startTime, endTime);

        List<Object[]> results = eventRepository.countByStatusGroup(startTime, endTime);
        return convertToMap(results);
    }

    /**
     * 获取高频事件源
     */
    public List<Map<String, Object>> getTopEventSources(LocalDateTime startTime, LocalDateTime endTime, int limit) {
        log.debug("获取前 {} 个高频事件源: {} - {}", limit, startTime, endTime);

        Pageable pageable = org.springframework.data.domain.PageRequest.of(0, limit);
        List<Object[]> results = eventRepository.countBySourceSystemGroup(startTime, endTime);

        return results.stream()
                .map(row -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("source", row[0] != null ? row[0].toString() : "Unknown");
                    map.put("count", (Long) row[1]);
                    return map;
                })
                .collect(Collectors.toList());
    }

    /**
     * 获取高风险用户
     */
    public List<Map<String, Object>> getHighRiskUsers(LocalDateTime startTime, LocalDateTime endTime, int limit) {
        log.debug("获取前 {} 个高风险用户: {} - {}", limit, startTime, endTime);

        Pageable pageable = org.springframework.data.domain.PageRequest.of(0, limit);
        List<Object[]> results = eventRepository.countByUserGroup(startTime, endTime, pageable);

        return results.stream()
                .map(row -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("userId", row[0] != null ? row[0].toString() : "Unknown");
                    map.put("count", (Long) row[1]);
                    return map;
                })
                .collect(Collectors.toList());
    }
}