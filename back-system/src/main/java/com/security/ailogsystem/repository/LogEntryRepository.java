package com.security.ailogsystem.repository;

import com.security.ailogsystem.model.LogEntry;
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
public interface LogEntryRepository extends JpaRepository<LogEntry, Long>, JpaSpecificationExecutor<LogEntry> {
    
    Page<LogEntry> findByIsAnomalyTrue(Pageable pageable);
    
    Page<LogEntry> findBySource(String source, Pageable pageable);
    
    Page<LogEntry> findByLevel(String level, Pageable pageable);
    
    Page<LogEntry> findByTimestampBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
    
    Page<LogEntry> findBySourceAndLevelAndTimestampBetween(
            String source, String level, LocalDateTime start, LocalDateTime end, Pageable pageable);
    
    @Query("SELECT l FROM LogEntry l WHERE l.content LIKE %:keyword% OR l.rawData LIKE %:keyword%")
    Page<LogEntry> findByKeyword(String keyword, Pageable pageable);
    
    List<LogEntry> findTop100ByOrderByTimestampDesc();
    
    @Query("SELECT COUNT(l) FROM LogEntry l WHERE l.isAnomaly = true AND l.timestamp >= :since")
    long countAnomaliesSince(LocalDateTime since);
    
    List<LogEntry> findTop10ByOrderByTimestampDesc();
    
    long countByLevel(String level);
    
    long countBySource(String source);
    
    long countByIsAnomalyTrue();
    
    long countByIsAnomalyFalse();
    
    void deleteByTimestampBefore(LocalDateTime date);
    
    // 新增的统计查询方法
    @Query("SELECT l.source, COUNT(l) FROM LogEntry l GROUP BY l.source")
    List<Object[]> findSourceStatistics();
    
    @Query("SELECT l.source, COUNT(l) FROM LogEntry l WHERE l.timestamp BETWEEN :startTime AND :endTime GROUP BY l.source")
    List<Object[]> findSourceStatisticsByTimeRange(LocalDateTime startTime, LocalDateTime endTime);
    
    @Query(value = "SELECT l.ip_address, COUNT(l), SUM(CASE WHEN l.is_anomaly = true THEN 1 ELSE 0 END), MAX(l.timestamp) FROM log_entries l WHERE l.ip_address IS NOT NULL GROUP BY l.ip_address ORDER BY COUNT(l) DESC LIMIT :limit", nativeQuery = true)
    List<Object[]> findTopIps(@Param("limit") int limit);
    
    @Query(value = "SELECT l.ip_address, COUNT(l), SUM(CASE WHEN l.is_anomaly = true THEN 1 ELSE 0 END), MAX(l.timestamp) FROM log_entries l WHERE l.ip_address IS NOT NULL AND l.timestamp BETWEEN :startTime AND :endTime GROUP BY l.ip_address ORDER BY COUNT(l) DESC LIMIT :limit", nativeQuery = true)
    List<Object[]> findTopIpsByTimeRange(@Param("limit") int limit, @Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);
    
    @Query(value = "SELECT l.user_id, COUNT(l), SUM(CASE WHEN l.is_anomaly = true THEN 1 ELSE 0 END), MAX(l.timestamp) FROM log_entries l WHERE l.user_id IS NOT NULL GROUP BY l.user_id ORDER BY COUNT(l) DESC LIMIT :limit", nativeQuery = true)
    List<Object[]> findTopUsers(@Param("limit") int limit);
    
    @Query(value = "SELECT l.user_id, COUNT(l), SUM(CASE WHEN l.is_anomaly = true THEN 1 ELSE 0 END), MAX(l.timestamp) FROM log_entries l WHERE l.user_id IS NOT NULL AND l.timestamp BETWEEN :startTime AND :endTime GROUP BY l.user_id ORDER BY COUNT(l) DESC LIMIT :limit", nativeQuery = true)
    List<Object[]> findTopUsersByTimeRange(@Param("limit") int limit, @Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);
    
    @Query(value = "SELECT l.action, COUNT(l) FROM log_entries l WHERE l.user_id = :userId AND l.action IS NOT NULL GROUP BY l.action ORDER BY COUNT(l) DESC LIMIT :limit", nativeQuery = true)
    List<Object[]> findTopActionsForUser(@Param("userId") String userId, @Param("limit") int limit);
    
    @Query(value = "SELECT l.action, COUNT(l) FROM log_entries l WHERE l.user_id = :userId AND l.action IS NOT NULL AND l.timestamp BETWEEN :startTime AND :endTime GROUP BY l.action ORDER BY COUNT(l) DESC LIMIT :limit", nativeQuery = true)
    List<Object[]> findTopActionsForUserByTimeRange(@Param("userId") String userId, @Param("limit") int limit, @Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);
    
    @Query("SELECT l.ipAddress, COUNT(l) FROM LogEntry l WHERE l.ipAddress IS NOT NULL GROUP BY l.ipAddress")
    List<Object[]> findIpDistribution();
    
    @Query("SELECT l.ipAddress, COUNT(l) FROM LogEntry l WHERE l.ipAddress IS NOT NULL AND l.timestamp BETWEEN :startTime AND :endTime GROUP BY l.ipAddress")
    List<Object[]> findIpDistributionByTimeRange(LocalDateTime startTime, LocalDateTime endTime);
    
    @Query("SELECT l.userId, COUNT(l) FROM LogEntry l WHERE l.userId IS NOT NULL GROUP BY l.userId")
    List<Object[]> findUserDistribution();
    
    @Query("SELECT l.userId, COUNT(l) FROM LogEntry l WHERE l.userId IS NOT NULL AND l.timestamp BETWEEN :startTime AND :endTime GROUP BY l.userId")
    List<Object[]> findUserDistributionByTimeRange(LocalDateTime startTime, LocalDateTime endTime);
    
    // 时间范围查询方法
    long countByTimestampBetween(LocalDateTime start, LocalDateTime end);
    
    long countByIsAnomalyTrueAndTimestampBetween(LocalDateTime start, LocalDateTime end);
    
    long countByLevelAndTimestampBetween(String level, LocalDateTime start, LocalDateTime end);
    
    long countByLevelAndIsAnomalyTrueAndTimestampBetween(String level, LocalDateTime start, LocalDateTime end);
    
    // 时间查询方法
    @Query("SELECT MIN(l.timestamp) FROM LogEntry l")
    LocalDateTime findFirstEventTime();
    
    @Query("SELECT MAX(l.timestamp) FROM LogEntry l")
    LocalDateTime findLastEventTime();
    
    // 修复查询方法
    long countByLevelAndIsAnomalyTrue(String level);
    
    // 批量操作相关方法
    @Query(value = "SELECT * FROM log_entries l WHERE l.timestamp < :beforeDate LIMIT :limit", nativeQuery = true)
    List<LogEntry> findTop1000ByTimestampBefore(@Param("beforeDate") LocalDateTime beforeDate);
    
    @Query(value = "SELECT COUNT(*) FROM log_entries l WHERE l.timestamp < :beforeDate", nativeQuery = true)
    long countByTimestampBefore(@Param("beforeDate") LocalDateTime beforeDate);
    
    // 批量更新异常标记
    @Query(value = "UPDATE log_entries SET is_anomaly = :isAnomaly, anomaly_score = :anomalyScore, anomaly_reason = :anomalyReason, updated_at = NOW() WHERE id IN :ids", nativeQuery = true)
    int batchUpdateAnomalyStatus(@Param("ids") List<Long> ids, @Param("isAnomaly") boolean isAnomaly, @Param("anomalyScore") Double anomalyScore, @Param("anomalyReason") String anomalyReason);
    
    // 批量删除（使用IN子句）
    @Query(value = "DELETE FROM log_entries WHERE id IN :ids", nativeQuery = true)
    int batchDeleteByIds(@Param("ids") List<Long> ids);
    
    // 高效分页查询（使用索引优化）
    @Query(value = "SELECT * FROM log_entries ORDER BY timestamp DESC LIMIT :offset, :limit", nativeQuery = true)
    List<LogEntry> findWithPagination(@Param("offset") int offset, @Param("limit") int limit);
    
    // 获取最近N条记录（用于实时监控）
    @Query(value = "SELECT * FROM log_entries ORDER BY timestamp DESC LIMIT :limit", nativeQuery = true)
    List<LogEntry> findRecentLogs(@Param("limit") int limit);
} 