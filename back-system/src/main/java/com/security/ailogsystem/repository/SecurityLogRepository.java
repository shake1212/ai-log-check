// repository/SecurityLogRepository.java
package com.security.ailogsystem.repository;

import com.security.ailogsystem.entity.SecurityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SecurityLogRepository extends JpaRepository<SecurityLog, Long> {

    // 原有的方法
    List<SecurityLog> findByEventTimeAfterOrderByEventTimeDesc(LocalDateTime since);

    List<SecurityLog> findByEventIdAndEventTimeAfter(Integer eventId, LocalDateTime since);

    @Query("SELECT l FROM SecurityLog l WHERE l.eventTime >= :start AND l.eventTime <= :end ORDER BY l.eventTime DESC")
    List<SecurityLog> findLogsByTimeRange(@Param("start") LocalDateTime start,
                                          @Param("end") LocalDateTime end);

    @Query("SELECT l.ipAddress, COUNT(l) FROM SecurityLog l " +
            "WHERE l.eventId = 4625 AND l.eventTime >= :start " +
            "GROUP BY l.ipAddress HAVING COUNT(l) > :threshold")
    List<Object[]> findBruteForceAttempts(@Param("start") LocalDateTime start,
                                          @Param("threshold") Long threshold);

    @Query("SELECT l.eventId, COUNT(l) FROM SecurityLog l " +
            "WHERE l.eventTime >= :start GROUP BY l.eventId")
    List<Object[]> countEventsByType(@Param("start") LocalDateTime start);

    @Query("SELECT FUNCTION('DATE', l.eventTime), COUNT(l) FROM SecurityLog l " +
            "WHERE l.eventTime >= :start GROUP BY FUNCTION('DATE', l.eventTime) ORDER BY FUNCTION('DATE', l.eventTime)")
    List<Object[]> getDailyLogCounts(@Param("start") LocalDateTime start);

    // 新增的方法
    Long countByEventTimeAfter(LocalDateTime time);

    Long countByEventTimeBetween(LocalDateTime start, LocalDateTime end);

    Long countByEventIdAndEventTimeBetween(Integer eventId, LocalDateTime start, LocalDateTime end);

    List<SecurityLog> findByEventTimeBefore(LocalDateTime time);

    List<SecurityLog> findByEventTimeBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT l.resultCode, COUNT(l) FROM SecurityLog l " +
            "WHERE l.eventId = 4625 AND l.eventTime BETWEEN :start AND :end " +
            "GROUP BY l.resultCode ORDER BY COUNT(l) DESC")
    List<Object[]> findCommonFailureReasons(@Param("start") LocalDateTime start,
                                            @Param("end") LocalDateTime end);

    @Query("SELECT l.ipAddress, COUNT(l) FROM SecurityLog l " +
            "WHERE l.eventId = 4625 AND l.eventTime BETWEEN :start AND :end " +
            "GROUP BY l.ipAddress ORDER BY COUNT(l) DESC")
    List<Object[]> findTopFailedLoginIps(@Param("start") LocalDateTime start,
                                         @Param("end") LocalDateTime end);

    // 使用 LIMIT 需要调整，MySQL 使用 LIMIT，这里使用子查询方式
    default List<Object[]> findTopFailedLoginIps(LocalDateTime start, LocalDateTime end, int limit) {
        List<Object[]> allResults = findTopFailedLoginIps(start, end);
        return allResults.subList(0, Math.min(limit, allResults.size()));
    }

    @Query("SELECT FUNCTION('DATE', l.eventTime), l.eventId, COUNT(l) FROM SecurityLog l " +
            "WHERE l.eventTime >= :start GROUP BY FUNCTION('DATE', l.eventTime), l.eventId " +
            "ORDER BY FUNCTION('DATE', l.eventTime), l.eventId")
    List<Object[]> getEventTypeTrends(@Param("start") LocalDateTime start);

    // 新增：根据威胁等级查询
    List<SecurityLog> findByThreatLevel(String threatLevel);

    // 新增：根据用户名查询
    List<SecurityLog> findByUserNameContainingIgnoreCase(String userName);
}