package com.security.ailogsystem.repository;

import com.security.ailogsystem.model.Alert;
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
public interface AlertRepository extends JpaRepository<Alert, Long>, JpaSpecificationExecutor<Alert> {

    // 按处理状态查询
    Page<Alert> findByHandled(Boolean handled, Pageable pageable);

    // 按告警级别查询
    Page<Alert> findByAlertLevel(String alertLevel, Pageable pageable);

    // 按告警类型查询
    Page<Alert> findByAlertType(String alertType, Pageable pageable);

    // 按状态查询
    Page<Alert> findByStatus(Alert.AlertStatus status, Pageable pageable);

    // 未处理的告警
    List<Alert> findByHandledFalse();

    // 最近创建的告警
    Page<Alert> findByCreatedTimeBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);

    // 搜索告警
    @Query("SELECT a FROM Alert a WHERE " +
            "(:keyword IS NULL OR " +
            "LOWER(a.alertId) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(a.source) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(a.alertType) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(a.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(a.assignee) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:alertLevel IS NULL OR a.alertLevel = :alertLevel) " +
            "AND (:handled IS NULL OR a.handled = :handled) " +
            "AND (:status IS NULL OR a.status = :status)")
    Page<Alert> searchAlerts(
            @Param("keyword") String keyword,
            @Param("alertLevel") String alertLevel,
            @Param("handled") Boolean handled,
            @Param("status") Alert.AlertStatus status,
            Pageable pageable);

    // 统计未处理告警数量
    long countByHandledFalse();

    // 按级别统计
    long countByAlertLevel(String alertLevel);

    long countByHandled(boolean b);

    // ========== 新增方法 ==========

    // 最近7天每日统计
    @Query("SELECT FUNCTION('DATE', a.createdTime), COUNT(a) FROM Alert a " +
            "WHERE a.createdTime >= :sevenDaysAgo " +
            "GROUP BY FUNCTION('DATE', a.createdTime) " +
            "ORDER BY FUNCTION('DATE', a.createdTime) ASC")
    List<Object[]> countByDateForLast7Days();

    // 暴力破解尝试（登录失败）
    @Query("SELECT a.source, COUNT(a) FROM Alert a " +
            "WHERE a.alertType = 'LOGIN_FAILURE' " +
            "GROUP BY a.source " +
            "ORDER BY COUNT(a) DESC")
    List<Object[]> findBruteForceAttempts();

    // 按事件类型统计
    @Query("SELECT a.alertType, COUNT(a) FROM Alert a " +
            "GROUP BY a.alertType " +
            "ORDER BY COUNT(a) DESC")
    List<Object[]> countByEventType();

    // 根据时间范围统计
    long countByCreatedTimeBetween(LocalDateTime start, LocalDateTime end);

    // 根据告警级别和时间范围统计
    @Query("SELECT COUNT(a) FROM Alert a WHERE a.alertLevel = :alertLevel AND a.createdTime BETWEEN :start AND :end")
    long countByAlertLevelAndCreatedTimeBetween(@Param("alertLevel") String alertLevel,
                                                @Param("start") LocalDateTime start,
                                                @Param("end") LocalDateTime end);

    // 获取未处理的告警（按时间倒序）
    List<Alert> findByHandledFalseOrderByCreatedTimeDesc();

    // 获取最近N条告警
    @Query(value = "SELECT * FROM alerts ORDER BY created_time DESC LIMIT :limit", nativeQuery = true)
    List<Alert> findRecentAlerts(@Param("limit") int limit);

    // 获取最近N条未处理告警
    @Query(value = "SELECT * FROM alerts WHERE handled = false ORDER BY created_time DESC LIMIT :limit", nativeQuery = true)
    List<Alert> findRecentUnhandledAlerts(@Param("limit") int limit);

    // 获取热门源IP（前10个）
    @Query("SELECT a.source, COUNT(a) as count FROM Alert a " +
            "WHERE a.source IS NOT NULL " +
            "GROUP BY a.source " +
            "ORDER BY count DESC")
    List<Object[]> getTopSourceIPs();

    // 获取今日告警统计
    @Query("SELECT COUNT(a) FROM Alert a WHERE DATE(a.createdTime) = CURRENT_DATE")
    long countTodayAlerts();

    // 获取最近24小时告警统计（按小时）
    @Query("SELECT HOUR(a.createdTime), COUNT(a) FROM Alert a " +
            "WHERE a.createdTime >= :twentyFourHoursAgo " +
            "GROUP BY HOUR(a.createdTime) " +
            "ORDER BY HOUR(a.createdTime) ASC")
    List<Object[]> getLast24HoursHourlyCounts(@Param("twentyFourHoursAgo") LocalDateTime twentyFourHoursAgo);

    // 获取用于Dashboard的告警统计
    default java.util.Map<String, Object> getDashboardStatistics() {
        java.util.Map<String, Object> stats = new java.util.HashMap<>();

        // 总告警数
        stats.put("totalAlerts", count());

        // 威胁等级分布
        java.util.Map<String, Long> threatLevels = new java.util.HashMap<>();
        threatLevels.put("LOW", countByAlertLevel("LOW"));
        threatLevels.put("MEDIUM", countByAlertLevel("MEDIUM"));
        threatLevels.put("HIGH", countByAlertLevel("HIGH"));
        threatLevels.put("CRITICAL", countByAlertLevel("CRITICAL"));
        stats.put("threatLevels", threatLevels);

        // 安全事件总数（MEDIUM及以上）
        long securityEvents = threatLevels.getOrDefault("MEDIUM", 0L) +
                threatLevels.getOrDefault("HIGH", 0L) +
                threatLevels.getOrDefault("CRITICAL", 0L);
        stats.put("securityEvents", securityEvents);

        // 高风险数量
        long highRiskCount = threatLevels.getOrDefault("HIGH", 0L) +
                threatLevels.getOrDefault("CRITICAL", 0L);
        stats.put("highRiskCount", highRiskCount);

        // 未处理告警
        long unhandledAlerts = countByHandledFalse();
        stats.put("unhandledAlerts", unhandledAlerts);

        // 最近7天每日统计
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        List<Object[]> dailyCounts = countByDateForLast7Days();
        stats.put("dailyCounts", dailyCounts);

        // 事件类型统计
        List<Object[]> eventCounts = countByEventType();
        stats.put("eventCounts", eventCounts);

        // 暴力破解尝试
        List<Object[]> bruteForceAttempts = findBruteForceAttempts();
        stats.put("bruteForceAttempts", bruteForceAttempts);

        // 今日异常数量
        LocalDateTime todayStart = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        long todayAnomalyCount = countByCreatedTimeBetween(todayStart, LocalDateTime.now());
        stats.put("anomalyCount", todayAnomalyCount);

        return stats;
    }
}