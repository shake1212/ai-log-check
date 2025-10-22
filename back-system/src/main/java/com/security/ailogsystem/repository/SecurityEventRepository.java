package com.security.ailogsystem.repository;

import com.security.ailogsystem.model.SecurityEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 安全事件Repository接口
 * 提供安全事件的数据访问方法
 */
@Repository
public interface SecurityEventRepository extends JpaRepository<SecurityEvent, Long> {

    /**
     * 根据时间范围查询安全事件
     */
    Page<SecurityEvent> findByTimestampBetween(LocalDateTime startTime, LocalDateTime endTime, Pageable pageable);

    /**
     * 根据日志级别查询安全事件
     */
    Page<SecurityEvent> findByLevel(SecurityEvent.LogLevel level, Pageable pageable);

    /**
     * 根据事件来源查询安全事件
     */
    Page<SecurityEvent> findBySource(String source, Pageable pageable);

    /**
     * 根据主机IP查询安全事件
     */
    Page<SecurityEvent> findByHostIp(String hostIp, Pageable pageable);

    /**
     * 根据用户ID查询安全事件
     */
    Page<SecurityEvent> findByUserId(String userId, Pageable pageable);

    /**
     * 查询异常事件
     */
    Page<SecurityEvent> findByIsAnomalyTrue(Pageable pageable);

    /**
     * 根据威胁等级查询安全事件
     */
    Page<SecurityEvent> findByThreatLevel(SecurityEvent.ThreatLevel threatLevel, Pageable pageable);

    /**
     * 根据事件状态查询安全事件
     */
    Page<SecurityEvent> findByStatus(SecurityEvent.EventStatus status, Pageable pageable);

    /**
     * 根据事件类型查询安全事件
     */
    Page<SecurityEvent> findByEventType(SecurityEvent.EventType eventType, Pageable pageable);

    /**
     * 根据事件分类查询安全事件
     */
    Page<SecurityEvent> findByCategory(SecurityEvent.EventCategory category, Pageable pageable);

    /**
     * 查询最近的安全事件
     */
    List<SecurityEvent> findTop10ByOrderByTimestampDesc();

    /**
     * 查询最近的异常事件
     */
    List<SecurityEvent> findTop10ByIsAnomalyTrueOrderByTimestampDesc();

    /**
     * 根据多个条件查询安全事件
     */
    @Query("SELECT se FROM SecurityEvent se WHERE " +
           "(:startTime IS NULL OR se.timestamp >= :startTime) AND " +
           "(:endTime IS NULL OR se.timestamp <= :endTime) AND " +
           "(:level IS NULL OR se.level = :level) AND " +
           "(:source IS NULL OR se.source = :source) AND " +
           "(:hostIp IS NULL OR se.hostIp = :hostIp) AND " +
           "(:userId IS NULL OR se.userId = :userId) AND " +
           "(:eventType IS NULL OR se.eventType = :eventType) AND " +
           "(:category IS NULL OR se.category = :category) AND " +
           "(:threatLevel IS NULL OR se.threatLevel = :threatLevel) AND " +
           "(:status IS NULL OR se.status = :status) AND " +
           "(:isAnomaly IS NULL OR se.isAnomaly = :isAnomaly) AND " +
           "(:keyword IS NULL OR se.message LIKE %:keyword%)")
    Page<SecurityEvent> findByMultipleConditions(
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            @Param("level") SecurityEvent.LogLevel level,
            @Param("source") String source,
            @Param("hostIp") String hostIp,
            @Param("userId") String userId,
            @Param("eventType") SecurityEvent.EventType eventType,
            @Param("category") SecurityEvent.EventCategory category,
            @Param("threatLevel") SecurityEvent.ThreatLevel threatLevel,
            @Param("status") SecurityEvent.EventStatus status,
            @Param("isAnomaly") Boolean isAnomaly,
            @Param("keyword") String keyword,
            Pageable pageable);

    /**
     * 统计各威胁等级的事件数量
     */
    @Query("SELECT se.threatLevel, COUNT(se) FROM SecurityEvent se " +
           "WHERE se.timestamp BETWEEN :startTime AND :endTime " +
           "GROUP BY se.threatLevel")
    List<Object[]> countByThreatLevel(@Param("startTime") LocalDateTime startTime, 
                                     @Param("endTime") LocalDateTime endTime);

    /**
     * 统计各事件类型的数量
     */
    @Query("SELECT se.eventType, COUNT(se) FROM SecurityEvent se " +
           "WHERE se.timestamp BETWEEN :startTime AND :endTime " +
           "GROUP BY se.eventType")
    List<Object[]> countByEventType(@Param("startTime") LocalDateTime startTime, 
                                   @Param("endTime") LocalDateTime endTime);

    /**
     * 统计各主机的事件数量
     */
    @Query("SELECT se.hostIp, COUNT(se) FROM SecurityEvent se " +
           "WHERE se.timestamp BETWEEN :startTime AND :endTime " +
           "GROUP BY se.hostIp ORDER BY COUNT(se) DESC")
    List<Object[]> countByHost(@Param("startTime") LocalDateTime startTime, 
                              @Param("endTime") LocalDateTime endTime);

    /**
     * 统计异常事件数量
     */
    @Query("SELECT COUNT(se) FROM SecurityEvent se " +
           "WHERE se.isAnomaly = true AND se.timestamp BETWEEN :startTime AND :endTime")
    Long countAnomalyEvents(@Param("startTime") LocalDateTime startTime, 
                           @Param("endTime") LocalDateTime endTime);

    /**
     * 统计各状态的事件数量
     */
    @Query("SELECT se.status, COUNT(se) FROM SecurityEvent se " +
           "WHERE se.timestamp BETWEEN :startTime AND :endTime " +
           "GROUP BY se.status")
    List<Object[]> countByStatus(@Param("startTime") LocalDateTime startTime, 
                                @Param("endTime") LocalDateTime endTime);

    /**
     * 查询高频事件源
     */
    @Query("SELECT se.source, COUNT(se) FROM SecurityEvent se " +
           "WHERE se.timestamp BETWEEN :startTime AND :endTime " +
           "GROUP BY se.source ORDER BY COUNT(se) DESC")
    List<Object[]> findTopEventSources(@Param("startTime") LocalDateTime startTime, 
                                      @Param("endTime") LocalDateTime endTime,
                                      Pageable pageable);

    /**
     * 查询高风险用户
     */
    @Query("SELECT se.userId, COUNT(se) FROM SecurityEvent se " +
           "WHERE se.threatLevel IN ('HIGH', 'CRITICAL') AND " +
           "se.timestamp BETWEEN :startTime AND :endTime " +
           "GROUP BY se.userId ORDER BY COUNT(se) DESC")
    List<Object[]> findHighRiskUsers(@Param("startTime") LocalDateTime startTime, 
                                    @Param("endTime") LocalDateTime endTime,
                                    Pageable pageable);

    /**
     * 查询待处理的事件
     */
    List<SecurityEvent> findByStatusInOrderByTimestampDesc(List<SecurityEvent.EventStatus> statuses);

    /**
     * 查询分配给特定用户的事件
     */
    Page<SecurityEvent> findByAssignedTo(String assignedTo, Pageable pageable);

    /**
     * 根据事件ID和时间范围查询
     */
    Page<SecurityEvent> findByEventIdAndTimestampBetween(Integer eventId, 
                                                        LocalDateTime startTime, 
                                                        LocalDateTime endTime, 
                                                        Pageable pageable);

    /**
     * 查询特定时间范围内的异常事件
     */
    @Query("SELECT se FROM SecurityEvent se WHERE " +
           "se.isAnomaly = true AND " +
           "se.timestamp BETWEEN :startTime AND :endTime " +
           "ORDER BY se.anomalyScore DESC, se.timestamp DESC")
    List<SecurityEvent> findAnomalyEventsByTimeRange(@Param("startTime") LocalDateTime startTime, 
                                                    @Param("endTime") LocalDateTime endTime,
                                                    Pageable pageable);

    /**
     * 统计每日事件数量
     */
    @Query("SELECT DATE(se.timestamp), COUNT(se) FROM SecurityEvent se " +
           "WHERE se.timestamp BETWEEN :startTime AND :endTime " +
           "GROUP BY DATE(se.timestamp) ORDER BY DATE(se.timestamp)")
    List<Object[]> countEventsByDay(@Param("startTime") LocalDateTime startTime, 
                                   @Param("endTime") LocalDateTime endTime);

    /**
     * 查询相似事件（基于事件类型和消息内容）
     */
    @Query("SELECT se FROM SecurityEvent se WHERE " +
           "se.eventType = :eventType AND " +
           "se.message LIKE %:messagePattern% AND " +
           "se.id != :excludeId " +
           "ORDER BY se.timestamp DESC")
    List<SecurityEvent> findSimilarEvents(@Param("eventType") SecurityEvent.EventType eventType,
                                         @Param("messagePattern") String messagePattern,
                                         @Param("excludeId") Long excludeId,
                                         Pageable pageable);
}
