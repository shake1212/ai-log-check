package com.security.ailogsystem.repository;

import com.security.ailogsystem.model.WmiCollectionTask;
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
 * WMI采集任务Repository
 * 
 * @author AI Log System
 * @version 1.0
 */
@Repository
public interface WmiCollectionTaskRepository extends JpaRepository<WmiCollectionTask, Long>, JpaSpecificationExecutor<WmiCollectionTask> {

    /**
     * 根据任务ID查找任务
     */
    Optional<WmiCollectionTask> findByTaskId(String taskId);

    /**
     * 根据目标主机查找任务
     */
    List<WmiCollectionTask> findByTargetHost(String targetHost);

    /**
     * 根据状态查找任务
     */
    List<WmiCollectionTask> findByStatus(WmiCollectionTask.TaskStatus status);

    /**
     * 根据状态分页查找任务
     */
    Page<WmiCollectionTask> findByStatus(WmiCollectionTask.TaskStatus status, Pageable pageable);

    /**
     * 查找启用的任务
     */
    List<WmiCollectionTask> findByIsEnabledTrue();

    /**
     * 查找需要执行的任务（下次执行时间已到且状态为PENDING）
     */
    @Query("SELECT t FROM WmiCollectionTask t WHERE t.isEnabled = true AND t.status = 'PENDING' AND t.nextCollectionTime <= :currentTime ORDER BY t.priority DESC, t.nextCollectionTime ASC")
    List<WmiCollectionTask> findTasksToExecute(@Param("currentTime") LocalDateTime currentTime);

    /**
     * 查找重试中的任务
     */
    @Query("SELECT t FROM WmiCollectionTask t WHERE t.status = 'RETRYING' AND t.currentRetryCount < t.maxRetryCount")
    List<WmiCollectionTask> findRetryingTasks();

    /**
     * 根据目标主机和WMI类查找任务
     */
    Optional<WmiCollectionTask> findByTargetHostAndWmiClass(String targetHost, String wmiClass);

    /**
     * 统计各状态的任务数量
     */
    @Query("SELECT t.status, COUNT(t) FROM WmiCollectionTask t GROUP BY t.status")
    List<Object[]> countTasksByStatus();

    /**
     * 统计各主机的任务数量
     */
    @Query("SELECT t.targetHost, COUNT(t) FROM WmiCollectionTask t GROUP BY t.targetHost")
    List<Object[]> countTasksByHost();

    /**
     * 更新任务状态
     */
    @Modifying
    @Query("UPDATE WmiCollectionTask t SET t.status = :status, t.updatedAt = :updateTime WHERE t.taskId = :taskId")
    int updateTaskStatus(@Param("taskId") String taskId, @Param("status") WmiCollectionTask.TaskStatus status, @Param("updateTime") LocalDateTime updateTime);

    /**
     * 更新重试计数
     */
    @Modifying
    @Query("UPDATE WmiCollectionTask t SET t.currentRetryCount = :retryCount, t.lastErrorTime = :errorTime, t.lastErrorMessage = :errorMessage, t.updatedAt = :updateTime WHERE t.taskId = :taskId")
    int updateRetryCount(@Param("taskId") String taskId, @Param("retryCount") Integer retryCount, @Param("errorTime") LocalDateTime errorTime, @Param("errorMessage") String errorMessage, @Param("updateTime") LocalDateTime updateTime);

    /**
     * 更新成功统计
     */
    @Modifying
    @Query("UPDATE WmiCollectionTask t SET t.lastSuccessTime = :successTime, t.totalCollections = t.totalCollections + 1, t.successfulCollections = t.successfulCollections + 1, t.currentRetryCount = 0, t.updatedAt = :updateTime WHERE t.taskId = :taskId")
    int updateSuccessStats(@Param("taskId") String taskId, @Param("successTime") LocalDateTime successTime, @Param("updateTime") LocalDateTime updateTime);

    /**
     * 更新失败统计
     */
    @Modifying
    @Query("UPDATE WmiCollectionTask t SET t.lastErrorTime = :errorTime, t.lastErrorMessage = :errorMessage, t.totalCollections = t.totalCollections + 1, t.failedCollections = t.failedCollections + 1, t.updatedAt = :updateTime WHERE t.taskId = :taskId")
    int updateFailureStats(@Param("taskId") String taskId, @Param("errorTime") LocalDateTime errorTime, @Param("errorMessage") String errorMessage, @Param("updateTime") LocalDateTime updateTime);

    /**
     * 更新下次执行时间
     */
    @Modifying
    @Query("UPDATE WmiCollectionTask t SET t.nextCollectionTime = :nextTime, t.updatedAt = :updateTime WHERE t.taskId = :taskId")
    int updateNextCollectionTime(@Param("taskId") String taskId, @Param("nextTime") LocalDateTime nextTime, @Param("updateTime") LocalDateTime updateTime);

    /**
     * 删除过期任务
     */
    @Modifying
    @Query("DELETE FROM WmiCollectionTask t WHERE t.createdAt < :expiredTime")
    int deleteExpiredTasks(@Param("expiredTime") LocalDateTime expiredTime);
}
