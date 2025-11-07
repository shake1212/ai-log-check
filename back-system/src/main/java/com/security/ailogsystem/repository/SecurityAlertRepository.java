// repository/SecurityAlertRepository.java
package com.security.ailogsystem.repository;

import com.security.ailogsystem.entity.SecurityAlert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SecurityAlertRepository extends JpaRepository<SecurityAlert, Long> {

    // 原有的方法
    List<SecurityAlert> findByHandledFalseOrderByCreatedTimeDesc();

    List<SecurityAlert> findByAlertLevelOrderByCreatedTimeDesc(SecurityAlert.AlertLevel level);

    // 新增的方法 - 修复缺失的方法
    Long countByAlertLevelAndCreatedTimeAfter(SecurityAlert.AlertLevel alertLevel, LocalDateTime createdTime);

    Long countByCreatedTimeAfter(LocalDateTime time);

    Long countByCreatedTimeBetween(LocalDateTime start, LocalDateTime end);

    Long countByHandledFalse();

    Long countByHandledFalseAndCreatedTimeBetween(LocalDateTime start, LocalDateTime end);

    Long countByAlertLevelAndCreatedTimeBetween(SecurityAlert.AlertLevel level, LocalDateTime start, LocalDateTime end);

    Long countByAlertTypeAndCreatedTimeBetween(String alertType, LocalDateTime start, LocalDateTime end);

    List<SecurityAlert> findByCreatedTimeBefore(LocalDateTime time);

    List<SecurityAlert> findByAlertLevelAndCreatedTimeAfterOrderByCreatedTimeDesc(
            SecurityAlert.AlertLevel level, LocalDateTime time);

    List<SecurityAlert> findByAlertLevelAndHandledFalseOrderByCreatedTimeDesc(
            SecurityAlert.AlertLevel level);

    // 新增：分页查询方法
    Page<SecurityAlert> findAll(Pageable pageable);

    Page<SecurityAlert> findByHandled(Boolean handled, Pageable pageable);

    // 新增：Top N 查询
    List<SecurityAlert> findTop10ByOrderByCreatedTimeDesc();

    List<SecurityAlert> findTop10ByHandledFalseOrderByCreatedTimeDesc();

    // 新增：搜索方法
    @Query("SELECT a FROM SecurityAlert a WHERE " +
            "(:keyword IS NULL OR a.description LIKE %:keyword%) AND " +
            "(:level IS NULL OR a.alertLevel = :level) AND " +
            "(:alertType IS NULL OR a.alertType LIKE %:alertType%) AND " +
            "(:handled IS NULL OR a.handled = :handled) AND " +
            "(:startTime IS NULL OR a.createdTime >= :startTime) AND " +
            "(:endTime IS NULL OR a.createdTime <= :endTime)")
    Page<SecurityAlert> searchAlerts(
            @Param("keyword") String keyword,
            @Param("level") SecurityAlert.AlertLevel level,
            @Param("alertType") String alertType,
            @Param("handled") Boolean handled,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            Pageable pageable
    );

    @Query("SELECT a.alertType, COUNT(a) FROM SecurityAlert a " +
            "WHERE a.createdTime BETWEEN :start AND :end GROUP BY a.alertType")
    List<Object[]> countAlertsByType(@Param("start") LocalDateTime start,
                                     @Param("end") LocalDateTime end);

    @Query("SELECT FUNCTION('DATE', a.createdTime), COUNT(a) FROM SecurityAlert a " +
            "WHERE a.alertType = 'BRUTE_FORCE_ATTACK' AND a.createdTime BETWEEN :start AND :end " +
            "GROUP BY FUNCTION('DATE', a.createdTime) ORDER BY FUNCTION('DATE', a.createdTime)")
    List<Object[]> countBruteForceByDay(@Param("start") LocalDateTime start,
                                        @Param("end") LocalDateTime end);

    @Query("SELECT FUNCTION('DATE', a.createdTime), COUNT(a) FROM SecurityAlert a " +
            "WHERE a.createdTime >= :start GROUP BY FUNCTION('DATE', a.createdTime) ORDER BY FUNCTION('DATE', a.createdTime)")
    List<Object[]> getDailyAlertCounts(@Param("start") LocalDateTime start);

    // 新增：按创建时间范围查询
    List<SecurityAlert> findByCreatedTimeBetween(LocalDateTime start, LocalDateTime end);

    // 新增：根据ID查找
    default SecurityAlert getById(Long id) {
        return findById(id).orElse(null);
    }
}