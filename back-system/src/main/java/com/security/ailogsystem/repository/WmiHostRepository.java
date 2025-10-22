package com.security.ailogsystem.repository;

import com.security.ailogsystem.model.WmiHost;
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
 * WMI主机Repository
 * 
 * @author AI Log System
 * @version 1.0
 */
@Repository
public interface WmiHostRepository extends JpaRepository<WmiHost, Long>, JpaSpecificationExecutor<WmiHost> {

    /**
     * 根据主机ID查找主机
     */
    Optional<WmiHost> findByHostId(String hostId);

    /**
     * 根据主机名查找主机
     */
    Optional<WmiHost> findByHostname(String hostname);

    /**
     * 根据IP地址查找主机
     */
    Optional<WmiHost> findByIpAddress(String ipAddress);

    /**
     * 查找启用的主机
     */
    List<WmiHost> findByIsEnabledTrue();

    /**
     * 查找启用的主机（分页）
     */
    Page<WmiHost> findByIsEnabledTrue(Pageable pageable);

    /**
     * 根据域名查找主机
     */
    List<WmiHost> findByDomain(String domain);

    /**
     * 根据创建者查找主机
     */
    List<WmiHost> findByCreatedBy(String createdBy);

    /**
     * 根据创建者分页查找主机
     */
    Page<WmiHost> findByCreatedBy(String createdBy, Pageable pageable);

    /**
     * 更新连接统计
     */
    @Modifying
    @Query("UPDATE WmiHost h SET h.connectionCount = h.connectionCount + 1, h.lastConnectionTime = :connectionTime, h.updatedAt = :updateTime WHERE h.hostId = :hostId")
    int updateConnectionStats(@Param("hostId") String hostId, @Param("connectionTime") LocalDateTime connectionTime, @Param("updateTime") LocalDateTime updateTime);

    /**
     * 更新成功统计
     */
    @Modifying
    @Query("UPDATE WmiHost h SET h.successCount = h.successCount + 1, h.lastSuccessTime = :successTime, h.updatedAt = :updateTime WHERE h.hostId = :hostId")
    int updateSuccessStats(@Param("hostId") String hostId, @Param("successTime") LocalDateTime successTime, @Param("updateTime") LocalDateTime updateTime);

    /**
     * 更新失败统计
     */
    @Modifying
    @Query("UPDATE WmiHost h SET h.errorCount = h.errorCount + 1, h.lastErrorTime = :errorTime, h.lastErrorMessage = :errorMessage, h.updatedAt = :updateTime WHERE h.hostId = :hostId")
    int updateFailureStats(@Param("hostId") String hostId, @Param("errorTime") LocalDateTime errorTime, @Param("errorMessage") String errorMessage, @Param("updateTime") LocalDateTime updateTime);

    /**
     * 统计各主机的连接数量
     */
    @Query("SELECT h.hostname, h.connectionCount FROM WmiHost h ORDER BY h.connectionCount DESC")
    List<Object[]> getHostConnectionStats();

    /**
     * 统计各主机的成功率
     */
    @Query("SELECT h.hostname, h.successRate FROM WmiHost h ORDER BY h.successRate DESC")
    List<Object[]> getHostSuccessRateStats();

    /**
     * 查找最近连接的主机
     */
    @Query("SELECT h FROM WmiHost h WHERE h.lastConnectionTime IS NOT NULL ORDER BY h.lastConnectionTime DESC")
    List<WmiHost> findRecentlyConnectedHosts(Pageable pageable);

    /**
     * 查找最近成功连接的主机
     */
    @Query("SELECT h FROM WmiHost h WHERE h.lastSuccessTime IS NOT NULL ORDER BY h.lastSuccessTime DESC")
    List<WmiHost> findRecentlySuccessfulHosts(Pageable pageable);

    /**
     * 查找最近失败的主机
     */
    @Query("SELECT h FROM WmiHost h WHERE h.lastErrorTime IS NOT NULL ORDER BY h.lastErrorTime DESC")
    List<WmiHost> findRecentlyFailedHosts(Pageable pageable);

    /**
     * 查找成功率低的主机
     */
    @Query("SELECT h FROM WmiHost h WHERE h.successRate < :threshold ORDER BY h.successRate ASC")
    List<WmiHost> findLowSuccessRateHosts(@Param("threshold") Double threshold);

    /**
     * 删除过期主机
     */
    @Modifying
    @Query("DELETE FROM WmiHost h WHERE h.createdAt < :expiredTime")
    int deleteExpiredHosts(@Param("expiredTime") LocalDateTime expiredTime);

    /**
     * 检查主机是否存在
     */
    boolean existsByHostname(String hostname);

    /**
     * 检查IP地址是否存在
     */
    boolean existsByIpAddress(String ipAddress);
}
