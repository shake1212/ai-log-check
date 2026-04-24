// repository/MetricsRepository.java
package com.security.ailogsystem.repository;

import com.security.ailogsystem.entity.SystemMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MetricsRepository extends JpaRepository<SystemMetrics, Long>, JpaSpecificationExecutor<SystemMetrics> {
    
    /**
     * Find most recent metric for real-time queries
     * @return Optional containing the most recent SystemMetrics, or empty if none exist
     */
    Optional<SystemMetrics> findFirstByOrderByTimestampDesc();
    
    /**
     * Find metrics within time range, ordered by timestamp ascending
     * @param start Start of time range (inclusive)
     * @param end End of time range (inclusive)
     * @return List of metrics within the time range
     */
    List<SystemMetrics> findByTimestampBetweenOrderByTimestampAsc(
        LocalDateTime start, LocalDateTime end);
    
    /**
     * Find metrics after a specific time, ordered by timestamp ascending
     * @param start Start time (inclusive)
     * @return List of metrics after the start time
     */
    List<SystemMetrics> findByTimestampAfterOrderByTimestampAsc(
        LocalDateTime start);
    
    /**
     * Find metrics before a specific time, ordered by timestamp ascending
     * @param end End time (inclusive)
     * @return List of metrics before the end time
     */
    List<SystemMetrics> findByTimestampBeforeOrderByTimestampAsc(
        LocalDateTime end);
    
    /**
     * Delete old metrics for retention policy
     * @param cutoffDate Metrics before this date will be deleted
     * @return Number of deleted records
     */
    @Modifying
    @Query("DELETE FROM SystemMetrics m WHERE m.timestamp < :cutoffDate")
    int deleteOldMetrics(@Param("cutoffDate") LocalDateTime cutoffDate);
    
    /**
     * Count metrics in time range for statistics
     * @param start Start of time range
     * @param end End of time range
     * @return Count of metrics in the range
     */
    long countByTimestampBetween(LocalDateTime start, LocalDateTime end);
}
