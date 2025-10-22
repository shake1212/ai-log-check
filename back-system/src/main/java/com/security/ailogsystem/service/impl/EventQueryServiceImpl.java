package com.security.ailogsystem.service.impl;

import com.security.ailogsystem.dto.EventStatisticsDTO;
import com.security.ailogsystem.dto.LogEntryDTO;
import com.security.ailogsystem.exception.DatabaseException;
import com.security.ailogsystem.model.Alert;
import com.security.ailogsystem.model.LogEntry;
import com.security.ailogsystem.repository.AlertRepository;
import com.security.ailogsystem.repository.LogEntryRepository;
import com.security.ailogsystem.service.EventQueryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 事件查询服务实现类
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventQueryServiceImpl implements EventQueryService {

    private final LogEntryRepository logEntryRepository;
    private final AlertRepository alertRepository;

    @Override
    public EventStatisticsDTO getComprehensiveStatistics() {
        log.debug("获取综合事件统计信息");
        
        LocalDateTime now = LocalDateTime.now();
        
        return EventStatisticsDTO.builder()
                .basic(getBasicStatistics())
                .timeRange(getTimeRangeStatistics())
                .sourceStatistics(getSourceStatistics(null, null))
                .levelStatistics(getLevelStatistics(null, null))
                .anomaly(getAnomalyStatistics(null, null))
                .trends(getEventTrends(now.minusDays(7), now, "hour"))
                .topIps(getTopIps(10, null, null))
                .userActivity(getUserActivityStatistics(10, null, null))
                .build();
    }

    @Override
    public EventStatisticsDTO getStatisticsByTimeRange(LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("获取指定时间范围的事件统计: {} - {}", startTime, endTime);
        
        return EventStatisticsDTO.builder()
                .basic(getBasicStatisticsForRange(startTime, endTime))
                .sourceStatistics(getSourceStatistics(startTime, endTime))
                .levelStatistics(getLevelStatistics(startTime, endTime))
                .anomaly(getAnomalyStatistics(startTime, endTime))
                .trends(getEventTrends(startTime, endTime, "hour"))
                .topIps(getTopIps(10, startTime, endTime))
                .userActivity(getUserActivityStatistics(10, startTime, endTime))
                .build();
    }

    @Override
    public List<EventStatisticsDTO.TrendData> getEventTrends(LocalDateTime startTime, LocalDateTime endTime, String granularity) {
        log.debug("获取事件趋势数据: {} - {}, 粒度: {}", startTime, endTime, granularity);
        
        List<EventStatisticsDTO.TrendData> trends = new ArrayList<>();
        
        if (startTime == null) {
            startTime = LocalDateTime.now().minusDays(7);
        }
        if (endTime == null) {
            endTime = LocalDateTime.now();
        }
        
        // 根据粒度计算时间间隔
        ChronoUnit timeUnit = "hour".equals(granularity) ? ChronoUnit.HOURS : 
                             "day".equals(granularity) ? ChronoUnit.DAYS : ChronoUnit.HOURS;
        
        LocalDateTime current = startTime;
        while (current.isBefore(endTime)) {
            LocalDateTime next = current.plus(1, timeUnit);
            if (next.isAfter(endTime)) {
                next = endTime;
            }
            
            long eventCount = logEntryRepository.countByTimestampBetween(current, next);
            long anomalyCount = logEntryRepository.countByIsAnomalyTrueAndTimestampBetween(current, next);
            double anomalyRate = eventCount > 0 ? (double) anomalyCount / eventCount : 0.0;
            
            trends.add(EventStatisticsDTO.TrendData.builder()
                    .timestamp(current)
                    .eventCount(eventCount)
                    .anomalyCount(anomalyCount)
                    .anomalyRate(anomalyRate)
                    .build());
            
            current = next;
        }
        
        return trends;
    }

    @Override
    public Map<String, Long> getSourceStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("获取来源统计: {} - {}", startTime, endTime);
        
        List<Object[]> results;
        if (startTime != null && endTime != null) {
            results = logEntryRepository.findSourceStatisticsByTimeRange(startTime, endTime);
        } else {
            results = logEntryRepository.findSourceStatistics();
        }
        
        return results.stream()
                .collect(Collectors.toMap(
                        result -> (String) result[0],
                        result -> (Long) result[1]
                ));
    }

    @Override
    public Map<String, Long> getLevelStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("获取级别统计: {} - {}", startTime, endTime);
        
        Map<String, Long> statistics = new HashMap<>();
        String[] levels = {"INFO", "WARN", "ERROR", "DEBUG"};
        
        for (String level : levels) {
            long count;
            if (startTime != null && endTime != null) {
                count = logEntryRepository.countByLevelAndTimestampBetween(level, startTime, endTime);
            } else {
                count = logEntryRepository.countByLevel(level);
            }
            statistics.put(level.toLowerCase(), count);
        }
        
        return statistics;
    }

    @Override
    public EventStatisticsDTO.AnomalyStatistics getAnomalyStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("获取异常统计: {} - {}", startTime, endTime);
        
        long totalAnomalies;
        long pendingAlerts;
        long resolvedAlerts;
        long falsePositiveAlerts;
        
        if (startTime != null && endTime != null) {
            totalAnomalies = logEntryRepository.countByIsAnomalyTrueAndTimestampBetween(startTime, endTime);
            pendingAlerts = alertRepository.countByStatusAndTimestampBetween(Alert.AlertStatus.PENDING, startTime, endTime);
            resolvedAlerts = alertRepository.countByStatusAndTimestampBetween(Alert.AlertStatus.RESOLVED, startTime, endTime);
            falsePositiveAlerts = alertRepository.countByStatusAndTimestampBetween(Alert.AlertStatus.FALSE_POSITIVE, startTime, endTime);
        } else {
            totalAnomalies = logEntryRepository.countByIsAnomalyTrue();
            pendingAlerts = alertRepository.countByStatus(Alert.AlertStatus.PENDING);
            resolvedAlerts = alertRepository.countByStatus(Alert.AlertStatus.RESOLVED);
            falsePositiveAlerts = alertRepository.countByStatus(Alert.AlertStatus.FALSE_POSITIVE);
        }
        
        // 计算平均置信度
        Double averageConfidence = alertRepository.getAverageConfidence();
        if (averageConfidence == null) {
            averageConfidence = 0.0;
        }
        
        return EventStatisticsDTO.AnomalyStatistics.builder()
                .totalAnomalies(totalAnomalies)
                .pendingAlerts(pendingAlerts)
                .resolvedAlerts(resolvedAlerts)
                .falsePositiveAlerts(falsePositiveAlerts)
                .averageConfidence(averageConfidence)
                .anomalyByType(getAnomalyByType(startTime, endTime))
                .anomalyByLevel(getAnomalyByLevel(startTime, endTime))
                .build();
    }

    @Override
    public List<EventStatisticsDTO.IpStatistics> getTopIps(int limit, LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("获取热点IP统计: 限制{}, 时间范围: {} - {}", limit, startTime, endTime);
        
        List<Object[]> results;
        if (startTime != null && endTime != null) {
            results = logEntryRepository.findTopIpsByTimeRange(limit, startTime, endTime);
        } else {
            results = logEntryRepository.findTopIps(limit);
        }
        
        return results.stream()
                .map(result -> EventStatisticsDTO.IpStatistics.builder()
                        .ipAddress((String) result[0])
                        .eventCount((Long) result[1])
                        .anomalyCount((Long) result[2])
                        .anomalyRate(((Long) result[1]) > 0 ? 
                                ((Long) result[2]).doubleValue() / ((Long) result[1]).doubleValue() : 0.0)
                        .lastActivity(result[3] != null ? result[3].toString() : "")
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<EventStatisticsDTO.UserActivityStatistics> getUserActivityStatistics(int limit, LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("获取用户活动统计: 限制{}, 时间范围: {} - {}", limit, startTime, endTime);
        
        List<Object[]> results;
        if (startTime != null && endTime != null) {
            results = logEntryRepository.findTopUsersByTimeRange(limit, startTime, endTime);
        } else {
            results = logEntryRepository.findTopUsers(limit);
        }
        
        return results.stream()
                .map(result -> EventStatisticsDTO.UserActivityStatistics.builder()
                        .userId((String) result[0])
                        .eventCount((Long) result[1])
                        .anomalyCount((Long) result[2])
                        .anomalyRate(((Long) result[1]) > 0 ? 
                                ((Long) result[2]).doubleValue() / ((Long) result[1]).doubleValue() : 0.0)
                        .lastActivity(result[3] != null ? result[3].toString() : "")
                        .topActions(getTopActionsForUser((String) result[0], startTime, endTime))
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public Page<LogEntryDTO> advancedEventQuery(String source, String level, String ipAddress, String userId, 
                                               String action, Boolean isAnomaly, Double minAnomalyScore, 
                                               Double maxAnomalyScore, LocalDateTime startTime, LocalDateTime endTime, 
                                               String keyword, Pageable pageable) {
        log.debug("执行高级事件查询");
        
        Specification<LogEntry> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            if (source != null && !source.isEmpty()) {
                predicates.add(cb.equal(root.get("source"), source));
            }
            if (level != null && !level.isEmpty()) {
                predicates.add(cb.equal(root.get("level"), level));
            }
            if (ipAddress != null && !ipAddress.isEmpty()) {
                predicates.add(cb.equal(root.get("ipAddress"), ipAddress));
            }
            if (userId != null && !userId.isEmpty()) {
                predicates.add(cb.equal(root.get("userId"), userId));
            }
            if (action != null && !action.isEmpty()) {
                predicates.add(cb.equal(root.get("action"), action));
            }
            if (isAnomaly != null) {
                predicates.add(cb.equal(root.get("isAnomaly"), isAnomaly));
            }
            if (minAnomalyScore != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("anomalyScore"), minAnomalyScore));
            }
            if (maxAnomalyScore != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("anomalyScore"), maxAnomalyScore));
            }
            if (startTime != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("timestamp"), startTime));
            }
            if (endTime != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("timestamp"), endTime));
            }
            if (keyword != null && !keyword.isEmpty()) {
                predicates.add(cb.or(
                        cb.like(root.get("content"), "%" + keyword + "%"),
                        cb.like(root.get("rawData"), "%" + keyword + "%")
                ));
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        
        Page<LogEntry> logEntries = logEntryRepository.findAll(spec, pageable);
        return logEntries.map(this::convertToDTO);
    }

    @Override
    public Map<String, Object> getEventAggregations(String groupBy, LocalDateTime startTime, LocalDateTime endTime, String aggregationType) {
        log.debug("获取事件聚合统计: 分组{}, 聚合类型{}, 时间范围: {} - {}", groupBy, aggregationType, startTime, endTime);
        
        Map<String, Object> result = new HashMap<>();
        
        switch (groupBy.toLowerCase()) {
            case "source":
                result.put("data", getSourceStatistics(startTime, endTime));
                break;
            case "level":
                result.put("data", getLevelStatistics(startTime, endTime));
                break;
            case "hour":
                result.put("data", getHourlyStatistics(startTime, endTime));
                break;
            case "day":
                result.put("data", getDailyStatistics(startTime, endTime));
                break;
            default:
                result.put("error", "不支持的分组字段: " + groupBy);
        }
        
        result.put("groupBy", groupBy);
        result.put("aggregationType", aggregationType);
        result.put("timeRange", Map.of("start", startTime, "end", endTime));
        
        return result;
    }

    @Override
    public Map<String, Long> getRealTimeStatistics() {
        log.debug("获取实时事件统计");
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastHour = now.minusHours(1);
        LocalDateTime last24Hours = now.minusHours(24);
        
        Map<String, Long> stats = new HashMap<>();
        stats.put("lastHourEvents", logEntryRepository.countByTimestampBetween(lastHour, now));
        stats.put("lastHourAnomalies", logEntryRepository.countByIsAnomalyTrueAndTimestampBetween(lastHour, now));
        stats.put("last24HoursEvents", logEntryRepository.countByTimestampBetween(last24Hours, now));
        stats.put("last24HoursAnomalies", logEntryRepository.countByIsAnomalyTrueAndTimestampBetween(last24Hours, now));
        stats.put("totalEvents", logEntryRepository.count());
        stats.put("totalAnomalies", logEntryRepository.countByIsAnomalyTrue());
        stats.put("pendingAlerts", alertRepository.countByStatus(Alert.AlertStatus.PENDING));
        
        return stats;
    }

    @Override
    public Map<String, Long> getEventDistribution(String dimension, LocalDateTime startTime, LocalDateTime endTime) {
        log.debug("获取事件分布统计: 维度{}, 时间范围: {} - {}", dimension, startTime, endTime);
        
        switch (dimension.toLowerCase()) {
            case "source":
                return getSourceStatistics(startTime, endTime);
            case "level":
                return getLevelStatistics(startTime, endTime);
            case "ip":
                return getIpDistribution(startTime, endTime);
            case "user":
                return getUserDistribution(startTime, endTime);
            default:
                return new HashMap<>();
        }
    }

    // 私有辅助方法
    private EventStatisticsDTO.BasicStatistics getBasicStatistics() {
        long totalEvents = logEntryRepository.count();
        long totalAlerts = alertRepository.count();
        long anomalyEvents = logEntryRepository.countByIsAnomalyTrue();
        long normalEvents = logEntryRepository.countByIsAnomalyFalse();
        double anomalyRate = totalEvents > 0 ? (double) anomalyEvents / totalEvents : 0.0;
        
        LocalDateTime firstEvent = logEntryRepository.findFirstEventTime();
        LocalDateTime lastEvent = logEntryRepository.findLastEventTime();
        
        return EventStatisticsDTO.BasicStatistics.builder()
                .totalEvents(totalEvents)
                .totalAlerts(totalAlerts)
                .anomalyEvents(anomalyEvents)
                .normalEvents(normalEvents)
                .anomalyRate(anomalyRate)
                .firstEventTime(firstEvent)
                .lastEventTime(lastEvent)
                .build();
    }

    private EventStatisticsDTO.BasicStatistics getBasicStatisticsForRange(LocalDateTime startTime, LocalDateTime endTime) {
        long totalEvents = logEntryRepository.countByTimestampBetween(startTime, endTime);
        long totalAlerts = alertRepository.countByTimestampBetween(startTime, endTime);
        long anomalyEvents = logEntryRepository.countByIsAnomalyTrueAndTimestampBetween(startTime, endTime);
        long normalEvents = totalEvents - anomalyEvents;
        double anomalyRate = totalEvents > 0 ? (double) anomalyEvents / totalEvents : 0.0;
        
        return EventStatisticsDTO.BasicStatistics.builder()
                .totalEvents(totalEvents)
                .totalAlerts(totalAlerts)
                .anomalyEvents(anomalyEvents)
                .normalEvents(normalEvents)
                .anomalyRate(anomalyRate)
                .firstEventTime(startTime)
                .lastEventTime(endTime)
                .build();
    }

    private EventStatisticsDTO.TimeRangeStatistics getTimeRangeStatistics() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        LocalDateTime startOfYesterday = startOfDay.minusDays(1);
        LocalDateTime startOfWeek = now.minusWeeks(1);
        LocalDateTime startOfLastWeek = now.minusWeeks(2);
        LocalDateTime startOfMonth = now.minusMonths(1);
        LocalDateTime startOfLastMonth = now.minusMonths(2);
        LocalDateTime last24Hours = now.minusHours(24);
        LocalDateTime last7Days = now.minusDays(7);
        LocalDateTime last30Days = now.minusDays(30);
        
        return EventStatisticsDTO.TimeRangeStatistics.builder()
                .todayEvents(logEntryRepository.countByTimestampBetween(startOfDay, now))
                .yesterdayEvents(logEntryRepository.countByTimestampBetween(startOfYesterday, startOfDay))
                .thisWeekEvents(logEntryRepository.countByTimestampBetween(startOfWeek, now))
                .lastWeekEvents(logEntryRepository.countByTimestampBetween(startOfLastWeek, startOfWeek))
                .thisMonthEvents(logEntryRepository.countByTimestampBetween(startOfMonth, now))
                .lastMonthEvents(logEntryRepository.countByTimestampBetween(startOfLastMonth, startOfMonth))
                .last24HoursEvents(logEntryRepository.countByTimestampBetween(last24Hours, now))
                .last7DaysEvents(logEntryRepository.countByTimestampBetween(last7Days, now))
                .last30DaysEvents(logEntryRepository.countByTimestampBetween(last30Days, now))
                .build();
    }

    private Map<String, Long> getAnomalyByType(LocalDateTime startTime, LocalDateTime endTime) {
        // 这里可以根据实际的异常类型字段来实现
        // 暂时返回空Map，需要根据具体业务逻辑实现
        return new HashMap<>();
    }

    private Map<String, Long> getAnomalyByLevel(LocalDateTime startTime, LocalDateTime endTime) {
        Map<String, Long> result = new HashMap<>();
        String[] levels = {"INFO", "WARN", "ERROR", "DEBUG"};
        
        for (String level : levels) {
            long count;
            if (startTime != null && endTime != null) {
                count = logEntryRepository.countByLevelAndIsAnomalyTrueAndTimestampBetween(level, startTime, endTime);
            } else {
                count = logEntryRepository.countByLevelAndIsAnomalyTrue(level);
            }
            result.put(level.toLowerCase(), count);
        }
        
        return result;
    }

    private List<String> getTopActionsForUser(String userId, LocalDateTime startTime, LocalDateTime endTime) {
        List<Object[]> results;
        if (startTime != null && endTime != null) {
            results = logEntryRepository.findTopActionsForUserByTimeRange(userId, 5, startTime, endTime);
        } else {
            results = logEntryRepository.findTopActionsForUser(userId, 5);
        }
        
        return results.stream()
                .map(result -> (String) result[0])
                .collect(Collectors.toList());
    }

    private Map<String, Long> getHourlyStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        // 实现按小时统计的逻辑
        return new HashMap<>();
    }

    private Map<String, Long> getDailyStatistics(LocalDateTime startTime, LocalDateTime endTime) {
        // 实现按天统计的逻辑
        return new HashMap<>();
    }

    private Map<String, Long> getIpDistribution(LocalDateTime startTime, LocalDateTime endTime) {
        List<Object[]> results;
        if (startTime != null && endTime != null) {
            results = logEntryRepository.findIpDistributionByTimeRange(startTime, endTime);
        } else {
            results = logEntryRepository.findIpDistribution();
        }
        
        return results.stream()
                .collect(Collectors.toMap(
                        result -> (String) result[0],
                        result -> (Long) result[1]
                ));
    }

    private Map<String, Long> getUserDistribution(LocalDateTime startTime, LocalDateTime endTime) {
        List<Object[]> results;
        if (startTime != null && endTime != null) {
            results = logEntryRepository.findUserDistributionByTimeRange(startTime, endTime);
        } else {
            results = logEntryRepository.findUserDistribution();
        }
        
        return results.stream()
                .collect(Collectors.toMap(
                        result -> (String) result[0],
                        result -> (Long) result[1]
                ));
    }

    private LogEntryDTO convertToDTO(LogEntry logEntry) {
        return LogEntryDTO.builder()
                .id(logEntry.getId().toString())
                .timestamp(logEntry.getTimestamp())
                .source(logEntry.getSource())
                .level(logEntry.getLevel())
                .content(logEntry.getContent())
                .ipAddress(logEntry.getIpAddress())
                .userId(logEntry.getUserId())
                .action(logEntry.getAction())
                .isAnomaly(logEntry.isAnomaly())
                .anomalyScore(logEntry.getAnomalyScore())
                .anomalyReason(logEntry.getAnomalyReason())
                .rawData(logEntry.getRawData())
                .features(logEntry.getFeatures())
                .createdAt(logEntry.getCreatedAt())
                .updatedAt(logEntry.getUpdatedAt())
                .build();
    }
}
