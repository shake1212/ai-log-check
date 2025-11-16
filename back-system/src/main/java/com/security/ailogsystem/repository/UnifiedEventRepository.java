package com.security.ailogsystem.repository;

import com.security.ailogsystem.model.UnifiedSecurityEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UnifiedEventRepository extends JpaRepository<UnifiedSecurityEvent, Long>,
        JpaSpecificationExecutor<UnifiedSecurityEvent> {

    // 基础查询方法
    Page<UnifiedSecurityEvent> findByIsAnomalyTrue(Pageable pageable);
    Page<UnifiedSecurityEvent> findBySourceSystem(String sourceSystem, Pageable pageable);
    Page<UnifiedSecurityEvent> findByEventType(String eventType, Pageable pageable);
    Page<UnifiedSecurityEvent> findByCategory(String category, Pageable pageable);
    Page<UnifiedSecurityEvent> findBySeverity(String severity, Pageable pageable);
    Page<UnifiedSecurityEvent> findByThreatLevel(String threatLevel, Pageable pageable);
    Page<UnifiedSecurityEvent> findByStatus(String status, Pageable pageable);

    // 时间范围查询
    Page<UnifiedSecurityEvent> findByTimestampBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
    List<UnifiedSecurityEvent> findByTimestampBetween(LocalDateTime start, LocalDateTime end);

    // 组合查询
    Page<UnifiedSecurityEvent> findBySourceSystemAndEventTypeAndTimestampBetween(
            String sourceSystem, String eventType, LocalDateTime start, LocalDateTime end, Pageable pageable);

    // 统计查询
    long countByTimestampBetween(LocalDateTime start, LocalDateTime end);
    long countByIsAnomalyTrueAndTimestampBetween(LocalDateTime start, LocalDateTime end);
    long countBySourceSystemAndTimestampBetween(String sourceSystem, LocalDateTime start, LocalDateTime end);
    long countByEventTypeAndTimestampBetween(String eventType, LocalDateTime start, LocalDateTime end);
    long countByCategoryAndTimestampBetween(String category, LocalDateTime start, LocalDateTime end);
    long countBySeverityAndTimestampBetween(String severity, LocalDateTime start, LocalDateTime end);
    long countByThreatLevelAndTimestampBetween(String threatLevel, LocalDateTime start, LocalDateTime end);

    // 新增的统计方法
    @Query("SELECT COUNT(e) FROM UnifiedSecurityEvent e WHERE e.eventType = :eventType AND e.sourceIp = :sourceIp AND e.timestamp BETWEEN :start AND :end")
    long countByEventTypeAndSourceIpAndTimestampBetween(@Param("eventType") String eventType,
                                                        @Param("sourceIp") String sourceIp,
                                                        @Param("start") LocalDateTime start,
                                                        @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(e) FROM UnifiedSecurityEvent e WHERE e.isAnomaly = true AND e.userId = :userId AND e.timestamp BETWEEN :start AND :end")
    long countByIsAnomalyTrueAndUserIdAndTimestampBetween(@Param("userId") String userId,
                                                          @Param("start") LocalDateTime start,
                                                          @Param("end") LocalDateTime end);

    long countByLevelAndIsAnomalyTrue(String level);

    long countByLevelAndIsAnomalyTrueAndTimestampBetween(String level, LocalDateTime start, LocalDateTime end);

    long countBySourceIpAndTimestampBetween(String sourceIp, LocalDateTime start, LocalDateTime end);

    long countByUserIdAndTimestampBetween(String userId, LocalDateTime start, LocalDateTime end);

    // 高级统计查询
    @Query("SELECT e.sourceSystem, COUNT(e) FROM UnifiedSecurityEvent e WHERE e.timestamp BETWEEN :start AND :end GROUP BY e.sourceSystem")
    List<Object[]> countBySourceSystemGroup(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT e.eventType, COUNT(e) FROM UnifiedSecurityEvent e WHERE e.timestamp BETWEEN :start AND :end GROUP BY e.eventType")
    List<Object[]> countByEventTypeGroup(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT e.category, COUNT(e) FROM UnifiedSecurityEvent e WHERE e.timestamp BETWEEN :start AND :end GROUP BY e.category")
    List<Object[]> countByCategoryGroup(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT e.severity, COUNT(e) FROM UnifiedSecurityEvent e WHERE e.timestamp BETWEEN :start AND :end GROUP BY e.severity")
    List<Object[]> countBySeverityGroup(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT e.threatLevel, COUNT(e) FROM UnifiedSecurityEvent e WHERE e.timestamp BETWEEN :start AND :end GROUP BY e.threatLevel")
    List<Object[]> countByThreatLevelGroup(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT e.status, COUNT(e) FROM UnifiedSecurityEvent e WHERE e.timestamp BETWEEN :start AND :end GROUP BY e.status")
    List<Object[]> countByStatusGroup(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT e.detectionAlgorithm, COUNT(e) FROM UnifiedSecurityEvent e WHERE e.timestamp BETWEEN :start AND :end GROUP BY e.detectionAlgorithm")
    List<Object[]> countByDetectionAlgorithmGroup(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // 热门IP和用户统计
    @Query("SELECT e.sourceIp, COUNT(e) FROM UnifiedSecurityEvent e WHERE e.sourceIp IS NOT NULL AND e.timestamp BETWEEN :start AND :end GROUP BY e.sourceIp ORDER BY COUNT(e) DESC")
    List<Object[]> findTopSourceIps(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end, Pageable pageable);

    @Query("SELECT e.userId, COUNT(e) FROM UnifiedSecurityEvent e WHERE e.userId IS NOT NULL AND e.timestamp BETWEEN :start AND :end GROUP BY e.userId ORDER BY COUNT(e) DESC")
    List<Object[]> findTopUsers(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end, Pageable pageable);

    @Query("SELECT e.hostIp, COUNT(e) FROM UnifiedSecurityEvent e WHERE e.hostIp IS NOT NULL AND e.timestamp BETWEEN :start AND :end GROUP BY e.hostIp ORDER BY COUNT(e) DESC")
    List<Object[]> countByHostGroup(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end, Pageable pageable);

    @Query("SELECT e.userId, COUNT(e) FROM UnifiedSecurityEvent e WHERE e.userId IS NOT NULL AND e.timestamp BETWEEN :start AND :end GROUP BY e.userId ORDER BY COUNT(e) DESC")
    List<Object[]> countByUserGroup(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end, Pageable pageable);

    // 异常事件统计
    @Query("SELECT COUNT(e) FROM UnifiedSecurityEvent e WHERE e.isAnomaly = true AND e.timestamp BETWEEN :start AND :end")
    long countAnomalyEvents(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // 时间序列统计
    @Query(value = "SELECT DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour, COUNT(*) as count " +
            "FROM unified_security_events WHERE timestamp BETWEEN :start AND :end " +
            "GROUP BY DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') ORDER BY hour",
            nativeQuery = true)
    List<Object[]> getHourlyStatistics(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // 获取最近事件
    List<UnifiedSecurityEvent> findTop100ByOrderByTimestampDesc();

    // 删除旧数据
    void deleteByTimestampBefore(LocalDateTime date);

    @Query(value = "SELECT FUNCTION('DATE_FORMAT', timestamp, '%Y-%m-%d %H:00:00') as hour, COUNT(*) as count " +
            "FROM UnifiedSecurityEvent WHERE timestamp BETWEEN :start AND :end " +
            "GROUP BY FUNCTION('DATE_FORMAT', timestamp, '%Y-%m-%d %H:00:00') ORDER BY hour")
    List<Object[]> getHourlyStatisticsCompatible(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}