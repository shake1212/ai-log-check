package com.security.ailogsystem.repository;

import com.security.ailogsystem.model.WmiCollectionResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * WMI采集结果Repository
 * 
 * @author AI Log System
 * @version 1.0
 */
@Repository
public interface WmiCollectionResultRepository extends JpaRepository<WmiCollectionResult, Long>, JpaSpecificationExecutor<WmiCollectionResult> {

    /**
     * 根据结果ID查找结果
     */
    Optional<WmiCollectionResult> findByResultId(String resultId);

    /**
     * 根据任务ID查找结果
     */
    List<WmiCollectionResult> findByTaskId(String taskId);

    /**
     * 根据任务ID分页查找结果
     */
    Page<WmiCollectionResult> findByTaskId(String taskId, Pageable pageable);

    /**
     * 根据目标主机查找结果
     */
    List<WmiCollectionResult> findByTargetHost(String targetHost);

    /**
     * 根据状态查找结果
     */
    List<WmiCollectionResult> findByStatus(WmiCollectionResult.CollectionStatus status);

    /**
     * 根据状态分页查找结果
     */
    Page<WmiCollectionResult> findByStatus(WmiCollectionResult.CollectionStatus status, Pageable pageable);

    /**
     * 根据采集时间范围查找结果
     */
    List<WmiCollectionResult> findByCollectionTimeBetween(LocalDateTime startTime, LocalDateTime endTime);

    /**
     * 根据采集时间范围分页查找结果
     */
    Page<WmiCollectionResult> findByCollectionTimeBetween(LocalDateTime startTime, LocalDateTime endTime, Pageable pageable);

    /**
     * 根据目标主机和采集时间范围查找结果
     */
    List<WmiCollectionResult> findByTargetHostAndCollectionTimeBetween(String targetHost, LocalDateTime startTime, LocalDateTime endTime);

    /**
     * 查找异常结果
     */
    List<WmiCollectionResult> findByIsAnomalyTrue();

    /**
     * 查找异常结果（分页）
     */
    Page<WmiCollectionResult> findByIsAnomalyTrue(Pageable pageable);

    /**
     * 根据目标主机和WMI类查找结果
     */
    List<WmiCollectionResult> findByTargetHostAndWmiClass(String targetHost, String wmiClass);

    /**
     * 根据目标主机和WMI类分页查找结果
     */
    Page<WmiCollectionResult> findByTargetHostAndWmiClass(String targetHost, String wmiClass, Pageable pageable);

    /**
     * 统计各状态的结果数量
     */
    @Query("SELECT r.status, COUNT(r) FROM WmiCollectionResult r GROUP BY r.status")
    List<Object[]> countResultsByStatus();

    /**
     * 统计各主机的结果数量
     */
    @Query("SELECT r.targetHost, COUNT(r) FROM WmiCollectionResult r GROUP BY r.targetHost")
    List<Object[]> countResultsByHost();

    /**
     * 统计各WMI类的结果数量
     */
    @Query("SELECT r.wmiClass, COUNT(r) FROM WmiCollectionResult r GROUP BY r.wmiClass")
    List<Object[]> countResultsByWmiClass();

    /**
     * 统计异常结果数量
     */
    @Query("SELECT COUNT(r) FROM WmiCollectionResult r WHERE r.isAnomaly = true")
    long countAnomalyResults();

    /**
     * 统计指定时间范围内的结果数量
     */
    @Query("SELECT COUNT(r) FROM WmiCollectionResult r WHERE r.collectionTime BETWEEN :startTime AND :endTime")
    long countResultsByTimeRange(@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);

    /**
     * 统计指定时间范围内的成功结果数量
     */
    @Query("SELECT COUNT(r) FROM WmiCollectionResult r WHERE r.status = 'SUCCESS' AND r.collectionTime BETWEEN :startTime AND :endTime")
    long countSuccessResultsByTimeRange(@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);

    /**
     * 统计指定时间范围内的失败结果数量
     */
    @Query("SELECT COUNT(r) FROM WmiCollectionResult r WHERE r.status != 'SUCCESS' AND r.collectionTime BETWEEN :startTime AND :endTime")
    long countFailureResultsByTimeRange(@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);

    /**
     * 查找最新的结果
     */
    @Query("SELECT r FROM WmiCollectionResult r ORDER BY r.collectionTime DESC")
    List<WmiCollectionResult> findLatestResults(Pageable pageable);

    /**
     * 查找指定任务的最新结果
     */
    @Query("SELECT r FROM WmiCollectionResult r WHERE r.taskId = :taskId ORDER BY r.collectionTime DESC")
    List<WmiCollectionResult> findLatestResultsByTask(@Param("taskId") String taskId, Pageable pageable);

    /**
     * 删除过期结果
     */
    @Modifying
    @Query("DELETE FROM WmiCollectionResult r WHERE r.createdAt < :expiredTime")
    int deleteExpiredResults(@Param("expiredTime") LocalDateTime expiredTime);

    /**
     * 删除指定任务的结果
     */
    @Modifying
    @Query("DELETE FROM WmiCollectionResult r WHERE r.taskId = :taskId")
    int deleteResultsByTaskId(@Param("taskId") String taskId);

    /**
     * 删除指定主机的结果
     */
    @Modifying
    @Query("DELETE FROM WmiCollectionResult r WHERE r.targetHost = :targetHost")
    int deleteResultsByTargetHost(@Param("targetHost") String targetHost);
}
