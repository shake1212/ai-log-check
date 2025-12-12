package com.security.ailogsystem.repository;

import com.security.ailogsystem.entity.SecurityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
public interface SecurityLogRepository extends JpaRepository<SecurityLog, Long> {

    // 原有的方法（保持不变）
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

    // ========== 新增的方法（解决LogController调用的问题）==========

    // 按威胁等级和时间统计数量
    @Query("SELECT COUNT(l) FROM SecurityLog l WHERE l.threatLevel = :threatLevel AND l.eventTime >= :since")
    Long countByThreatLevelAndEventTimeAfter(@Param("threatLevel") String threatLevel,
                                             @Param("since") LocalDateTime since);

    // 按威胁等级分组统计
    @Query("SELECT l.threatLevel, COUNT(l) FROM SecurityLog l WHERE l.eventTime >= :since GROUP BY l.threatLevel")
    List<Object[]> countByThreatLevelGroup(@Param("since") LocalDateTime since);

    // 按威胁等级和时间范围统计
    @Query("SELECT COUNT(l) FROM SecurityLog l WHERE l.threatLevel = :threatLevel AND l.eventTime BETWEEN :start AND :end")
    Long countByThreatLevelAndEventTimeBetween(@Param("threatLevel") String threatLevel,
                                               @Param("start") LocalDateTime start,
                                               @Param("end") LocalDateTime end);

    // ========== 新添加的方法（用于Dashboard动态数据）==========

    // 1. 统计特定威胁等级的日志总数（不按时间）
    Long countByThreatLevel(String threatLevel);

    // 2. 统计多个威胁等级在某个时间之后的日志数量（用于异常流量统计）
    @Query("SELECT COUNT(l) FROM SecurityLog l WHERE l.threatLevel IN :threatLevels AND l.eventTime >= :time")
    Long countByThreatLevelInAndEventTimeAfter(@Param("threatLevels") List<String> threatLevels,
                                               @Param("time") LocalDateTime time);

    // 3. 统计多个威胁等级在某个时间范围内的日志数量
    @Query("SELECT COUNT(l) FROM SecurityLog l WHERE l.threatLevel IN :threatLevels AND l.eventTime BETWEEN :start AND :end")
    Long countByThreatLevelInAndEventTimeBetween(@Param("threatLevels") List<String> threatLevels,
                                                 @Param("start") LocalDateTime start,
                                                 @Param("end") LocalDateTime end);

    // 4. 统计所有日志的总数
    @Query("SELECT COUNT(l) FROM SecurityLog l")
    Long getTotalLogCount();

    // 5. 获取威胁等级分布统计（用于Dashboard）
    @Query("SELECT l.threatLevel, COUNT(l) FROM SecurityLog l GROUP BY l.threatLevel")
    List<Object[]> getThreatLevelDistribution();

    // 6. 获取最近N条日志
    @Query(value = "SELECT * FROM windows_security_logs ORDER BY event_time DESC LIMIT :limit", nativeQuery = true)
    List<SecurityLog> findRecentLogs(@Param("limit") int limit);

    // 7. 按时间范围和威胁等级统计
    @Query("SELECT COUNT(l) FROM SecurityLog l WHERE l.eventTime >= :startTime AND l.eventTime <= :endTime AND l.threatLevel = :threatLevel")
    Long countByTimeRangeAndThreatLevel(@Param("startTime") LocalDateTime startTime,
                                        @Param("endTime") LocalDateTime endTime,
                                        @Param("threatLevel") String threatLevel);

    // 8. 获取高风险日志（威胁等级为MEDIUM及以上）
    @Query("SELECT COUNT(l) FROM SecurityLog l WHERE l.threatLevel IN ('MEDIUM', 'HIGH', 'CRITICAL')")
    Long countHighRiskLogs();

    // 9. 获取今日日志统计
    @Query("SELECT COUNT(l) FROM SecurityLog l WHERE DATE(l.eventTime) = CURRENT_DATE")
    Long countTodayLogs();

    // 10. 获取最近7天每日统计（用于Dashboard图表）
    @Query("SELECT DATE(l.eventTime), COUNT(l) FROM SecurityLog l " +
            "WHERE l.eventTime >= :sevenDaysAgo " +
            "GROUP BY DATE(l.eventTime) " +
            "ORDER BY DATE(l.eventTime) ASC")
    List<Object[]> getLast7DaysDailyCounts(@Param("sevenDaysAgo") LocalDateTime sevenDaysAgo);

    // 11. 获取最近24小时日志统计（按小时）
    @Query("SELECT HOUR(l.eventTime), COUNT(l) FROM SecurityLog l " +
            "WHERE l.eventTime >= :twentyFourHoursAgo " +
            "GROUP BY HOUR(l.eventTime) " +
            "ORDER BY HOUR(l.eventTime) ASC")
    List<Object[]> getLast24HoursHourlyCounts(@Param("twentyFourHoursAgo") LocalDateTime twentyFourHoursAgo);

    // 12. 获取热门事件类型（前10个）- 修正版：只使用eventId
    @Query("SELECT l.eventId, COUNT(l) as count FROM SecurityLog l " +
            "WHERE l.eventTime >= :startTime " +
            "GROUP BY l.eventId " +
            "ORDER BY count DESC")
    List<Object[]> getTopEventTypes(@Param("startTime") LocalDateTime startTime);

    // 13. 获取热门IP地址（前10个）
    @Query("SELECT l.ipAddress, COUNT(l) as count FROM SecurityLog l " +
            "WHERE l.eventTime >= :startTime AND l.ipAddress IS NOT NULL " +
            "GROUP BY l.ipAddress " +
            "ORDER BY count DESC")
    List<Object[]> getTopIpAddresses(@Param("startTime") LocalDateTime startTime);

    // 14. 统计指定时间范围内的平均吞吐量（条/分钟）- 使用原生查询
    @Query(value = "SELECT COUNT(*) / (TIMESTAMPDIFF(MINUTE, MIN(event_time), MAX(event_time)) + 1) " +
            "FROM windows_security_logs WHERE event_time BETWEEN :start AND :end", nativeQuery = true)
    Double calculateAverageThroughput(@Param("start") LocalDateTime start,
                                      @Param("end") LocalDateTime end);

    // 15. 获取系统运行概况统计
    default Map<String, Object> getSystemOverviewStats() {
        Map<String, Object> stats = new HashMap<>();

        // 总日志数
        Long totalLogs = count();
        stats.put("totalLogs", totalLogs);

        // 今日日志数
        Long todayLogs = countTodayLogs();
        stats.put("todayLogs", todayLogs);

        // 威胁等级分布
        List<Object[]> threatDistribution = getThreatLevelDistribution();
        Map<String, Long> threatLevels = new HashMap<>();
        for (Object[] row : threatDistribution) {
            threatLevels.put((String) row[0], (Long) row[1]);
        }
        stats.put("threatLevels", threatLevels);

        // 计算高风险数量
        Long highRiskCount = threatLevels.getOrDefault("HIGH", 0L) +
                threatLevels.getOrDefault("CRITICAL", 0L);
        stats.put("highRiskCount", highRiskCount);

        // 高风险日志
        Long highRiskLogs = countHighRiskLogs();
        stats.put("highRiskLogs", highRiskLogs);

        // 最近7天统计
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        List<Object[]> last7DaysStats = getLast7DaysDailyCounts(sevenDaysAgo);
        stats.put("last7DaysStats", last7DaysStats);

        return stats;
    }

    // 16. 获取用于Dashboard的完整统计信息
    default Map<String, Object> getDashboardStatistics() {
        Map<String, Object> statistics = new HashMap<>();

        // 总日志数
        statistics.put("totalLogs", count());

        // 威胁等级分布
        List<Object[]> threatDistribution = getThreatLevelDistribution();
        Map<String, Long> threatLevels = new HashMap<>();
        for (Object[] row : threatDistribution) {
            threatLevels.put((String) row[0], (Long) row[1]);
        }
        statistics.put("threatLevels", threatLevels);

        // 安全事件总数（MEDIUM及以上）
        long securityEvents = threatLevels.getOrDefault("MEDIUM", 0L) +
                threatLevels.getOrDefault("HIGH", 0L) +
                threatLevels.getOrDefault("CRITICAL", 0L);
        statistics.put("securityEvents", securityEvents);

        // 高风险数量
        long highRiskCount = threatLevels.getOrDefault("HIGH", 0L) +
                threatLevels.getOrDefault("CRITICAL", 0L);
        statistics.put("highRiskCount", highRiskCount);

        // 高风险日志
        statistics.put("highRiskLogs", countHighRiskLogs());

        // 最近7天每日统计
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        List<Object[]> dailyCounts = getLast7DaysDailyCounts(sevenDaysAgo);
        statistics.put("dailyCounts", dailyCounts);

        // 事件类型统计（最近24小时）
        LocalDateTime twentyFourHoursAgo = LocalDateTime.now().minusHours(24);
        List<Object[]> eventCounts = countEventsByType(twentyFourHoursAgo);
        statistics.put("eventCounts", eventCounts);

        // 暴力破解尝试（最近24小时）
        List<Object[]> bruteForceAttempts = findBruteForceAttempts(twentyFourHoursAgo, 5L);
        statistics.put("bruteForceAttempts", bruteForceAttempts);

        // 计算异常数量（今天）
        LocalDateTime todayStart = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        long todayAnomalyCount = 0L;

        // 调用新添加的方法
        try {
            List<String> threatLevelsList = Arrays.asList("MEDIUM", "HIGH", "CRITICAL");
            Long count = countByThreatLevelInAndEventTimeBetween(
                    threatLevelsList,
                    todayStart,
                    LocalDateTime.now()
            );
            todayAnomalyCount = count != null ? count : 0L;
        } catch (Exception e) {
            // 如果方法调用失败，使用备用计算方法
            todayAnomalyCount = threatLevels.getOrDefault("MEDIUM", 0L) +
                    threatLevels.getOrDefault("HIGH", 0L) +
                    threatLevels.getOrDefault("CRITICAL", 0L);
        }

        statistics.put("anomalyCount", todayAnomalyCount);

        return statistics;
    }

    // 17. 辅助方法：获取事件ID对应的事件名称（用于前端显示）
    default String getEventNameById(Integer eventId) {
        // Windows安全事件ID到名称的映射
        Map<Integer, String> eventMap = new HashMap<>();
        eventMap.put(4625, "登录失败");
        eventMap.put(4624, "登录成功");
        eventMap.put(4634, "注销");
        eventMap.put(4672, "特殊权限分配");
        eventMap.put(4648, "使用显式凭据登录");
        eventMap.put(4670, "权限更改");
        eventMap.put(4688, "新进程创建");
        eventMap.put(4697, "服务安装");
        eventMap.put(4698, "计划任务创建");
        eventMap.put(4702, "计划任务更新");
        eventMap.put(4719, "系统审核策略更改");
        eventMap.put(4720, "用户帐户创建");
        eventMap.put(4722, "用户帐户启用");
        eventMap.put(4723, "用户帐户密码更改");
        eventMap.put(4724, "用户帐户密码重置");
        eventMap.put(4725, "用户帐户禁用");
        eventMap.put(4726, "用户帐户删除");
        eventMap.put(4738, "用户帐户更改");
        eventMap.put(4740, "用户帐户锁定");
        eventMap.put(4767, "用户帐户解锁");
        eventMap.put(4776, "域控制器尝试验证凭据");
        eventMap.put(1102, "安全日志清除");

        return eventMap.getOrDefault(eventId, "事件 " + eventId);
    }
}